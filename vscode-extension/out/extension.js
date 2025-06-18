"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs-extra"));
const progressUI_1 = require("./ui/progressUI");
const configPanel_1 = require("./ui/configPanel");
const nodeConverter_1 = require("./core/nodeConverter");
const yaml = __importStar(require("js-yaml"));
const path = __importStar(require("path"));
class AutoDependencyInstaller {
    constructor(context) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('Markdown to Word - 依赖安装');
    }
    checkAndInstallDependencies() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.outputChannel.show(true);
                this.outputChannel.appendLine('开始检查依赖环境...');
                const nodeSuccess = yield this.checkAndInstallNodeDependencies();
                if (nodeSuccess) {
                    this.outputChannel.appendLine('✅ 所有依赖安装完成！');
                    return true;
                }
                else {
                    this.outputChannel.appendLine('❌ Node.js 依赖安装失败');
                    return false;
                }
            }
            catch (error) {
                this.outputChannel.appendLine(`依赖安装过程中出现错误: ${error}`);
                return false;
            }
        });
    }
    checkAndInstallNodeDependencies() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.outputChannel.appendLine('🔍 检查 Node.js 依赖...');
                const nodeJsAvailable = yield this.checkNodeJsEnvironment();
                if (!nodeJsAvailable) {
                    this.outputChannel.appendLine('❌ Node.js 环境不可用，无法安装依赖');
                    this.outputChannel.appendLine('💡 请先安装 Node.js，然后重新启动编辑器');
                    return false;
                }
                const nodejsPath = path.join(this.context.extensionPath, 'nodejs');
                const packageJsonPath = path.join(nodejsPath, 'package.json');
                const nodeModulesPath = path.join(nodejsPath, 'node_modules');
                if (!(yield fs.pathExists(packageJsonPath))) {
                    this.outputChannel.appendLine('❌ 未找到 nodejs/package.json 文件');
                    return false;
                }
                const keyDependencies = [
                    'axios', 'fs-extra', 'docx', 'markdown-it', 'cheerio'
                ];
                let needsInstall = false;
                if (!(yield fs.pathExists(nodeModulesPath))) {
                    this.outputChannel.appendLine('📦 node_modules 目录不存在，需要安装依赖');
                    needsInstall = true;
                }
                else {
                    for (const dep of keyDependencies) {
                        const depPath = path.join(nodeModulesPath, dep);
                        if (!(yield fs.pathExists(depPath))) {
                            this.outputChannel.appendLine(`📦 缺少关键依赖: ${dep}`);
                            needsInstall = true;
                            break;
                        }
                    }
                }
                if (!needsInstall) {
                    this.outputChannel.appendLine('✅ Node.js 依赖已满足');
                    return true;
                }
                const packageManager = yield this.detectPackageManager();
                this.outputChannel.appendLine(`📦 使用包管理器: ${packageManager}`);
                this.outputChannel.appendLine('🚀 开始安装 Node.js 依赖...');
                let baseCommand;
                const portableNpmPath = this.getPortableNpmPath(packageManager);
                if (portableNpmPath) {
                    baseCommand = `"${portableNpmPath}"`;
                    this.outputChannel.appendLine(`📦 使用便携版 ${packageManager}: ${portableNpmPath}`);
                }
                else {
                    baseCommand = process.platform === 'win32' ? `${packageManager}.cmd` : packageManager;
                    this.outputChannel.appendLine(`📦 使用系统 ${packageManager}`);
                }
                let installCommand = `${baseCommand} install`;
                installCommand += ' --include=optional';
                this.outputChannel.appendLine('🔧 启用可选依赖安装以支持Sharp库和图像处理');
                if (process.platform === 'win32') {
                    this.outputChannel.appendLine('🪟 Windows环境：使用特殊配置确保Sharp库安装成功');
                }
                return new Promise((resolve) => {
                    const { exec } = require('child_process');
                    const execOptions = {
                        cwd: nodejsPath,
                        timeout: 300000,
                        maxBuffer: 1024 * 1024 * 10,
                        windowsHide: true,
                        env: Object.assign(Object.assign({}, process.env), { npm_config_optional: 'true' })
                    };
                    this.outputChannel.appendLine(`执行命令: ${installCommand}`);
                    exec(installCommand, execOptions, (error, stdout) => __awaiter(this, void 0, void 0, function* () {
                        if (error) {
                            this.outputChannel.appendLine(`❌ 安装失败: ${error.message}`);
                            this.outputChannel.appendLine('\n📋 手动安装指导:');
                            this.outputChannel.appendLine(`1. 打开终端/命令提示符`);
                            this.outputChannel.appendLine(`2. 切换到目录: cd "${nodejsPath}"`);
                            this.outputChannel.appendLine(`3. 运行安装命令: ${installCommand}`);
                            if (process.platform === 'win32') {
                                this.outputChannel.appendLine('\n🔧 Windows特殊说明:');
                                this.outputChannel.appendLine('- 如果Sharp库安装失败，请尝试:');
                                this.outputChannel.appendLine('  npm install --include=optional sharp');
                                this.outputChannel.appendLine('  或 npm install --os=win32 --cpu=x64 sharp');
                            }
                            resolve(false);
                        }
                        else {
                            this.outputChannel.appendLine('✅ Node.js 依赖安装成功');
                            if (stdout) {
                                const lines = stdout.split('\n').filter(line => line.includes('added') ||
                                    line.includes('installed') ||
                                    line.includes('warning') ||
                                    line.includes('error'));
                                if (lines.length > 0) {
                                    this.outputChannel.appendLine('安装摘要:');
                                    lines.forEach(line => this.outputChannel.appendLine(`  ${line.trim()}`));
                                }
                            }
                            const installSuccess = yield this.verifyInstallation();
                            if (installSuccess) {
                                yield this.ensureSharpInstallation(baseCommand);
                            }
                            resolve(installSuccess);
                        }
                    }));
                });
            }
            catch (error) {
                this.outputChannel.appendLine(`❌ Node.js依赖检查失败: ${error instanceof Error ? error.message : String(error)}`);
                return false;
            }
        });
    }
    checkNodeJsEnvironment() {
        return __awaiter(this, void 0, void 0, function* () {
            this.outputChannel.appendLine('🔍 检查 Node.js 环境...');
            try {
                const vscodeNodePath = yield this.getVSCodeNodePath();
                if (vscodeNodePath) {
                    this.outputChannel.appendLine(`✅ 使用 VS Code 内置 Node.js: ${vscodeNodePath}`);
                    return true;
                }
                const portableNodePath = this.getPortableNodePath();
                if (portableNodePath) {
                    this.outputChannel.appendLine(`✅ 使用便携版 Node.js: ${portableNodePath}`);
                    return true;
                }
                const nodeAvailable = yield this.checkCommandAvailable('node', '--version');
                if (nodeAvailable) {
                    this.outputChannel.appendLine('✅ 使用系统 Node.js');
                    return true;
                }
                this.outputChannel.appendLine('❌ 未找到任何可用的 Node.js 环境');
                if (process.platform === 'win32') {
                    this.outputChannel.appendLine('');
                    this.outputChannel.appendLine('🪟 Windows 环境检测结果:');
                    this.outputChannel.appendLine('  - VS Code 内置 Node.js: 检测到但不包含 npm/pnpm');
                    this.outputChannel.appendLine('  - 系统 Node.js: 未安装或未添加到 PATH');
                    this.outputChannel.appendLine('  - 便携版 Node.js: 未安装');
                    this.outputChannel.appendLine('');
                    this.outputChannel.appendLine('💡 解决方案: 需要安装完整的 Node.js 环境');
                }
                this.outputChannel.show(true);
                vscode.window.showErrorMessage('⚠️ 未检测到 Node.js 环境！插件无法正常工作。', '查看详情', '立即解决').then(selection => {
                    if (selection === '查看详情') {
                        this.outputChannel.show(true);
                    }
                    else if (selection === '立即解决') {
                        this.showNodeJsInstallDialog();
                    }
                });
                setTimeout(() => {
                    this.showNodeJsInstallDialog();
                }, 2000);
                return false;
            }
            catch (error) {
                this.outputChannel.appendLine(`❌ Node.js 环境检查失败: ${error instanceof Error ? error.message : String(error)}`);
                return false;
            }
        });
    }
    showNodeJsInstallDialog() {
        return __awaiter(this, void 0, void 0, function* () {
            const choice = yield vscode.window.showInformationMessage('🚀 Markdown to Word 插件需要 Node.js 环境才能正常工作。\n\n我们可以为您自动安装 Node.js，整个过程大约需要 2-5 分钟。\n\n注意：VS Code 本身包含 Node.js，但插件无法访问。我们需要安装独立的 Node.js 环境。', { modal: true }, '自动安装 Node.js', '手动安装', '取消');
            if (choice === '自动安装 Node.js') {
                this.outputChannel.appendLine('🚀 开始自动安装 Node.js...');
                const installSuccess = yield this.autoInstallNodeJs();
                if (installSuccess) {
                    this.outputChannel.appendLine('✅ Node.js 自动安装完成！');
                    vscode.window.showInformationMessage('🎉 Node.js 安装成功！插件现在可以正常使用了。');
                }
                else {
                    this.outputChannel.appendLine('❌ Node.js 自动安装失败，请尝试手动安装');
                    this.showManualInstallInstructions();
                }
            }
            else if (choice === '手动安装') {
                this.showManualInstallInstructions();
            }
            else {
                this.outputChannel.appendLine('用户取消了 Node.js 安装');
                vscode.window.showWarningMessage('插件需要 Node.js 才能正常工作。您可以稍后通过命令面板搜索 "检查依赖状态" 重新开始安装。', '了解更多').then(selection => {
                    if (selection === '了解更多') {
                        this.outputChannel.show(true);
                    }
                });
            }
        });
    }
    autoInstallNodeJs() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.outputChannel.appendLine('📥 正在下载便携版 Node.js...');
                return yield vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "正在安装 Node.js",
                    cancellable: false
                }, (progress) => __awaiter(this, void 0, void 0, function* () {
                    progress.report({ increment: 10, message: "检测系统信息..." });
                    const platform = process.platform;
                    const arch = process.arch;
                    this.outputChannel.appendLine(`系统平台: ${platform}`);
                    this.outputChannel.appendLine(`系统架构: ${arch}`);
                    const nodeVersion = 'v20.10.0';
                    const downloadUrl = this.getNodeJsDownloadUrl(nodeVersion, platform, arch);
                    if (!downloadUrl) {
                        this.outputChannel.appendLine('❌ 不支持的系统平台或架构');
                        return false;
                    }
                    this.outputChannel.appendLine(`下载地址: ${downloadUrl}`);
                    progress.report({ increment: 20, message: "下载 Node.js 安装包..." });
                    const nodeInstallDir = path.join(this.context.extensionPath, 'portable-nodejs');
                    yield fs.ensureDir(nodeInstallDir);
                    const downloadSuccess = yield this.downloadFile(downloadUrl, nodeInstallDir, progress);
                    if (!downloadSuccess) {
                        return false;
                    }
                    progress.report({ increment: 50, message: "安装便携版 Node.js..." });
                    const installSuccess = yield this.installPortableNodeJs(nodeInstallDir, platform, progress);
                    if (installSuccess) {
                        progress.report({ increment: 100, message: "安装完成！" });
                        yield this.updateNodeJsPath();
                        return true;
                    }
                    else {
                        return false;
                    }
                }));
            }
            catch (error) {
                this.outputChannel.appendLine(`❌ 自动安装失败: ${error instanceof Error ? error.message : String(error)}`);
                return false;
            }
        });
    }
    getNodeJsDownloadUrl(version, platform, arch) {
        const baseUrl = `https://nodejs.org/dist/${version}`;
        switch (platform) {
            case 'win32':
                const winArch = arch === 'x64' ? 'x64' : 'x86';
                return `${baseUrl}/node-${version}-win-${winArch}.zip`;
            case 'darwin':
                const macArch = arch === 'arm64' ? 'arm64' : 'x64';
                return `${baseUrl}/node-${version}-darwin-${macArch}.tar.gz`;
            case 'linux':
                const linuxArch = arch === 'arm64' ? 'arm64' : 'x64';
                return `${baseUrl}/node-${version}-linux-${linuxArch}.tar.xz`;
            default:
                return null;
        }
    }
    downloadFile(url, destDir, progress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const https = require('https');
                const fs = require('fs');
                const path = require('path');
                const fileName = path.basename(url);
                const filePath = path.join(destDir, fileName);
                return new Promise((resolve) => {
                    const file = fs.createWriteStream(filePath);
                    https.get(url, (response) => {
                        const totalSize = parseInt(response.headers['content-length'], 10);
                        let downloadedSize = 0;
                        response.pipe(file);
                        response.on('data', (chunk) => {
                            downloadedSize += chunk.length;
                            const downloadPercent = Math.round((downloadedSize / totalSize) * 100);
                            progress.report({
                                increment: 0,
                                message: `下载中... ${downloadPercent}%`
                            });
                        });
                        file.on('finish', () => {
                            file.close();
                            this.outputChannel.appendLine(`✅ 下载完成: ${filePath}`);
                            resolve(true);
                        });
                    }).on('error', (error) => {
                        this.outputChannel.appendLine(`❌ 下载失败: ${error.message}`);
                        resolve(false);
                    });
                });
            }
            catch (error) {
                this.outputChannel.appendLine(`❌ 下载过程出错: ${error instanceof Error ? error.message : String(error)}`);
                return false;
            }
        });
    }
    installPortableNodeJs(installDir, platform, progress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const path = require('path');
                const fs = require('fs');
                const files = yield fs.promises.readdir(installDir);
                const downloadedFile = files.find((file) => file.endsWith('.zip') || file.endsWith('.tar.gz') || file.endsWith('.tar.xz'));
                if (!downloadedFile) {
                    this.outputChannel.appendLine('❌ 找不到下载的安装文件');
                    return false;
                }
                const filePath = path.join(installDir, downloadedFile);
                this.outputChannel.appendLine(`📦 准备安装便携版: ${filePath}`);
                if (platform === 'win32') {
                    return yield this.extractPortableNodeJsWindows(filePath, installDir, progress);
                }
                else {
                    return yield this.extractPortableNodeJsUnix(filePath, installDir, progress);
                }
            }
            catch (error) {
                this.outputChannel.appendLine(`❌ 便携版安装过程出错: ${error instanceof Error ? error.message : String(error)}`);
                return false;
            }
        });
    }
    extractPortableNodeJsWindows(filePath, installDir, progress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { exec } = require('child_process');
                const path = require('path');
                progress.report({ message: "解压便携版安装包..." });
                const extractDir = path.join(installDir, 'extracted');
                yield fs.ensureDir(extractDir);
                const extractCommand = `powershell -command "Expand-Archive -Path '${filePath}' -DestinationPath '${extractDir}' -Force"`;
                return new Promise((resolve) => {
                    exec(extractCommand, (error) => __awaiter(this, void 0, void 0, function* () {
                        if (error) {
                            this.outputChannel.appendLine(`❌ 解压失败: ${error.message}`);
                            resolve(false);
                            return;
                        }
                        try {
                            const extractedDirs = yield fs.promises.readdir(extractDir);
                            const nodeDir = extractedDirs.find((dir) => dir.startsWith('node-'));
                            if (!nodeDir) {
                                this.outputChannel.appendLine('❌ 找不到Node.js目录');
                                resolve(false);
                                return;
                            }
                            const nodePath = path.join(extractDir, nodeDir);
                            const finalNodePath = path.join(installDir, 'node');
                            progress.report({ message: "整理文件结构..." });
                            yield fs.move(nodePath, finalNodePath, { overwrite: true });
                            yield fs.remove(extractDir);
                            yield fs.remove(filePath);
                            this.outputChannel.appendLine('✅ 便携版 Node.js 安装完成');
                            resolve(true);
                        }
                        catch (err) {
                            this.outputChannel.appendLine(`❌ 文件处理出错: ${err}`);
                            resolve(false);
                        }
                    }));
                });
            }
            catch (error) {
                this.outputChannel.appendLine(`❌ Windows便携版安装失败: ${error instanceof Error ? error.message : String(error)}`);
                return false;
            }
        });
    }
    extractPortableNodeJsUnix(filePath, installDir, progress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { exec } = require('child_process');
                const path = require('path');
                progress.report({ message: "解压便携版安装包..." });
                const extractCommand = filePath.endsWith('.tar.gz')
                    ? `tar -xzf "${filePath}" -C "${installDir}"`
                    : `tar -xJf "${filePath}" -C "${installDir}"`;
                return new Promise((resolve) => {
                    exec(extractCommand, (error) => __awaiter(this, void 0, void 0, function* () {
                        if (error) {
                            this.outputChannel.appendLine(`❌ 解压失败: ${error.message}`);
                            resolve(false);
                            return;
                        }
                        try {
                            const dirs = yield fs.promises.readdir(installDir);
                            const nodeDir = dirs.find((dir) => dir.startsWith('node-') &&
                                !dir.endsWith('.tar.gz') &&
                                !dir.endsWith('.tar.xz') &&
                                !dir.endsWith('.zip'));
                            if (!nodeDir) {
                                this.outputChannel.appendLine('❌ 找不到Node.js目录');
                                resolve(false);
                                return;
                            }
                            const nodePath = path.join(installDir, nodeDir);
                            const finalNodePath = path.join(installDir, 'node');
                            progress.report({ message: "整理文件结构..." });
                            yield fs.move(nodePath, finalNodePath, { overwrite: true });
                            yield fs.remove(filePath);
                            this.outputChannel.appendLine('✅ 便携版 Node.js 安装完成');
                            resolve(true);
                        }
                        catch (err) {
                            this.outputChannel.appendLine(`❌ 文件处理出错: ${err}`);
                            resolve(false);
                        }
                    }));
                });
            }
            catch (error) {
                this.outputChannel.appendLine(`❌ Unix便携版安装失败: ${error instanceof Error ? error.message : String(error)}`);
                return false;
            }
        });
    }
    updateNodeJsPath() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const nodeInstallDir = path.join(this.context.extensionPath, 'portable-nodejs', 'node');
                const nodeBinDir = path.join(nodeInstallDir, 'bin');
                const nodeExePath = process.platform === 'win32'
                    ? path.join(nodeInstallDir, 'node.exe')
                    : path.join(nodeBinDir, 'node');
                if (yield fs.pathExists(nodeExePath)) {
                    const currentPath = process.env.PATH || '';
                    const newPath = process.platform === 'win32'
                        ? `${nodeInstallDir};${currentPath}`
                        : `${nodeBinDir}:${currentPath}`;
                    process.env.PATH = newPath;
                    this.outputChannel.appendLine(`✅ 便携版 Node.js 路径已配置: ${nodeExePath}`);
                    this.outputChannel.appendLine('🔄 请重启编辑器以确保环境变量生效');
                    const restartChoice = yield vscode.window.showInformationMessage('🎉 Node.js 安装完成！\n\n为了确保插件正常工作，建议重启编辑器。', '立即重启', '稍后重启');
                    if (restartChoice === '立即重启') {
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                }
                else {
                    this.outputChannel.appendLine(`❌ 找不到Node.js可执行文件: ${nodeExePath}`);
                }
            }
            catch (error) {
                this.outputChannel.appendLine(`❌ 配置Node.js路径失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    showManualInstallInstructions() {
        this.outputChannel.appendLine('\n📋 手动安装 Node.js 详细步骤:');
        this.outputChannel.appendLine('');
        if (process.platform === 'win32') {
            this.outputChannel.appendLine('🪟 Windows 系统安装步骤:');
            this.outputChannel.appendLine('1. 📥 下载 Node.js:');
            this.outputChannel.appendLine('   - 访问：https://nodejs.org/');
            this.outputChannel.appendLine('   - 点击左侧绿色按钮下载 LTS 版本（推荐）');
            this.outputChannel.appendLine('   - 文件名类似：node-v20.x.x-x64.msi');
            this.outputChannel.appendLine('');
            this.outputChannel.appendLine('2. 🔧 安装 Node.js:');
            this.outputChannel.appendLine('   - 双击下载的 .msi 文件');
            this.outputChannel.appendLine('   - 一路点击 "Next"');
            this.outputChannel.appendLine('   - ⚠️ 重要：确保勾选 "Add to PATH" 选项');
            this.outputChannel.appendLine('   - 点击 "Install" 完成安装');
            this.outputChannel.appendLine('');
            this.outputChannel.appendLine('3. 🔄 重启系统:');
            this.outputChannel.appendLine('   - 安装完成后重启计算机');
            this.outputChannel.appendLine('   - 这确保环境变量生效');
            this.outputChannel.appendLine('');
            this.outputChannel.appendLine('4. ✅ 验证安装:');
            this.outputChannel.appendLine('   - 按 Win+R，输入 cmd，按回车');
            this.outputChannel.appendLine('   - 输入：node --version');
            this.outputChannel.appendLine('   - 输入：npm --version');
            this.outputChannel.appendLine('   - 如果显示版本号，说明安装成功');
            this.outputChannel.appendLine('');
            this.outputChannel.appendLine('5. 🔄 重启编辑器:');
            this.outputChannel.appendLine('   - 完全关闭 VS Code/Cursor');
            this.outputChannel.appendLine('   - 重新启动编辑器');
            this.outputChannel.appendLine('   - 插件将自动检测新安装的 Node.js');
            this.outputChannel.appendLine('');
            this.outputChannel.appendLine('🚨 常见问题解决:');
            this.outputChannel.appendLine('- 如果命令提示符中 node --version 失败：');
            this.outputChannel.appendLine('  1. 确认安装时勾选了 "Add to PATH"');
            this.outputChannel.appendLine('  2. 重启计算机');
            this.outputChannel.appendLine('  3. 如果还不行，重新安装 Node.js');
            this.outputChannel.appendLine('- 如果插件仍然无法工作：');
            this.outputChannel.appendLine('  1. 在命令面板中搜索 "检查依赖状态"');
            this.outputChannel.appendLine('  2. 查看详细的检测结果');
            this.outputChannel.appendLine('  3. 如有问题，截图报告给开发者');
        }
        else {
            this.outputChannel.appendLine('🍎 macOS/Linux 系统安装步骤:');
            this.outputChannel.appendLine('1. 访问 Node.js 官网：https://nodejs.org/');
            this.outputChannel.appendLine('2. 下载并安装 LTS 版本（推荐）');
            this.outputChannel.appendLine('3. 安装完成后重启终端');
            this.outputChannel.appendLine('4. 运行：node --version 验证安装');
            this.outputChannel.appendLine('5. 重新打开编辑器');
        }
        this.outputChannel.show(true);
        vscode.window.showInformationMessage(`📋 已为您准备了详细的 ${process.platform === 'win32' ? 'Windows' : 'macOS/Linux'} 安装指导，请查看输出窗口。\n\n安装完成后，请重启编辑器。`, '打开 Node.js 官网', '查看详细步骤').then(selection => {
            if (selection === '打开 Node.js 官网') {
                vscode.env.openExternal(vscode.Uri.parse('https://nodejs.org/'));
            }
            else if (selection === '查看详细步骤') {
                this.outputChannel.show(true);
            }
        });
    }
    checkCommandAvailable(command, args) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                const { exec } = require('child_process');
                if (command === 'node') {
                    const portableNodePath = this.getPortableNodePath();
                    if (portableNodePath) {
                        const portableCommand = `"${portableNodePath}" ${args}`;
                        const execOptions = {
                            timeout: 10000,
                            windowsHide: true,
                            env: Object.assign({}, process.env)
                        };
                        exec(portableCommand, execOptions, (error, stdout) => {
                            if (!error && stdout) {
                                this.outputChannel.appendLine(`  ${command} (便携版) 版本: ${stdout.trim()}`);
                                resolve(true);
                                return;
                            }
                            this.checkSystemCommand(command, args, resolve);
                        });
                        return;
                    }
                }
                if (['npm', 'pnpm', 'yarn'].includes(command)) {
                    const portableNpmPath = this.getPortableNpmPath(command);
                    if (portableNpmPath) {
                        const portableCommand = `"${portableNpmPath}" ${args}`;
                        const execOptions = {
                            timeout: 10000,
                            windowsHide: true,
                            env: Object.assign({}, process.env)
                        };
                        exec(portableCommand, execOptions, (error, stdout) => {
                            if (!error && stdout) {
                                this.outputChannel.appendLine(`  ${command} (便携版) 版本: ${stdout.trim()}`);
                                resolve(true);
                                return;
                            }
                            this.checkSystemCommand(command, args, resolve);
                        });
                        return;
                    }
                }
                this.checkSystemCommand(command, args, resolve);
            });
        });
    }
    getVSCodeNodePath() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const possiblePaths = [
                    process.env.CURSOR_NODE_PATH,
                    process.env.VSCODE_NODE_PATH,
                    process.execPath.replace(/cursor|code/, 'node'),
                    path.join(process.env.VSCODE_PATH || '', 'node'),
                    path.join(process.env.CURSOR_PATH || '', 'node'),
                ].filter(Boolean);
                for (const nodePath of possiblePaths) {
                    if (nodePath && fs.existsSync(nodePath)) {
                        try {
                            const { exec } = require('child_process');
                            yield new Promise((resolve, reject) => {
                                exec(`"${nodePath}" --version`, { timeout: 5000 }, (error) => {
                                    if (error)
                                        reject(error);
                                    else
                                        resolve();
                                });
                            });
                            return nodePath;
                        }
                        catch (_a) {
                            continue;
                        }
                    }
                }
            }
            catch (error) {
            }
            return null;
        });
    }
    getPortableNodePath() {
        try {
            const nodeInstallDir = path.join(this.context.extensionPath, 'portable-nodejs', 'node');
            const nodeExePath = process.platform === 'win32'
                ? path.join(nodeInstallDir, 'node.exe')
                : path.join(nodeInstallDir, 'bin', 'node');
            const fs = require('fs');
            if (fs.existsSync(nodeExePath)) {
                return nodeExePath;
            }
        }
        catch (error) {
        }
        return null;
    }
    getPortableNpmPath(command) {
        try {
            const nodeInstallDir = path.join(this.context.extensionPath, 'portable-nodejs', 'node');
            let cmdPath;
            if (process.platform === 'win32') {
                cmdPath = path.join(nodeInstallDir, `${command}.cmd`);
            }
            else {
                cmdPath = path.join(nodeInstallDir, 'bin', command);
            }
            const fs = require('fs');
            if (fs.existsSync(cmdPath)) {
                return cmdPath;
            }
        }
        catch (error) {
        }
        return null;
    }
    checkSystemCommand(command, args, resolve) {
        const { exec } = require('child_process');
        const fullCommand = process.platform === 'win32' ? `${command}.exe ${args}` : `${command} ${args}`;
        const execOptions = {
            timeout: 10000,
            windowsHide: true,
            env: Object.assign({}, process.env)
        };
        exec(fullCommand, execOptions, (error, stdout) => {
            if (!error && stdout) {
                this.outputChannel.appendLine(`  ${command} 版本: ${stdout.trim()}`);
                resolve(true);
            }
            else {
                this.outputChannel.appendLine(`  ${command} 不可用: ${(error === null || error === void 0 ? void 0 : error.message) || '未知错误'}`);
                resolve(false);
            }
        });
    }
    ensureSharpInstallation(packageManagerCommand) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const nodejsPath = path.join(this.context.extensionPath, 'nodejs');
                const nodeModulesPath = path.join(nodejsPath, 'node_modules');
                const sharpPath = path.join(nodeModulesPath, 'sharp');
                if (yield fs.pathExists(sharpPath)) {
                    this.outputChannel.appendLine('✅ Sharp 库已安装');
                    return;
                }
                this.outputChannel.appendLine('🔧 Sharp 库未安装，开始强制安装...');
                const installMethods = [
                    `${packageManagerCommand} add sharp`,
                    `${packageManagerCommand} add sharp --force`,
                    process.platform === 'win32'
                        ? `${packageManagerCommand} add sharp --platform=win32 --arch=x64`
                        : `${packageManagerCommand} add sharp`,
                    `${packageManagerCommand} add sharp --install-strategy=nested`
                ];
                for (const [index, command] of installMethods.entries()) {
                    this.outputChannel.appendLine(`🚀 尝试方法 ${index + 1}: ${command}`);
                    const success = yield new Promise((resolve) => {
                        const { exec } = require('child_process');
                        const execOptions = {
                            cwd: nodejsPath,
                            timeout: 180000,
                            windowsHide: true,
                            env: Object.assign({}, process.env)
                        };
                        exec(command, execOptions, (error, stdout, stderr) => __awaiter(this, void 0, void 0, function* () {
                            if (error) {
                                this.outputChannel.appendLine(`❌ 方法 ${index + 1} 失败: ${error.message}`);
                                if (stderr) {
                                    this.outputChannel.appendLine(`错误详情: ${stderr.slice(0, 200)}...`);
                                }
                                resolve(false);
                            }
                            else {
                                const installed = yield fs.pathExists(sharpPath);
                                if (installed) {
                                    this.outputChannel.appendLine(`✅ 方法 ${index + 1} 成功安装 Sharp`);
                                    if (stdout) {
                                        this.outputChannel.appendLine(`安装输出: ${stdout.slice(0, 200)}...`);
                                    }
                                    resolve(true);
                                }
                                else {
                                    this.outputChannel.appendLine(`❌ 方法 ${index + 1} 安装命令成功但Sharp仍不可用`);
                                    resolve(false);
                                }
                            }
                        }));
                    });
                    if (success) {
                        this.outputChannel.appendLine('🎉 Sharp 库安装成功！现在支持 SVG 图表和图像处理');
                        return;
                    }
                }
                this.outputChannel.appendLine('⚠️ Sharp 库安装失败，但这不会影响核心功能');
                this.outputChannel.appendLine('💡 建议：将 SVG 图表转换为 PNG 格式后再使用');
            }
            catch (error) {
                this.outputChannel.appendLine(`❌ Sharp 安装过程出错: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    verifyInstallation() {
        return __awaiter(this, void 0, void 0, function* () {
            const nodejsPath = path.join(this.context.extensionPath, 'nodejs');
            const nodeModulesPath = path.join(nodejsPath, 'node_modules');
            const keyDependencies = [
                'axios', 'fs-extra', 'docx', 'markdown-it', 'cheerio'
            ];
            let allInstalled = true;
            this.outputChannel.appendLine('\n🔍 验证安装结果:');
            for (const dep of keyDependencies) {
                const depPath = path.join(nodeModulesPath, dep);
                const exists = yield fs.pathExists(depPath);
                this.outputChannel.appendLine(`  ${dep}: ${exists ? '✅' : '❌'}`);
                if (!exists) {
                    allInstalled = false;
                }
            }
            const sharpPath = path.join(nodeModulesPath, 'sharp');
            const sharpExists = yield fs.pathExists(sharpPath);
            this.outputChannel.appendLine(`  sharp (重要): ${sharpExists ? '✅' : '❌ 将尝试强制安装'}`);
            return allInstalled;
        });
    }
    detectPackageManager() {
        return __awaiter(this, void 0, void 0, function* () {
            this.outputChannel.appendLine('🔍 检测包管理器...');
            this.outputChannel.appendLine('🚀 pnpm 是最佳选择，优先检测和安装 pnpm...');
            const pnpmAvailable = yield this.checkPackageManagerAvailable('pnpm');
            if (pnpmAvailable) {
                this.outputChannel.appendLine('✅ pnpm 已可用');
                return 'pnpm';
            }
            this.outputChannel.appendLine('📦 pnpm 不可用，尝试自动安装...');
            const pnpmInstalled = yield this.installPnpm();
            if (pnpmInstalled) {
                this.outputChannel.appendLine('✅ pnpm 安装成功');
                return 'pnpm';
            }
            this.outputChannel.appendLine('⚠️ pnpm 安装失败，检查其他包管理器...');
            const packageManagers = ['yarn', 'npm'];
            for (const manager of packageManagers) {
                try {
                    const nodejsPath = path.join(this.context.extensionPath, 'nodejs');
                    const lockFiles = {
                        'yarn': 'yarn.lock',
                        'npm': 'package-lock.json'
                    };
                    const lockFile = path.join(nodejsPath, lockFiles[manager]);
                    if (yield fs.pathExists(lockFile)) {
                        this.outputChannel.appendLine(`找到 ${lockFiles[manager]}，优先使用 ${manager}`);
                        const isAvailable = yield this.checkPackageManagerAvailable(manager);
                        if (isAvailable) {
                            return manager;
                        }
                        else {
                            this.outputChannel.appendLine(`⚠️ ${manager} 不可用，尝试下一个包管理器`);
                        }
                    }
                    const isAvailable = yield this.checkPackageManagerAvailable(manager);
                    if (isAvailable) {
                        this.outputChannel.appendLine(`✅ ${manager} 可用`);
                        return manager;
                    }
                }
                catch (error) {
                    this.outputChannel.appendLine(`❌ ${manager} 检测失败: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            this.outputChannel.appendLine('⚠️ 未找到可用的包管理器，使用默认的 npm');
            return 'npm';
        });
    }
    installPnpm() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.outputChannel.appendLine('🚀 开始安装 pnpm...');
                let npmCommand;
                const portableNpmPath = this.getPortableNpmPath('npm');
                if (portableNpmPath) {
                    npmCommand = `"${portableNpmPath}"`;
                    this.outputChannel.appendLine(`📦 使用便携版 npm 安装 pnpm: ${portableNpmPath}`);
                }
                else {
                    npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
                    this.outputChannel.appendLine(`📦 使用系统 npm 安装 pnpm`);
                }
                return new Promise((resolve) => {
                    const { exec } = require('child_process');
                    const installCommand = `${npmCommand} install -g pnpm`;
                    this.outputChannel.appendLine(`执行命令: ${installCommand}`);
                    const execOptions = {
                        timeout: 120000,
                        windowsHide: true,
                        env: Object.assign({}, process.env)
                    };
                    exec(installCommand, execOptions, (error, stdout, stderr) => {
                        if (error) {
                            this.outputChannel.appendLine(`❌ pnpm 安装失败: ${error.message}`);
                            if (stderr) {
                                this.outputChannel.appendLine(`错误详情: ${stderr}`);
                            }
                            resolve(false);
                        }
                        else {
                            this.outputChannel.appendLine('✅ pnpm 安装成功');
                            if (stdout) {
                                this.outputChannel.appendLine(`安装输出: ${stdout.trim()}`);
                            }
                            resolve(true);
                        }
                    });
                });
            }
            catch (error) {
                this.outputChannel.appendLine(`❌ pnpm 安装过程出错: ${error instanceof Error ? error.message : String(error)}`);
                return false;
            }
        });
    }
    checkPackageManagerAvailable(manager) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.checkCommandAvailable(manager, '--version');
        });
    }
    checkDependencyStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            this.outputChannel.show(true);
            this.outputChannel.appendLine('=== 依赖状态检查 ===');
            yield this.checkNodeDependencyStatus();
            this.outputChannel.appendLine('=== 检查完成 ===');
        });
    }
    checkNodeDependencyStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            this.outputChannel.appendLine('\n📦 Node.js 依赖状态:');
            const nodejsPath = path.join(this.context.extensionPath, 'nodejs');
            const packageJsonPath = path.join(nodejsPath, 'package.json');
            const nodeModulesPath = path.join(nodejsPath, 'node_modules');
            this.outputChannel.appendLine(`- nodejs 目录: ${(yield fs.pathExists(nodejsPath)) ? '✅' : '❌'}`);
            this.outputChannel.appendLine(`- package.json: ${(yield fs.pathExists(packageJsonPath)) ? '✅' : '❌'}`);
            this.outputChannel.appendLine(`- node_modules: ${(yield fs.pathExists(nodeModulesPath)) ? '✅' : '❌'}`);
            const keyDependencies = [
                'axios', 'fs-extra', 'docx', 'markdown-it', 'cheerio',
                'js-yaml', 'yargs', 'inquirer'
            ];
            this.outputChannel.appendLine('\n关键依赖检查:');
            for (const dep of keyDependencies) {
                const depPath = path.join(nodeModulesPath, dep);
                const exists = yield fs.pathExists(depPath);
                this.outputChannel.appendLine(`  ${dep}: ${exists ? '✅' : '❌'}`);
            }
            const packageManager = yield this.detectPackageManager();
            this.outputChannel.appendLine(`\n包管理器: ${packageManager}`);
        });
    }
    dispose() {
        this.outputChannel.dispose();
    }
}
function checkMarketplaceInstall(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const marketplaceCompleted = context.globalState.get('marketplaceInstallCompleted', false);
        if (marketplaceCompleted) {
            return false;
        }
        const dependenciesInstalled = context.globalState.get('dependenciesInstalled', false);
        const lastInstallTime = context.globalState.get('lastInstallTime', 0);
        if (!dependenciesInstalled && lastInstallTime === 0) {
            const extensionPath = context.extensionPath;
            const nodejsPath = path.join(extensionPath, 'nodejs');
            const nodeModulesPath = path.join(nodejsPath, 'node_modules');
            if (!fs.existsSync(nodeModulesPath)) {
                return true;
            }
        }
        return false;
    });
}
function shouldRunDependencyInstall(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const dependenciesInstalled = context.globalState.get('dependenciesInstalled', false);
        const lastInstallTime = context.globalState.get('lastInstallTime', 0);
        if (!dependenciesInstalled) {
            return true;
        }
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        if (lastInstallTime < thirtyDaysAgo) {
            return true;
        }
        const nodejsPath = path.join(context.extensionPath, 'nodejs');
        const nodeModulesPath = path.join(nodejsPath, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            return true;
        }
        const keyDependencies = ['axios', 'fs-extra', 'docx', 'markdown-it', 'cheerio'];
        for (const dep of keyDependencies) {
            const depPath = path.join(nodeModulesPath, dep);
            if (!fs.existsSync(depPath)) {
                return true;
            }
        }
        return false;
    });
}
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('插件 "Markdown to Word Converter" 正在激活...');
        const isMarketplaceInstall = yield checkMarketplaceInstall(context);
        if (isMarketplaceInstall) {
            console.log('检测到从插件市场安装，执行特殊初始化...');
            vscode.window.showInformationMessage('🎉 欢迎使用 Markdown to Word 插件！\n\n插件正在初始化环境，首次使用需要安装依赖包，请稍候...', '了解更多').then(selection => {
                if (selection === '了解更多') {
                    vscode.env.openExternal(vscode.Uri.parse('https://github.com/YaYII/md_To_Html_To_World/blob/main/vscode-extension/README.md'));
                }
            });
        }
        const dependencyInstaller = new AutoDependencyInstaller(context);
        const needsInstall = yield shouldRunDependencyInstall(context);
        if (needsInstall) {
            console.log('检测到需要安装依赖，开始自动安装...');
            const installSuccess = yield dependencyInstaller.checkAndInstallDependencies();
            if (installSuccess) {
                yield context.globalState.update('dependenciesInstalled', true);
                yield context.globalState.update('lastInstallTime', Date.now());
                yield context.globalState.update('marketplaceInstallCompleted', true);
            }
            else {
                console.warn('依赖安装失败，插件可能无法正常工作');
            }
        }
        else {
            console.log('依赖已安装，跳过自动安装过程');
        }
        context.subscriptions.push(dependencyInstaller);
        const converter = nodeConverter_1.NodeMarkdownConverter.getInstance();
        const progressUI = progressUI_1.ProgressUI.getInstance();
        function handleCommandLineArgs() {
            return __awaiter(this, void 0, void 0, function* () {
                const args = process.argv;
                console.log('命令行参数:', args);
                const mdFilePaths = [];
                for (const arg of args) {
                    try {
                        const decodedArg = decodeURIComponent(arg);
                        if (decodedArg.toLowerCase().endsWith('.md')) {
                            try {
                                const normalizedPath = path.normalize(decodedArg);
                                console.log(`找到可能的Markdown文件路径: ${normalizedPath}`);
                                mdFilePaths.push(normalizedPath);
                            }
                            catch (e) {
                                console.log(`无法规范化路径 ${decodedArg}，使用原始路径`);
                                mdFilePaths.push(decodedArg);
                            }
                        }
                    }
                    catch (e) {
                        if (arg.toLowerCase().endsWith('.md')) {
                            console.log(`找到可能的Markdown文件路径(未解码): ${arg}`);
                            mdFilePaths.push(arg);
                        }
                    }
                }
                if (mdFilePaths.length > 0) {
                    console.log('检测到命令行启动并传入Markdown文件:', mdFilePaths);
                    for (const mdFilePath of mdFilePaths) {
                        try {
                            console.log(`检查文件是否存在: ${mdFilePath}`);
                            if (!fs.existsSync(mdFilePath)) {
                                console.error(`文件不存在: ${mdFilePath}`);
                                continue;
                            }
                            console.log('获取用户配置...');
                            const userConfig = getUserConfig();
                            yield progressUI.withProgress(`转换文件: ${path.basename(mdFilePath)}`, (progress) => __awaiter(this, void 0, void 0, function* () {
                                progress.report({ message: '执行转换...' });
                                console.log(`开始转换文件: ${mdFilePath}`);
                                console.log('使用配置:', JSON.stringify({
                                    fonts: userConfig.fonts,
                                    document: userConfig.document,
                                    chinese: userConfig.chinese
                                }, null, 2));
                                const outputDir = path.dirname(mdFilePath);
                                yield fs.ensureDir(outputDir);
                                const result = yield converter.convert(mdFilePath, {
                                    showProgress: true,
                                    useConfig: userConfig,
                                    keepHtml: false,
                                    onComplete: (conversionResult) => {
                                        if (conversionResult.success && conversionResult.outputFile) {
                                            progressUI.showSuccess(conversionResult.message, conversionResult.outputFile);
                                        }
                                    }
                                });
                                progress.report({ message: '转换完成！' });
                                yield progressUI.showSuccess('Markdown 文件已成功转换为 Word 文档！', result.outputFile);
                                try {
                                    if (result.outputFile) {
                                        const uri = vscode.Uri.file(result.outputFile);
                                        yield vscode.commands.executeCommand('vscode.open', uri);
                                    }
                                }
                                catch (openError) {
                                    console.error('无法打开生成的文件:', openError);
                                }
                            }));
                        }
                        catch (error) {
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            console.error(`转换文件 ${mdFilePath} 失败:`, errorMessage);
                            yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                        }
                    }
                }
            });
        }
        yield handleCommandLineArgs();
        function getUserConfig() {
            try {
                const converter = nodeConverter_1.NodeMarkdownConverter.getInstance();
                const configFilePath = converter.getConfigFilePath();
                console.log('尝试从统一配置文件加载:', configFilePath);
                if (fs.existsSync(configFilePath)) {
                    try {
                        const configContent = fs.readFileSync(configFilePath, 'utf8');
                        const config = yaml.load(configContent);
                        if (config && typeof config === 'object' && config.fonts && config.sizes) {
                            console.log('成功从统一配置文件加载配置');
                            return config;
                        }
                    }
                    catch (error) {
                        console.error('读取配置文件失败:', error);
                    }
                }
                const vscodeConfig = vscode.workspace.getConfiguration('markdown-to-word');
                const userConfig = vscodeConfig.get('markdownToWordUserConfig');
                if (userConfig && typeof userConfig === 'object' && userConfig.fonts && userConfig.sizes) {
                    console.log('从VS Code设置加载配置');
                    return userConfig;
                }
                console.log('使用默认配置');
                const defaultConfig = {
                    fonts: {
                        default: vscodeConfig.get('defaultFontFamily') || '微软雅黑',
                        code: 'Courier New',
                        headings: vscodeConfig.get('defaultFontFamily') || '微软雅黑'
                    },
                    sizes: {
                        default: vscodeConfig.get('defaultFontSize') || 12,
                        code: (vscodeConfig.get('defaultFontSize') || 12) - 2,
                        heading1: 18,
                        heading2: 16,
                        heading3: 14,
                        heading4: 12,
                        heading5: 12,
                        heading6: 12
                    },
                    colors: {
                        default: '#000000',
                        headings: '#000000',
                        code: '#333333',
                        link: '#0563C1'
                    },
                    paragraph: {
                        line_spacing: vscodeConfig.get('defaultLineSpacing') || 1.5,
                        space_before: 0,
                        space_after: 6,
                        first_line_indent: 0
                    },
                    document: {
                        page_size: vscodeConfig.get('defaultPageSize') || 'A4',
                        margin_top: 2.54,
                        margin_bottom: 2.54,
                        margin_left: 3.18,
                        margin_right: 3.18,
                        generate_toc: vscodeConfig.get('includeToc') || false,
                        show_horizontal_rules: true,
                        header: '',
                        footer: ''
                    },
                    chinese: {
                        convert_to_traditional: false,
                        punctuation_spacing: false,
                        auto_spacing: false
                    },
                    table_styles: {
                        even_row_color: '#FFFFFF',
                        odd_row_color: '#F2F2F2',
                        header_bg_color: '#DDDDDD',
                        border_color: '#000000',
                        cell_height: 'auto',
                        table_width: '100%'
                    },
                    enhanced_table_styles: {
                        style: 'default',
                        width: 100,
                        border: true,
                        border_size: 1,
                        border_color: '#000000',
                        header_bg_color: '#DDDDDD',
                        even_row_color: '#FFFFFF',
                        text_align: 'left',
                        vertical_align: 'middle',
                        cell_padding: 5,
                        cell_height: 20,
                        autofit: true,
                        first_row_as_header: true,
                        keep_header_visible: true,
                        row_height: {
                            default: 20,
                            header: 24,
                            min: 10,
                            max: 100,
                            auto_adjust: true
                        }
                    },
                    markdown: {
                        extensions: ['extra', 'tables', 'toc', 'fenced_code'],
                        extension_configs: {
                            codehilite: {
                                linenums: false,
                                use_pygments: false
                            }
                        }
                    },
                    output: {
                        keepHtml: vscodeConfig.get('keepHtml') || false
                    },
                    debug: {
                        enabled: false,
                        log_level: 'info',
                        log_to_file: false,
                        log_file: '',
                        print_html_structure: false,
                        verbose_element_info: false,
                        timing: false
                    }
                };
                converter.saveConfig(defaultConfig)
                    .then(() => console.log('默认配置已保存'))
                    .catch((err) => console.error('保存默认配置失败:', err));
                return defaultConfig;
            }
            catch (error) {
                console.error('获取配置失败:', error);
                return {
                    fonts: { default: '微软雅黑', code: 'Courier New', headings: '微软雅黑' },
                    sizes: {
                        default: 12, code: 10, heading1: 18, heading2: 16,
                        heading3: 14, heading4: 12, heading5: 12, heading6: 12
                    },
                    colors: { default: '#000000', headings: '#000000', code: '#333333', link: '#0563C1' },
                    paragraph: { line_spacing: 1.5, space_before: 0, space_after: 6, first_line_indent: 0 },
                    document: {
                        page_size: 'A4', margin_top: 2.54, margin_bottom: 2.54,
                        margin_left: 3.18, margin_right: 3.18,
                        generate_toc: false, show_horizontal_rules: true, header: '', footer: ''
                    },
                    chinese: { convert_to_traditional: false, punctuation_spacing: false, auto_spacing: false },
                    table_styles: {
                        even_row_color: '#FFFFFF', odd_row_color: '#F2F2F2',
                        header_bg_color: '#DDDDDD', border_color: '#000000',
                        cell_height: 'auto', table_width: '100%'
                    },
                    enhanced_table_styles: {
                        style: 'default', width: 100, border: true, border_size: 1,
                        border_color: '#000000', header_bg_color: '#DDDDDD',
                        even_row_color: '#FFFFFF', text_align: 'left',
                        vertical_align: 'middle', cell_padding: 5,
                        cell_height: 20, autofit: true,
                        first_row_as_header: true, keep_header_visible: true,
                        row_height: {
                            default: 20, header: 24, min: 10, max: 100, auto_adjust: true
                        }
                    },
                    markdown: {
                        extensions: ['extra', 'tables', 'toc', 'fenced_code'],
                        extension_configs: {
                            codehilite: {
                                linenums: false,
                                use_pygments: false
                            }
                        }
                    },
                    output: { keepHtml: false },
                    debug: {
                        enabled: false, log_level: 'info', log_to_file: false,
                        log_file: '', print_html_structure: false,
                        verbose_element_info: false, timing: false
                    }
                };
            }
        }
        const commands = [
            vscode.commands.registerCommand('markdowntoword.markdown-to-word.convert', (uri) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const filePath = (uri === null || uri === void 0 ? void 0 : uri.fsPath) || ((_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.uri.fsPath);
                if (filePath && filePath.endsWith('.md')) {
                    configPanel_1.ConfigPanel.createOrShow(context.extensionPath, filePath, (config, cancelled) => __awaiter(this, void 0, void 0, function* () {
                        if (!cancelled) {
                            try {
                                const userConfig = config;
                                yield progressUI.withProgress(`转换文件: ${path.basename(filePath)}`, (progress) => __awaiter(this, void 0, void 0, function* () {
                                    progress.report({ message: '执行转换...' });
                                    const result = yield converter.convert(filePath, {
                                        showProgress: true,
                                        useConfig: userConfig,
                                        keepHtml: false
                                    });
                                    yield progressUI.showSuccess('Markdown 文件已成功转换为 Word 文档！', result.outputFile);
                                }));
                            }
                            catch (error) {
                                yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                            }
                        }
                    }));
                }
                else {
                    vscode.window.showErrorMessage('请选择一个Markdown文件');
                }
            })),
            vscode.commands.registerCommand('markdowntoword.markdown-to-word.convertDirect', (uri) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const filePath = (uri === null || uri === void 0 ? void 0 : uri.fsPath) || ((_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.uri.fsPath);
                if (filePath && filePath.endsWith('.md')) {
                    try {
                        const userConfig = getUserConfig();
                        yield progressUI.withProgress(`转换文件: ${path.basename(filePath)}`, (progress) => __awaiter(this, void 0, void 0, function* () {
                            progress.report({ message: '执行转换...' });
                            const result = yield converter.convert(filePath, {
                                showProgress: true,
                                useConfig: userConfig,
                                keepHtml: false
                            });
                            yield progressUI.showSuccess('Markdown 文件已成功转换为 Word 文档！', result.outputFile);
                        }));
                    }
                    catch (error) {
                        yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                    }
                }
                else {
                    vscode.window.showErrorMessage('请选择一个Markdown文件');
                }
            })),
            vscode.commands.registerCommand('markdowntoword.markdown-to-word.convertToHtml', (uri) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const filePath = (uri === null || uri === void 0 ? void 0 : uri.fsPath) || ((_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.uri.fsPath);
                if (filePath && filePath.endsWith('.md')) {
                    try {
                        yield progressUI.withProgress(`转换文件: ${path.basename(filePath)}`, (progress) => __awaiter(this, void 0, void 0, function* () {
                            progress.report({ message: '执行HTML转换...' });
                            vscode.window.showInformationMessage('HTML转换功能暂未实现，将在后续版本中提供');
                        }));
                    }
                    catch (error) {
                        yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                    }
                }
                else {
                    vscode.window.showErrorMessage('请选择一个Markdown文件');
                }
            })),
            vscode.commands.registerCommand('markdowntoword.markdown-to-word.convertToExcel', (uri) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const filePath = (uri === null || uri === void 0 ? void 0 : uri.fsPath) || ((_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.uri.fsPath);
                if (filePath && filePath.endsWith('.md')) {
                    try {
                        yield progressUI.withProgress(`转换文件: ${path.basename(filePath)}`, (progress) => __awaiter(this, void 0, void 0, function* () {
                            progress.report({ message: '执行Excel转换...' });
                            vscode.window.showInformationMessage('Excel转换功能暂未实现，将在后续版本中提供');
                        }));
                    }
                    catch (error) {
                        yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                    }
                }
                else {
                    vscode.window.showErrorMessage('请选择一个Markdown文件');
                }
            })),
            vscode.commands.registerCommand('markdowntoword.markdown-to-word.batchConvertToWord', (uri) => __awaiter(this, void 0, void 0, function* () {
                if (uri && uri.fsPath) {
                    try {
                        yield progressUI.withProgress('批量转换为Word文档', (progress) => __awaiter(this, void 0, void 0, function* () {
                            progress.report({ message: '扫描Markdown文件...' });
                            vscode.window.showInformationMessage('批量Word转换功能暂未实现，将在后续版本中提供');
                        }));
                    }
                    catch (error) {
                        yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                    }
                }
                else {
                    vscode.window.showErrorMessage('请选择一个文件夹');
                }
            })),
            vscode.commands.registerCommand('markdowntoword.markdown-to-word.batchConvertToHtml', (uri) => __awaiter(this, void 0, void 0, function* () {
                if (uri && uri.fsPath) {
                    try {
                        yield progressUI.withProgress('批量转换为HTML文档', (progress) => __awaiter(this, void 0, void 0, function* () {
                            progress.report({ message: '扫描Markdown文件...' });
                            vscode.window.showInformationMessage('批量HTML转换功能暂未实现，将在后续版本中提供');
                        }));
                    }
                    catch (error) {
                        yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                    }
                }
                else {
                    vscode.window.showErrorMessage('请选择一个文件夹');
                }
            })),
            vscode.commands.registerCommand('markdowntoword.markdown-to-word.batchConvertToExcel', (uri) => __awaiter(this, void 0, void 0, function* () {
                if (uri && uri.fsPath) {
                    try {
                        yield progressUI.withProgress('批量转换为Excel文档', (progress) => __awaiter(this, void 0, void 0, function* () {
                            progress.report({ message: '扫描Markdown文件...' });
                            vscode.window.showInformationMessage('批量Excel转换功能暂未实现，将在后续版本中提供');
                        }));
                    }
                    catch (error) {
                        yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                    }
                }
                else {
                    vscode.window.showErrorMessage('请选择一个文件夹');
                }
            })),
            vscode.commands.registerCommand('markdowntoword.markdown-to-word.editConfig', () => __awaiter(this, void 0, void 0, function* () {
                try {
                    configPanel_1.ConfigPanel.createOrShow(context.extensionPath, '', (_config, cancelled) => __awaiter(this, void 0, void 0, function* () {
                        if (!cancelled) {
                            vscode.window.showInformationMessage('配置已保存！');
                        }
                    }));
                }
                catch (error) {
                    yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                }
            })),
            vscode.commands.registerCommand('markdowntoword.markdown-to-word.configExcel', () => __awaiter(this, void 0, void 0, function* () {
                try {
                    vscode.window.showInformationMessage('Excel配置功能暂未实现，将在后续版本中提供');
                }
                catch (error) {
                    yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                }
            })),
            vscode.commands.registerCommand('markdowntoword.markdown-to-word.installDependencies', () => __awaiter(this, void 0, void 0, function* () {
                try {
                    const installer = new AutoDependencyInstaller(context);
                    const success = yield installer.checkAndInstallDependencies();
                    if (success) {
                        yield context.globalState.update('dependenciesInstalled', true);
                        yield context.globalState.update('lastInstallTime', Date.now());
                    }
                    else {
                        vscode.window.showWarningMessage('依赖安装失败，请查看输出面板获取详细信息');
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    vscode.window.showErrorMessage(`手动安装依赖失败: ${errorMessage}`);
                }
            })),
            vscode.commands.registerCommand('markdowntoword.markdown-to-word.checkDependencies', () => __awaiter(this, void 0, void 0, function* () {
                try {
                    const outputChannel = vscode.window.createOutputChannel('Markdown to Word - 依赖检查');
                    outputChannel.show();
                    outputChannel.appendLine('开始检查依赖状态...\n');
                    const nodejsPath = path.join(context.extensionPath, 'nodejs');
                    const nodeModulesPath = path.join(nodejsPath, 'node_modules');
                    outputChannel.appendLine('=== Node.js 依赖检查 ===');
                    if (fs.existsSync(nodeModulesPath)) {
                        outputChannel.appendLine('✓ node_modules 目录存在');
                        const keyDependencies = ['axios', 'fs-extra', 'docx', 'markdown-it', 'cheerio'];
                        for (const dep of keyDependencies) {
                            const depPath = path.join(nodeModulesPath, dep);
                            if (fs.existsSync(depPath)) {
                                outputChannel.appendLine(`✓ ${dep} 已安装`);
                            }
                            else {
                                outputChannel.appendLine(`✗ ${dep} 未安装`);
                            }
                        }
                    }
                    else {
                        outputChannel.appendLine('✗ node_modules 目录不存在');
                    }
                    outputChannel.appendLine('\n=== Python 依赖检查 ===');
                    const pythonCommands = ['python3', 'python', 'py'];
                    let pythonFound = false;
                    for (const cmd of pythonCommands) {
                        try {
                            const { exec } = require('child_process');
                            yield new Promise((resolve) => {
                                exec(`${cmd} --version`, (error, stdout) => {
                                    if (!error) {
                                        outputChannel.appendLine(`✓ Python 可用: ${cmd} (${stdout.trim()})`);
                                        pythonFound = true;
                                    }
                                    resolve();
                                });
                            });
                            if (pythonFound)
                                break;
                        }
                        catch (_a) {
                            continue;
                        }
                    }
                    if (!pythonFound) {
                        outputChannel.appendLine('✗ 未找到可用的Python环境');
                    }
                    outputChannel.appendLine('\n依赖检查完成！');
                    vscode.window.showInformationMessage('依赖检查完成，请查看输出面板', '查看结果').then(selection => {
                        if (selection === '查看结果') {
                            outputChannel.show();
                        }
                    });
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    vscode.window.showErrorMessage(`依赖检查失败: ${errorMessage}`);
                }
            }))
        ];
        commands.forEach(command => context.subscriptions.push(command));
        console.log('插件 "Markdown to Word Converter" 激活完成！');
    });
}
function deactivate() {
    console.log('插件 "Markdown to Word Converter" 已停用');
}
//# sourceMappingURL=extension.js.map