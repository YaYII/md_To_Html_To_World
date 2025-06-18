import * as vscode from 'vscode';
import * as os from 'os';
import { IEnvironmentInfo } from './types';
import { PythonDetector } from './pythonDetector';
import { PackageManager } from './packageManager';

/**
 * @description 环境管理器类
 */
export class EnvironmentManager {
    private static instance: EnvironmentManager;
    private environmentInfo?: IEnvironmentInfo;
    
    // 私有构造函数，用于单例模式实现
    private constructor() {
        // 单例模式，无需初始化操作
    }
    
    /**
     * @description 获取单例实例
     */
    static getInstance(): EnvironmentManager {
        if (!EnvironmentManager.instance) {
            EnvironmentManager.instance = new EnvironmentManager();
        }
        return EnvironmentManager.instance;
    }
    
    /**
     * @description 初始化并检测环境
     * @param context VS Code扩展上下文
     */
    async initialize(context: vscode.ExtensionContext): Promise<IEnvironmentInfo> {
        // 获取工作区信息
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        
        // 检测Python环境
        const pythonEnv = await PythonDetector.detect(workspaceRoot);
        
        // 检测pip版本
        const pipVersion = await PackageManager.getPipVersion(pythonEnv.cmd);
        
        // 检测已安装的包
        const installedPackages = await PackageManager.getInstalledPackages(pythonEnv.cmd);
        
        // 检测requirements.txt路径
        const requirementsPath = await PackageManager.findRequirementsFile(context, workspaceRoot);
        
        this.environmentInfo = {
            // 系统信息
            platform: process.platform,
            architecture: process.arch,
            release: os.release(),
            userInfo: {
                username: os.userInfo().username,
                homedir: os.homedir()
            },
            
            // Python环境
            pythonCmd: pythonEnv.cmd,
            pythonVersion: pythonEnv.version,
            pythonPath: pythonEnv.path,
            pipVersion,
            
            // 工作区信息
            workspaceRoot,
            extensionPath: context.extensionPath,
            
            // 虚拟环境信息
            isVirtualEnv: this.isVirtualEnvironment(pythonEnv.path),
            virtualEnvPath: this.getVirtualEnvPath(pythonEnv.path),
            
            // 依赖信息
            requirementsPath,
            installedPackages
        };
        
        await this.validateEnvironment();
        return this.environmentInfo;
    }
    
    /**
     * @description 判断是否为虚拟环境
     */
    private isVirtualEnvironment(pythonPath: string): boolean {
        return pythonPath.includes('venv') || 
               pythonPath.includes('virtualenv') || 
               process.env.VIRTUAL_ENV !== undefined;
    }
    
    /**
     * @description 获取虚拟环境路径
     */
    private getVirtualEnvPath(pythonPath: string): string | undefined {
        if (process.env.VIRTUAL_ENV) {
            return process.env.VIRTUAL_ENV;
        }
        
        const parts = pythonPath.split(/[/\\]/);
        const venvIndex = parts.findIndex(p => 
            p === 'venv' || 
            p === '.venv' || 
            p === 'virtualenv' || 
            p === 'env'
        );
        
        if (venvIndex !== -1) {
            return parts.slice(0, venvIndex + 1).join('/');
        }
        
        return undefined;
    }
    
    /**
     * @description 验证环境
     */
    private async validateEnvironment(): Promise<void> {
        if (!this.environmentInfo) {
            throw new Error('环境信息未初始化');
        }

        // 检查pip是否需要更新
        const needsPipUpgrade = await PackageManager.checkPipUpgrade(this.environmentInfo.pythonCmd);
        if (needsPipUpgrade) {
            await PackageManager.upgradePip(this.environmentInfo.pythonCmd);
        }

        // 安装所需依赖
        await PackageManager.installDependencies(
            this.environmentInfo.pythonCmd,
            this.environmentInfo.requirementsPath
        );
    }
    
    /**
     * @description 获取环境信息
     */
    getEnvironmentInfo(): IEnvironmentInfo {
        if (!this.environmentInfo) {
            throw new Error('环境信息未初始化');
        }
        return this.environmentInfo;
    }
    
    /**
     * @description 获取诊断信息
     */
    async getDiagnostics(): Promise<string> {
        if (!this.environmentInfo) {
            return '环境信息未初始化';
        }
        
        return [
            '系统信息:',
            `- 平台: ${this.environmentInfo.platform}`,
            `- 架构: ${this.environmentInfo.architecture}`,
            `- 发行版: ${this.environmentInfo.release}`,
            '',
            'Python环境:',
            `- Python命令: ${this.environmentInfo.pythonCmd}`,
            `- Python版本: ${this.environmentInfo.pythonVersion}`,
            `- Python路径: ${this.environmentInfo.pythonPath}`,
            `- Pip版本: ${this.environmentInfo.pipVersion || '未知'}`,
            '',
            '虚拟环境:',
            `- 是否虚拟环境: ${this.environmentInfo.isVirtualEnv}`,
            `- 虚拟环境路径: ${this.environmentInfo.virtualEnvPath || '无'}`,
            '',
            '工作区信息:',
            `- 工作区根目录: ${this.environmentInfo.workspaceRoot || '无'}`,
            `- 扩展路径: ${this.environmentInfo.extensionPath}`,
            '',
            '依赖信息:',
            `- Requirements文件: ${this.environmentInfo.requirementsPath}`,
            `- 已安装包数量: ${this.environmentInfo.installedPackages.size}`
        ].join('\n');
    }
} 