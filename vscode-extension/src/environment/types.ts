/**
 * @description 环境信息接口定义
 */
export interface IEnvironmentInfo {
    /** 系统信息 */
    platform: string;
    architecture: string;
    release: string;
    userInfo: {
        username: string;
        homedir: string;
    };
    
    /** Python环境 */
    pythonCmd: string;
    pythonVersion: string;
    pythonPath: string;
    pipVersion?: string;
    
    /** 工作区信息 */
    workspaceRoot?: string;
    extensionPath: string;
    
    /** 虚拟环境信息 */
    isVirtualEnv: boolean;
    virtualEnvPath?: string;
    
    /** 依赖信息 */
    requirementsPath: string;
    installedPackages: Set<string>;
}

/**
 * @description Python环境检测结果
 */
export interface IPythonEnvironmentResult {
    cmd: string;
    version: string;
    path: string;
}

/**
 * @description Python检测结果
 */
export interface IPythonCheckResult {
    success: boolean;
    version?: string;
    path?: string;
}

/**
 * @description 环境验证错误
 */
export class EnvironmentError extends Error {
    constructor(message: string, public details?: unknown) {
        super(message);
        this.name = 'EnvironmentError';
    }
} 