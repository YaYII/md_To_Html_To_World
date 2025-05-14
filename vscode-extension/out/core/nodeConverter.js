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
exports.NodeMarkdownConverter = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const docxGenerator_1 = require("./markdown/docxGenerator");
class NodeMarkdownConverter {
    constructor() {
    }
    convert(inputFile, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!fs.existsSync(inputFile)) {
                    return {
                        success: false,
                        error: `输入文件不存在: ${inputFile}`,
                        message: `转换失败: 文件不存在`
                    };
                }
                let outputDir = options.outputDirectory;
                if (!outputDir) {
                    outputDir = path.dirname(inputFile);
                }
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }
                const baseName = path.basename(inputFile, '.md');
                const outputFile = path.join(outputDir, `${baseName}.docx`);
                const htmlFile = path.join(outputDir, `${baseName}.html`);
                if (options.onProgress) {
                    options.onProgress(`开始转换 ${inputFile}...`);
                }
                const docxOptions = this.createDocxOptions(options);
                const generator = new docxGenerator_1.DocxGenerator(docxOptions);
                if (options.onProgress) {
                    options.onProgress(`生成Word文档...`);
                }
                const success = yield generator.convertFile(inputFile, outputFile);
                if (!success) {
                    return {
                        success: false,
                        error: "文档生成失败",
                        message: `转换失败: 无法生成Word文档`
                    };
                }
                return {
                    success: true,
                    outputFile: outputFile,
                    htmlFile: options.keepHtml ? htmlFile : undefined,
                    message: options.keepHtml
                        ? `转换成功: 已生成Word文档和HTML文件`
                        : `转换成功: 已生成Word文档`
                };
            }
            catch (error) {
                console.error('转换过程中发生错误:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                    message: `转换失败: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        });
    }
    batchConvert(inputDir, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!fs.existsSync(inputDir) || !fs.statSync(inputDir).isDirectory()) {
                    return {
                        success: false,
                        error: `输入目录不存在或不是目录: ${inputDir}`,
                        message: `批量转换失败: 目录不存在或无效`
                    };
                }
                let outputDir = options.outputDirectory;
                if (!outputDir) {
                    outputDir = inputDir;
                }
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }
                const files = fs.readdirSync(inputDir)
                    .filter(file => file.toLowerCase().endsWith('.md'))
                    .map(file => path.join(inputDir, file));
                if (files.length === 0) {
                    return {
                        success: false,
                        error: `未找到Markdown文件`,
                        message: `批量转换失败: 目录中没有Markdown文件`
                    };
                }
                if (options.onProgress) {
                    options.onProgress(`开始批量转换，找到 ${files.length} 个Markdown文件...`);
                }
                const docxOptions = this.createDocxOptions(options);
                const generator = new docxGenerator_1.DocxGenerator(docxOptions);
                if (options.onProgress) {
                    options.onProgress(`批量生成Word文档...`);
                }
                const results = yield generator.batchConvert(inputDir, outputDir);
                const totalFiles = Object.keys(results).length;
                const successCount = Object.values(results).filter(result => result).length;
                if (successCount === 0) {
                    return {
                        success: false,
                        error: `所有文件转换失败`,
                        message: `批量转换失败: 所有 ${totalFiles} 个文件都转换失败`
                    };
                }
                else if (successCount < totalFiles) {
                    return {
                        success: true,
                        message: `批量转换部分成功: ${successCount}/${totalFiles} 个文件转换成功`
                    };
                }
                else {
                    return {
                        success: true,
                        message: `批量转换成功: 所有 ${totalFiles} 个文件转换完成`
                    };
                }
            }
            catch (error) {
                console.error('批量转换过程中发生错误:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                    message: `批量转换失败: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        });
    }
    createDocxOptions(options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const config = options.useConfig || {};
        return {
            titleSize: ((_a = config.sizes) === null || _a === void 0 ? void 0 : _a.heading1) || 24,
            paragraphSize: ((_b = config.sizes) === null || _b === void 0 ? void 0 : _b.default) || 12,
            titleFont: ((_c = config.fonts) === null || _c === void 0 ? void 0 : _c.headings) || 'Microsoft YaHei',
            paragraphFont: ((_d = config.fonts) === null || _d === void 0 ? void 0 : _d.default) || 'Microsoft YaHei',
            lineSpacing: ((_e = config.paragraph) === null || _e === void 0 ? void 0 : _e.line_spacing) || 1.15,
            paragraphSpacing: ((_f = config.paragraph) === null || _f === void 0 ? void 0 : _f.space_after) || 8,
            margins: {
                top: ((_g = config.document) === null || _g === void 0 ? void 0 : _g.margin_top) || 1,
                right: ((_h = config.document) === null || _h === void 0 ? void 0 : _h.margin_right) || 1,
                bottom: ((_j = config.document) === null || _j === void 0 ? void 0 : _j.margin_bottom) || 1,
                left: ((_k = config.document) === null || _k === void 0 ? void 0 : _k.margin_left) || 1,
            },
            keepHtml: options.keepHtml || false,
            downloadImages: true,
        };
    }
}
exports.NodeMarkdownConverter = NodeMarkdownConverter;
//# sourceMappingURL=nodeConverter.js.map