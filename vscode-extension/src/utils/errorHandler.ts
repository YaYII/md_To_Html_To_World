/**
 * @file errorHandler.ts
 * @description 错误处理工具 - 提供统一的错误处理机制
 */
import * as vscode from 'vscode';
import { notifyError, notifyWarning } from './notify';

/**
 * 错误类型枚举
 */
export enum ErrorType {
    DEPENDENCY_ERROR = 'dependency',
    CONVERSION_ERROR = 'conversion',
    CONFIG_ERROR = 'config',
    FILE_ERROR = 'file',
    NETWORK_ERROR = 'network',
    UNKNOWN_ERROR = 'unknown'
}

/**
 * 错误信息接口
 */
export interface ErrorInfo {
    type: ErrorType;
    message: string;
    details?: any;
    stack?: string;
    timestamp: Date;
    context?: string;
}

/**
 * 错误处理选项
 */
export interface ErrorHandlingOptions {
    showToUser?: boolean;
    logToConsole?: boolean;
    logToOutput?: boolean;
    showDetails?: boolean;
    suggestActions?: string[];
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
    private outputChannel: vscode.OutputChannel;
    private errorHistory: ErrorInfo[] = [];
    private readonly maxHistorySize = 100;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Markdown to Word - 错误日志');
    }

    /**
     * 处理错误的主要方法
     */
    async handleError(
        error: Error | string | any,
        context?: string,
        options: ErrorHandlingOptions = {}
    ): Promise<void> {
        const errorInfo = this.createErrorInfo(error, context);
        
        // 添加到历史记录
        this.addToHistory(errorInfo);
        
        // 设置默认选项
        const defaultOptions: ErrorHandlingOptions = {
            showToUser: true,
            logToConsole: true,
            logToOutput: true,
            showDetails: false,
            suggestActions: []
        };
        const finalOptions = { ...defaultOptions, ...options };
        
        // 记录到控制台
        if (finalOptions.logToConsole) {
            this.logToConsole(errorInfo);
        }
        
        // 记录到输出通道
        if (finalOptions.logToOutput) {
            this.logToOutput(errorInfo);
        }
        
        // 显示给用户
        if (finalOptions.showToUser) {
            await this.showToUser(errorInfo, finalOptions);
        }
    }

    /**
     * 创建错误信息对象
     */
    private createErrorInfo(error: Error | string | any, context?: string): ErrorInfo {
        let message: string;
        let stack: string | undefined;
        let type: ErrorType = ErrorType.UNKNOWN_ERROR;
        
        if (error instanceof Error) {
            message = error.message;
            stack = error.stack;
            
            // 根据错误消息推断错误类型
            type = this.inferErrorType(error.message);
        } else if (typeof error === 'string') {
            message = error;
            type = this.inferErrorType(error);
        } else {
            message = String(error);
        }
        
        return {
            type,
            message,
            details: error,
            stack,
            timestamp: new Date(),
            context
        };
    }

    /**
     * 根据错误消息推断错误类型
     */
    private inferErrorType(message: string): ErrorType {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('node') || lowerMessage.includes('npm') || 
            lowerMessage.includes('dependency') || lowerMessage.includes('package')) {
            return ErrorType.DEPENDENCY_ERROR;
        }
        
        if (lowerMessage.includes('convert') || lowerMessage.includes('transform') ||
            lowerMessage.includes('pandoc') || lowerMessage.includes('docx')) {
            return ErrorType.CONVERSION_ERROR;
        }
        
        if (lowerMessage.includes('config') || lowerMessage.includes('setting') ||
            lowerMessage.includes('yaml') || lowerMessage.includes('json')) {
            return ErrorType.CONFIG_ERROR;
        }
        
        if (lowerMessage.includes('file') || lowerMessage.includes('path') ||
            lowerMessage.includes('directory') || lowerMessage.includes('enoent')) {
            return ErrorType.FILE_ERROR;
        }
        
        if (lowerMessage.includes('network') || lowerMessage.includes('timeout') ||
            lowerMessage.includes('connection') || lowerMessage.includes('fetch')) {
            return ErrorType.NETWORK_ERROR;
        }
        
        return ErrorType.UNKNOWN_ERROR;
    }

    /**
     * 记录到控制台
     */
    private logToConsole(_errorInfo: ErrorInfo): void {
        // console.error(`[${_errorInfo.timestamp.toISOString()}] ${_errorInfo.type.toUpperCase()}:`, _errorInfo.message);
        // if (_errorInfo.context) {
        //     console.error('Context:', _errorInfo.context);
        // }
        // if (_errorInfo.stack) {
        //     console.error('Stack:', _errorInfo.stack);
        // }
    }

    /**
     * 记录到输出通道
     */
    private logToOutput(errorInfo: ErrorInfo): void {
        this.outputChannel.appendLine(`[${errorInfo.timestamp.toISOString()}] ${errorInfo.type.toUpperCase()}: ${errorInfo.message}`);
        if (errorInfo.context) {
            this.outputChannel.appendLine(`Context: ${errorInfo.context}`);
        }
        if (errorInfo.stack) {
            this.outputChannel.appendLine(`Stack: ${errorInfo.stack}`);
        }
        this.outputChannel.appendLine('---');
    }

    /**
     * 显示给用户
     * 生产产品禁止错误弹窗：错误/警告一律不弹窗，只写输出通道（用户可查「输出」面板）。
     * （旧实现用 showErrorMessage/showWarningMessage 弹窗打扰用户，已废弃）
     */
    private showToUser(errorInfo: ErrorInfo, _options: ErrorHandlingOptions): void {
        const userMessage = this.getUserFriendlyMessage(errorInfo);
        if (errorInfo.type === ErrorType.CONFIG_ERROR || errorInfo.type === ErrorType.NETWORK_ERROR) {
            notifyWarning(userMessage);
        } else {
            notifyError(userMessage);
        }
    }

    /**
     * 获取用户友好的错误消息
     */
    private getUserFriendlyMessage(errorInfo: ErrorInfo): string {
        const baseMessage = errorInfo.context ? `${errorInfo.context}: ${errorInfo.message}` : errorInfo.message;
        
        switch (errorInfo.type) {
            case ErrorType.DEPENDENCY_ERROR:
                return `依赖错误: ${baseMessage}`;
            case ErrorType.CONVERSION_ERROR:
                return `转换错误: ${baseMessage}`;
            case ErrorType.CONFIG_ERROR:
                return `配置错误: ${baseMessage}`;
            case ErrorType.FILE_ERROR:
                return `文件错误: ${baseMessage}`;
            case ErrorType.NETWORK_ERROR:
                return `网络错误: ${baseMessage}`;
            default:
                return `错误: ${baseMessage}`;
        }
    }

    /**
     * 添加到历史记录
     */
    private addToHistory(errorInfo: ErrorInfo): void {
        this.errorHistory.unshift(errorInfo);
        
        // 限制历史记录大小
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * 获取错误历史
     */
    getErrorHistory(): ErrorInfo[] {
        return [...this.errorHistory];
    }

    /**
     * 清除错误历史
     */
    clearErrorHistory(): void {
        this.errorHistory = [];
    }

    /**
     * 获取错误统计
     */
    getErrorStats(): { [key in ErrorType]: number } {
        const stats = {
            [ErrorType.DEPENDENCY_ERROR]: 0,
            [ErrorType.CONVERSION_ERROR]: 0,
            [ErrorType.CONFIG_ERROR]: 0,
            [ErrorType.FILE_ERROR]: 0,
            [ErrorType.NETWORK_ERROR]: 0,
            [ErrorType.UNKNOWN_ERROR]: 0
        };
        
        this.errorHistory.forEach(error => {
            stats[error.type]++;
        });
        
        return stats;
    }

    /**
     * 创建快速错误处理方法
     */
    static createQuickHandler(context: string, options?: ErrorHandlingOptions) {
        const handler = new ErrorHandler();
        return (error: Error | string | any) => handler.handleError(error, context, options);
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.outputChannel.dispose();
        this.errorHistory = [];
    }
}

/**
 * 全局错误处理器实例
 */
export const globalErrorHandler = new ErrorHandler();

/**
 * 便捷的错误处理函数
 */
export async function handleError(
    error: Error | string | any,
    context?: string,
    options?: ErrorHandlingOptions
): Promise<void> {
    return globalErrorHandler.handleError(error, context, options);
}

/**
 * 创建特定上下文的错误处理器
 */
export function createContextErrorHandler(context: string, options?: ErrorHandlingOptions) {
    return (error: Error | string | any) => globalErrorHandler.handleError(error, context, options);
}
