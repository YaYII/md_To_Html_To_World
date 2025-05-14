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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
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
    withProgress(title, task) {
        return __awaiter(this, void 0, void 0, function* () {
            return vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title,
                cancellable: false
            }, (progress, token) => __awaiter(this, void 0, void 0, function* () {
                this.currentProgress = progress;
                return yield task(progress, token);
            }));
        });
    }
    updateProgress(progress) {
        if (this.currentProgress) {
            this.currentProgress.report({
                message: `${progress.step} (${progress.percentage}%)${progress.detail ? ` - ${progress.detail}` : ''}`
            });
        }
    }
    showSuccess(message, outputFile) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const result = yield vscode.window.showInformationMessage(message, ...actions);
            if (result && outputFile) {
                this.openDocument(outputFile);
            }
        });
    }
    showError(error) {
        return __awaiter(this, void 0, void 0, function* () {
            const message = `转换失败: ${error.message}`;
            const result = yield vscode.window.showErrorMessage(message, '查看详情', '重试');
            if (result === '查看详情') {
                const detailedMessage = error.stack || error.message;
                const doc = yield vscode.workspace.openTextDocument({
                    content: detailedMessage,
                    language: 'plaintext'
                });
                yield vscode.window.showTextDocument(doc);
            }
        });
    }
    openDocument(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const uri = vscode.Uri.file(filePath);
                vscode.env.openExternal(uri);
            }
            catch (error) {
                vscode.window.showErrorMessage(`无法打开文件: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
}
exports.ProgressUI = ProgressUI;
//# sourceMappingURL=progressUI.js.map