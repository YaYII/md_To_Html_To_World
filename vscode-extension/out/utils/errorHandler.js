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
exports.globalErrorHandler = exports.ErrorHandler = exports.ErrorType = void 0;
exports.handleError = handleError;
exports.createContextErrorHandler = createContextErrorHandler;
const vscode = __importStar(require("vscode"));
var ErrorType;
(function (ErrorType) {
    ErrorType["DEPENDENCY_ERROR"] = "dependency";
    ErrorType["CONVERSION_ERROR"] = "conversion";
    ErrorType["CONFIG_ERROR"] = "config";
    ErrorType["FILE_ERROR"] = "file";
    ErrorType["NETWORK_ERROR"] = "network";
    ErrorType["UNKNOWN_ERROR"] = "unknown";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
class ErrorHandler {
    constructor() {
        this.errorHistory = [];
        this.maxHistorySize = 100;
        this.outputChannel = vscode.window.createOutputChannel('Markdown to Word - 错误日志');
    }
    handleError(error_1, context_1) {
        return __awaiter(this, arguments, void 0, function* (error, context, options = {}) {
            const errorInfo = this.createErrorInfo(error, context);
            this.addToHistory(errorInfo);
            const defaultOptions = {
                showToUser: true,
                logToConsole: true,
                logToOutput: true,
                showDetails: false,
                suggestActions: []
            };
            const finalOptions = Object.assign(Object.assign({}, defaultOptions), options);
            if (finalOptions.logToConsole) {
                this.logToConsole(errorInfo);
            }
            if (finalOptions.logToOutput) {
                this.logToOutput(errorInfo);
            }
            if (finalOptions.showToUser) {
                yield this.showToUser(errorInfo, finalOptions);
            }
        });
    }
    createErrorInfo(error, context) {
        let message;
        let stack;
        let type = ErrorType.UNKNOWN_ERROR;
        if (error instanceof Error) {
            message = error.message;
            stack = error.stack;
            type = this.inferErrorType(error.message);
        }
        else if (typeof error === 'string') {
            message = error;
            type = this.inferErrorType(error);
        }
        else {
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
    inferErrorType(message) {
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
    logToConsole(errorInfo) {
        console.error(`[${errorInfo.timestamp.toISOString()}] ${errorInfo.type.toUpperCase()}:`, errorInfo.message);
        if (errorInfo.context) {
            console.error('Context:', errorInfo.context);
        }
        if (errorInfo.stack) {
            console.error('Stack:', errorInfo.stack);
        }
    }
    logToOutput(errorInfo) {
        this.outputChannel.appendLine(`[${errorInfo.timestamp.toISOString()}] ${errorInfo.type.toUpperCase()}: ${errorInfo.message}`);
        if (errorInfo.context) {
            this.outputChannel.appendLine(`Context: ${errorInfo.context}`);
        }
        if (errorInfo.stack) {
            this.outputChannel.appendLine(`Stack: ${errorInfo.stack}`);
        }
        this.outputChannel.appendLine('---');
    }
    showToUser(errorInfo, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const userMessage = this.getUserFriendlyMessage(errorInfo);
            const actions = this.getSuggestedActions(errorInfo, options.suggestActions || []);
            let choice;
            switch (errorInfo.type) {
                case ErrorType.DEPENDENCY_ERROR:
                    choice = yield vscode.window.showErrorMessage(userMessage, ...actions);
                    break;
                case ErrorType.CONVERSION_ERROR:
                    choice = yield vscode.window.showErrorMessage(userMessage, ...actions);
                    break;
                case ErrorType.CONFIG_ERROR:
                    choice = yield vscode.window.showWarningMessage(userMessage, ...actions);
                    break;
                case ErrorType.FILE_ERROR:
                    choice = yield vscode.window.showErrorMessage(userMessage, ...actions);
                    break;
                case ErrorType.NETWORK_ERROR:
                    choice = yield vscode.window.showWarningMessage(userMessage, ...actions);
                    break;
                default:
                    choice = yield vscode.window.showErrorMessage(userMessage, ...actions);
                    break;
            }
            if (choice) {
                yield this.handleUserAction(choice, errorInfo);
            }
        });
    }
    getUserFriendlyMessage(errorInfo) {
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
    getSuggestedActions(errorInfo, customActions) {
        const actions = [...customActions];
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
        actions.push('查看详情');
        return actions;
    }
    handleUserAction(action, errorInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (action) {
                case '查看详情':
                    yield this.showErrorDetails(errorInfo);
                    break;
                case '检查依赖':
                    yield vscode.commands.executeCommand('markdowntoword.markdown-to-word.checkDependencies');
                    break;
                case '安装指南':
                    yield vscode.commands.executeCommand('markdowntoword.markdown-to-word.showInstallationGuide');
                    break;
                case '重置配置':
                    yield vscode.commands.executeCommand('markdowntoword.markdown-to-word.resetConfig');
                    break;
                case '打开配置':
                    yield vscode.commands.executeCommand('markdowntoword.markdown-to-word.openConfig');
                    break;
                case '重试':
                    yield vscode.window.showInformationMessage('请手动重试操作');
                    break;
                case '检查文件':
                    yield vscode.window.showInformationMessage('请检查文件是否存在且格式正确');
                    break;
                case '检查路径':
                    yield vscode.window.showInformationMessage('请检查文件路径是否正确');
                    break;
                case '重新选择文件':
                    yield vscode.window.showInformationMessage('请重新选择要处理的文件');
                    break;
                case '检查网络':
                    yield vscode.window.showInformationMessage('请检查网络连接是否正常');
                    break;
            }
        });
    }
    showErrorDetails(errorInfo) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    addToHistory(errorInfo) {
        this.errorHistory.unshift(errorInfo);
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
        }
    }
    getErrorHistory() {
        return [...this.errorHistory];
    }
    clearErrorHistory() {
        this.errorHistory = [];
    }
    getErrorStats() {
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
    static createQuickHandler(context, options) {
        const handler = new ErrorHandler();
        return (error) => handler.handleError(error, context, options);
    }
    dispose() {
        this.outputChannel.dispose();
        this.errorHistory = [];
    }
}
exports.ErrorHandler = ErrorHandler;
exports.globalErrorHandler = new ErrorHandler();
function handleError(error, context, options) {
    return __awaiter(this, void 0, void 0, function* () {
        return exports.globalErrorHandler.handleError(error, context, options);
    });
}
function createContextErrorHandler(context, options) {
    return (error) => exports.globalErrorHandler.handleError(error, context, options);
}
//# sourceMappingURL=errorHandler.js.map