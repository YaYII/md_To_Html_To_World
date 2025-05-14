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
exports.ConvertToWordCommand = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const configurationUI_1 = require("../configurationUI");
const environmentManager_1 = require("../environmentManager");
const pythonRunner_1 = require("../utils/pythonRunner");
class ConvertToWordCommand {
    constructor(context) {
        this.context = context;
        this.configUI = configurationUI_1.ConfigurationUI.getInstance();
        this.envManager = environmentManager_1.EnvironmentManager.getInstance();
        this.pythonRunner = new pythonRunner_1.PythonRunner(this.envManager);
    }
    static getInstance(context) {
        if (!ConvertToWordCommand.instance) {
            ConvertToWordCommand.instance = new ConvertToWordCommand(context);
        }
        return ConvertToWordCommand.instance;
    }
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.envManager.initialize(this.context);
                const config = yield this.configUI.showConfigurationUI();
                if (!config) {
                    return;
                }
                yield this.startConversion(config);
            }
            catch (error) {
                vscode.window.showErrorMessage(`转换失败: ${error}`);
            }
        });
    }
    startConversion(config) {
        return __awaiter(this, void 0, void 0, function* () {
            yield vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "正在转换文档",
                cancellable: false
            }, (progress) => __awaiter(this, void 0, void 0, function* () {
                try {
                    progress.report({ message: "准备转换..." });
                    if (!(yield this.validateInputFile(config.inputFile))) {
                        throw new Error('输入文件无效');
                    }
                    yield this.ensureOutputDirectory(config.outputDirectory);
                    progress.report({ message: "正在转换..." });
                    yield this.convert(config);
                    vscode.window.showInformationMessage(`转换完成！文件已保存至: ${config.outputDirectory}/${config.outputFileName}`);
                }
                catch (error) {
                    vscode.window.showErrorMessage(`转换过程出错: ${error}`);
                }
            }));
        });
    }
    validateInputFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stat = yield vscode.workspace.fs.stat(vscode.Uri.file(filePath));
                return stat.type === vscode.FileType.File;
            }
            catch (_a) {
                return false;
            }
        });
    }
    ensureOutputDirectory(dirPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
            }
            catch (error) {
                throw new Error(`无法创建输出目录: ${error}`);
            }
        });
    }
    convert(config) {
        return __awaiter(this, void 0, void 0, function* () {
            const scriptPath = path.join(this.context.extensionPath, 'scripts', 'convert.py');
            const configPath = yield this.prepareConfigFile(config);
            const args = [
                '--input', config.inputFile,
                '--output', path.join(config.outputDirectory, config.outputFileName),
                '--config', configPath
            ];
            const result = yield this.pythonRunner.runScript(scriptPath, args, {
                cwd: path.dirname(config.inputFile),
                timeout: 30000
            });
            if (!result.success) {
                throw new Error(`转换失败:\n${result.stderr}`);
            }
            yield this.cleanupConfigFile(configPath);
        });
    }
    prepareConfigFile(config) {
        return __awaiter(this, void 0, void 0, function* () {
            const configData = {
                format: {
                    page_size: config.formatOptions.pageSize,
                    orientation: config.formatOptions.orientation,
                    margins: config.formatOptions.margins
                },
                style: {
                    font_family: config.styleOptions.fontFamily,
                    font_size: config.styleOptions.fontSize,
                    line_spacing: config.styleOptions.lineSpacing,
                    custom_style: config.styleOptions.enableCustomStyles ? config.styleOptions.customStylePath : null
                },
                toc: {
                    include: config.tocOptions.includeToc,
                    depth: config.tocOptions.tocDepth,
                    title: config.tocOptions.tocTitle
                },
                advanced: {
                    preserve_images: config.advancedOptions.preserveImages,
                    image_max_width: config.advancedOptions.imageMaxWidth,
                    preserve_links: config.advancedOptions.preserveLinks,
                    preserve_footnotes: config.advancedOptions.preserveFootnotes
                }
            };
            const tempPath = path.join(this.context.globalStoragePath, `config_${Date.now()}.json`);
            yield vscode.workspace.fs.writeFile(vscode.Uri.file(tempPath), Buffer.from(JSON.stringify(configData, null, 2)));
            return tempPath;
        });
    }
    cleanupConfigFile(configPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield vscode.workspace.fs.delete(vscode.Uri.file(configPath));
            }
            catch (error) {
                console.error('清理配置文件失败:', error);
            }
        });
    }
}
exports.ConvertToWordCommand = ConvertToWordCommand;
//# sourceMappingURL=convertToWord.js.map