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
exports.ConfigurationUI = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class ConfigurationUI {
    constructor() {
    }
    static getInstance() {
        if (!ConfigurationUI.instance) {
            ConfigurationUI.instance = new ConfigurationUI();
        }
        return ConfigurationUI.instance;
    }
    showConfigurationUI() {
        return __awaiter(this, void 0, void 0, function* () {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showErrorMessage('请先打开一个Markdown文件');
                return undefined;
            }
            const defaultConfig = this.getDefaultConfig(activeEditor.document.uri);
            try {
                const config = yield this.showConfigurationSteps(defaultConfig);
                if (config) {
                    this.currentConfig = config;
                    return config;
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`配置过程出错: ${error instanceof Error ? error.message : String(error)}`);
            }
            return undefined;
        });
    }
    getDefaultConfig(inputFileUri) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(inputFileUri);
        const outputDirectory = workspaceFolder ? workspaceFolder.uri.fsPath : path.dirname(inputFileUri.fsPath);
        return {
            inputFile: inputFileUri.fsPath,
            outputDirectory,
            outputFileName: path.basename(inputFileUri.fsPath, '.md') + '.docx',
            formatOptions: {
                pageSize: 'A4',
                orientation: 'portrait',
                margins: {
                    top: 2.54,
                    bottom: 2.54,
                    left: 3.18,
                    right: 3.18
                }
            },
            styleOptions: {
                fontFamily: '微软雅黑',
                fontSize: 12,
                lineSpacing: 1.5,
                enableCustomStyles: false
            },
            tocOptions: {
                includeToc: true,
                tocDepth: 3,
                tocTitle: '目录'
            },
            advancedOptions: {
                preserveImages: true,
                imageMaxWidth: 800,
                preserveLinks: true,
                preserveFootnotes: true
            }
        };
    }
    showConfigurationSteps(defaultConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            const outputDirectory = yield vscode.window.showInputBox({
                prompt: '请输入输出目录路径',
                value: defaultConfig.outputDirectory,
                validateInput: (value) => {
                    return value ? undefined : '输出目录不能为空';
                }
            });
            if (!outputDirectory)
                return undefined;
            const outputFileName = yield vscode.window.showInputBox({
                prompt: '请输入输出文件名',
                value: defaultConfig.outputFileName,
                validateInput: (value) => {
                    return value ? undefined : '文件名不能为空';
                }
            });
            if (!outputFileName)
                return undefined;
            const pageSize = yield vscode.window.showQuickPick(['A4', 'Letter', 'Legal'], {
                placeHolder: '选择页面大小',
                canPickMany: false
            });
            if (!pageSize)
                return undefined;
            const orientation = yield vscode.window.showQuickPick(['portrait', 'landscape'], {
                placeHolder: '选择页面方向',
                canPickMany: false
            });
            if (!orientation)
                return undefined;
            const fontFamily = yield vscode.window.showQuickPick(['微软雅黑', '宋体', '黑体', 'Times New Roman', 'Arial'], {
                placeHolder: '选择字体',
                canPickMany: false
            });
            if (!fontFamily)
                return undefined;
            const fontSize = yield vscode.window.showQuickPick(['10', '11', '12', '14', '16', '18'], {
                placeHolder: '选择字号',
                canPickMany: false
            });
            if (!fontSize)
                return undefined;
            const includeToc = yield vscode.window.showQuickPick(['是', '否'], {
                placeHolder: '是否包含目录',
                canPickMany: false
            });
            if (!includeToc)
                return undefined;
            const tocDepth = includeToc === '是' ? yield vscode.window.showQuickPick(['1', '2', '3', '4', '5'], {
                placeHolder: '选择目录深度',
                canPickMany: false
            }) : '3';
            if (!tocDepth)
                return undefined;
            return Object.assign(Object.assign({}, defaultConfig), { outputDirectory,
                outputFileName, formatOptions: Object.assign(Object.assign({}, defaultConfig.formatOptions), { pageSize,
                    orientation }), styleOptions: Object.assign(Object.assign({}, defaultConfig.styleOptions), { fontFamily, fontSize: parseInt(fontSize) }), tocOptions: Object.assign(Object.assign({}, defaultConfig.tocOptions), { includeToc: includeToc === '是', tocDepth: parseInt(tocDepth) }) });
        });
    }
    getCurrentConfig() {
        return this.currentConfig;
    }
}
exports.ConfigurationUI = ConfigurationUI;
//# sourceMappingURL=configurationUI.js.map