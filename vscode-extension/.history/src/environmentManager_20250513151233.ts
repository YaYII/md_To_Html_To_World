import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execWithDetails } from './utils';

/**
 * @description 环境信息接口
 */
export interface IEnvironmentInfo {
    // 系统信息
    platform: string;
    architecture: string;
    release: string;
    userInfo: {
        username: string;
        homedir: string;
    };
    
    // Python环境
    pythonCmd: string;
    pythonVersion: string;
    pythonPath: string;
    pipVersion?: string;
    
    // 工作区信息
    workspaceRoot?: string;
    extensionPath: string;
    
    // 虚拟环境信息
    isVirtualEnv: boolean;
    virtualEnvPath?: string;
    
    // 依赖信息
    requirementsPath: string;
    installedPackages: Set<string>;
}

export class EnvironmentManager {
    private static instance: EnvironmentManager;
    private environmentInfo?: IEnvironmentInfo;
    
    private constructor() {}
    
    static getInstance(): EnvironmentManager {
        if (!EnvironmentManager.instance) {
            EnvironmentManager.instance = new EnvironmentManager();
        }
        return EnvironmentManager.instance;
    }
    
    /**
     * 初始化并检测环境
     */
    async initialize(context: vscode.ExtensionContext): Promise<IEnvironmentInfo> {
        // 基本系统信息
        const basicInfo = {
            platform: process.platform,
            architecture: process.arch,
            release: os.release(),
            userInfo: {
                username: os.userInfo().username,
                homedir: os.homedir()
            }
        };
        
        // 获取工作区信息
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        
        // 检测Python环境
        const pythonEnv = await this.detectPythonEnvironment(workspaceRoot);
        
        // 检测pip版本
        const pipVersion = await this.getPipVersion(pythonEnv.cmd);
        
        // 检测已安装的包
        const installedPackages = await this.getInstalledPackages(pythonEnv.cmd);
        
        // 检测requirements.txt路径
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
    
    /**
     * 检测Python环境
     */
    private async detectPythonEnvironment(workspaceRoot?: string): Promise<{ cmd: string; version: string; path: string }> {
        const config = vscode.workspace.getConfiguration('markdown-to-word');
        const pythonPath = config.get<string>('pythonPath', '');
        const useVirtualEnv = config.get<boolean>('useVirtualEnv', true);
        
        // 检查函数
        const checkPython = async (cmd: string): Promise<{ success: boolean; version?: string; path?: string }> => {
            try {
                const quotedCmd = cmd.includes(' ') ? `"${cmd}"` : cmd;
                const versionResult = await execWithDetails(`${quotedCmd} --version`);
                if (!versionResult.success || !versionResult.stdout) return { success: false };
                
                const pathResult = await execWithDetails(`${quotedCmd} -c "import sys; print(sys.executable)"`);
                if (!pathResult.success || !pathResult.stdout) return { success: false };
                
                return {
                    success: true,
                    version: versionResult.stdout.trim(),
                    path: pathResult.stdout.trim()
                };
            } catch {
                return { success: false };
            }
        };
        
        // 按优先级尝试不同的Python环境
        const attempts = [
            // 1. 用户配置的路径
            async () => {
                if (pythonPath) {
                    const expandedPath = this.expandEnvironmentVariables(pythonPath);
                    if (!path.isAbsolute(expandedPath) && workspaceRoot) {
                        const fullPath = path.join(workspaceRoot, expandedPath);
                        if (fs.existsSync(fullPath)) {
                            const result = await checkPython(fullPath);
                            if (result.success) return result;
                        }
                    } else if (fs.existsSync(expandedPath)) {
                        const result = await checkPython(expandedPath);
                        if (result.success) return result;
                    }
                }
                return { success: false };
            },
            
            // 2. VS Code Python扩展
            async () => {
                try {
                    const pythonExtConfig = vscode.workspace.getConfiguration('python');
                    const pythonExtPath = pythonExtConfig.get<string>('defaultInterpreterPath');
                    if (pythonExtPath && fs.existsSync(pythonExtPath)) {
                        const result = await checkPython(pythonExtPath);
                        if (result.success) return result;
                    }

                    // 尝试获取活动的Python解释器
                    const pythonApi = await this.getPythonExtensionApi();
                    if (pythonApi) {
                        try {
                            const activePython = pythonApi.environment?.getActiveEnvironmentPath();
                            if (activePython?.path && fs.existsSync(activePython.path)) {
                                const result = await checkPython(activePython.path);
                                if (result.success) return result;
                            }
                        } catch (e) {
                            // 忽略Python API错误
                            console.error('访问Python API失败:', e);
                        }
                    }
                } catch (error) {
                    // 忽略错误，继续尝试其他方式
                    console.error('检测VS Code Python扩展失败:', error);
                }
                return { success: false };
            },
            
            // 3. 虚拟环境
            async () => {
                if (useVirtualEnv && workspaceRoot) {
                    const venvPaths = ['.venv', 'venv', 'env', '.virtualenv', 'virtualenv'];
                    
                    for (const venvPath of venvPaths) {
                        const venvPython = process.platform === 'win32'
                            ? path.join(workspaceRoot, venvPath, 'Scripts', 'python.exe')
                            : path.join(workspaceRoot, venvPath, 'bin', 'python');
                        
                        if (fs.existsSync(venvPython)) {
                            const result = await checkPython(venvPython);
                            if (result.success) return result;
                        }
                    }
                    
                    // 检查Conda环境
                    const condaEnvs = ['.conda', 'conda-env', '.conda-env'];
                    for (const condaPath of condaEnvs) {
                        const condaPython = process.platform === 'win32'
                            ? path.join(workspaceRoot, condaPath, 'python.exe')
                            : path.join(workspaceRoot, condaPath, 'bin', 'python');
                            
                        if (fs.existsSync(condaPython)) {
                            const result = await checkPython(condaPython);
                            if (result.success) return result;
                        }
                    }
                }
                return { success: false };
            },
            
            // 4. 系统PATH
            async () => {
                const pythonCommands = process.platform === 'win32'
                    ? ['python.exe', 'python3.exe', 'py.exe']
                    : ['python3', 'python'];
                
                for (const cmd of pythonCommands) {
                    const result = await checkPython(cmd);
                    if (result.success) return result;
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
    
    /**
     * 尝试获取Python扩展API
     */
    private async getPythonExtensionApi() {
        try {
            const pythonExt = vscode.extensions.getExtension('ms-python.python');
            if (pythonExt) {
                if (!pythonExt.isActive) {
                    await pythonExt.activate();
                }
                return pythonExt.exports;
            }
        } catch (e) {
            console.error('获取Python扩展API失败:', e);
        }
        return undefined;
    }
    
    /**
     * 获取pip版本
     */
    private async getPipVersion(pythonCmd: string): Promise<string | undefined> {
        const result = await execWithDetails(`${pythonCmd} -m pip --version`);
        if (result.success && result.stdout) {
            const match = result.stdout.match(/pip (\S+)/);
            return match ? match[1] : undefined;
        }
        return undefined;
    }
    
    /**
     * 获取已安装的包
     */
    private async getInstalledPackages(pythonCmd: string): Promise<Set<string>> {
        const result = await execWithDetails(`${pythonCmd} -m pip list --format=json`);
        if (result.success && result.stdout) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const packages = JSON.parse(result.stdout).map((pkg: any) => pkg.name.toLowerCase());
                return new Set(packages);
            } catch (error) {
                // 解析失败，返回空集合
                console.error('解析pip列表失败:', error);
            }
        }
        return new Set();
    }
    
    /**
     * 查找requirements.txt文件
     */
    private async findRequirementsFile(context: vscode.ExtensionContext, workspaceRoot?: string): Promise<string> {
        const config = vscode.workspace.getConfiguration('markdown-to-word');
        const customPath = config.get<string>('requirementsPath', '');
        
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
        
        // 在扩展目录中查找
        const extRequirements = path.join(context.extensionPath, 'scripts', 'requirements.txt');
        if (fs.existsSync(extRequirements)) {
            return extRequirements;
        }
        
        // 在src目录中查找
        const srcRequirements = path.join(context.extensionPath, 'scripts', 'src', 'requirements.txt');
        if (fs.existsSync(srcRequirements)) {
            return srcRequirements;
        }
        
        return extRequirements; // 返回扩展目录下的路径，即使文件不存在（后续会创建）
    }
    
    /**
     * 判断是否为虚拟环境
     */
    private isVirtualEnvironment(pythonPath: string): boolean {
        const venvMarkers = ['venv', 'virtualenv', 'env', 'pyenv', 'conda'];
        const pathNormalized = pythonPath.toLowerCase().replace(/\\/g, '/');
        
        return venvMarkers.some(marker => pathNormalized.includes(`/${marker}/`) || 
                                          pathNormalized.includes(`\\${marker}\\`) ||
                                          pathNormalized.includes(`.${marker}`));
    }
    
    /**
     * 获取虚拟环境路径
     */
    private getVirtualEnvPath(pythonPath: string): string | undefined {
        if (!this.isVirtualEnvironment(pythonPath)) {
            return undefined;
        }
        
        // 尝试提取虚拟环境根目录
        const parts = pythonPath.split(path.sep);
        const indexOfBin = parts.findIndex(p => p === 'bin' || p === 'Scripts');
        
        if (indexOfBin > 0) {
            return parts.slice(0, indexOfBin).join(path.sep);
        }
        
        return path.dirname(pythonPath);
    }
    
    /**
     * 展开环境变量
     */
    private expandEnvironmentVariables(value: string): string {
        return value.replace(/%([^%]+)%/g, (_, key) => process.env[key] || '');
    }
    
    /**
     * 验证环境
     */
    private async validateEnvironment(): Promise<void> {
        if (!this.environmentInfo) {
            throw new Error('环境信息未初始化');
        }
        
        const validations = [
            // 验证Python可用性
            async (): Promise<string | null> => {
                try {
                    const result = await execWithDetails(`${this.environmentInfo!.pythonCmd} -c "print('测试')" 2>&1`);
                    return result.success ? null : '无法执行Python命令';
                } catch (error) {
                    return `执行Python命令失败: ${error}`;
                }
            },
            
            // 验证pip可用性
            async (): Promise<string | null> => {
                if (!this.environmentInfo!.pipVersion) {
                    return '未检测到pip';
                }
                return null;
            },
            
            // 验证关键依赖
            async (): Promise<string | null> => {
                const requiredPackages = ['python-docx', 'markdown', 'beautifulsoup4', 'lxml'];
                const missing = requiredPackages.filter(pkg => 
                    !this.environmentInfo!.installedPackages.has(pkg.toLowerCase()));
                
                if (missing.length > 0) {
                    // 尝试安装缺失的依赖
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
    
    /**
     * 安装依赖包
     */
    private async installDependencies(): Promise<{ success: boolean; message: string }> {
        if (!this.environmentInfo) {
            throw new Error('环境信息未初始化，请先调用initialize()');
        }
        
        const installScript = path.join(this.environmentInfo.extensionPath, 'scripts', 'install_dependencies.py');
        
        if (!fs.existsSync(installScript)) {
            return { success: false, message: '依赖安装脚本不存在' };
        }
        
        try {
            const result = await execWithDetails(`${this.environmentInfo.pythonCmd} "${installScript}"`);
            
            if (result.success) {
                // 安装成功后更新已安装的包集合
                this.environmentInfo.installedPackages = await this.getInstalledPackages(this.environmentInfo.pythonCmd);
                return { success: true, message: '依赖安装成功' };
            } else {
                return { success: false, message: `依赖安装失败: ${result.stderr || '未知错误'}` };
            }
        } catch (error) {
            return { success: false, message: `安装依赖时出错: ${error}` };
        }
    }
    
    /**
     * 获取环境信息
     */
    getEnvironmentInfo(): IEnvironmentInfo {
        if (!this.environmentInfo) {
            throw new Error('环境信息未初始化，请先调用initialize()');
        }
        return this.environmentInfo;
    }
    
    /**
     * 获取环境诊断信息
     */
    async getDiagnostics(): Promise<string> {
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