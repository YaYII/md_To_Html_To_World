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
exports.ConversionService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const nodeConverter_1 = require("../core/nodeConverter");
const progressUI_1 = require("../ui/progressUI");
class ConversionService {
    constructor(configService) {
        this.configService = configService;
        this.progressUI = progressUI_1.ProgressUI.getInstance();
        this.converter = nodeConverter_1.NodeMarkdownConverter.getInstance();
    }
    convertFile(filePath_1) {
        return __awaiter(this, arguments, void 0, function* (filePath, options = {}) {
            try {
                if (!filePath || !filePath.endsWith('.md')) {
                    throw new Error('请选择一个有效的 Markdown 文件');
                }
                if (!(yield fs.pathExists(filePath))) {
                    throw new Error(`文件不存在: ${filePath}`);
                }
                const config = options.useConfig || (yield this.configService.getUserConfig());
                const outputDir = options.outputDirectory || path.dirname(filePath);
                yield fs.ensureDir(outputDir);
                console.log(`开始转换文件: ${filePath}`);
                console.log('使用配置:', JSON.stringify({
                    fonts: config.fonts,
                    document: config.document,
                    chinese: config.chinese
                }, null, 2));
                const result = yield this.converter.convert(filePath, {
                    showProgress: options.showProgress || false,
                    useConfig: config,
                    keepHtml: options.keepHtml || false,
                    onComplete: options.onComplete
                });
                return {
                    success: true,
                    outputFile: result.outputFile,
                    message: 'Markdown 文件已成功转换为 Word 文档！'
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`转换文件 ${filePath} 失败:`, errorMessage);
                return {
                    success: false,
                    message: `转换失败: ${errorMessage}`,
                    error: error instanceof Error ? error : new Error(String(error))
                };
            }
        });
    }
    convertFileWithProgress(filePath_1) {
        return __awaiter(this, arguments, void 0, function* (filePath, options = {}) {
            return yield this.progressUI.withProgress(`转换文件: ${path.basename(filePath)}`, (progress) => __awaiter(this, void 0, void 0, function* () {
                progress.report({ message: '准备转换...' });
                const result = yield this.convertFile(filePath, Object.assign(Object.assign({}, options), { showProgress: true }));
                if (result.success) {
                    progress.report({ message: '转换完成！' });
                    yield this.progressUI.showSuccess(result.message, result.outputFile);
                    yield this.openGeneratedFile(result.outputFile);
                }
                else {
                    yield this.progressUI.showError(result.error);
                }
                return result;
            }));
        });
    }
    convertMultipleFiles(filePaths_1) {
        return __awaiter(this, arguments, void 0, function* (filePaths, options = {}) {
            const results = [];
            for (let i = 0; i < filePaths.length; i++) {
                const filePath = filePaths[i];
                const fileName = path.basename(filePath);
                try {
                    const result = yield this.progressUI.withProgress(`转换文件 ${i + 1}/${filePaths.length}: ${fileName}`, (progress) => __awaiter(this, void 0, void 0, function* () {
                        progress.report({
                            message: '执行转换...',
                            increment: (i / filePaths.length) * 100
                        });
                        return yield this.convertFile(filePath, options);
                    }));
                    results.push(result);
                    if (result.success) {
                        console.log(`✅ 转换成功: ${fileName}`);
                    }
                    else {
                        console.error(`❌ 转换失败: ${fileName} - ${result.message}`);
                    }
                }
                catch (error) {
                    const errorResult = {
                        success: false,
                        message: `转换失败: ${error instanceof Error ? error.message : String(error)}`,
                        error: error instanceof Error ? error : new Error(String(error))
                    };
                    results.push(errorResult);
                }
            }
            yield this.showBatchConversionResults(results);
            return results;
        });
    }
    handleCommandLineArgs() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const args = process.argv;
                console.log('命令行参数:', args);
                const mdFileArg = args.find(arg => arg.endsWith('.md') && !arg.includes('node_modules'));
                if (mdFileArg) {
                    console.log('检测到命令行 Markdown 文件:', mdFileArg);
                    let mdFilePath = mdFileArg;
                    if (!path.isAbsolute(mdFilePath)) {
                        mdFilePath = path.resolve(process.cwd(), mdFilePath);
                    }
                    console.log('解析后的文件路径:', mdFilePath);
                    if (yield fs.pathExists(mdFilePath)) {
                        console.log('文件存在，开始转换...');
                        const fileName = path.basename(mdFilePath);
                        const choice = yield vscode.window.showInformationMessage(`检测到要转换的 Markdown 文件: ${fileName}`, '立即转换', '取消');
                        if (choice === '立即转换') {
                            yield this.convertFileWithProgress(mdFilePath);
                        }
                    }
                    else {
                        console.log('文件不存在:', mdFilePath);
                    }
                }
            }
            catch (error) {
                console.error('处理命令行参数时出错:', error);
            }
        });
    }
    openGeneratedFile(outputFile) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (outputFile && (yield fs.pathExists(outputFile))) {
                    const uri = vscode.Uri.file(outputFile);
                    yield vscode.commands.executeCommand('vscode.open', uri);
                }
            }
            catch (error) {
                console.error('无法打开生成的文件:', error);
            }
        });
    }
    showBatchConversionResults(results) {
        return __awaiter(this, void 0, void 0, function* () {
            const successCount = results.filter(r => r.success).length;
            const failureCount = results.length - successCount;
            let message = `批量转换完成: ${successCount} 个成功`;
            if (failureCount > 0) {
                message += `, ${failureCount} 个失败`;
            }
            if (failureCount === 0) {
                yield vscode.window.showInformationMessage(message);
            }
            else {
                const choice = yield vscode.window.showWarningMessage(message, '查看详情');
                if (choice === '查看详情') {
                    const outputChannel = vscode.window.createOutputChannel('批量转换结果');
                    outputChannel.clear();
                    outputChannel.appendLine('批量转换结果详情:');
                    outputChannel.appendLine('='.repeat(50));
                    results.forEach((result, index) => {
                        const status = result.success ? '✅ 成功' : '❌ 失败';
                        outputChannel.appendLine(`${index + 1}. ${status} - ${result.message}`);
                        if (!result.success && result.error) {
                            outputChannel.appendLine(`   错误: ${result.error.message}`);
                        }
                    });
                    outputChannel.show();
                }
            }
        });
    }
    getSupportedFileTypes() {
        return ['.md', '.markdown'];
    }
    isSupportedFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.getSupportedFileTypes().includes(ext);
    }
    getOutputFilePath(inputPath, outputDir) {
        const baseName = path.basename(inputPath, path.extname(inputPath));
        const outputDirectory = outputDir || path.dirname(inputPath);
        return path.join(outputDirectory, `${baseName}.docx`);
    }
    dispose() {
    }
}
exports.ConversionService = ConversionService;
//# sourceMappingURL=conversionService.js.map