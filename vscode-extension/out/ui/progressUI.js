"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressUI = void 0;
const vscode = __importStar(require("vscode"));
class ProgressUI {
    constructor() { }
    static getInstance() {
        if (!ProgressUI.instance) {
            ProgressUI.instance = new ProgressUI();
        }
        return ProgressUI.instance;
    }
    async withProgress(title, task) {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable: false
        }, async (progress, token) => {
            this.currentProgress = progress;
            return await task(progress, token);
        });
    }
    updateProgress(progress) {
        if (this.currentProgress) {
            this.currentProgress.report({
                message: `${progress.step} (${progress.percentage}%)${progress.detail ? ` - ${progress.detail}` : ''}`
            });
        }
    }
    async showSuccess(message, outputFile) {
        const action = await vscode.window.showInformationMessage(message, { modal: false, detail: `文件已保存至: ${outputFile}` }, '打开文件', '打开所在文件夹');
        if (action === '打开文件') {
            await vscode.env.openExternal(vscode.Uri.file(outputFile));
        }
        else if (action === '打开所在文件夹') {
            await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputFile));
        }
    }
    async showError(error) {
        const selection = await vscode.window.showErrorMessage(error.message || '转换过程中发生未知错误。', '查看错误日志');
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
exports.ProgressUI = ProgressUI;
//# sourceMappingURL=progressUI.js.map