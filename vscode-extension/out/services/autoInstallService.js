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
exports.AutoInstallService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const stream_1 = require("stream");
const fs_1 = require("fs");
const unzipper_1 = require("unzipper");
const tar = __importStar(require("tar"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const pipelineAsync = (0, util_1.promisify)(stream_1.pipeline);
class AutoInstallService {
    constructor(context) {
        this.NODE_DOWNLOAD_BASE = 'https://nodejs.org/dist';
        this.NODE_RELEASES_API = 'https://nodejs.org/dist/index.json';
        this.PORTABLE_NODE_DIR = 'portable-nodejs';
        this.MIN_NODE_VERSION = 16;
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('Markdown to Word - 自动安装');
    }
    autoInstall() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.outputChannel.show(true);
                this.outputChannel.appendLine('🚀 开始自动化安装流程...');
                this.outputChannel.appendLine('='.repeat(50));
                const systemNodeAvailable = yield this.checkSystemNode();
                if (systemNodeAvailable) {
                    this.outputChannel.appendLine('✅ 系统 Node.js 可用，跳过自动安装');
                    return yield this.installProjectDependencies();
                }
                const portableNodeAvailable = yield this.checkPortableNode();
                if (portableNodeAvailable) {
                    this.outputChannel.appendLine('✅ 便携版 Node.js 可用，跳过下载');
                    return yield this.installProjectDependencies();
                }
                const downloadSuccess = yield this.downloadAndInstallNode();
                if (!downloadSuccess) {
                    this.outputChannel.appendLine('❌ Node.js 自动安装失败');
                    yield this.showManualInstallGuide();
                    return false;
                }
                const dependenciesSuccess = yield this.installProjectDependencies();
                if (!dependenciesSuccess) {
                    this.outputChannel.appendLine('❌ 项目依赖安装失败');
                    return false;
                }
                this.outputChannel.appendLine('🎉 自动化安装完成！');
                this.outputChannel.appendLine('='.repeat(50));
                return true;
            }
            catch (error) {
                this.outputChannel.appendLine(`❌ 自动安装过程中出现错误: ${error}`);
                yield this.showManualInstallGuide();
                return false;
            }
        });
    }
    checkSystemNode() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { stdout } = yield execAsync('node --version');
                const version = stdout.trim();
                const versionNumber = parseInt(version.replace('v', '').split('.')[0]);
                this.outputChannel.appendLine(`🔍 检测到系统 Node.js 版本: ${version}`);
                if (versionNumber >= this.MIN_NODE_VERSION) {
                    this.outputChannel.appendLine('✅ 系统 Node.js 版本满足要求');
                    return true;
                }
                else {
                    this.outputChannel.appendLine(`⚠️ 系统 Node.js 版本过低 (需要 >= ${this.MIN_NODE_VERSION})`);
                    return false;
                }
            }
            catch (error) {
                this.outputChannel.appendLine('⚠️ 系统未安装 Node.js 或不在 PATH 中');
                return false;
            }
        });
    }
    checkPortableNode() {
        return __awaiter(this, void 0, void 0, function* () {
            const portableDir = path.join(this.context.extensionPath, this.PORTABLE_NODE_DIR);
            const nodeExecutable = this.getNodeExecutableName();
            const possiblePaths = [
                path.join(portableDir, 'node', 'bin', nodeExecutable),
                path.join(portableDir, 'node', nodeExecutable),
                path.join(portableDir, 'bin', nodeExecutable),
                path.join(portableDir, nodeExecutable)
            ];
            for (const nodePath of possiblePaths) {
                if (yield fs.pathExists(nodePath)) {
                    try {
                        const { stdout } = yield execAsync(`"${nodePath}" --version`);
                        const version = stdout.trim();
                        this.outputChannel.appendLine(`✅ 找到便携版 Node.js: ${version} (${nodePath})`);
                        return true;
                    }
                    catch (error) {
                        this.outputChannel.appendLine(`⚠️ 便携版 Node.js 不可执行: ${nodePath}`);
                    }
                }
            }
            this.outputChannel.appendLine('⚠️ 未找到可用的便携版 Node.js');
            return false;
        });
    }
    downloadAndInstallNode() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.outputChannel.appendLine('📥 开始下载 Node.js...');
                const nodeVersion = yield this.getLatestLTSVersion();
                if (!nodeVersion) {
                    this.outputChannel.appendLine('❌ 无法获取 Node.js 版本信息');
                    return false;
                }
                this.outputChannel.appendLine(`📋 准备下载 Node.js ${nodeVersion.version}`);
                const downloadUrl = this.buildDownloadUrl(nodeVersion.version);
                if (!downloadUrl) {
                    this.outputChannel.appendLine('❌ 无法构建下载 URL');
                    return false;
                }
                this.outputChannel.appendLine(`🔗 下载地址: ${downloadUrl}`);
                const downloadPath = yield this.downloadFile(downloadUrl);
                if (!downloadPath) {
                    this.outputChannel.appendLine('❌ 文件下载失败');
                    return false;
                }
                const extractSuccess = yield this.extractNodeArchive(downloadPath);
                if (!extractSuccess) {
                    this.outputChannel.appendLine('❌ 文件解压失败');
                    return false;
                }
                yield fs.remove(downloadPath);
                this.outputChannel.appendLine('🧹 清理临时文件完成');
                const verifySuccess = yield this.verifyNodeInstallation();
                if (!verifySuccess) {
                    this.outputChannel.appendLine('❌ Node.js 安装验证失败');
                    return false;
                }
                this.outputChannel.appendLine('✅ Node.js 自动安装完成');
                return true;
            }
            catch (error) {
                this.outputChannel.appendLine(`❌ Node.js 下载安装失败: ${error}`);
                return false;
            }
        });
    }
    getLatestLTSVersion() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.outputChannel.appendLine('🔍 获取 Node.js 版本信息...');
                const data = yield this.httpGet(this.NODE_RELEASES_API);
                const releases = JSON.parse(data);
                const ltsVersion = releases.find(release => release.lts &&
                    parseInt(release.version.replace('v', '').split('.')[0]) >= this.MIN_NODE_VERSION);
                if (ltsVersion) {
                    this.outputChannel.appendLine(`✅ 找到 LTS 版本: ${ltsVersion.version}`);
                    return ltsVersion;
                }
                else {
                    this.outputChannel.appendLine('❌ 未找到合适的 LTS 版本');
                    return null;
                }
            }
            catch (error) {
                this.outputChannel.appendLine(`❌ 获取版本信息失败: ${error}`);
                return null;
            }
        });
    }
    buildDownloadUrl(version) {
        const platform = os.platform();
        const arch = os.arch();
        let platformName;
        let archName;
        let extension;
        switch (platform) {
            case 'win32':
                platformName = 'win';
                extension = 'zip';
                break;
            case 'darwin':
                platformName = 'darwin';
                extension = 'tar.gz';
                break;
            case 'linux':
                platformName = 'linux';
                extension = 'tar.xz';
                break;
            default:
                this.outputChannel.appendLine(`❌ 不支持的平台: ${platform}`);
                return null;
        }
        switch (arch) {
            case 'x64':
                archName = 'x64';
                break;
            case 'arm64':
                archName = 'arm64';
                break;
            case 'ia32':
                archName = 'x86';
                break;
            default:
                this.outputChannel.appendLine(`❌ 不支持的架构: ${arch}`);
                return null;
        }
        const filename = `node-${version}-${platformName}-${archName}.${extension}`;
        return `${this.NODE_DOWNLOAD_BASE}/${version}/${filename}`;
    }
    downloadFile(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const filename = path.basename(url);
                const downloadPath = path.join(os.tmpdir(), filename);
                this.outputChannel.appendLine(`📥 开始下载: ${filename}`);
                this.outputChannel.appendLine(`💾 保存到: ${downloadPath}`);
                yield this.downloadWithProgress(url, downloadPath);
                this.outputChannel.appendLine('✅ 下载完成');
                return downloadPath;
            }
            catch (error) {
                this.outputChannel.appendLine(`❌ 下载失败: ${error}`);
                return null;
            }
        });
    }
    downloadWithProgress(url, filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const protocol = url.startsWith('https:') ? https : http;
                protocol.get(url, (response) => {
                    if (response.statusCode === 302 || response.statusCode === 301) {
                        if (response.headers.location) {
                            this.downloadWithProgress(response.headers.location, filePath)
                                .then(resolve)
                                .catch(reject);
                            return;
                        }
                    }
                    if (response.statusCode !== 200) {
                        reject(new Error(`下载失败: HTTP ${response.statusCode}`));
                        return;
                    }
                    const totalSize = parseInt(response.headers['content-length'] || '0');
                    let downloadedSize = 0;
                    let lastProgress = 0;
                    const fileStream = (0, fs_1.createWriteStream)(filePath);
                    response.on('data', (chunk) => {
                        downloadedSize += chunk.length;
                        if (totalSize > 0) {
                            const progress = Math.floor((downloadedSize / totalSize) * 100);
                            if (progress > lastProgress && progress % 10 === 0) {
                                this.outputChannel.appendLine(`📊 下载进度: ${progress}% (${this.formatBytes(downloadedSize)}/${this.formatBytes(totalSize)})`);
                                lastProgress = progress;
                            }
                        }
                    });
                    response.pipe(fileStream);
                    fileStream.on('finish', () => {
                        fileStream.close();
                        resolve();
                    });
                    fileStream.on('error', (error) => {
                        fs.unlink(filePath).catch(() => { });
                        reject(error);
                    });
                }).on('error', reject);
            });
        });
    }
    extractNodeArchive(archivePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const portableDir = path.join(this.context.extensionPath, this.PORTABLE_NODE_DIR);
                yield fs.ensureDir(portableDir);
                this.outputChannel.appendLine(`📦 开始解压到: ${portableDir}`);
                const extension = path.extname(archivePath).toLowerCase();
                if (extension === '.zip') {
                    yield this.extractZip(archivePath, portableDir);
                }
                else if (extension === '.gz' || extension === '.xz') {
                    yield this.extractTar(archivePath, portableDir);
                }
                else {
                    this.outputChannel.appendLine(`❌ 不支持的压缩格式: ${extension}`);
                    return false;
                }
                this.outputChannel.appendLine('✅ 解压完成');
                return true;
            }
            catch (error) {
                this.outputChannel.appendLine(`❌ 解压失败: ${error}`);
                return false;
            }
        });
    }
    extractZip(zipPath, extractDir) {
        return __awaiter(this, void 0, void 0, function* () {
            const readStream = fs.createReadStream(zipPath);
            const extractStream = (0, unzipper_1.Extract)({ path: extractDir });
            yield pipelineAsync(readStream, extractStream);
            const files = yield fs.readdir(extractDir);
            const nodeDir = files.find(file => file.startsWith('node-'));
            if (nodeDir) {
                const oldPath = path.join(extractDir, nodeDir);
                const newPath = path.join(extractDir, 'node');
                yield fs.move(oldPath, newPath);
            }
        });
    }
    extractTar(tarPath, extractDir) {
        return __awaiter(this, void 0, void 0, function* () {
            yield tar.extract({
                file: tarPath,
                cwd: extractDir,
                strip: 1,
                newer: true
            });
            const nodeDir = path.join(extractDir, 'node');
            if (!(yield fs.pathExists(nodeDir))) {
                yield fs.ensureDir(nodeDir);
                const files = yield fs.readdir(extractDir);
                for (const file of files) {
                    if (file !== 'node') {
                        const oldPath = path.join(extractDir, file);
                        const newPath = path.join(nodeDir, file);
                        yield fs.move(oldPath, newPath);
                    }
                }
            }
        });
    }
    verifyNodeInstallation() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.outputChannel.appendLine('🔍 验证 Node.js 安装...');
                const portableDir = path.join(this.context.extensionPath, this.PORTABLE_NODE_DIR);
                const nodeExecutable = this.getNodeExecutableName();
                const possiblePaths = [
                    path.join(portableDir, 'node', 'bin', nodeExecutable),
                    path.join(portableDir, 'node', nodeExecutable),
                    path.join(portableDir, 'bin', nodeExecutable),
                    path.join(portableDir, nodeExecutable)
                ];
                for (const nodePath of possiblePaths) {
                    if (yield fs.pathExists(nodePath)) {
                        try {
                            const { stdout } = yield execAsync(`"${nodePath}" --version`);
                            const version = stdout.trim();
                            this.outputChannel.appendLine(`✅ Node.js 验证成功: ${version}`);
                            this.outputChannel.appendLine(`📍 安装路径: ${nodePath}`);
                            return true;
                        }
                        catch (error) {
                            this.outputChannel.appendLine(`⚠️ Node.js 不可执行: ${nodePath}`);
                        }
                    }
                }
                this.outputChannel.appendLine('❌ Node.js 验证失败');
                return false;
            }
            catch (error) {
                this.outputChannel.appendLine(`❌ 验证过程出错: ${error}`);
                return false;
            }
        });
    }
    installProjectDependencies() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.outputChannel.appendLine('📦 开始安装项目依赖...');
                const nodejsPath = path.join(this.context.extensionPath, 'nodejs');
                const packageJsonPath = path.join(nodejsPath, 'package.json');
                if (!(yield fs.pathExists(packageJsonPath))) {
                    this.outputChannel.appendLine('❌ 未找到 nodejs/package.json 文件');
                    return false;
                }
                const npmCommand = yield this.getNpmCommand();
                if (!npmCommand) {
                    this.outputChannel.appendLine('❌ 未找到可用的包管理器');
                    return false;
                }
                this.outputChannel.appendLine(`🔧 使用包管理器: ${npmCommand}`);
                this.outputChannel.appendLine(`📂 工作目录: ${nodejsPath}`);
                const installCommand = `${npmCommand} install`;
                this.outputChannel.appendLine(`⚡ 执行命令: ${installCommand}`);
                const { stdout, stderr } = yield execAsync(installCommand, {
                    cwd: nodejsPath,
                    timeout: 300000,
                    env: yield this.getEnvWithNodePath()
                });
                if (stdout) {
                    this.outputChannel.appendLine('📋 安装输出:');
                    this.outputChannel.appendLine(stdout);
                }
                if (stderr && !stderr.includes('WARN')) {
                    this.outputChannel.appendLine('⚠️ 安装警告:');
                    this.outputChannel.appendLine(stderr);
                }
                const nodeModulesPath = path.join(nodejsPath, 'node_modules');
                if (yield fs.pathExists(nodeModulesPath)) {
                    this.outputChannel.appendLine('✅ 项目依赖安装完成');
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
        });
    }
    getNpmCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            const portableNpm = yield this.getPortableNpm();
            if (portableNpm) {
                return portableNpm;
            }
            const systemCommands = ['npm', 'pnpm', 'yarn'];
            for (const cmd of systemCommands) {
                try {
                    yield execAsync(`${cmd} --version`);
                    this.outputChannel.appendLine(`✅ 找到系统包管理器: ${cmd}`);
                    return cmd;
                }
                catch (error) {
                }
            }
            this.outputChannel.appendLine('❌ 未找到可用的包管理器');
            return null;
        });
    }
    getPortableNpm() {
        return __awaiter(this, void 0, void 0, function* () {
            const portableDir = path.join(this.context.extensionPath, this.PORTABLE_NODE_DIR);
            const isWindows = os.platform() === 'win32';
            const npmExecutable = isWindows ? 'npm.cmd' : 'npm';
            const possiblePaths = [
                path.join(portableDir, 'node', 'bin', npmExecutable),
                path.join(portableDir, 'node', npmExecutable),
                path.join(portableDir, 'bin', npmExecutable),
                path.join(portableDir, npmExecutable)
            ];
            for (const npmPath of possiblePaths) {
                if (yield fs.pathExists(npmPath)) {
                    try {
                        yield execAsync(`"${npmPath}" --version`);
                        this.outputChannel.appendLine(`✅ 找到便携版 npm: ${npmPath}`);
                        return `"${npmPath}"`;
                    }
                    catch (error) {
                    }
                }
            }
            return null;
        });
    }
    getEnvWithNodePath() {
        return __awaiter(this, void 0, void 0, function* () {
            const env = Object.assign({}, process.env);
            const portableDir = path.join(this.context.extensionPath, this.PORTABLE_NODE_DIR);
            const binPaths = [
                path.join(portableDir, 'node', 'bin'),
                path.join(portableDir, 'node'),
                path.join(portableDir, 'bin'),
                portableDir
            ];
            const existingPath = env.PATH || env.Path || '';
            const newPath = binPaths.join(path.delimiter) + path.delimiter + existingPath;
            env.PATH = newPath;
            env.Path = newPath;
            return env;
        });
    }
    getNodeExecutableName() {
        return os.platform() === 'win32' ? 'node.exe' : 'node';
    }
    httpGet(url) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const protocol = url.startsWith('https:') ? https : http;
                protocol.get(url, (response) => {
                    if (response.statusCode === 302 || response.statusCode === 301) {
                        if (response.headers.location) {
                            this.httpGet(response.headers.location)
                                .then(resolve)
                                .catch(reject);
                            return;
                        }
                    }
                    if (response.statusCode !== 200) {
                        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                        return;
                    }
                    let data = '';
                    response.on('data', chunk => data += chunk);
                    response.on('end', () => resolve(data));
                }).on('error', reject);
            });
        });
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    showManualInstallGuide() {
        return __awaiter(this, void 0, void 0, function* () {
            const message = `
🤖 自动安装失败 - 手动安装指南

📋 **自动安装尝试了以下步骤但失败了：**
1. 检查系统 Node.js 环境
2. 检查便携版 Node.js
3. 自动下载最新 LTS 版本
4. 解压并配置环境
5. 安装项目依赖

💡 **手动解决方案：**

**方案1: 安装系统 Node.js (推荐)**
1. 访问 https://nodejs.org/
2. 下载并安装 LTS 版本 (>= ${this.MIN_NODE_VERSION})
3. 确保添加到系统 PATH
4. 重启 VS Code
5. 重新尝试使用扩展

**方案2: 手动下载便携版**
1. 访问 https://nodejs.org/dist/
2. 下载适合您系统的便携版
3. 解压到扩展目录: ${path.join(this.context.extensionPath, this.PORTABLE_NODE_DIR)}
4. 重新尝试使用扩展

**方案3: 手动安装依赖**
1. 确保系统有 Node.js
2. 打开终端，执行：
   cd "${path.join(this.context.extensionPath, 'nodejs')}"
   npm install

🔧 **常见问题：**
- 网络连接问题：检查防火墙和代理设置
- 权限问题：在管理员模式下运行 VS Code
- 磁盘空间不足：确保有足够的存储空间

安装完成后，请重新尝试使用扩展功能。
        `;
            this.outputChannel.appendLine(message);
            const action = yield vscode.window.showErrorMessage('自动安装失败，需要手动处理', '查看详细说明', '打开 Node.js 官网', '打开扩展目录');
            if (action === '查看详细说明') {
                this.outputChannel.show();
            }
            else if (action === '打开 Node.js 官网') {
                vscode.env.openExternal(vscode.Uri.parse('https://nodejs.org/'));
            }
            else if (action === '打开扩展目录') {
                vscode.env.openExternal(vscode.Uri.file(this.context.extensionPath));
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
exports.AutoInstallService = AutoInstallService;
//# sourceMappingURL=autoInstallService.js.map