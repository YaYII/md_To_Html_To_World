import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execWithDetails } from '../utils';
import { IPythonEnvironmentResult, IPythonCheckResult, EnvironmentError } from './types';

/**
 * @description Python环境检测工具类
 */
export class PythonDetector {
    /**
     * @description 检测Python环境
     * @param workspaceRoot 工作区根目录
     * @returns Python环境信息
     */
    static async detect(workspaceRoot?: string): Promise<IPythonEnvironmentResult> {
        const config = vscode.workspace.getConfiguration('markdown-to-word');
        const pythonPathFromConfig = config.get<string>('pythonPath', '');
        const useVirtualEnv = config.get<boolean>('useVirtualEnv', true);

        // 按优先级尝试不同的Python环境
        const attempts = [
            // 1. 用户配置的路径
            async () => await this.checkUserConfigPath(pythonPathFromConfig, workspaceRoot),
            // 2. VS Code Python扩展
            async () => await this.checkVSCodePythonExt(),
            // 3. 虚拟环境
            async () => await this.checkVirtualEnv(useVirtualEnv, workspaceRoot),
            // 4. 系统PATH
            async () => await this.checkSystemPath()
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

        throw new EnvironmentError('未找到可用的Python环境');
    }

    /**
     * @description 检查用户配置的Python路径
     */
    private static async checkUserConfigPath(pythonPath: string, workspaceRoot?: string): Promise<IPythonCheckResult> {
        if (!pythonPath) {
            return { success: false };
        }

        let expandedPath = this.expandEnvironmentVariables(pythonPath);
        if (!path.isAbsolute(expandedPath) && workspaceRoot) {
            expandedPath = path.join(workspaceRoot, expandedPath);
        }

        return await this.checkPython(expandedPath);
    }

    /**
     * @description 检查VS Code Python扩展配置
     */
    private static async checkVSCodePythonExt(): Promise<IPythonCheckResult> {
        try {
            const pythonExtConfig = vscode.workspace.getConfiguration('python');
            const pythonExtPath = pythonExtConfig.get<string>('defaultInterpreterPath');
            if (pythonExtPath) {
                return await this.checkPython(pythonExtPath);
            }
        } catch {
            // 忽略错误，继续尝试其他方式
        }
        return { success: false };
    }

    /**
     * @description 检查虚拟环境
     */
    private static async checkVirtualEnv(useVirtualEnv: boolean, workspaceRoot?: string): Promise<IPythonCheckResult> {
        if (!useVirtualEnv || !workspaceRoot) {
            return { success: false };
        }

        const venvPaths = ['.venv', 'venv', 'env'];
        for (const venvPath of venvPaths) {
            const venvPython = process.platform === 'win32'
                ? path.join(workspaceRoot, venvPath, 'Scripts', 'python.exe')
                : path.join(workspaceRoot, venvPath, 'bin', 'python');
            
            if (fs.existsSync(venvPython)) {
                const result = await this.checkPython(venvPython);
                if (result.success) {
                    return result;
                }
            }
        }

        return { success: false };
    }

    /**
     * @description 检查系统PATH中的Python
     */
    private static async checkSystemPath(): Promise<IPythonCheckResult> {
        const pythonCommands = process.platform === 'win32'
            ? ['python.exe', 'python3.exe']
            : ['python3', 'python'];
        
        for (const cmd of pythonCommands) {
            const result = await this.checkPython(cmd);
            if (result.success) {
                return result;
            }
        }

        return { success: false };
    }

    /**
     * @description 检查Python命令是否可用
     */
    private static async checkPython(cmd: string): Promise<IPythonCheckResult> {
        try {
            const quotedCmd = cmd.includes(' ') ? `"${cmd}"` : cmd;
            const versionResult = await execWithDetails(`${quotedCmd} --version`);
            if (!versionResult.success || !versionResult.stdout) {
                return { success: false };
            }
            
            const pathResult = await execWithDetails(`${quotedCmd} -c "import sys; print(sys.executable)"`);
            if (!pathResult.success || !pathResult.stdout) {
                return { success: false };
            }
            
            return {
                success: true,
                version: versionResult.stdout.trim(),
                path: pathResult.stdout.trim()
            };
        } catch {
            return { success: false };
        }
    }

    /**
     * @description 展开环境变量
     */
    private static expandEnvironmentVariables(value: string): string {
        // 优先处理 Windows 风格的环境变量 (%VAR%)
        let expandedValue = value.replace(/%([^%]+)%/g, (_, key) => process.env[key] || '');
        // 再处理 POSIX 风格的环境变量 (${VAR} 或 $VAR)
        expandedValue = expandedValue.replace(/\${([^}]+)}/g, (_, key) => process.env[key] || '');
        expandedValue = expandedValue.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key) => process.env[key] || '');
        return expandedValue;
    }
} 