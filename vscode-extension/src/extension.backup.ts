/**
 * @file extension.ts
 * @description VS Code 插件主入口文件 - 精简版
 * @author VSCode研发高手智能体
 * @version 2.0.0
 */

import * as vscode from 'vscode';
import { DependencyService } from './services/dependencyService';
import { ConfigService } from './services/configService';
import { ConversionService } from './services/conversionService';
import { CommandService } from './services/commandService';
import { ErrorHandler } from './utils/errorHandler';

/**
 * 插件激活函数
 * @param context VS Code 扩展上下文
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('正在激活插件 "Markdown to Word Converter"...');
    
    try {
        // 初始化错误处理器
        const errorHandler = new ErrorHandler();
        
        // 初始化核心服务
        const dependencyService = new DependencyService(context);
        const configService = new ConfigService();
        const conversionService = new ConversionService(configService);
        
        // 初始化命令服务
        const commandService = new CommandService(
            context,
            dependencyService,
            configService,
            conversionService
        );
        
        // 注册所有命令
        commandService.registerCommands();
        
        // 检查并安装依赖（异步执行，不阻塞激活）
        dependencyService.checkAndInstallDependencies().catch(error => {
            errorHandler.handleError(error, '依赖检查', {
                showToUser: true,
                logToConsole: true
            });
        });
        
        // 将服务实例保存到上下文中，供其他模块使用
        context.globalState.update('services', {
            dependency: dependencyService,
            config: configService,
            conversion: conversionService,
            command: commandService,
            errorHandler: errorHandler
        });
        
        console.log('插件 "Markdown to Word Converter" 激活完成！');
        
    } catch (error) {
        const errorHandler = new ErrorHandler();
        errorHandler.handleError(error, '插件激活', {
            showToUser: true,
            logToConsole: true
        });
        
        // 即使出错也要确保基本功能可用
        vscode.window.showErrorMessage(
            '插件激活时发生错误，部分功能可能不可用。请查看输出面板获取详细信息。',
            '查看输出'
        ).then(selection => {
            if (selection === '查看输出') {
                vscode.window.createOutputChannel('Markdown to Word').show();
            }
        });
    }
}

/**
 * 插件停用函数
 */
export function deactivate(): void {
    console.log('插件 "Markdown to Word Converter" 已停用');
    
    // 清理资源
    // 注意：VS Code会自动处理大部分清理工作，这里只需要处理特殊的清理逻辑
}

/**
 * 获取服务实例的辅助函数
 * @param context VS Code 扩展上下文
 * @returns 服务实例集合
 */
export function getServices(context: vscode.ExtensionContext): any {
    return context.globalState.get('services');
}