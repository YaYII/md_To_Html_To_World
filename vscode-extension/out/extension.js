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
exports.EXTENSION_INFO = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
exports.getExtensionManager = getExtensionManager;
const vscode = __importStar(require("vscode"));
const dependencyService_1 = require("./services/dependencyService");
const configService_1 = require("./services/configService");
const conversionService_1 = require("./services/conversionService");
const commandService_1 = require("./services/commandService");
const autoInstallService_1 = require("./services/autoInstallService");
const errorHandler_1 = require("./utils/errorHandler");
const progressUI_1 = require("./ui/progressUI");
class ExtensionManager {
    constructor(context) {
        this.context = context;
        this.errorHandler = new errorHandler_1.ErrorHandler();
        this.progressUI = progressUI_1.ProgressUI.getInstance();
        this.dependencyService = new dependencyService_1.DependencyService(context);
        this.configService = new configService_1.ConfigService();
        this.conversionService = new conversionService_1.ConversionService(this.configService);
        this.commandService = new commandService_1.CommandService(this.context, this.dependencyService, this.configService, this.conversionService);
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('Markdown to Word 插件正在激活...');
                yield this.checkDependencies();
                yield this.registerCommands();
                this.setupErrorHandling();
                console.log('Markdown to Word 插件激活成功！');
            }
            catch (error) {
                yield this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), errorHandler_1.ErrorType.UNKNOWN_ERROR, { showToUser: true });
                throw error;
            }
        });
    }
    checkDependencies() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.progressUI.withProgress('检查运行环境', (progress) => __awaiter(this, void 0, void 0, function* () {
                    progress.report({ message: '检查Node.js环境...', increment: 0 });
                    yield this.dependencyService.checkAndInstallDependencies();
                    progress.report({ message: '环境检查完成', increment: 100 });
                }));
            }
            catch (error) {
                const choice = yield vscode.window.showErrorMessage('运行环境检查失败，插件可能无法正常工作。', '查看详情', '安装指南', '重新检查');
                switch (choice) {
                    case '查看详情':
                        yield this.showDependencyDetails(error);
                        break;
                    case '安装指南':
                        yield this.dependencyService.showManualInstallationInstructions();
                        break;
                    case '重新检查':
                        yield this.checkDependencies();
                        break;
                }
                throw error;
            }
        });
    }
    registerCommands() {
        return __awaiter(this, void 0, void 0, function* () {
            this.commandService.registerCommands();
            console.log('命令注册完成');
        });
    }
    setupErrorHandling() {
        this.uncaughtExceptionHandler = (error) => {
            this.errorHandler.handleError(error, 'uncaughtException', {
                showToUser: true,
                logToConsole: true
            });
        };
        this.unhandledRejectionHandler = (reason) => {
            const error = reason instanceof Error ? reason : new Error(String(reason));
            this.errorHandler.handleError(error, 'unhandledRejection', {
                showToUser: true,
                logToConsole: true
            });
        };
        process.on('uncaughtException', this.uncaughtExceptionHandler);
        process.on('unhandledRejection', this.unhandledRejectionHandler);
    }
    showDependencyDetails(error) {
        return __awaiter(this, void 0, void 0, function* () {
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
            }
            else {
                outputChannel.appendLine(`错误: ${String(error)}`);
            }
            outputChannel.appendLine('\n解决方案:');
            outputChannel.appendLine('1. 确保已安装Node.js (版本 >= 14)');
            outputChannel.appendLine('2. 确保已安装Python (版本 >= 3.7)');
            outputChannel.appendLine('3. 运行命令: npm install -g pandoc');
            outputChannel.appendLine('4. 重启VS Code');
            outputChannel.show();
        });
    }
    dispose() {
        var _a, _b, _c, _d;
        try {
            if (this.uncaughtExceptionHandler) {
                process.removeListener('uncaughtException', this.uncaughtExceptionHandler);
                this.uncaughtExceptionHandler = undefined;
            }
            if (this.unhandledRejectionHandler) {
                process.removeListener('unhandledRejection', this.unhandledRejectionHandler);
                this.unhandledRejectionHandler = undefined;
            }
            (_a = this.commandService) === null || _a === void 0 ? void 0 : _a.dispose();
            (_b = this.conversionService) === null || _b === void 0 ? void 0 : _b.dispose();
            (_c = this.dependencyService) === null || _c === void 0 ? void 0 : _c.dispose();
            (_d = this.errorHandler) === null || _d === void 0 ? void 0 : _d.dispose();
            console.log('Markdown to Word 插件已停用');
        }
        catch (error) {
            console.error('插件停用时发生错误:', error);
        }
    }
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
let extensionManager;
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const autoInstallService = new autoInstallService_1.AutoInstallService(context);
            try {
                const autoInstallSuccess = yield autoInstallService.autoInstall();
                if (!autoInstallSuccess) {
                    vscode.window.showWarningMessage('Markdown to Word: 自动安装未完成，某些功能可能不可用。请查看输出面板了解详情。', '查看详情').then(selection => {
                        if (selection === '查看详情') {
                            autoInstallService.getOutputChannel().show();
                        }
                    });
                }
                else {
                    vscode.window.showInformationMessage('Markdown to Word: 环境配置完成，插件已就绪！');
                }
            }
            catch (error) {
                console.error('自动安装过程出错:', error);
                vscode.window.showErrorMessage(`Markdown to Word: 自动安装失败 - ${error}`);
            }
            extensionManager = new ExtensionManager(context);
            yield extensionManager.initialize();
            context.subscriptions.push({
                dispose: () => {
                    extensionManager === null || extensionManager === void 0 ? void 0 : extensionManager.dispose();
                    autoInstallService === null || autoInstallService === void 0 ? void 0 : autoInstallService.dispose();
                }
            });
        }
        catch (error) {
            console.error('插件激活失败:', error);
            const message = error instanceof Error ? error.message : String(error);
            yield vscode.window.showErrorMessage(`Markdown to Word 插件激活失败: ${message}`, '查看日志').then(choice => {
                if (choice === '查看日志') {
                    vscode.commands.executeCommand('workbench.action.toggleDevTools');
                }
            });
            throw error;
        }
    });
}
function deactivate() {
    extensionManager === null || extensionManager === void 0 ? void 0 : extensionManager.dispose();
    extensionManager = undefined;
}
function getExtensionManager() {
    return extensionManager;
}
exports.EXTENSION_INFO = {
    name: 'Markdown to Word',
    version: '1.0.0',
    description: 'Convert Markdown files to Word documents with advanced formatting support',
    author: 'VSCode研发高手智能体',
    repository: 'https://github.com/your-repo/markdown-to-word'
};
//# sourceMappingURL=extension.js.map