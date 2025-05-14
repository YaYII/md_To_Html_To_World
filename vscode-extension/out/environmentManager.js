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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const utils_1 = require("./utils");
class EnvironmentManager {
    constructor() { }
    static getInstance() {
        if (!EnvironmentManager.instance) {
            EnvironmentManager.instance = new EnvironmentManager();
        }
        return EnvironmentManager.instance;
    }
    async initialize(context) {
        const basicInfo = {
            platform: process.platform,
            architecture: process.arch,
            release: os.release(),
            userInfo: {
                username: os.userInfo().username,
                homedir: os.homedir()
            }
        };
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const pythonEnv = await this.detectPythonEnvironment(workspaceRoot);
        const pipVersion = await this.getPipVersion(pythonEnv.cmd);
        const installedPackages = await this.getInstalledPackages(pythonEnv.cmd);
        const requirementsPath = await this.findRequirementsFile(context, workspaceRoot);
        this.environmentInfo = {
            ...basicInfo,
            pythonCmd: pythonEnv.cmd,
            pythonVersion: pythonEnv.version,
            pythonPath: pythonEnv.path,
            pipVersion,
            workspaceRoot,
            extensionPath: context.extensionPath,
            isVirtualEnv: this.isVirtualEnvironment(pythonEnv.path),
            virtualEnvPath: this.getVirtualEnvPath(pythonEnv.path),
            requirementsPath,
            installedPackages
        };
        await this.validateEnvironment();
        return this.environmentInfo;
    }
    async detectPythonEnvironment(workspaceRoot) {
        const config = vscode.workspace.getConfiguration('markdown-to-word');
        const pythonPath = config.get('pythonPath', '');
        const useVirtualEnv = config.get('useVirtualEnv', true);
        const checkPython = async (cmd) => {
            try {
                const quotedCmd = cmd.includes(' ') ? `"${cmd}"` : cmd;
                const versionResult = await (0, utils_1.execWithDetails)(`${quotedCmd} --version`);
                if (!versionResult.success || !versionResult.stdout)
                    return { success: false };
                const pathResult = await (0, utils_1.execWithDetails)(`${quotedCmd} -c "import sys; print(sys.executable)"`);
                if (!pathResult.success || !pathResult.stdout)
                    return { success: false };
                return {
                    success: true,
                    version: versionResult.stdout.trim(),
                    path: pathResult.stdout.trim()
                };
            }
            catch {
                return { success: false };
            }
        };
        const attempts = [
            async () => {
                if (pythonPath) {
                    const expandedPath = this.expandEnvironmentVariables(pythonPath);
                    if (!path.isAbsolute(expandedPath) && workspaceRoot) {
                        const fullPath = path.join(workspaceRoot, expandedPath);
                        if (fs.existsSync(fullPath)) {
                            const result = await checkPython(fullPath);
                            if (result.success)
                                return result;
                        }
                    }
                    else if (fs.existsSync(expandedPath)) {
                        const result = await checkPython(expandedPath);
                        if (result.success)
                            return result;
                    }
                }
                return { success: false };
            },
            async () => {
                try {
                    const pythonExtConfig = vscode.workspace.getConfiguration('python');
                    const pythonExtPath = pythonExtConfig.get('defaultInterpreterPath');
                    if (pythonExtPath && fs.existsSync(pythonExtPath)) {
                        const result = await checkPython(pythonExtPath);
                        if (result.success)
                            return result;
                    }
                    const pythonApi = await this.getPythonExtensionApi();
                    if (pythonApi) {
                        try {
                            const activePython = pythonApi.environment?.getActiveEnvironmentPath();
                            if (activePython?.path && fs.existsSync(activePython.path)) {
                                const result = await checkPython(activePython.path);
                                if (result.success)
                                    return result;
                            }
                        }
                        catch (e) {
                            console.error('访问Python API失败:', e);
                        }
                    }
                }
                catch (error) {
                    console.error('检测VS Code Python扩展失败:', error);
                }
                return { success: false };
            },
            async () => {
                if (useVirtualEnv && workspaceRoot) {
                    const venvPaths = ['.venv', 'venv', 'env', '.virtualenv', 'virtualenv'];
                    for (const venvPath of venvPaths) {
                        const venvPython = process.platform === 'win32'
                            ? path.join(workspaceRoot, venvPath, 'Scripts', 'python.exe')
                            : path.join(workspaceRoot, venvPath, 'bin', 'python');
                        if (fs.existsSync(venvPython)) {
                            const result = await checkPython(venvPython);
                            if (result.success)
                                return result;
                        }
                    }
                    const condaEnvs = ['.conda', 'conda-env', '.conda-env'];
                    for (const condaPath of condaEnvs) {
                        const condaPython = process.platform === 'win32'
                            ? path.join(workspaceRoot, condaPath, 'python.exe')
                            : path.join(workspaceRoot, condaPath, 'bin', 'python');
                        if (fs.existsSync(condaPython)) {
                            const result = await checkPython(condaPython);
                            if (result.success)
                                return result;
                        }
                    }
                }
                return { success: false };
            },
            async () => {
                const pythonCommands = process.platform === 'win32'
                    ? ['python.exe', 'python3.exe', 'py.exe']
                    : ['python3', 'python'];
                for (const cmd of pythonCommands) {
                    const result = await checkPython(cmd);
                    if (result.success)
                        return result;
                }
                return { success: false };
            }
        ];
        for (const attempt of attempts) {
            const result = await attempt();
            if (result.success && result.version && result.path) {
                return {
                    cmd: result.path,
                    version: result.version,
                    path: result.path
                };
            }
        }
        throw new Error('未找到可用的Python环境');
    }
    async getPythonExtensionApi() {
        try {
            const pythonExt = vscode.extensions.getExtension('ms-python.python');
            if (pythonExt) {
                if (!pythonExt.isActive) {
                    await pythonExt.activate();
                }
                return pythonExt.exports;
            }
        }
        catch (e) {
            console.error('获取Python扩展API失败:', e);
        }
        return undefined;
    }
    async getPipVersion(pythonCmd) {
        const result = await (0, utils_1.execWithDetails)(`${pythonCmd} -m pip --version`);
        if (result.success && result.stdout) {
            const match = result.stdout.match(/pip (\S+)/);
            return match ? match[1] : undefined;
        }
        return undefined;
    }
    async getInstalledPackages(pythonCmd) {
        const result = await (0, utils_1.execWithDetails)(`${pythonCmd} -m pip list --format=json`);
        if (result.success && result.stdout) {
            try {
                const packages = JSON.parse(result.stdout).map((pkg) => pkg.name.toLowerCase());
                return new Set(packages);
            }
            catch (error) {
                console.error('解析pip列表失败:', error);
            }
        }
        return new Set();
    }
    async findRequirementsFile(context, workspaceRoot) {
        const config = vscode.workspace.getConfiguration('markdown-to-word');
        const customPath = config.get('requirementsPath', '');
        if (customPath) {
            const fullPath = path.isAbsolute(customPath)
                ? customPath
                : workspaceRoot
                    ? path.join(workspaceRoot, customPath)
                    : customPath;
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
        }
        const extRequirements = path.join(context.extensionPath, 'scripts', 'requirements.txt');
        if (fs.existsSync(extRequirements)) {
            return extRequirements;
        }
        const srcRequirements = path.join(context.extensionPath, 'scripts', 'src', 'requirements.txt');
        if (fs.existsSync(srcRequirements)) {
            return srcRequirements;
        }
        return extRequirements;
    }
    isVirtualEnvironment(pythonPath) {
        const venvMarkers = ['venv', 'virtualenv', 'env', 'pyenv', 'conda'];
        const pathNormalized = pythonPath.toLowerCase().replace(/\\/g, '/');
        return venvMarkers.some(marker => pathNormalized.includes(`/${marker}/`) ||
            pathNormalized.includes(`\\${marker}\\`) ||
            pathNormalized.includes(`.${marker}`));
    }
    getVirtualEnvPath(pythonPath) {
        if (!this.isVirtualEnvironment(pythonPath)) {
            return undefined;
        }
        const parts = pythonPath.split(path.sep);
        const indexOfBin = parts.findIndex(p => p === 'bin' || p === 'Scripts');
        if (indexOfBin > 0) {
            return parts.slice(0, indexOfBin).join(path.sep);
        }
        return path.dirname(pythonPath);
    }
    expandEnvironmentVariables(value) {
        return value.replace(/%([^%]+)%/g, (_, key) => process.env[key] || '');
    }
    async validateEnvironment() {
        if (!this.environmentInfo) {
            throw new Error('环境信息未初始化');
        }
        const validations = [
            async () => {
                try {
                    const result = await (0, utils_1.execWithDetails)(`${this.environmentInfo.pythonCmd} -c "print('测试')" 2>&1`);
                    return result.success ? null : '无法执行Python命令';
                }
                catch (error) {
                    return `执行Python命令失败: ${error}`;
                }
            },
            async () => {
                if (!this.environmentInfo.pipVersion) {
                    return '未检测到pip';
                }
                return null;
            },
            async () => {
                const requiredPackages = ['python-docx', 'markdown', 'beautifulsoup4', 'lxml'];
                const missing = requiredPackages.filter(pkg => !this.environmentInfo.installedPackages.has(pkg.toLowerCase()));
                if (missing.length > 0) {
                    const installResult = await this.installDependencies();
                    if (!installResult.success) {
                        return `缺少必需的依赖包: ${missing.join(', ')}`;
                    }
                }
                return null;
            }
        ];
        const errors = (await Promise.all(validations.map(v => v())))
            .filter(result => result !== null);
        if (errors.length > 0) {
            throw new Error(`环境验证失败：\n${errors.join('\n')}`);
        }
    }
    async installDependencies() {
        if (!this.environmentInfo) {
            throw new Error('环境信息未初始化，请先调用initialize()');
        }
        const installScript = path.join(this.environmentInfo.extensionPath, 'scripts', 'install_dependencies.py');
        if (!fs.existsSync(installScript)) {
            return { success: false, message: '依赖安装脚本不存在' };
        }
        try {
            const result = await (0, utils_1.execWithDetails)(`${this.environmentInfo.pythonCmd} "${installScript}"`);
            if (result.success) {
                this.environmentInfo.installedPackages = await this.getInstalledPackages(this.environmentInfo.pythonCmd);
                return { success: true, message: '依赖安装成功' };
            }
            else {
                return { success: false, message: `依赖安装失败: ${result.stderr || '未知错误'}` };
            }
        }
        catch (error) {
            return { success: false, message: `安装依赖时出错: ${error}` };
        }
    }
    getEnvironmentInfo() {
        if (!this.environmentInfo) {
            throw new Error('环境信息未初始化，请先调用initialize()');
        }
        return this.environmentInfo;
    }
    async getDiagnostics() {
        if (!this.environmentInfo) {
            return '环境未初始化';
        }
        return `
环境诊断信息：
系统: ${this.environmentInfo.platform} (${this.environmentInfo.architecture})
Python版本: ${this.environmentInfo.pythonVersion}
Python路径: ${this.environmentInfo.pythonPath}
PIP版本: ${this.environmentInfo.pipVersion || '未检测到'}
虚拟环境: ${this.environmentInfo.isVirtualEnv ? '是' : '否'}
${this.environmentInfo.virtualEnvPath ? `虚拟环境路径: ${this.environmentInfo.virtualEnvPath}` : ''}
已安装的关键包:
- python-docx: ${this.environmentInfo.installedPackages.has('python-docx') ? '已安装' : '未安装'}
- markdown: ${this.environmentInfo.installedPackages.has('markdown') ? '已安装' : '未安装'}
- beautifulsoup4: ${this.environmentInfo.installedPackages.has('beautifulsoup4') ? '已安装' : '未安装'}
- lxml: ${this.environmentInfo.installedPackages.has('lxml') ? '已安装' : '未安装'}
工作区根目录: ${this.environmentInfo.workspaceRoot || '未检测到'}
扩展目录: ${this.environmentInfo.extensionPath}
requirements.txt: ${this.environmentInfo.requirementsPath}
`;
    }
}
exports.EnvironmentManager = EnvironmentManager;
//# sourceMappingURL=environmentManager.js.map