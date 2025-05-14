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
exports.NodeMarkdownConverter = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const vscode = __importStar(require("vscode"));
const os = __importStar(require("os"));
const NodeJsConverter = require('../../nodejs/src/converter');
const ConfigManager = require('../../nodejs/src/utils/configManager');
const ConfigUI = require('../../nodejs/src/utils/configUI');
const CONFIG_FILE_PATH = path.join(os.tmpdir(), 'markdown-to-word', 'user-config.yaml');
class NodeMarkdownConverter {
    constructor() {
        const tempDir = path.dirname(CONFIG_FILE_PATH);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        this.configManager = new ConfigManager();
        if (fs.existsSync(CONFIG_FILE_PATH)) {
            try {
                this.configManager.loadFromYaml(CONFIG_FILE_PATH);
                console.log('从文件加载配置成功:', CONFIG_FILE_PATH);
            }
            catch (error) {
                console.error('加载配置文件失败:', error);
            }
        }
        else {
            const vscodeConfig = vscode.workspace.getConfiguration('markdown-to-word');
            const userConfig = vscodeConfig.get('markdownToWordUserConfig');
            if (userConfig && typeof userConfig === 'object') {
                this.configManager.config = userConfig;
                this.configManager.saveToYaml(CONFIG_FILE_PATH)
                    .then(() => console.log('配置已保存到文件:', CONFIG_FILE_PATH))
                    .catch((err) => console.error('保存配置文件失败:', err));
                console.log('从VS Code设置加载配置成功');
            }
            else {
                console.log('未找到现有配置，使用默认配置');
            }
        }
        this.nodeConverter = new NodeJsConverter(this.configManager.getAll());
    }
    static getInstance() {
        if (!NodeMarkdownConverter.instance) {
            NodeMarkdownConverter.instance = new NodeMarkdownConverter();
        }
        return NodeMarkdownConverter.instance;
    }
    convert(inputFile_1) {
        return __awaiter(this, arguments, void 0, function* (inputFile, options = {}) {
            try {
                const outputDir = options.outputDirectory || path.dirname(inputFile);
                const inputBaseName = path.basename(inputFile, '.md');
                const outputFile = path.join(outputDir, `${inputBaseName}.docx`);
                yield fs.ensureDir(outputDir);
                if (options.useConfig) {
                    console.log('转换时提供了配置:', JSON.stringify({
                        document: options.useConfig.document,
                        fonts: options.useConfig.fonts,
                        sizes: options.useConfig.sizes,
                        chinese: options.useConfig.chinese
                    }, null, 2));
                    const nodeConfig = this.convertConfig(options.useConfig);
                    console.log('转换后的Node配置:', JSON.stringify({
                        document: nodeConfig.document,
                        fonts: nodeConfig.fonts,
                        sizes: nodeConfig.sizes,
                        chinese: nodeConfig.chinese
                    }, null, 2));
                    this.configManager.config = nodeConfig;
                    this.nodeConverter = new NodeJsConverter(nodeConfig);
                    yield this.configManager.saveToYaml(CONFIG_FILE_PATH);
                    console.log('更新配置并保存到文件:', CONFIG_FILE_PATH);
                    yield this.updateVSCodeConfig(nodeConfig);
                }
                else {
                    console.log('未提供配置，使用默认配置');
                }
                if (options.onProgress) {
                    options.onProgress('正在执行转换...');
                }
                console.log(`开始转换 ${inputFile} 到 ${outputFile}`);
                const result = yield this.nodeConverter.convert_file(inputFile, outputFile, options.keepHtml || false);
                if (result.success) {
                    const message = `成功将 ${inputBaseName}.md 转换为 ${path.basename(outputFile)}`;
                    console.log(message);
                    if (options.onComplete) {
                        options.onComplete({
                            success: true,
                            message,
                            outputFile: result.outputFile
                        });
                    }
                    return {
                        success: true,
                        message,
                        outputFile: result.outputFile
                    };
                }
                else {
                    throw new Error(result.message || '转换失败，未知错误');
                }
            }
            catch (error) {
                console.error('转换失败:', error);
                const message = error instanceof Error ? error.message : String(error);
                if (options.onComplete) {
                    options.onComplete({
                        success: false,
                        message: `转换失败: ${message}`,
                        error: error instanceof Error ? error : new Error(String(error))
                    });
                }
                throw error;
            }
        });
    }
    batchConvert(inputDir_1, outputDir_1) {
        return __awaiter(this, arguments, void 0, function* (inputDir, outputDir, options = {}) {
            try {
                yield fs.ensureDir(outputDir);
                if (options.useConfig) {
                    const nodeConfig = this.convertConfig(options.useConfig);
                    this.nodeConverter = new NodeJsConverter(nodeConfig);
                }
                if (options.onProgress) {
                    options.onProgress('正在批量转换...');
                }
                const results = yield this.nodeConverter.batch_convert(inputDir, outputDir, options.keepHtml || false);
                return results;
            }
            catch (error) {
                console.error('批量转换失败:', error);
                throw error;
            }
        });
    }
    convertToHtml(inputFile_1) {
        return __awaiter(this, arguments, void 0, function* (inputFile, options = {}) {
            try {
                const outputDir = options.outputDirectory || path.dirname(inputFile);
                const inputBaseName = path.basename(inputFile, '.md');
                const outputFile = path.join(outputDir, `${inputBaseName}.html`);
                yield fs.ensureDir(outputDir);
                if (options.useConfig) {
                    const nodeConfig = this.convertConfig(options.useConfig);
                    this.nodeConverter = new NodeJsConverter(nodeConfig);
                }
                if (options.onProgress) {
                    options.onProgress('正在转换为HTML...');
                }
                const htmlContent = yield this.nodeConverter.md_to_html.convertFile(inputFile, outputFile);
                if (htmlContent) {
                    const message = `成功将 ${inputBaseName}.md 转换为 ${path.basename(outputFile)}`;
                    if (options.onComplete) {
                        options.onComplete({
                            success: true,
                            message,
                            outputFile
                        });
                    }
                    return {
                        success: true,
                        message,
                        outputFile
                    };
                }
                else {
                    throw new Error('转换失败，未能生成HTML内容');
                }
            }
            catch (error) {
                console.error('转换到HTML失败:', error);
                const message = error instanceof Error ? error.message : String(error);
                if (options.onComplete) {
                    options.onComplete({
                        success: false,
                        message: `转换到HTML失败: ${message}`,
                        error: error instanceof Error ? error : new Error(String(error))
                    });
                }
                throw error;
            }
        });
    }
    batchConvertToHtml(inputDir_1, outputDir_1) {
        return __awaiter(this, arguments, void 0, function* (inputDir, outputDir, options = {}) {
            try {
                yield fs.ensureDir(outputDir);
                if (options.useConfig) {
                    const nodeConfig = this.convertConfig(options.useConfig);
                    this.nodeConverter = new NodeJsConverter(nodeConfig);
                }
                if (options.onProgress) {
                    options.onProgress('正在批量转换为HTML...');
                }
                const glob = require('glob');
                const files = glob.sync(path.join(inputDir, '**', '*.md'));
                const results = {};
                for (const file of files) {
                    try {
                        const relPath = path.relative(inputDir, file);
                        const baseName = path.basename(relPath, '.md');
                        const dirName = path.dirname(relPath);
                        const outputFile = path.join(outputDir, dirName, `${baseName}.html`);
                        yield fs.ensureDir(path.dirname(outputFile));
                        const htmlContent = yield this.nodeConverter.md_to_html.convertFile(file, outputFile);
                        results[relPath] = !!htmlContent;
                    }
                    catch (error) {
                        console.error(`转换文件 ${file} 失败:`, error);
                        results[path.relative(inputDir, file)] = false;
                    }
                }
                return results;
            }
            catch (error) {
                console.error('批量转换到HTML失败:', error);
                throw error;
            }
        });
    }
    editConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const config = vscode.workspace.getConfiguration('markdown-to-word');
                const nodeConfig = this.getNodeConfigFromVSCode(config);
                this.configManager.config = nodeConfig;
                yield this.configManager.saveToYaml(CONFIG_FILE_PATH);
                console.log('配置已保存到文件:', CONFIG_FILE_PATH);
                const configUI = new ConfigUI();
                yield configUI.start(CONFIG_FILE_PATH);
                yield this.configManager.loadFromYaml(CONFIG_FILE_PATH);
                const updatedConfig = this.configManager.getAll();
                yield this.updateVSCodeConfig(updatedConfig);
                this.nodeConverter = new NodeJsConverter(updatedConfig);
                vscode.window.showInformationMessage('配置已更新');
            }
            catch (error) {
                console.error('编辑配置失败:', error);
                vscode.window.showErrorMessage(`编辑配置失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    getConfigFilePath() {
        return CONFIG_FILE_PATH;
    }
    loadConfig(configPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pathToLoad = configPath || CONFIG_FILE_PATH;
                if (!fs.existsSync(pathToLoad)) {
                    console.log('配置文件不存在:', pathToLoad);
                    return false;
                }
                const success = yield this.configManager.loadFromYaml(pathToLoad);
                if (success) {
                    this.nodeConverter = new NodeJsConverter(this.configManager.getAll());
                    console.log('成功加载配置文件:', pathToLoad);
                    return true;
                }
                return false;
            }
            catch (error) {
                console.error('加载配置失败:', error);
                return false;
            }
        });
    }
    saveConfig(config, configPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.configManager.config = config;
                const pathToSave = configPath || CONFIG_FILE_PATH;
                yield this.configManager.saveToYaml(pathToSave);
                console.log('配置已保存到文件:', pathToSave);
                yield this.updateVSCodeConfig(config);
                this.nodeConverter = new NodeJsConverter(config);
                return true;
            }
            catch (error) {
                console.error('保存配置失败:', error);
                return false;
            }
        });
    }
    getNodeConfigFromVSCode(vsConfig) {
        const userConfig = vsConfig.get('markdownToWordUserConfig');
        if (userConfig && typeof userConfig === 'object') {
            console.log('使用完整的用户配置');
            return userConfig;
        }
        console.log('使用单独的配置项构建配置');
        return {
            fonts: {
                default: vsConfig.get('defaultFontFamily') || '微软雅黑',
                code: 'Courier New',
                headings: vsConfig.get('defaultFontFamily') || '微软雅黑'
            },
            sizes: {
                default: vsConfig.get('defaultFontSize') || 12,
                code: (vsConfig.get('defaultFontSize') || 12) - 2,
                heading1: 18,
                heading2: 16,
                heading3: 14,
                heading4: 12,
                heading5: 12,
                heading6: 12
            },
            colors: {
                default: '#000000',
                headings: '#000000',
                code: '#333333',
                link: '#0563C1'
            },
            paragraph: {
                line_spacing: vsConfig.get('defaultLineSpacing') || 1.5,
                space_before: 0,
                space_after: 6,
                first_line_indent: 0
            },
            document: {
                page_size: vsConfig.get('defaultPageSize') || 'A4',
                orientation: vsConfig.get('defaultOrientation') || 'portrait',
                margin_top: 2.54,
                margin_bottom: 2.54,
                margin_left: 3.18,
                margin_right: 3.18,
                generate_toc: vsConfig.get('includeToc') || false,
                toc_depth: vsConfig.get('tocDepth') || 3
            },
            images: {
                preserve: vsConfig.get('preserveImages') || true,
                max_width: vsConfig.get('imageMaxWidth') || 800
            },
            output: {
                keepHtml: vsConfig.get('keepHtml') || false
            }
        };
    }
    convertConfig(config) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3;
        console.log('转换配置:', JSON.stringify(config, null, 2));
        const convertedConfig = {
            fonts: {
                default: ((_a = config.fonts) === null || _a === void 0 ? void 0 : _a.default) || '微软雅黑',
                code: ((_b = config.fonts) === null || _b === void 0 ? void 0 : _b.code) || 'Courier New',
                headings: ((_c = config.fonts) === null || _c === void 0 ? void 0 : _c.headings) || '微软雅黑'
            },
            sizes: {
                default: ((_d = config.sizes) === null || _d === void 0 ? void 0 : _d.default) || 12,
                code: ((_e = config.sizes) === null || _e === void 0 ? void 0 : _e.code) || 10,
                heading1: ((_f = config.sizes) === null || _f === void 0 ? void 0 : _f.heading1) || 18,
                heading2: ((_g = config.sizes) === null || _g === void 0 ? void 0 : _g.heading2) || 16,
                heading3: ((_h = config.sizes) === null || _h === void 0 ? void 0 : _h.heading3) || 14,
                heading4: ((_j = config.sizes) === null || _j === void 0 ? void 0 : _j.heading4) || 12,
                heading5: ((_k = config.sizes) === null || _k === void 0 ? void 0 : _k.heading5) || 12,
                heading6: ((_l = config.sizes) === null || _l === void 0 ? void 0 : _l.heading6) || 12
            },
            colors: {
                default: ((_m = config.colors) === null || _m === void 0 ? void 0 : _m.default) || '#000000',
                headings: ((_o = config.colors) === null || _o === void 0 ? void 0 : _o.headings) || '#000000',
                code: ((_p = config.colors) === null || _p === void 0 ? void 0 : _p.code) || '#333333',
                link: ((_q = config.colors) === null || _q === void 0 ? void 0 : _q.link) || '#0563C1'
            },
            paragraph: {
                line_spacing: ((_r = config.paragraph) === null || _r === void 0 ? void 0 : _r.line_spacing) || 1.5,
                space_before: ((_s = config.paragraph) === null || _s === void 0 ? void 0 : _s.space_before) || 0,
                space_after: ((_t = config.paragraph) === null || _t === void 0 ? void 0 : _t.space_after) || 6,
                first_line_indent: ((_u = config.paragraph) === null || _u === void 0 ? void 0 : _u.first_line_indent) || 0
            },
            document: {
                page_size: ((_v = config.document) === null || _v === void 0 ? void 0 : _v.page_size) || 'A4',
                orientation: 'portrait',
                margin_top: ((_w = config.document) === null || _w === void 0 ? void 0 : _w.margin_top) || 2.54,
                margin_bottom: ((_x = config.document) === null || _x === void 0 ? void 0 : _x.margin_bottom) || 2.54,
                margin_left: ((_y = config.document) === null || _y === void 0 ? void 0 : _y.margin_left) || 3.18,
                margin_right: ((_z = config.document) === null || _z === void 0 ? void 0 : _z.margin_right) || 3.18,
                generate_toc: ((_0 = config.document) === null || _0 === void 0 ? void 0 : _0.generate_toc) || false,
                toc_depth: 3
            },
            images: {
                preserve: true,
                max_width: 800
            },
            chinese: {
                convert_to_traditional: ((_1 = config.chinese) === null || _1 === void 0 ? void 0 : _1.convert_to_traditional) || false,
                punctuation_spacing: ((_2 = config.chinese) === null || _2 === void 0 ? void 0 : _2.punctuation_spacing) || true,
                auto_spacing: ((_3 = config.chinese) === null || _3 === void 0 ? void 0 : _3.auto_spacing) || true
            }
        };
        if (config.table_styles) {
            convertedConfig.table_styles = config.table_styles;
        }
        if (config.enhanced_table_styles) {
            convertedConfig.enhanced_table_styles = config.enhanced_table_styles;
        }
        if (config.markdown) {
            convertedConfig.markdown = config.markdown;
        }
        if (config.output) {
            convertedConfig.output = config.output;
        }
        if (config.debug) {
            convertedConfig.debug = config.debug;
        }
        console.log('转换后的配置:', JSON.stringify(convertedConfig, null, 2));
        return convertedConfig;
    }
    updateVSCodeConfig(nodeConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            const config = vscode.workspace.getConfiguration('markdown-to-word');
            try {
                if ((_a = nodeConfig.fonts) === null || _a === void 0 ? void 0 : _a.default) {
                    yield config.update('defaultFontFamily', nodeConfig.fonts.default, vscode.ConfigurationTarget.Global);
                }
                if ((_b = nodeConfig.sizes) === null || _b === void 0 ? void 0 : _b.default) {
                    yield config.update('defaultFontSize', nodeConfig.sizes.default, vscode.ConfigurationTarget.Global);
                }
                if ((_c = nodeConfig.paragraph) === null || _c === void 0 ? void 0 : _c.line_spacing) {
                    yield config.update('defaultLineSpacing', nodeConfig.paragraph.line_spacing, vscode.ConfigurationTarget.Global);
                }
                if ((_d = nodeConfig.document) === null || _d === void 0 ? void 0 : _d.page_size) {
                    yield config.update('defaultPageSize', nodeConfig.document.page_size, vscode.ConfigurationTarget.Global);
                }
                if ((_e = nodeConfig.document) === null || _e === void 0 ? void 0 : _e.orientation) {
                    yield config.update('defaultOrientation', nodeConfig.document.orientation, vscode.ConfigurationTarget.Global);
                }
                if (((_f = nodeConfig.document) === null || _f === void 0 ? void 0 : _f.generate_toc) !== undefined) {
                    yield config.update('includeToc', nodeConfig.document.generate_toc, vscode.ConfigurationTarget.Global);
                }
                if ((_g = nodeConfig.document) === null || _g === void 0 ? void 0 : _g.toc_depth) {
                    yield config.update('tocDepth', nodeConfig.document.toc_depth, vscode.ConfigurationTarget.Global);
                }
                if (((_h = nodeConfig.images) === null || _h === void 0 ? void 0 : _h.preserve) !== undefined) {
                    yield config.update('preserveImages', nodeConfig.images.preserve, vscode.ConfigurationTarget.Global);
                }
                if ((_j = nodeConfig.images) === null || _j === void 0 ? void 0 : _j.max_width) {
                    yield config.update('imageMaxWidth', nodeConfig.images.max_width, vscode.ConfigurationTarget.Global);
                }
                yield config.update('markdownToWordUserConfig', nodeConfig, vscode.ConfigurationTarget.Global);
            }
            catch (error) {
                console.error('更新VS Code配置失败:', error);
                throw error;
            }
        });
    }
}
exports.NodeMarkdownConverter = NodeMarkdownConverter;
//# sourceMappingURL=nodeConverter.js.map