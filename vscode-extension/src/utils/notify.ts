/**
 * @file notify.ts
 * @description 生产模式通知策略
 *
 * 生产产品禁止错误弹窗（用户硬性要求）：
 * - 错误 / 警告消息：**不弹窗**，只写入输出通道（用户可通过「输出」面板查看）
 * - 正常消息（成功提示等）：保留弹窗（showInformationMessage）
 *
 * 统一从这里发通知，禁止在业务代码里直接调用 showErrorMessage / showWarningMessage
 * （错误类警告也不弹，避免生产环境打扰用户 / 被误认为插件问题）。
 */
import * as vscode from 'vscode';

const outputChannel = vscode.window.createOutputChannel('Markdown to Word');

/** 错误消息：静默（只写输出通道，不弹窗） */
export function notifyError(message: string): void {
    outputChannel.appendLine(`[${new Date().toISOString()}] [ERROR] ${message}`);
}

/** 警告消息：静默（只写输出通道，不弹窗） */
export function notifyWarning(message: string): void {
    outputChannel.appendLine(`[${new Date().toISOString()}] [WARN] ${message}`);
}

/** 正常消息：保留弹窗 */
export function notifyInfo(message: string, ...items: string[]): Thenable<string | undefined> {
    return vscode.window.showInformationMessage(message, ...items);
}
