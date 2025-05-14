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
        const actions = [];
        if (outputFile) {
            const fileExtension = outputFile.toLowerCase().split('.').pop();
            let actionText = '打开文档';
            if (fileExtension === 'docx') {
                actionText = '打开Word文档';
            }
            else if (fileExtension === 'html') {
                actionText = '打开HTML文档';
            }
            actions.push(actionText);
        }
        const result = await vscode.window.showInformationMessage(message, ...actions);
        if (result && outputFile) {
            this.openDocument(outputFile);
        }
    }
    async showError(error) {
        const message = `转换失败: ${error.message}`;
        const result = await vscode.window.showErrorMessage(message, '查看详情', '重试');
        if (result === '查看详情') {
            const detailedMessage = error.stack || error.message;
            const doc = await vscode.workspace.openTextDocument({
                content: detailedMessage,
                language: 'plaintext'
            });
            await vscode.window.showTextDocument(doc);
        }
    }
    async openDocument(filePath) {
        try {
            const uri = vscode.Uri.file(filePath);
            vscode.env.openExternal(uri);
        }
        catch (error) {
            vscode.window.showErrorMessage(`无法打开文件: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.ProgressUI = ProgressUI;
//# sourceMappingURL=progressUI.js.map