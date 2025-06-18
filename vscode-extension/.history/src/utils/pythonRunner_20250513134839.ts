/**
 * @fileoverview Python脚本执行器
 * @description 处理Python脚本的执行和输出
 */

import * as child_process from 'child_process';
import { EnvironmentManager } from '../environmentManager';

export interface PythonRunnerOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeout?: number;
}

export interface PythonRunnerResult {
    success: boolean;
    stdout: string;
    stderr: string;
    error?: Error;
}

/**
 * Python脚本执行器类
 */
export class PythonRunner {
    private envManager: EnvironmentManager;
    
    constructor(envManager: EnvironmentManager) {
        this.envManager = envManager;
    }
    
    /**
     * 执行Python脚本
     * @param scriptPath - 脚本路径
     * @param args - 脚本参数
     * @param options - 执行选项
     */
    public async runScript(
        scriptPath: string,
        args: string[] = [],
        options: PythonRunnerOptions = {}
    ): Promise<PythonRunnerResult> {
        try {
            const env = this.envManager.getEnvironmentInfo();
            const pythonPath = env.pythonCmd;
            
            // 构建完整的命令参数
            const fullArgs = [scriptPath, ...args];
            
            // 设置环境变量
            const processEnv = {
                ...process.env,
                ...options.env,
                PYTHONUNBUFFERED: '1' // 禁用Python输出缓冲
            };
            
            // 执行Python脚本
            return await new Promise<PythonRunnerResult>((resolve, reject) => {
                const process = child_process.spawn(pythonPath, fullArgs, {
                    cwd: options.cwd,
                    env: processEnv
                });
                
                let stdout = '';
                let stderr = '';
                
                // 收集标准输出
                process.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
                
                // 收集标准错误
                process.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                
                // 处理超时
                let timeoutHandle: NodeJS.Timeout | undefined;
                if (options.timeout) {
                    timeoutHandle = setTimeout(() => {
                        process.kill();
                        reject(new Error(`执行超时 (${options.timeout}ms)`));
                    }, options.timeout);
                }
                
                // 处理完成
                process.on('close', (code) => {
                    if (timeoutHandle) {
                        clearTimeout(timeoutHandle);
                    }
                    
                    resolve({
                        success: code === 0,
                        stdout,
                        stderr
                    });
                });
                
                // 处理错误
                process.on('error', (error) => {
                    if (timeoutHandle) {
                        clearTimeout(timeoutHandle);
                    }
                    
                    resolve({
                        success: false,
                        stdout,
                        stderr,
                        error
                    });
                });
            });
            
        } catch (error) {
            return {
                success: false,
                stdout: '',
                stderr: '',
                error: error as Error
            };
        }
    }
    
    /**
     * 验证Python环境
     */
    public async validateEnvironment(): Promise<boolean> {
        try {
            const result = await this.runScript('-c', ['print("测试Python环境")']);
            return result.success;
        } catch {
            return false;
        }
    }
} 