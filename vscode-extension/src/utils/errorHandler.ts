/**
 * @file errorHandler.ts
 * @description 错误处理工具 - 提供统一的错误处理机制
 */
import * as vscode from 'vscode';

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
    private logToConsole(errorInfo: ErrorInfo): void {
        console.error(`[${errorInfo.timestamp.toISOString()}] ${errorInfo.type.toUpperCase()}:`, errorInfo.message);
        if (errorInfo.context) {
            console.error('Context:', errorInfo.context);
        }
        if (errorInfo.stack) {
            console.error('Stack:', errorInfo.stack);
        }
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
     */
    private async showToUser(errorInfo: ErrorInfo, options: ErrorHandlingOptions): Promise<void> {
        const userMessage = this.getUserFriendlyMessage(errorInfo);
        const actions = this.getSuggestedActions(errorInfo, options.suggestActions || []);
        
        let choice: string | undefined;
        
        switch (errorInfo.type) {
            case ErrorType.DEPENDENCY_ERROR:
                choice = await vscode.window.showErrorMessage(userMessage, ...actions);
                break;
            case ErrorType.CONVERSION_ERROR:
                choice = await vscode.window.showErrorMessage(userMessage, ...actions);
                break;
            case ErrorType.CONFIG_ERROR:
                choice = await vscode.window.showWarningMessage(userMessage, ...actions);
                break;
            case ErrorType.FILE_ERROR:
                choice = await vscode.window.showErrorMessage(userMessage, ...actions);
                break;
            case ErrorType.NETWORK_ERROR:
                choice = await vscode.window.showWarningMessage(userMessage, ...actions);
                break;
            default:
                choice = await vscode.window.showErrorMessage(userMessage, ...actions);
                break;
        }
        
        // 处理用户选择的操作
        if (choice) {
            await this.handleUserAction(choice, errorInfo);
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
     * 获取建议的操作
     */
    private getSuggestedActions(errorInfo: ErrorInfo, customActions: string[]): string[] {
        const actions = [...customActions];
        
        // 根据错误类型添加默认操作
        switch (errorInfo.type) {
            case ErrorType.DEPENDENCY_ERROR:
                actions.push('检查依赖', '安装指南');
                break;
            case ErrorType.CONVERSION_ERROR:
                actions.push('重试', '检查文件');
                break;
            case ErrorType.CONFIG_ERROR:
                actions.push('重置配置', '打开配置');
                break;
            case ErrorType.FILE_ERROR:
                actions.push('检查路径', '重新选择文件');
                break;
            case ErrorType.NETWORK_ERROR:
                actions.push('重试', '检查网络');
                break;
        }
        
        // 总是添加查看详情选项
        actions.push('查看详情');
        
        return actions;
    }

    /**
     * 处理用户选择的操作
     */
    private async handleUserAction(action: string, errorInfo: ErrorInfo): Promise<void> {
        switch (action) {
            case '查看详情':
                await this.showErrorDetails(errorInfo);
                break;
            case '检查依赖':
                await vscode.commands.executeCommand('markdowntoword.markdown-to-word.checkDependencies');
                break;
            case '安装指南':
                await vscode.commands.executeCommand('markdowntoword.markdown-to-word.showInstallationGuide');
                break;
            case '重置配置':
                await vscode.commands.executeCommand('markdowntoword.markdown-to-word.resetConfig');
                break;
            case '打开配置':
                await vscode.commands.executeCommand('markdowntoword.markdown-to-word.openConfig');
                break;
            case '重试':
                // 这里可以根据上下文决定重试什么操作
                await vscode.window.showInformationMessage('请手动重试操作');
                break;
            case '检查文件':
                await vscode.window.showInformationMessage('请检查文件是否存在且格式正确');
                break;
            case '检查路径':
                await vscode.window.showInformationMessage('请检查文件路径是否正确');
                break;
            case '重新选择文件':
                await vscode.window.showInformationMessage('请重新选择要处理的文件');
                break;
            case '检查网络':
                await vscode.window.showInformationMessage('请检查网络连接是否正常');
                break;
        }
    }

    /**
     * 显示错误详情
     */
    private async showErrorDetails(errorInfo: ErrorInfo): Promise<void> {
        this.outputChannel.clear();
        this.outputChannel.appendLine('错误详情');
        this.outputChannel.appendLine('='.repeat(50));
        this.outputChannel.appendLine(`时间: ${errorInfo.timestamp.toISOString()}`);
        this.outputChannel.appendLine(`类型: ${errorInfo.type}`);
        this.outputChannel.appendLine(`消息: ${errorInfo.message}`);
        
        if (errorInfo.context) {
            this.outputChannel.appendLine(`上下文: ${errorInfo.context}`);
        }
        
        if (errorInfo.stack) {
            this.outputChannel.appendLine('\n堆栈跟踪:');
            this.outputChannel.appendLine(errorInfo.stack);
        }
        
        if (errorInfo.details && typeof errorInfo.details === 'object') {
            this.outputChannel.appendLine('\n详细信息:');
            this.outputChannel.appendLine(JSON.stringify(errorInfo.details, null, 2));
        }
        
        this.outputChannel.show();
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