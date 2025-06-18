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
exports.CommandService = void 0;
const vscode = __importStar(require("vscode"));
const errorHandler_1 = require("../utils/errorHandler");
const configurationUI_1 = require("../configurationUI");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class CommandService {
    constructor(context, dependencyService, configService, conversionService) {
        this.context = context;
        this.dependencyService = dependencyService;
        this.configService = configService;
        this.conversionService = conversionService;
        this.errorHandler = new errorHandler_1.ErrorHandler();
        this.configUI = configurationUI_1.ConfigurationUI.getInstance();
    }
    registerCommands() {
        const commands = [
            {
                command: 'markdowntoword.markdown-to-word.convert',
                handler: this.handleConvertCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.convertDirect',
                handler: this.handleConvertDirectCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.openConfig',
                handler: this.handleOpenConfigCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.resetConfig',
                handler: this.handleResetConfigCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.exportConfig',
                handler: this.handleExportConfigCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.importConfig',
                handler: this.handleImportConfigCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.checkDependencies',
                handler: this.handleCheckDependenciesCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.installDependencies',
                handler: this.handleInstallDependenciesCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.showInstallationGuide',
                handler: this.handleShowInstallationGuideCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.convertWorkspace',
                handler: this.handleConvertWorkspaceCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.convertFolder',
                handler: this.handleConvertFolderCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.showHelp',
                handler: this.handleShowHelpCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.showVersion',
                handler: this.handleShowVersionCommand.bind(this)
            }
        ];
        commands.forEach(({ command, handler }) => {
            const disposable = vscode.commands.registerCommand(command, handler);
            this.context.subscriptions.push(disposable);
        });
        console.log(`已注册 ${commands.length} 个命令`);
    }
    handleConvertCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dependencyCheck = yield this.dependencyService.checkAndInstallDependencies();
                if (!dependencyCheck) {
                    yield vscode.window.showErrorMessage('依赖检查失败，请手动安装依赖');
                    return;
                }
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    yield vscode.window.showErrorMessage('请先打开一个 Markdown 文件');
                    return;
                }
                const filePath = editor.document.fileName;
                if (!this.conversionService.isSupportedFile(filePath)) {
                    yield vscode.window.showErrorMessage('当前文件不是 Markdown 文件');
                    return;
                }
                if (editor.document.isDirty) {
                    yield editor.document.save();
                }
                yield this.configUI.showConfigurationUI();
            }
            catch (error) {
                yield this.errorHandler.handleError(error, '转换命令执行失败');
            }
        });
    }
    handleConvertDirectCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dependencyCheck = yield this.dependencyService.checkAndInstallDependencies();
                if (!dependencyCheck) {
                    vscode.window.showErrorMessage('依赖检查失败，无法执行转换');
                    return;
                }
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    yield vscode.window.showErrorMessage('请先打开一个 Markdown 文件');
                    return;
                }
                const filePath = editor.document.fileName;
                if (!this.conversionService.isSupportedFile(filePath)) {
                    yield vscode.window.showErrorMessage('当前文件不是 Markdown 文件');
                    return;
                }
                if (editor.document.isDirty) {
                    yield editor.document.save();
                }
                yield this.conversionService.convertFileWithProgress(filePath);
            }
            catch (error) {
                yield this.errorHandler.handleError(error, '直接转换命令执行失败');
            }
        });
    }
    handleOpenConfigCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.configUI.showConfigurationUI();
            }
            catch (error) {
                yield this.errorHandler.handleError(error, '打开配置界面失败');
            }
        });
    }
    handleResetConfigCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const choice = yield vscode.window.showWarningMessage('确定要重置所有配置到默认值吗？此操作不可撤销。', '确定', '取消');
                if (choice === '确定') {
                    yield this.configService.resetToDefault();
                    yield vscode.window.showInformationMessage('配置已重置为默认值');
                }
            }
            catch (error) {
                yield this.errorHandler.handleError(error, '重置配置失败');
            }
        });
    }
    handleExportConfigCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const saveUri = yield vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.file('markdown-to-word-config.yaml'),
                    filters: {
                        'YAML 文件': ['yaml', 'yml'],
                        '所有文件': ['*']
                    }
                });
                if (saveUri) {
                    yield this.configService.exportConfig(saveUri.fsPath);
                    yield vscode.window.showInformationMessage(`配置已导出到: ${saveUri.fsPath}`);
                }
            }
            catch (error) {
                yield this.errorHandler.handleError(error, '导出配置失败');
            }
        });
    }
    handleImportConfigCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const openUri = yield vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    filters: {
                        'YAML 文件': ['yaml', 'yml'],
                        '所有文件': ['*']
                    }
                });
                if (openUri && openUri[0]) {
                    yield this.configService.importConfig(openUri[0].fsPath);
                    yield vscode.window.showInformationMessage(`配置已从 ${openUri[0].fsPath} 导入`);
                }
            }
            catch (error) {
                yield this.errorHandler.handleError(error, '导入配置失败');
            }
        });
    }
    handleCheckDependenciesCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.dependencyService.checkAndInstallDependencies();
                if (result) {
                    yield vscode.window.showInformationMessage('所有依赖都已正确安装！');
                }
                else {
                    yield vscode.window.showErrorMessage('依赖安装失败，请查看输出面板了解详情');
                }
            }
            catch (error) {
                yield this.errorHandler.handleError(error, '检查依赖失败');
            }
        });
    }
    handleInstallDependenciesCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.dependencyService.checkAndInstallDependencies();
            }
            catch (error) {
                yield this.errorHandler.handleError(error, '安装依赖失败');
            }
        });
    }
    handleShowInstallationGuideCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.dependencyService.showManualInstallationInstructions();
            }
            catch (error) {
                yield this.errorHandler.handleError(error, '显示安装指南失败');
            }
        });
    }
    handleConvertWorkspaceCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dependencyCheck = yield this.dependencyService.checkAndInstallDependencies();
                if (!dependencyCheck) {
                    vscode.window.showErrorMessage('依赖检查失败，无法执行转换');
                    return;
                }
                const markdownFiles = yield vscode.workspace.findFiles('**/*.md', '**/node_modules/**');
                if (markdownFiles.length === 0) {
                    yield vscode.window.showInformationMessage('工作区中没有找到 Markdown 文件');
                    return;
                }
                const choice = yield vscode.window.showInformationMessage(`找到 ${markdownFiles.length} 个 Markdown 文件，确定要全部转换吗？`, '确定', '取消');
                if (choice === '确定') {
                    const filePaths = markdownFiles.map(uri => uri.fsPath);
                    yield this.conversionService.convertMultipleFiles(filePaths);
                }
            }
            catch (error) {
                yield this.errorHandler.handleError(error, '转换工作区失败');
            }
        });
    }
    handleConvertFolderCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dependencyCheck = yield this.dependencyService.checkAndInstallDependencies();
                if (!dependencyCheck) {
                    vscode.window.showErrorMessage('依赖检查失败，无法执行转换');
                    return;
                }
                const folderUri = yield vscode.window.showOpenDialog({
                    canSelectFiles: false,
                    canSelectFolders: true,
                    canSelectMany: false,
                    openLabel: '选择要转换的文件夹'
                });
                if (!folderUri || folderUri.length === 0) {
                    return;
                }
                const folderPath = folderUri[0].fsPath;
                const pattern = new vscode.RelativePattern(folderPath, '**/*.md');
                const markdownFiles = yield vscode.workspace.findFiles(pattern, '**/node_modules/**');
                if (markdownFiles.length === 0) {
                    yield vscode.window.showInformationMessage('选择的文件夹中没有找到 Markdown 文件');
                    return;
                }
                const choice = yield vscode.window.showInformationMessage(`在文件夹中找到 ${markdownFiles.length} 个 Markdown 文件，确定要全部转换吗？`, '确定', '取消');
                if (choice === '确定') {
                    const filePaths = markdownFiles.map(uri => uri.fsPath);
                    yield this.conversionService.convertMultipleFiles(filePaths);
                }
            }
            catch (error) {
                yield this.errorHandler.handleError(error, '转换文件夹失败');
            }
        });
    }
    handleShowHelpCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const helpMessage = `
# Markdown to Word 插件帮助

## 主要功能
- 将 Markdown 文件转换为 Word 文档
- 支持自定义样式和格式配置
- 支持批量转换
- 支持中文优化

## 使用方法
1. 打开 Markdown 文件
2. 使用命令面板 (Ctrl+Shift+P) 搜索 "Markdown to Word"
3. 选择相应的转换命令

## 可用命令
- **转换当前文件**: 打开配置界面进行转换
- **直接转换**: 使用默认配置直接转换
- **批量转换**: 转换工作区或文件夹中的所有 Markdown 文件
- **配置管理**: 打开、重置、导入、导出配置
- **依赖管理**: 检查和安装必要的依赖

## 支持的格式
- 输入: .md, .markdown
- 输出: .docx

如需更多帮助，请访问插件的 GitHub 仓库。
            `;
                const panel = vscode.window.createWebviewPanel('markdownToWordHelp', 'Markdown to Word 帮助', vscode.ViewColumn.One, {
                    enableScripts: false,
                    retainContextWhenHidden: true
                });
                panel.webview.html = this.generateHelpHTML(helpMessage);
            }
            catch (error) {
                yield this.errorHandler.handleError(error, '显示帮助失败');
            }
        });
    }
    handleShowVersionCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const packageJsonPath = path.join(__dirname, '../../package.json');
                const packageJsonContent = yield fs.promises.readFile(packageJsonPath, 'utf8');
                const packageJson = JSON.parse(packageJsonContent);
                const version = packageJson.version || '未知版本';
                const description = packageJson.description || '';
                yield vscode.window.showInformationMessage(`Markdown to Word v${version}\n${description}`);
            }
            catch (error) {
                yield this.errorHandler.handleError(error, '显示版本信息失败');
            }
        });
    }
    generateHelpHTML(helpMessage) {
        const convertMarkdownToHTML = (text) => {
            return text.split('\n').map(line => {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('# ')) {
                    return `<h1>${this.escapeHtml(trimmedLine.substring(2))}</h1>`;
                }
                else if (trimmedLine.startsWith('## ')) {
                    return `<h2>${this.escapeHtml(trimmedLine.substring(3))}</h2>`;
                }
                else if (trimmedLine.startsWith('- ')) {
                    return `<li>${this.escapeHtml(trimmedLine.substring(2))}</li>`;
                }
                else if (trimmedLine.match(/^\d+\. /)) {
                    return `<li>${this.escapeHtml(trimmedLine.substring(trimmedLine.indexOf(' ') + 1))}</li>`;
                }
                else if (trimmedLine === '') {
                    return '<br>';
                }
                else {
                    return `<p>${this.escapeHtml(trimmedLine)}</p>`;
                }
            }).join('');
        };
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
                <title>帮助</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        line-height: 1.6;
                        padding: 20px;
                        margin: 0;
                    }
                    h1, h2, h3 {
                        color: var(--vscode-textLink-foreground);
                        margin-top: 20px;
                        margin-bottom: 10px;
                    }
                    h1 {
                        border-bottom: 1px solid var(--vscode-textSeparator-foreground);
                        padding-bottom: 10px;
                    }
                    code {
                        background-color: var(--vscode-textCodeBlock-background);
                        padding: 2px 4px;
                        border-radius: 3px;
                        font-family: var(--vscode-editor-font-family);
                    }
                    ul {
                        padding-left: 20px;
                        margin: 10px 0;
                    }
                    li {
                        margin-bottom: 5px;
                    }
                    p {
                        margin: 10px 0;
                    }
                </style>
            </head>
            <body>
                ${convertMarkdownToHTML(helpMessage)}
            </body>
            </html>
        `;
    }
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    dispose() {
        if (this.errorHandler && typeof this.errorHandler.dispose === 'function') {
            this.errorHandler.dispose();
        }
    }
}
exports.CommandService = CommandService;
//# sourceMappingURL=commandService.js.map