import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execWithDetails } from '../utils';
import { EnvironmentError } from './types';

/**
 * @description Python包管理工具类
 */
export class PackageManager {
    /**
     * @description 获取pip版本
     * @param pythonCmd Python命令路径
     */
    static async getPipVersion(pythonCmd: string): Promise<string | undefined> {
        const result = await execWithDetails(`${pythonCmd} -m pip --version`);
        if (result.success && result.stdout) {
            const match = result.stdout.match(/pip (\S+)/);
            return match ? match[1] : undefined;
        }
        return undefined;
    }

    /**
     * @description 获取已安装的包列表
     * @param pythonCmd Python命令路径
     */
    static async getInstalledPackages(pythonCmd: string): Promise<Set<string>> {
        const result = await execWithDetails(`${pythonCmd} -m pip list --format=json`);
        if (result.success && result.stdout) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const packages = JSON.parse(result.stdout).map((pkg: any) => String(pkg.name).toLowerCase());
                return new Set(packages);
            } catch (error: unknown) {
                throw new EnvironmentError('解析已安装包列表失败', error);
            }
        }
        return new Set();
    }

    /**
     * @description 查找requirements.txt文件
     * @param context VS Code扩展上下文
     * @param workspaceRoot 工作区根目录
     */
    static async findRequirementsFile(context: vscode.ExtensionContext, workspaceRoot?: string): Promise<string> {
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
        
        const searchPaths = [
            workspaceRoot && path.join(workspaceRoot, 'requirements.txt'),
            path.join(context.extensionPath, 'scripts', 'requirements.txt'),
            path.join(context.extensionPath, 'requirements.txt')
        ].filter(Boolean) as string[];
        
        for (const p of searchPaths) {
            if (fs.existsSync(p)) {
                return p;
            }
        }

        throw new EnvironmentError('未找到requirements.txt文件');
    }

    /**
     * @description 安装依赖包
     * @param pythonCmd Python命令路径
     * @param requirementsPath requirements.txt文件路径
     */
    static async installDependencies(pythonCmd: string, requirementsPath: string): Promise<void> {
        const result = await execWithDetails(
            `${pythonCmd} -m pip install -r "${requirementsPath}"`
        );

        if (!result.success) {
            throw new EnvironmentError('安装依赖包失败', {
                stdout: result.stdout,
                stderr: result.stderr
            });
        }
    }

    /**
     * @description 检查是否需要更新pip
     * @param pythonCmd Python命令路径
     */
    static async checkPipUpgrade(pythonCmd: string): Promise<boolean> {
        const result = await execWithDetails(`${pythonCmd} -m pip list --outdated`);
        return result.success && result.stdout ? result.stdout.toLowerCase().includes('pip') : false;
    }

    /**
     * @description 更新pip
     * @param pythonCmd Python命令路径
     */
    static async upgradePip(pythonCmd: string): Promise<void> {
        const result = await execWithDetails(
            `${pythonCmd} -m pip install --upgrade pip`
        );

        if (!result.success) {
            throw new EnvironmentError('更新pip失败', {
                stdout: result.stdout,
                stderr: result.stderr
            });
        }
    }
} 