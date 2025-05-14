/**
 * @fileoverview 执行工具函数
 * @description 提供命令执行相关的工具函数
 */

import * as child_process from 'child_process';
import { promisify } from 'util';

const exec = promisify(child_process.exec);

/**
 * @description 执行命令的结果接口
 */
export interface IExecResult {
    /** 是否执行成功 */
    success: boolean;
    /** 标准输出 */
    stdout?: string;
    /** 标准错误 */
    stderr?: string;
}

/**
 * @description 将 Buffer 或字符串转换为字符串
 * @param data 要转换的数据
 */
function bufferToString(data: string | Buffer | undefined): string | undefined {
    if (data === undefined) {
        return undefined;
    }
    return data instanceof Buffer ? data.toString('utf8') : data;
}

/**
 * @description 执行命令并返回详细结果
 * @param command 要执行的命令
 * @param options 执行选项
 */
export async function execWithDetails(
    command: string,
    options?: child_process.ExecOptions
): Promise<IExecResult> {
    try {
        const { stdout, stderr } = await exec(command, {
            ...options,
            encoding: 'utf8'
        });
        
        return {
            success: true,
            stdout: bufferToString(stdout)?.trim(),
            stderr: bufferToString(stderr)?.trim()
        };
    } catch (error: unknown) {
        // 类型守卫确保安全访问错误属性
        const execError = error as { stdout?: string | Buffer; stderr?: string | Buffer; message?: string };
        return {
            success: false,
            stdout: bufferToString(execError.stdout)?.trim(),
            stderr: bufferToString(execError.stderr)?.trim() || (execError.message || '未知错误')
        };
    }
} 