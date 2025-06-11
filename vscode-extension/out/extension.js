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
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs-extra"));
const progressUI_1 = require("./ui/progressUI");
const configPanel_1 = require("./ui/configPanel");
const nodeConverter_1 = require("./core/nodeConverter");
const yaml = __importStar(require("js-yaml"));
const path = __importStar(require("path"));
const ExcelModule = require('../nodeexcel/src/index');
const { convertFile, convertBatch } = ExcelModule;
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('插件 "Markdown to Word Converter" 正在激活...');
        const converter = nodeConverter_1.NodeMarkdownConverter.getInstance();
        const progressUI = progressUI_1.ProgressUI.getInstance();
        function handleCommandLineArgs() {
            return __awaiter(this, void 0, void 0, function* () {
                const args = process.argv;
                console.log('命令行参数:', args);
                const mdFilePaths = [];
                for (const arg of args) {
                    try {
                        const decodedArg = decodeURIComponent(arg);
                        if (decodedArg.toLowerCase().endsWith('.md')) {
                            try {
                                const normalizedPath = path.normalize(decodedArg);
                                console.log(`找到可能的Markdown文件路径: ${normalizedPath}`);
                                mdFilePaths.push(normalizedPath);
                            }
                            catch (e) {
                                console.log(`无法规范化路径 ${decodedArg}，使用原始路径`);
                                mdFilePaths.push(decodedArg);
                            }
                        }
                    }
                    catch (e) {
                        if (arg.toLowerCase().endsWith('.md')) {
                            console.log(`找到可能的Markdown文件路径(未解码): ${arg}`);
                            mdFilePaths.push(arg);
                        }
                    }
                }
                if (mdFilePaths.length > 0) {
                    console.log('检测到命令行启动并传入Markdown文件:', mdFilePaths);
                    for (const mdFilePath of mdFilePaths) {
                        try {
                            console.log(`检查文件是否存在: ${mdFilePath}`);
                            if (!fs.existsSync(mdFilePath)) {
                                console.error(`文件不存在: ${mdFilePath}`);
                                continue;
                            }
                            console.log('获取用户配置...');
                            const userConfig = getUserConfig();
                            yield progressUI.withProgress(`转换文件: ${path.basename(mdFilePath)}`, (progress) => __awaiter(this, void 0, void 0, function* () {
                                progress.report({ message: '执行转换...' });
                                console.log(`开始转换文件: ${mdFilePath}`);
                                console.log('使用配置:', JSON.stringify({
                                    fonts: userConfig.fonts,
                                    document: userConfig.document,
                                    chinese: userConfig.chinese
                                }, null, 2));
                                const outputDir = path.dirname(mdFilePath);
                                yield fs.ensureDir(outputDir);
                                const result = yield converter.convert(mdFilePath, {
                                    showProgress: true,
                                    useConfig: userConfig,
                                    keepHtml: false,
                                    onComplete: (conversionResult) => {
                                        if (conversionResult.success && conversionResult.outputFile) {
                                            progressUI.showSuccess(conversionResult.message, conversionResult.outputFile);
                                        }
                                    }
                                });
                                progress.report({ message: '转换完成！' });
                                yield progressUI.showSuccess('Markdown 文件已成功转换为 Word 文档！', result.outputFile);
                                try {
                                    if (result.outputFile) {
                                        const uri = vscode.Uri.file(result.outputFile);
                                        yield vscode.commands.executeCommand('vscode.open', uri);
                                    }
                                }
                                catch (openError) {
                                    console.error('无法打开生成的文件:', openError);
                                }
                            }));
                        }
                        catch (error) {
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            console.error(`转换文件 ${mdFilePath} 失败:`, errorMessage);
                            yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                        }
                    }
                }
            });
        }
        yield handleCommandLineArgs();
        function getUserConfig() {
            try {
                const converter = nodeConverter_1.NodeMarkdownConverter.getInstance();
                const configFilePath = converter.getConfigFilePath();
                console.log('尝试从统一配置文件加载:', configFilePath);
                if (fs.existsSync(configFilePath)) {
                    try {
                        const configContent = fs.readFileSync(configFilePath, 'utf8');
                        const config = yaml.load(configContent);
                        if (config && typeof config === 'object' && config.fonts && config.sizes) {
                            console.log('成功从统一配置文件加载配置');
                            return config;
                        }
                    }
                    catch (error) {
                        console.error('读取配置文件失败:', error);
                    }
                }
                const vscodeConfig = vscode.workspace.getConfiguration('markdown-to-word');
                const userConfig = vscodeConfig.get('markdownToWordUserConfig');
                if (userConfig && typeof userConfig === 'object' && userConfig.fonts && userConfig.sizes) {
                    console.log('从VS Code设置加载配置');
                    return userConfig;
                }
                console.log('使用默认配置');
                const defaultConfig = {
                    fonts: {
                        default: vscodeConfig.get('defaultFontFamily') || '微软雅黑',
                        code: 'Courier New',
                        headings: vscodeConfig.get('defaultFontFamily') || '微软雅黑'
                    },
                    sizes: {
                        default: vscodeConfig.get('defaultFontSize') || 12,
                        code: (vscodeConfig.get('defaultFontSize') || 12) - 2,
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
                        line_spacing: vscodeConfig.get('defaultLineSpacing') || 1.5,
                        space_before: 0,
                        space_after: 6,
                        first_line_indent: 0
                    },
                    document: {
                        page_size: vscodeConfig.get('defaultPageSize') || 'A4',
                        margin_top: 2.54,
                        margin_bottom: 2.54,
                        margin_left: 3.18,
                        margin_right: 3.18,
                        generate_toc: vscodeConfig.get('includeToc') || false,
                        show_horizontal_rules: true,
                        header: '',
                        footer: ''
                    },
                    chinese: {
                        convert_to_traditional: false,
                        punctuation_spacing: false,
                        auto_spacing: false
                    },
                    table_styles: {
                        even_row_color: '#FFFFFF',
                        odd_row_color: '#F2F2F2',
                        header_bg_color: '#DDDDDD',
                        border_color: '#000000',
                        cell_height: 'auto',
                        table_width: '100%'
                    },
                    enhanced_table_styles: {
                        style: 'default',
                        width: 100,
                        border: true,
                        border_size: 1,
                        border_color: '#000000',
                        header_bg_color: '#DDDDDD',
                        even_row_color: '#FFFFFF',
                        text_align: 'left',
                        vertical_align: 'middle',
                        cell_padding: 5,
                        cell_height: 20,
                        autofit: true,
                        first_row_as_header: true,
                        keep_header_visible: true,
                        row_height: {
                            default: 20,
                            header: 24,
                            min: 10,
                            max: 100,
                            auto_adjust: true
                        }
                    },
                    markdown: {
                        extensions: ['extra', 'tables', 'toc', 'fenced_code'],
                        extension_configs: {
                            codehilite: {
                                linenums: false,
                                use_pygments: false
                            }
                        }
                    },
                    output: {
                        keepHtml: vscodeConfig.get('keepHtml') || false
                    },
                    debug: {
                        enabled: false,
                        log_level: 'info',
                        log_to_file: false,
                        log_file: '',
                        print_html_structure: false,
                        verbose_element_info: false,
                        timing: false
                    }
                };
                converter.saveConfig(defaultConfig)
                    .then(() => console.log('默认配置已保存'))
                    .catch((err) => console.error('保存默认配置失败:', err));
                return defaultConfig;
            }
            catch (error) {
                console.error('获取配置失败:', error);
                return {
                    fonts: { default: '微软雅黑', code: 'Courier New', headings: '微软雅黑' },
                    sizes: {
                        default: 12, code: 10, heading1: 18, heading2: 16,
                        heading3: 14, heading4: 12, heading5: 12, heading6: 12
                    },
                    colors: { default: '#000000', headings: '#000000', code: '#333333', link: '#0563C1' },
                    paragraph: { line_spacing: 1.5, space_before: 0, space_after: 6, first_line_indent: 0 },
                    document: {
                        page_size: 'A4', margin_top: 2.54, margin_bottom: 2.54,
                        margin_left: 3.18, margin_right: 3.18,
                        generate_toc: false, show_horizontal_rules: true, header: '', footer: ''
                    },
                    chinese: { convert_to_traditional: false, punctuation_spacing: false, auto_spacing: false },
                    table_styles: {
                        even_row_color: '#FFFFFF', odd_row_color: '#F2F2F2',
                        header_bg_color: '#DDDDDD', border_color: '#000000',
                        cell_height: 'auto', table_width: '100%'
                    },
                    enhanced_table_styles: {
                        style: 'default', width: 100, border: true, border_size: 1,
                        border_color: '#000000', header_bg_color: '#DDDDDD',
                        even_row_color: '#FFFFFF', text_align: 'left',
                        vertical_align: 'middle', cell_padding: 5,
                        cell_height: 20, autofit: true,
                        first_row_as_header: true, keep_header_visible: true,
                        row_height: {
                            default: 20, header: 24, min: 10, max: 100, auto_adjust: true
                        }
                    },
                    markdown: {
                        extensions: ['extra', 'tables', 'toc', 'fenced_code'],
                        extension_configs: {
                            codehilite: {
                                linenums: false,
                                use_pygments: false
                            }
                        }
                    },
                    output: { keepHtml: false },
                    debug: {
                        enabled: false, log_level: 'info', log_to_file: false,
                        log_file: '', print_html_structure: false,
                        verbose_element_info: false, timing: false
                    }
                };
            }
        }
        const disposable = vscode.commands.registerCommand('markdowntoword.markdown-to-word.convert', (uri) => __awaiter(this, void 0, void 0, function* () {
            try {
                const editor = vscode.window.activeTextEditor;
                const inputFileUri = uri || (editor === null || editor === void 0 ? void 0 : editor.document.uri);
                if (!inputFileUri) {
                    throw new Error('无法确定要转换的 Markdown 文件。请在编辑器中打开一个 Markdown 文件，或在文件资源管理器中右键单击它。');
                }
                const inputFile = inputFileUri.fsPath;
                if (!inputFile.toLowerCase().endsWith('.md')) {
                    throw new Error(`选择的文件不是 Markdown (.md) 文件: ${inputFile}`);
                }
                console.log('准备显示配置面板, 输入文件:', inputFile);
                configPanel_1.ConfigPanel.createOrShow(context.extensionPath, inputFile, (config, cancelled) => __awaiter(this, void 0, void 0, function* () {
                    console.log('配置面板回调, 取消状态:', cancelled);
                    if (cancelled) {
                        console.log('用户取消了转换');
                        return;
                    }
                    yield progressUI.withProgress('Markdown 转 Word', (progress) => __awaiter(this, void 0, void 0, function* () {
                        progress.report({ message: '执行转换...' });
                        const result = yield converter.convert(inputFile, {
                            showProgress: true,
                            useConfig: config,
                            keepHtml: false,
                            onComplete: (conversionResult) => {
                                if (conversionResult.success && conversionResult.outputFile) {
                                    progressUI.showSuccess(conversionResult.message, conversionResult.outputFile);
                                }
                            }
                        });
                        progress.report({ message: '转换完成！' });
                        progressUI.showSuccess('Markdown 文件已成功转换为 Word 文档！', result.outputFile);
                    }));
                }));
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('转换失败:', errorMessage);
                yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
            }
        }));
        const directConvertCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.convertDirect', (uri) => __awaiter(this, void 0, void 0, function* () {
            try {
                const editor = vscode.window.activeTextEditor;
                const inputFileUri = uri || (editor === null || editor === void 0 ? void 0 : editor.document.uri);
                if (!inputFileUri) {
                    throw new Error('无法确定要转换的 Markdown 文件。请在编辑器中打开一个 Markdown 文件，或在文件资源管理器中右键单击它。');
                }
                const inputFile = inputFileUri.fsPath;
                if (!inputFile.toLowerCase().endsWith('.md')) {
                    throw new Error(`选择的文件不是 Markdown (.md) 文件: ${inputFile}`);
                }
                const config = vscode.workspace.getConfiguration('markdown-to-word');
                const userConfig = getUserConfig();
                yield progressUI.withProgress('Markdown 直接转 Word', (progress) => __awaiter(this, void 0, void 0, function* () {
                    progress.report({ message: '执行转换...' });
                    const result = yield converter.convert(inputFile, {
                        showProgress: true,
                        useConfig: userConfig,
                        keepHtml: config.get('keepHtml') || false,
                        onComplete: (conversionResult) => {
                            if (conversionResult.success && conversionResult.outputFile) {
                                progressUI.showSuccess(conversionResult.message, conversionResult.outputFile);
                            }
                        }
                    });
                    progress.report({ message: '转换完成！' });
                    yield progressUI.showSuccess('Markdown 文件已成功转换为 Word 文档！', result.outputFile);
                }));
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('直接转换失败:', errorMessage);
                yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
            }
        }));
        const convertToHtmlCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.convertToHtml', (uri) => __awaiter(this, void 0, void 0, function* () {
            try {
                const editor = vscode.window.activeTextEditor;
                const inputFileUri = uri || (editor === null || editor === void 0 ? void 0 : editor.document.uri);
                if (!inputFileUri) {
                    throw new Error('无法确定要转换的 Markdown 文件。请在编辑器中打开一个 Markdown 文件，或在文件资源管理器中右键单击它。');
                }
                const inputFile = inputFileUri.fsPath;
                if (!inputFile.toLowerCase().endsWith('.md')) {
                    throw new Error(`选择的文件不是 Markdown (.md) 文件: ${inputFile}`);
                }
                const userConfig = getUserConfig();
                yield progressUI.withProgress('Markdown 转 HTML', (progress) => __awaiter(this, void 0, void 0, function* () {
                    progress.report({ message: '执行转换...' });
                    const result = yield converter.convertToHtml(inputFile, {
                        showProgress: true,
                        useConfig: userConfig,
                        onComplete: (conversionResult) => {
                            if (conversionResult.success && conversionResult.outputFile) {
                                progressUI.showSuccess(conversionResult.message, conversionResult.outputFile);
                            }
                        }
                    });
                    progress.report({ message: '转换完成！' });
                    yield progressUI.showSuccess('Markdown 文件已成功转换为 HTML 文档！', result.outputFile);
                }));
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('转换到HTML失败:', errorMessage);
                yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
            }
        }));
        const batchConvertToWordCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.batchConvertToWord', (uri) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!uri) {
                    throw new Error('未选择目录。请在文件资源管理器中右键单击一个目录。');
                }
                const inputDir = uri.fsPath;
                const stats = yield fs.stat(inputDir);
                if (!stats.isDirectory()) {
                    throw new Error(`选择的路径不是目录: ${inputDir}`);
                }
                const outputDir = yield vscode.window.showInputBox({
                    prompt: '请输入输出目录路径',
                    value: inputDir,
                    validateInput: (value) => __awaiter(this, void 0, void 0, function* () {
                        if (!value) {
                            return '输出目录不能为空';
                        }
                        try {
                            yield fs.ensureDir(value);
                            return null;
                        }
                        catch (error) {
                            return `无法创建目录: ${error instanceof Error ? error.message : String(error)}`;
                        }
                    })
                });
                if (!outputDir) {
                    return;
                }
                const config = vscode.workspace.getConfiguration('markdown-to-word');
                const userConfig = getUserConfig();
                yield progressUI.withProgress('批量转换 Markdown 到 Word', (progress) => __awaiter(this, void 0, void 0, function* () {
                    progress.report({ message: '正在批量转换...' });
                    const results = yield converter.batchConvert(inputDir, outputDir, {
                        showProgress: true,
                        useConfig: userConfig,
                        keepHtml: config.get('keepHtml') || false,
                        onProgress: (message) => {
                            progress.report({ message });
                        }
                    });
                    const successCount = Object.values(results).filter(Boolean).length;
                    const totalCount = Object.keys(results).length;
                    progress.report({ message: '批量转换完成！' });
                    yield progressUI.showSuccess(`批量转换完成: 共 ${totalCount} 个文件, 成功 ${successCount} 个, 失败 ${totalCount - successCount} 个`, outputDir);
                }));
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('批量转换失败:', errorMessage);
                yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
            }
        }));
        const batchConvertToHtmlCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.batchConvertToHtml', (uri) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!uri) {
                    throw new Error('未选择目录。请在文件资源管理器中右键单击一个目录。');
                }
                const inputDir = uri.fsPath;
                const stats = yield fs.stat(inputDir);
                if (!stats.isDirectory()) {
                    throw new Error(`选择的路径不是目录: ${inputDir}`);
                }
                const outputDir = yield vscode.window.showInputBox({
                    prompt: '请输入输出目录路径',
                    value: inputDir,
                    validateInput: (value) => __awaiter(this, void 0, void 0, function* () {
                        if (!value) {
                            return '输出目录不能为空';
                        }
                        try {
                            yield fs.ensureDir(value);
                            return null;
                        }
                        catch (error) {
                            return `无法创建目录: ${error instanceof Error ? error.message : String(error)}`;
                        }
                    })
                });
                if (!outputDir) {
                    return;
                }
                const userConfig = getUserConfig();
                yield progressUI.withProgress('批量转换 Markdown 到 HTML', (progress) => __awaiter(this, void 0, void 0, function* () {
                    progress.report({ message: '正在批量转换...' });
                    const results = yield converter.batchConvertToHtml(inputDir, outputDir, {
                        showProgress: true,
                        useConfig: userConfig,
                        onProgress: (message) => {
                            progress.report({ message });
                        }
                    });
                    const successCount = Object.values(results).filter(Boolean).length;
                    const totalCount = Object.keys(results).length;
                    progress.report({ message: '批量转换完成！' });
                    yield progressUI.showSuccess(`批量转换完成: 共 ${totalCount} 个文件, 成功 ${successCount} 个, 失败 ${totalCount - successCount} 个`, outputDir);
                }));
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('批量转换到HTML失败:', errorMessage);
                yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
            }
        }));
        const editConfigCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.editConfig', () => __awaiter(this, void 0, void 0, function* () {
            try {
                yield converter.editConfig();
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('编辑配置失败:', errorMessage);
                vscode.window.showErrorMessage(`编辑配置失败: ${errorMessage}`);
            }
        }));
        const convertToExcelCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.convertToExcel', (uri) => __awaiter(this, void 0, void 0, function* () {
            try {
                const editor = vscode.window.activeTextEditor;
                const inputFileUri = uri || (editor === null || editor === void 0 ? void 0 : editor.document.uri);
                if (!inputFileUri) {
                    throw new Error('无法确定要转换的 Markdown 文件。请在编辑器中打开一个 Markdown 文件，或在文件资源管理器中右键单击它。');
                }
                const inputFile = inputFileUri.fsPath;
                if (!inputFile.toLowerCase().endsWith('.md')) {
                    throw new Error(`选择的文件不是 Markdown (.md) 文件: ${inputFile}`);
                }
                const excelConfig = {
                    preserveFormatting: true,
                    autoColumnWidth: true,
                    freezeHeaders: true
                };
                yield progressUI.withProgress('Markdown 转 Excel', (progress) => __awaiter(this, void 0, void 0, function* () {
                    progress.report({ message: '正在转换为Excel...' });
                    const outputFile = inputFile.replace(/\.md$/i, '.xlsx');
                    const result = yield convertFile(inputFile, outputFile, excelConfig);
                    progress.report({ message: '转换完成！' });
                    yield progressUI.showSuccess('Markdown 文件已成功转换为 Excel 文档！', result.outputFile);
                    try {
                        if (result.outputFile) {
                            const uri = vscode.Uri.file(result.outputFile);
                            yield vscode.commands.executeCommand('vscode.open', uri);
                        }
                    }
                    catch (openError) {
                        console.error('无法打开生成的Excel文件:', openError);
                    }
                }));
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('转换到Excel失败:', errorMessage);
                yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
            }
        }));
        const batchConvertToExcelCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.batchConvertToExcel', (uri) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!uri) {
                    throw new Error('未选择目录。请在文件资源管理器中右键单击一个目录。');
                }
                const inputDir = uri.fsPath;
                const stats = yield fs.stat(inputDir);
                if (!stats.isDirectory()) {
                    throw new Error(`选择的路径不是目录: ${inputDir}`);
                }
                const outputDir = yield vscode.window.showInputBox({
                    prompt: '请输入输出目录路径',
                    value: inputDir,
                    validateInput: (value) => __awaiter(this, void 0, void 0, function* () {
                        if (!value) {
                            return '输出目录不能为空';
                        }
                        try {
                            yield fs.ensureDir(value);
                            return null;
                        }
                        catch (error) {
                            return `无法创建目录: ${error instanceof Error ? error.message : String(error)}`;
                        }
                    })
                });
                if (!outputDir) {
                    return;
                }
                const excelConfig = {
                    preserveFormatting: true,
                    autoColumnWidth: true,
                    freezeHeaders: true,
                    showProgress: true
                };
                yield progressUI.withProgress('批量转换 Markdown 到 Excel', (progress) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    progress.report({ message: '正在扫描Markdown文件...' });
                    const inputPattern = path.join(inputDir, '**/*.md');
                    const results = yield convertBatch(inputPattern, outputDir, excelConfig);
                    const successCount = ((_a = results.successful) === null || _a === void 0 ? void 0 : _a.length) || 0;
                    const failedCount = ((_b = results.failed) === null || _b === void 0 ? void 0 : _b.length) || 0;
                    const totalCount = successCount + failedCount;
                    progress.report({ message: '批量转换完成！' });
                    if (totalCount === 0) {
                        yield progressUI.showError(new Error('在指定目录中未找到Markdown文件'));
                        return;
                    }
                    yield progressUI.showSuccess(`批量转换完成: 共 ${totalCount} 个文件, 成功 ${successCount} 个, 失败 ${failedCount} 个`, outputDir);
                    if (failedCount > 0 && results.failed) {
                        const failedFiles = results.failed.map((f) => `${f.file}: ${f.error}`).join('\n');
                        console.warn('转换失败的文件:\n', failedFiles);
                    }
                }));
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('批量转换到Excel失败:', errorMessage);
                yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
            }
        }));
        const configExcelCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.configExcel', () => __awaiter(this, void 0, void 0, function* () {
            try {
                const options = [
                    { label: '$(gear) 打开配置工具', description: '在终端中启动交互式配置工具' },
                    { label: '$(file-text) 查看当前配置', description: '显示当前Excel转换配置' },
                    { label: '$(refresh) 重置为默认配置', description: '恢复Excel转换的默认设置' },
                    { label: '$(folder-opened) 打开配置目录', description: '在文件管理器中打开配置文件目录' }
                ];
                const selected = yield vscode.window.showQuickPick(options, {
                    placeHolder: '选择Excel配置操作',
                    canPickMany: false
                });
                if (!selected) {
                    return;
                }
                switch (selected.label) {
                    case '$(gear) 打开配置工具':
                        const terminal = vscode.window.createTerminal({
                            name: 'Excel配置工具',
                            cwd: path.join(context.extensionPath, 'nodeexcel')
                        });
                        terminal.show();
                        terminal.sendText('node bin/config.js');
                        vscode.window.showInformationMessage('Excel配置工具已在终端中启动');
                        break;
                    case '$(file-text) 查看当前配置':
                        try {
                            const configInfo = {
                                '样式设置': {
                                    '自动列宽': true,
                                    '冻结表头': true,
                                    '保留格式': true
                                },
                                '转换选项': {
                                    '支持的输入格式': ['.md', '.markdown'],
                                    '输出格式': '.xlsx',
                                    '智能内容映射': true
                                },
                                '功能特性': ExcelModule.getFeatures().features.slice(0, 5)
                            };
                            const configText = JSON.stringify(configInfo, null, 2);
                            const doc = yield vscode.workspace.openTextDocument({
                                content: configText,
                                language: 'json'
                            });
                            yield vscode.window.showTextDocument(doc);
                        }
                        catch (error) {
                            vscode.window.showErrorMessage('无法获取配置信息');
                        }
                        break;
                    case '$(refresh) 重置为默认配置':
                        const confirm = yield vscode.window.showWarningMessage('确定要重置Excel转换配置为默认设置吗？', { modal: true }, '确定', '取消');
                        if (confirm === '确定') {
                            try {
                                const configPath = path.join(context.extensionPath, 'nodeexcel', 'config', 'excel-config.json');
                                yield ExcelModule.createDefaultConfigFile(configPath);
                                vscode.window.showInformationMessage('Excel配置已重置为默认设置');
                            }
                            catch (error) {
                                vscode.window.showErrorMessage('重置配置失败');
                            }
                        }
                        break;
                    case '$(folder-opened) 打开配置目录':
                        const configDir = path.join(context.extensionPath, 'nodeexcel', 'config');
                        yield fs.ensureDir(configDir);
                        const uri = vscode.Uri.file(configDir);
                        yield vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false });
                        break;
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('Excel配置操作失败:', errorMessage);
                vscode.window.showErrorMessage(`Excel配置操作失败: ${errorMessage}`);
            }
        }));
        context.subscriptions.push(disposable, directConvertCmd, convertToHtmlCmd, batchConvertToWordCmd, batchConvertToHtmlCmd, editConfigCmd, convertToExcelCmd, batchConvertToExcelCmd, configExcelCmd);
        console.log('插件 "Markdown to Word Converter" 已激活');
    });
}
function deactivate() {
    console.log('插件 "Markdown to Word Converter" 已停用');
}
//# sourceMappingURL=extension.js.map