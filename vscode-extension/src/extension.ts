/**
 * @file extension.refactored.ts
 * @description 重构后的VS Code插件主入口文件
 * @author VSCode研发高手智能体
 */

import * as vscode from 'vscode';
import { DependencyService } from './services/dependencyService';
import { ConfigService } from './services/configService';
import { ConversionService } from './services/conversionService';
import { CommandService } from './services/commandService';
import { AutoInstallService } from './services/autoInstallService';
import { ErrorHandler, ErrorType } from './utils/errorHandler';
import { ProgressUI } from './ui/progressUI';

/**
 * 插件上下文管理器
 */
class ExtensionManager {
    private dependencyService: DependencyService;
    private configService: ConfigService;
    private conversionService: ConversionService;
    private commandService: CommandService;
    private errorHandler: ErrorHandler;
    private progressUI: ProgressUI;
    private context: vscode.ExtensionContext;
    private uncaughtExceptionHandler?: (error: Error) => void;
    private unhandledRejectionHandler?: (reason: any) => void;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.errorHandler = new ErrorHandler();
        this.progressUI = ProgressUI.getInstance();
        this.dependencyService = new DependencyService(context);
        this.configService = new ConfigService();
        this.conversionService = new ConversionService(this.configService);
        this.commandService = new CommandService(
            this.context,
            this.dependencyService,
            this.configService,
            this.conversionService
        );
    }

    /**
     * 初始化插件
     */
    async initialize(): Promise<void> {
        try {
            console.log('Markdown to Word 插件正在激活...');

            // 1. 检查依赖环境
            await this.checkDependencies();

            // 2. 配置服务已在构造函数中初始化
            // ConfigService 不需要额外的 initialize 调用

            // 3. 注册所有命令
            await this.registerCommands();

            // 4. 设置错误处理
            this.setupErrorHandling();

            console.log('Markdown to Word 插件激活成功！');
        } catch (error) {
            await this.errorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                ErrorType.UNKNOWN_ERROR,
                { showToUser: true }
            );
            throw error;
        }
    }

    /**
     * 检查依赖环境
     */
    private async checkDependencies(): Promise<void> {
        try {
            await this.progressUI.withProgress(
                '检查运行环境',
                async (progress) => {
                    progress.report({ message: '检查Node.js环境...', increment: 0 });
                    await this.dependencyService.checkAndInstallDependencies();
                    
                    progress.report({ message: '环境检查完成', increment: 100 });
                }
            );
        } catch (error) {
            // 依赖检查失败时，显示详细的错误信息和解决方案
            const choice = await vscode.window.showErrorMessage(
                '运行环境检查失败，插件可能无法正常工作。',
                '查看详情',
                '安装指南',
                '重新检查'
            );

            switch (choice) {
                case '查看详情':
                    await this.showDependencyDetails(error);
                    break;
                case '安装指南':
                    await this.dependencyService.showManualInstallationInstructions();
                    break;
                case '重新检查':
                    await this.checkDependencies();
                    break;
            }
            
            throw error;
        }
    }

    /**
     * 注册所有命令
     */
    private async registerCommands(): Promise<void> {
        this.commandService.registerCommands();
        
        console.log('命令注册完成');
    }

    /**
     * 设置错误处理
     */
    private setupErrorHandling(): void {
        // 创建错误处理函数
        this.uncaughtExceptionHandler = (error: Error) => {
            this.errorHandler.handleError(error, 'uncaughtException', {
                showToUser: true,
                logToConsole: true
            });
        };

        this.unhandledRejectionHandler = (reason: any) => {
            const error = reason instanceof Error ? reason : new Error(String(reason));
            this.errorHandler.handleError(error, 'unhandledRejection', {
                showToUser: true,
                logToConsole: true
            });
        };

        // 监听未捕获的异常
        process.on('uncaughtException', this.uncaughtExceptionHandler);

        // 监听未处理的Promise拒绝
        process.on('unhandledRejection', this.unhandledRejectionHandler);
    }

    /**
     * 显示依赖详情
     */
    private async showDependencyDetails(error: Error | unknown): Promise<void> {
        const outputChannel = vscode.window.createOutputChannel('Markdown to Word - 依赖检查');
        outputChannel.clear();
        outputChannel.appendLine('依赖环境检查失败');
        outputChannel.appendLine('='.repeat(50));
        
        if (error instanceof Error) {
            outputChannel.appendLine(`错误: ${error.message}`);
            if (error.stack) {
                outputChannel.appendLine('\n堆栈跟踪:');
                outputChannel.appendLine(error.stack);
            }
        } else {
            outputChannel.appendLine(`错误: ${String(error)}`);
        }
        
        outputChannel.appendLine('\n解决方案:');
        outputChannel.appendLine('1. 确保已安装Node.js (版本 >= 14)');
        outputChannel.appendLine('2. 确保已安装Python (版本 >= 3.7)');
        outputChannel.appendLine('3. 运行命令: npm install -g pandoc');
        outputChannel.appendLine('4. 重启VS Code');
        
        outputChannel.show();
    }

    /**
     * 清理资源
     */
    dispose(): void {
        try {
            // 移除全局错误监听器
            if (this.uncaughtExceptionHandler) {
                process.removeListener('uncaughtException', this.uncaughtExceptionHandler);
                this.uncaughtExceptionHandler = undefined;
            }
            if (this.unhandledRejectionHandler) {
                process.removeListener('unhandledRejection', this.unhandledRejectionHandler);
                this.unhandledRejectionHandler = undefined;
            }

            // 清理各个服务
            this.commandService?.dispose();
            this.conversionService?.dispose();
            // ConfigService doesn't have dispose method
            this.dependencyService?.dispose();
            this.errorHandler?.dispose();
            
            console.log('Markdown to Word 插件已停用');
        } catch (error) {
            console.error('插件停用时发生错误:', error);
        }
    }

    /**
     * 获取服务实例（用于测试或外部访问）
     */
    getServices() {
        return {
            dependency: this.dependencyService,
            config: this.configService,
            conversion: this.conversionService,
            command: this.commandService,
            errorHandler: this.errorHandler,
            progressUI: this.progressUI
        };
    }
}

// 全局扩展管理器实例
let extensionManager: ExtensionManager | undefined;

/**
 * 插件激活函数
 * @param context VS Code扩展上下文
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    try {
        // 初始化自动安装服务
        const autoInstallService = new AutoInstallService(context);
        
        // 自动化安装流程
        try {
            const autoInstallSuccess = await autoInstallService.autoInstall();
            if (!autoInstallSuccess) {
                vscode.window.showWarningMessage(
                    'Markdown to Word: 自动安装未完成，某些功能可能不可用。请查看输出面板了解详情。',
                    '查看详情'
                ).then(selection => {
                    if (selection === '查看详情') {
                        autoInstallService.getOutputChannel().show();
                    }
                });
            } else {
                vscode.window.showInformationMessage('Markdown to Word: 环境配置完成，插件已就绪！');
            }
        } catch (error) {
            console.error('自动安装过程出错:', error);
            vscode.window.showErrorMessage(`Markdown to Word: 自动安装失败 - ${error}`);
        }
        
        // 创建扩展管理器
        extensionManager = new ExtensionManager(context);
        
        // 初始化插件
        await extensionManager.initialize();
        
        // 将管理器和自动安装服务添加到订阅列表，确保在插件停用时正确清理
        context.subscriptions.push({
            dispose: () => {
                extensionManager?.dispose();
                autoInstallService?.dispose();
            }
        });
        
    } catch (error) {
        console.error('插件激活失败:', error);
        
        // 显示激活失败的错误信息
        const message = error instanceof Error ? error.message : String(error);
        await vscode.window.showErrorMessage(
            `Markdown to Word 插件激活失败: ${message}`,
            '查看日志'
        ).then(choice => {
            if (choice === '查看日志') {
                vscode.commands.executeCommand('workbench.action.toggleDevTools');
            }
        });
        
        throw error;
    }
}

/**
 * 插件停用函数
 */
export function deactivate(): void {
    extensionManager?.dispose();
    extensionManager = undefined;
}

/**
 * 获取扩展管理器实例（用于测试）
 */
export function getExtensionManager(): ExtensionManager | undefined {
    return extensionManager;
}

/**
 * 插件信息
 */
export const EXTENSION_INFO = {
    name: 'Markdown to Word',
    version: '1.0.0',
    description: 'Convert Markdown files to Word documents with advanced formatting support',
    author: 'VSCode研发高手智能体',
    repository: 'https://github.com/your-repo/markdown-to-word'
} as const;