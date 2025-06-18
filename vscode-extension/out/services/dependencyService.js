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
exports.DependencyService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs-extra"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class DependencyService {
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
                    this.outputChannel.appendLine('✅ Node.js 依赖已存在');
                    return true;
                }
                this.outputChannel.appendLine('📦 开始安装 Node.js 依赖...');
                const npmCommand = yield this.getNpmCommand();
                if (!npmCommand) {
                    this.outputChannel.appendLine('❌ 未找到可用的包管理器 (npm/pnpm/yarn)');
                    return false;
                }
                try {
                    const installCommand = this.buildInstallCommand(npmCommand);
                    this.outputChannel.appendLine(`执行命令: ${installCommand}`);
                    const { stdout, stderr } = yield execAsync(installCommand, {
                        cwd: nodejsPath,
                        timeout: 300000,
                        env: yield this.getEnvWithNodePath()
                    });
                    if (stdout)
                        this.outputChannel.appendLine(stdout);
                    if (stderr && !stderr.includes('WARN')) {
                        this.outputChannel.appendLine(`安装警告: ${stderr}`);
                    }
                    if (yield fs.pathExists(nodeModulesPath)) {
                        this.outputChannel.appendLine('✅ Node.js 依赖安装完成');
                        return true;
                    }
                    else {
                        this.outputChannel.appendLine('❌ 依赖安装失败：node_modules 目录未创建');
                        return false;
                    }
                }
                catch (error) {
                    this.outputChannel.appendLine(`❌ 依赖安装失败: ${error.message}`);
                    if (error.stdout)
                        this.outputChannel.appendLine(`stdout: ${error.stdout}`);
                    if (error.stderr)
                        this.outputChannel.appendLine(`stderr: ${error.stderr}`);
                    return false;
                }
            }
            catch (error) {
                this.outputChannel.appendLine(`检查 Node.js 依赖时出错: ${error}`);
                return false;
            }
        });
    }
    buildInstallCommand(npmCommand) {
        if (npmCommand.includes('"')) {
            return `${npmCommand} install`;
        }
        return `${npmCommand} install`;
    }
    getEnvWithNodePath() {
        return __awaiter(this, void 0, void 0, function* () {
            const env = Object.assign({}, process.env);
            const internalNodePath = yield this.getInternalNodePath();
            if (internalNodePath) {
                const binPaths = [
                    path.join(internalNodePath, 'bin'),
                    path.join(internalNodePath, 'node_modules', '.bin'),
                    internalNodePath
                ];
                const existingPath = env.PATH || env.Path || '';
                const newPath = binPaths.join(path.delimiter) + path.delimiter + existingPath;
                env.PATH = newPath;
                env.Path = newPath;
            }
            return env;
        });
    }
    checkNodeJsEnvironment() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { stdout } = yield execAsync('node --version');
                const version = stdout.trim();
                this.outputChannel.appendLine(`✅ 系统 Node.js 版本: ${version}`);
                const versionNumber = parseInt(version.replace('v', '').split('.')[0]);
                if (versionNumber < 14) {
                    this.outputChannel.appendLine(`⚠️ 系统 Node.js 版本过低，尝试使用便携版 Node.js`);
                    return yield this.checkPortableNodeJs();
                }
                return true;
            }
            catch (error) {
                this.outputChannel.appendLine('⚠️ 系统 Node.js 未安装或不在 PATH 中，尝试使用便携版 Node.js');
                return yield this.checkPortableNodeJs();
            }
        });
    }
    checkPortableNodeJs() {
        return __awaiter(this, void 0, void 0, function* () {
            const portableNodeDir = path.join(this.context.extensionPath, 'portable-nodejs', 'node');
            const nodeExecutable = os.platform() === 'win32' ? 'node.exe' : 'node';
            const nodePath = path.join(portableNodeDir, 'bin', nodeExecutable);
            const nodePathWin = path.join(portableNodeDir, nodeExecutable);
            const finalNodePath = (yield fs.pathExists(nodePath)) ? nodePath :
                (yield fs.pathExists(nodePathWin)) ? nodePathWin : null;
            if (finalNodePath) {
                try {
                    const { stdout } = yield execAsync(`"${finalNodePath}" --version`);
                    const version = stdout.trim();
                    this.outputChannel.appendLine(`✅ 便携版 Node.js 版本: ${version}`);
                    return true;
                }
                catch (error) {
                    this.outputChannel.appendLine(`❌ 便携版 Node.js 执行失败: ${error}`);
                }
            }
            this.outputChannel.appendLine('❌ 未找到可用的 Node.js 环境');
            return false;
        });
    }
    getNpmCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            const internalNodePath = yield this.getInternalNodePath();
            if (internalNodePath) {
                const internalCmd = yield this.getInternalPackageManager(internalNodePath);
                if (internalCmd) {
                    return internalCmd;
                }
            }
            this.outputChannel.appendLine('⚠️ 项目内部Node.js环境不可用，尝试使用系统环境');
            const commands = ['pnpm', 'yarn', 'npm'];
            for (const cmd of commands) {
                try {
                    yield execAsync(`${cmd} --version`);
                    this.outputChannel.appendLine(`✅ 找到系统包管理器: ${cmd}`);
                    return cmd;
                }
                catch (error) {
                    this.outputChannel.appendLine(`⚠️ 系统 ${cmd} 不可用`);
                }
            }
            return null;
        });
    }
    getInternalNodePath() {
        return __awaiter(this, void 0, void 0, function* () {
            const nodejsDir = path.join(this.context.extensionPath, 'nodejs');
            if (yield fs.pathExists(nodejsDir)) {
                this.outputChannel.appendLine(`✅ 找到项目内部Node.js目录: ${nodejsDir}`);
                return nodejsDir;
            }
            const portableNodeDir = path.join(this.context.extensionPath, 'portable-nodejs', 'node');
            if (yield fs.pathExists(portableNodeDir)) {
                this.outputChannel.appendLine(`✅ 找到便携版Node.js目录: ${portableNodeDir}`);
                return portableNodeDir;
            }
            this.outputChannel.appendLine('⚠️ 未找到项目内部Node.js环境');
            return null;
        });
    }
    getInternalPackageManager(nodePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const platform = os.platform();
            const isWindows = platform === 'win32';
            const binDir = path.join(nodePath, 'node_modules', '.bin');
            const globalBinDir = path.join(nodePath, 'bin');
            const packageManagers = [
                { name: 'npm', paths: [
                        path.join(binDir, isWindows ? 'npm.cmd' : 'npm'),
                        path.join(globalBinDir, isWindows ? 'npm.cmd' : 'npm'),
                        path.join(nodePath, isWindows ? 'npm.cmd' : 'npm')
                    ] },
                { name: 'pnpm', paths: [
                        path.join(binDir, isWindows ? 'pnpm.cmd' : 'pnpm'),
                        path.join(globalBinDir, isWindows ? 'pnpm.cmd' : 'pnpm')
                    ] },
                { name: 'yarn', paths: [
                        path.join(binDir, isWindows ? 'yarn.cmd' : 'yarn'),
                        path.join(globalBinDir, isWindows ? 'yarn.cmd' : 'yarn')
                    ] }
            ];
            for (const pm of packageManagers) {
                for (const pmPath of pm.paths) {
                    if (yield fs.pathExists(pmPath)) {
                        try {
                            yield execAsync(`"${pmPath}" --version`);
                            this.outputChannel.appendLine(`✅ 找到项目内部包管理器: ${pm.name} (${pmPath})`);
                            return `"${pmPath}"`;
                        }
                        catch (error) {
                            this.outputChannel.appendLine(`⚠️ 项目内部 ${pm.name} 不可执行: ${error}`);
                        }
                    }
                }
            }
            const nodeExecutable = isWindows ? 'node.exe' : 'node';
            const possibleNodePaths = [
                path.join(nodePath, 'bin', nodeExecutable),
                path.join(nodePath, nodeExecutable)
            ];
            for (const nodeExePath of possibleNodePaths) {
                if (yield fs.pathExists(nodeExePath)) {
                    try {
                        yield execAsync(`"${nodeExePath}" -p "process.version"`);
                        this.outputChannel.appendLine(`✅ 找到项目内部Node.js: ${nodeExePath}`);
                        return `"${nodeExePath}" -e "require('child_process').spawn('npm', process.argv.slice(1), {stdio:'inherit'})" --`;
                    }
                    catch (error) {
                        this.outputChannel.appendLine(`⚠️ 项目内部Node.js不可执行: ${error}`);
                    }
                }
            }
            return null;
        });
    }
    checkSystemCommand(command) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield execAsync(`${command} --version`);
                return true;
            }
            catch (error) {
                return false;
            }
        });
    }
    showManualInstallationInstructions() {
        return __awaiter(this, void 0, void 0, function* () {
            const message = `
📋 依赖安装失败 - 解决方案：

🔍 **问题诊断**
扩展尝试使用项目内部的 Node.js 环境，但未能成功安装依赖。

💡 **解决方案**

**方案1: 使用系统 Node.js (推荐)**
1. 确保系统已安装 Node.js (版本 >= 14)
2. 验证安装: 在终端运行 \`node --version\` 和 \`npm --version\`
3. 重启 VS Code 并重试

**方案2: 手动安装项目依赖**
1. 打开终端，导航到扩展目录:
   \`cd "${this.context.extensionPath}/nodejs"\`
2. 手动安装依赖:
   \`npm install\` 或 \`yarn install\` 或 \`pnpm install\`

🔧 **安装 Node.js (如果未安装)**

**Windows:**
1. 访问 https://nodejs.org/
2. 下载并安装 LTS 版本
3. 确保勾选 "Add to PATH" 选项
4. 重启 VS Code

**macOS:**
方法1 - 官方安装包：
1. 访问 https://nodejs.org/
2. 下载并安装 LTS 版本

方法2 - 使用 Homebrew：
\`\`\`bash
brew install node
\`\`\`

**Linux (Ubuntu/Debian):**
\`\`\`bash
# 使用 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 或使用包管理器
sudo apt update
sudo apt install nodejs npm
\`\`\`

**Linux (CentOS/RHEL/Fedora):**
\`\`\`bash
# 使用 NodeSource 仓库
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
sudo yum install -y nodejs npm
\`\`\`

🔍 **验证安装**
\`\`\`bash
node --version
npm --version
\`\`\`

🚨 **常见问题解决**
1. **命令未找到**: 确保 Node.js 已添加到系统 PATH
2. **权限问题**: 在 Linux/macOS 上可能需要 sudo
3. **网络问题**: 检查防火墙和代理设置
4. **重启**: 安装后重启终端或 VS Code
5. **项目依赖**: 确保 ${this.context.extensionPath}/nodejs 目录存在且包含 package.json

安装完成后，请重新尝试使用扩展功能。
        `;
            this.outputChannel.appendLine(message);
            const action = yield vscode.window.showErrorMessage('依赖安装失败，需要手动处理', '查看详细说明', '打开项目目录', '打开 Node.js 官网');
            if (action === '查看详细说明') {
                this.outputChannel.show();
            }
            else if (action === '打开项目目录') {
                const nodejsPath = path.join(this.context.extensionPath, 'nodejs');
                vscode.env.openExternal(vscode.Uri.file(nodejsPath));
            }
            else if (action === '打开 Node.js 官网') {
                vscode.env.openExternal(vscode.Uri.parse('https://nodejs.org/'));
            }
        });
    }
    getOutputChannel() {
        return this.outputChannel;
    }
    dispose() {
        this.outputChannel.dispose();
    }
}
exports.DependencyService = DependencyService;
//# sourceMappingURL=dependencyService.js.map