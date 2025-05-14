/**
 * @description 进度显示UI处理类
 */
import * as vscode from 'vscode';
import { IConversionProgress } from '../core/types';

export class ProgressUI {
    private static instance: ProgressUI;
    private currentProgress?: vscode.Progress<{ message?: string; increment?: number }>;

    private constructor() {}

    /**
     * @description 获取UI实例
     */
    public static getInstance(): ProgressUI {
        if (!ProgressUI.instance) {
            ProgressUI.instance = new ProgressUI();
        }
        return ProgressUI.instance;
    }

    /**
     * @description 显示进度
     * @param title 进度标题
     * @param task 要执行的任务
     */
    public async withProgress<T>(
        title: string,
        task: (
            progress: vscode.Progress<{ message?: string; increment?: number }>,
            token: vscode.CancellationToken
        ) => Thenable<T>
    ): Promise<T> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title,
                cancellable: false
            },
            async (progress, token) => {
                this.currentProgress = progress;
                return await task(progress, token);
            }
        );
    }

    /**
     * @description 更新进度信息
     * @param progress 进度信息
     */
    public updateProgress(progress: IConversionProgress): void {
        if (this.currentProgress) {
            this.currentProgress.report({
                message: `${progress.step} (${progress.percentage}%)${
                    progress.detail ? ` - ${progress.detail}` : ''
                }`
            });
        }
    }

    /**
     * @description 显示成功消息
     * @param message 消息内容
     * @param outputFile 输出文件路径
     */
    public async showSuccess(message: string, outputFile: string): Promise<void> {
        const action = await vscode.window.showInformationMessage(
            message,
            { modal: false, detail: `文件已保存至: ${outputFile}` },
            '打开文件',
            '打开所在文件夹'
        );

        if (action === '打开文件') {
            await vscode.env.openExternal(vscode.Uri.file(outputFile));
        } else if (action === '打开所在文件夹') {
            await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputFile));
        }
    }

    /**
     * @description 显示错误消息
     * @param error 错误对象
     */
    public async showError(error: Error): Promise<void> {
        const selection = await vscode.window.showErrorMessage(
            error.message || '转换过程中发生未知错误。',
            '查看错误日志'
        );

        if (selection === '查看错误日志') {
            const channel = vscode.window.createOutputChannel('Markdown 转换器 错误日志');
            channel.show(true);
            channel.appendLine(`======== ${new Date().toISOString()} ========`);
            channel.appendLine('错误详情:');
            channel.appendLine(`  消息: ${error.message || '未知错误'}`);
            if (error.stack) {
                channel.appendLine('  错误堆栈:');
                channel.appendLine(error.stack);
            }
            channel.appendLine('======== 日志结束 ========');
        }
    }
} 