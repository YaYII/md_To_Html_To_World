/**
 * @description 进度UI管理类
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
     * @param message 成功消息
     * @param outputFile 输出文件路径（可选）
     */
    public async showSuccess(message: string, outputFile?: string): Promise<void> {
        const actions: string[] = [];
        
        if (outputFile) {
            // 根据文件扩展名决定显示的按钮文本
            const fileExtension = outputFile.toLowerCase().split('.').pop();
            let actionText = '打开文档';
            
            if (fileExtension === 'docx') {
                actionText = '打开Word文档';
            } else if (fileExtension === 'html') {
                actionText = '打开HTML文档';
            }
            
            actions.push(actionText);
        }
        
        const result = await vscode.window.showInformationMessage(message, ...actions);
        
        if (result && outputFile) {
            // 打开生成的文档
            this.openDocument(outputFile);
        }
    }

    /**
     * @description 显示错误消息
     * @param error 错误对象
     */
    public async showError(error: Error): Promise<void> {
        const message = `转换失败: ${error.message}`;
        
        const result = await vscode.window.showErrorMessage(
            message,
            '查看详情',
            '重试'
        );
        
        if (result === '查看详情') {
            // 显示详细错误信息
            const detailedMessage = error.stack || error.message;
            const doc = await vscode.workspace.openTextDocument({
                content: detailedMessage,
                language: 'plaintext'
            });
            await vscode.window.showTextDocument(doc);
        }
    }

    /**
     * @description 打开文档
     * @param filePath 文件路径
     */
    private async openDocument(filePath: string): Promise<void> {
        try {
            // 使用VS Code的URI打开文件（适用于Windows路径）
            const uri = vscode.Uri.file(filePath);
            
            // 在操作系统默认应用中打开文件
            vscode.env.openExternal(uri);
        } catch (error) {
            vscode.window.showErrorMessage(`无法打开文件: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 