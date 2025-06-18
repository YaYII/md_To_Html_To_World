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
exports.activate = activate;
exports.deactivate = deactivate;
exports.getServices = getServices;
const vscode = __importStar(require("vscode"));
const dependencyService_1 = require("./services/dependencyService");
const configService_1 = require("./services/configService");
const conversionService_1 = require("./services/conversionService");
const commandService_1 = require("./services/commandService");
const errorHandler_1 = require("./utils/errorHandler");
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('正在激活插件 "Markdown to Word Converter"...');
        try {
            const errorHandler = new errorHandler_1.ErrorHandler();
            const dependencyService = new dependencyService_1.DependencyService(context);
            const configService = new configService_1.ConfigService();
            const conversionService = new conversionService_1.ConversionService(configService);
            const commandService = new commandService_1.CommandService(context, dependencyService, configService, conversionService);
            commandService.registerCommands();
            dependencyService.checkAndInstallDependencies().catch(error => {
                errorHandler.handleError(error, '依赖检查', {
                    showToUser: true,
                    logToConsole: true
                });
            });
            context.globalState.update('services', {
                dependency: dependencyService,
                config: configService,
                conversion: conversionService,
                command: commandService,
                errorHandler: errorHandler
            });
            console.log('插件 "Markdown to Word Converter" 激活完成！');
        }
        catch (error) {
            const errorHandler = new errorHandler_1.ErrorHandler();
            errorHandler.handleError(error, '插件激活', {
                showToUser: true,
                logToConsole: true
            });
            vscode.window.showErrorMessage('插件激活时发生错误，部分功能可能不可用。请查看输出面板获取详细信息。', '查看输出').then(selection => {
                if (selection === '查看输出') {
                    vscode.window.createOutputChannel('Markdown to Word').show();
                }
            });
        }
    });
}
function deactivate() {
    console.log('插件 "Markdown to Word Converter" 已停用');
}
function getServices(context) {
    return context.globalState.get('services');
}
//# sourceMappingURL=extension.backup.js.map