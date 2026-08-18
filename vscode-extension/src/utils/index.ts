/**
 * @fileoverview 工具函数模块
 * @description 包含项目中常用的工具函数
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * 展开环境变量
 * @param {string} value - 包含环境变量的字符串
 * @returns {string} 展开后的字符串
 */
export function expandEnvironmentVariables(value: string): string {
    return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        return process.env[varName] || match;
    });
}

/**
 * 检查文件是否存在
 * @param {string} filePath - 文件路径
 * @returns {boolean} 文件是否存在
 */
export function fileExists(filePath: string): boolean {
    try {
        fs.accessSync(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * 获取平台特定的可执行文件扩展名
 * @returns {string} 可执行文件扩展名
 */
export function getExecutableExtension(): string {
    return os.platform() === 'win32' ? '.exe' : '';
}

/**
 * 规范化路径（处理跨平台路径分隔符）
 * @param {string} inputPath - 输入路径
 * @returns {string} 规范化后的路径
 */
export function normalizePath(inputPath: string): string {
    return path.normalize(inputPath).replace(/\\/g, '/');
}

/**
 * 异步等待指定时间
 * @param {number} ms - 等待毫秒数
 * @returns {Promise<void>}
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建目录（如果不存在）
 * @param {string} dirPath - 目录路径
 */
export function ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * 获取用户主目录
 * @returns {string} 用户主目录路径
 */
export function getUserHome(): string {
    return os.homedir();
}

export * from './execUtils'; 