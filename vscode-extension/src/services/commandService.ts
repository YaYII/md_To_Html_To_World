/**
 * @file commandService.ts
 * @description 命令服务 - 负责注册和处理VS Code命令
 */
import * as vscode from 'vscode';

import { ConfigService } from './configService';
import { ConversionService } from './conversionService';
import { BrowserService } from './browserService';
import { ErrorHandler } from '../utils/errorHandler';
// 直接使用 WorldToMD 项目
const { WordToMarkdownConverter } = require('../../worldtomd/src/index');

import { ConfigPanel, IDocumentConfig } from '../ui/configPanel';
import { notifyError, notifyWarning } from '../utils/notify';
import * as path from 'path';
import * as fs from 'fs-extra';

// 定义 WordToMarkdownConverter 的类型
interface IWordToMarkdownConverter {
    convertFile(inputPath: string, outputPath: string): Promise<{
        success: boolean;
        inputPath: string;
        outputPath: string;
        stats: any;
        duration: number;
    }>;
    convertDirectory(inputDir: string, outputDir: string, recursive?: boolean): Promise<{
        success: boolean;
        totalFiles: number;
        successCount: number;
        failureCount: number;
        results: Array<{
            success: boolean;
            inputPath: string;
            outputPath?: string;
            error?: string;
        }>;
        duration: number;
    }>;
}

/**
 * 命令服务类
 */
export class CommandService {
    private context: vscode.ExtensionContext;
    private configService: ConfigService;
    private conversionService: ConversionService;
    private browserService: BrowserService;
    private errorHandler: ErrorHandler;
    private wordToMarkdownConverter: IWordToMarkdownConverter;

    constructor(
        context: vscode.ExtensionContext,
        configService: ConfigService,
        conversionService: ConversionService
    ) {
        this.context = context;
        this.configService = configService;
        this.conversionService = conversionService;
        this.browserService = new BrowserService();
        this.errorHandler = new ErrorHandler();
        this.wordToMarkdownConverter = new WordToMarkdownConverter({
            preserveImages: true,
            preserveTables: true,
            preserveFormatting: true,
            verbose: false
        });
    }

    /**
     * 注册所有命令
     */
    registerCommands(): void {
        const commands = [
            // 主要转换命令
            {
                command: 'markdowntoword.markdown-to-word.convert',
                handler: this.handleConvertCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.convertDirect',
                handler: this.handleConvertDirectCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.convertToHtml',
                handler: this.handleConvertToHtmlCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.convertToExcel',
                handler: this.handleConvertToExcelCommand.bind(this)
            },
            
            // 批量转换命令
            {
                command: 'markdowntoword.markdown-to-word.batchConvertToWord',
                handler: this.handleBatchConvertToWordCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.batchConvertToHtml',
                handler: this.handleBatchConvertToHtmlCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.batchConvertToExcel',
                handler: this.handleBatchConvertToExcelCommand.bind(this)
            },
            
            // 配置相关命令
            {
                command: 'markdowntoword.markdown-to-word.editConfig',
                handler: this.handleEditConfigCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.configExcel',
                handler: this.handleConfigExcelCommand.bind(this)
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
            
            // 依赖管理命令
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
            
            // 批量处理命令（工作区）
            {
                command: 'markdowntoword.markdown-to-word.convertWorkspace',
                handler: this.handleConvertWorkspaceCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.convertFolder',
                handler: this.handleConvertFolderCommand.bind(this)
            },
            
            // 帮助和信息命令
            {
                command: 'markdowntoword.markdown-to-word.showHelp',
                handler: this.handleShowHelpCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.showVersion',
                handler: this.handleShowVersionCommand.bind(this)
            },
            
            // 浏览器预览命令
            {
                command: 'markdowntoword.markdown-to-word.openInBrowser',
                handler: this.handleOpenInBrowserCommand.bind(this)
            },
            
            // Word转Markdown命令
            {
                command: 'markdowntoword.markdown-to-word.convertTomd',
                handler: this.handleWordToMarkdownCommand.bind(this)
            },
            {
                command: 'markdowntoword.markdown-to-word.batchConvertTomd',
                handler: this.handleBatchWordToMarkdownCommand.bind(this)
            }
        ];

        // 注册所有命令
        commands.forEach(({ command, handler }) => {
            const disposable = vscode.commands.registerCommand(command, handler);
            this.context.subscriptions.push(disposable);
        });

        console.log(`已注册 ${commands.length} 个命令`);
    }

    /**
     * 处理转换命令（带配置界面）
     */
    private async handleConvertCommand(): Promise<void> {
        try {
           
            // 获取当前活动的编辑器
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                notifyError('请先打开一个 Markdown 文件');
                return;
            }

            const filePath = editor.document.fileName;
            if (!this.conversionService.isSupportedFile(filePath)) {
                notifyError('当前文件不是 Markdown 文件');
                return;
            }

            // 保存文件（如果有未保存的更改）
            if (editor.document.isDirty) {
                await editor.document.save();
            }

            // 打开配置界面
            ConfigPanel.createOrShow(this.context.extensionPath, filePath, async (config: IDocumentConfig, cancelled: boolean) => {
                if (!cancelled) {
                    // 用户完成配置，开始转换
                    await this.conversionService.convertFileWithProgress(filePath, { useConfig: config });
                }
            });
            
        } catch (error) {
            await this.errorHandler.handleError(error, '转换命令执行失败');
        }
    }

    /**
     * 处理直接转换命令（使用默认配置）
     */
    private async handleConvertDirectCommand(): Promise<void> {
        try {
            

            // 获取当前活动的编辑器
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                notifyError('请先打开一个 Markdown 文件');
                return;
            }

            const filePath = editor.document.fileName;
            if (!this.conversionService.isSupportedFile(filePath)) {
                notifyError('当前文件不是 Markdown 文件');
                return;
            }

            // 保存文件（如果有未保存的更改）
            if (editor.document.isDirty) {
                await editor.document.save();
            }

            // 直接转换（使用默认配置）
            await this.conversionService.convertFileWithProgress(filePath);
            
        } catch (error) {
            await this.errorHandler.handleError(error, '直接转换命令执行失败');
        }
    }

    /**
     * 处理打开配置命令
     */
    private async handleOpenConfigCommand(): Promise<void> {
        try {
            // 获取当前活动的编辑器
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                notifyError('请先打开一个 Markdown 文件');
                return;
            }

            const filePath = editor.document.fileName;
            ConfigPanel.createOrShow(this.context.extensionPath, filePath, async (_config: IDocumentConfig, cancelled: boolean) => {
                if (!cancelled) {
                    await vscode.window.showInformationMessage('配置已保存');
                }
            });
        } catch (error) {
            await this.errorHandler.handleError(error, '打开配置界面失败');
        }
    }

    /**
     * 处理重置配置命令
     */
    private async handleResetConfigCommand(): Promise<void> {
        try {
            const choice = await vscode.window.showWarningMessage(
                '确定要重置所有配置到默认值吗？此操作不可撤销。',
                '确定',
                '取消'
            );

            if (choice === '确定') {
                await this.configService.resetToDefault();
                await vscode.window.showInformationMessage('配置已重置为默认值');
            }
        } catch (error) {
            await this.errorHandler.handleError(error, '重置配置失败');
        }
    }

    /**
     * 处理导出配置命令
     */
    private async handleExportConfigCommand(): Promise<void> {
        try {
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('markdown-to-word-config.yaml'),
                filters: {
                    'YAML 文件': ['yaml', 'yml'],
                    '所有文件': ['*']
                }
            });

            if (saveUri) {
                await this.configService.exportConfig(saveUri.fsPath);
                await vscode.window.showInformationMessage(`配置已导出到: ${saveUri.fsPath}`);
            }
        } catch (error) {
            await this.errorHandler.handleError(error, '导出配置失败');
        }
    }

    /**
     * 处理导入配置命令
     */
    private async handleImportConfigCommand(): Promise<void> {
        try {
            const openUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'YAML 文件': ['yaml', 'yml'],
                    '所有文件': ['*']
                }
            });

            if (openUri && openUri[0]) {
                await this.configService.importConfig(openUri[0].fsPath);
                await vscode.window.showInformationMessage(`配置已从 ${openUri[0].fsPath} 导入`);
            }
        } catch (error) {
            await this.errorHandler.handleError(error, '导入配置失败');
        }
    }

    /**
     * 处理检查依赖命令
     */
    private async handleCheckDependenciesCommand(): Promise<void> {
        try {
           
          
        } catch (error) {
            await this.errorHandler.handleError(error, '检查依赖失败');
        }
    }

    /**
     * 处理安装依赖命令
     */
    private async handleInstallDependenciesCommand(): Promise<void> {
        try {
            
        } catch (error) {
            await this.errorHandler.handleError(error, '安装依赖失败');
        }
    }

    /**
     * 处理显示安装指南命令
     */
    private async handleShowInstallationGuideCommand(): Promise<void> {
        try {
            //await this.dependencyService.showManualInstallInstructions();
            //await this.dependencyService.showManualInstallationInstructions();  
        } catch (error) {
            await this.errorHandler.handleError(error, '显示安装指南失败');
        }
    }

    /**
     * 处理转换工作区命令
     */
    private async handleConvertWorkspaceCommand(): Promise<void> {
        try {
            // 检查依赖
            

            // 获取工作区中的所有 Markdown 文件
            const markdownFiles = await vscode.workspace.findFiles('**/*.md', '**/node_modules/**');
            
            if (markdownFiles.length === 0) {
                await vscode.window.showInformationMessage('工作区中没有找到 Markdown 文件');
                return;
            }

            const choice = await vscode.window.showInformationMessage(
                `找到 ${markdownFiles.length} 个 Markdown 文件，确定要全部转换吗？`,
                '确定',
                '取消'
            );

            if (choice === '确定') {
                const filePaths = markdownFiles.map(uri => uri.fsPath);
                await this.conversionService.convertMultipleFiles(filePaths);
            }
        } catch (error) {
            await this.errorHandler.handleError(error, '转换工作区失败');
        }
    }

    /**
     * 处理转换文件夹命令
     */
    private async handleConvertFolderCommand(): Promise<void> {
        try {
           

            // 让用户选择文件夹
            const folderUri = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: '选择要转换的文件夹'
            });

            if (!folderUri || folderUri.length === 0) {
                return;
            }

            const folderPath = folderUri[0].fsPath;
            
            // 查找文件夹中的 Markdown 文件
            const pattern = new vscode.RelativePattern(folderPath, '**/*.md');
            const markdownFiles = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
            
            if (markdownFiles.length === 0) {
                await vscode.window.showInformationMessage('选择的文件夹中没有找到 Markdown 文件');
                return;
            }

            const choice = await vscode.window.showInformationMessage(
                `在文件夹中找到 ${markdownFiles.length} 个 Markdown 文件，确定要全部转换吗？`,
                '确定',
                '取消'
            );

            if (choice === '确定') {
                const filePaths = markdownFiles.map(uri => uri.fsPath);
                await this.conversionService.convertMultipleFiles(filePaths);
            }
        } catch (error) {
            await this.errorHandler.handleError(error, '转换文件夹失败');
        }
    }

    /**
     * 处理显示帮助命令
     */
    private async handleShowHelpCommand(): Promise<void> {
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

            const panel = vscode.window.createWebviewPanel(
                'markdownToWordHelp',
                'Markdown to Word 帮助',
                vscode.ViewColumn.One,
                {
                    enableScripts: false,
                    retainContextWhenHidden: true
                }
            );

            panel.webview.html = this.generateHelpHTML(helpMessage);
        } catch (error) {
            await this.errorHandler.handleError(error, '显示帮助失败');
        }
    }

    /**
     * 处理显示版本命令
     */
    private async handleShowVersionCommand(): Promise<void> {
        try {
            const packageJsonPath = path.join(__dirname, '../../package.json');
            const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf8');
            const packageJson = JSON.parse(packageJsonContent);
            const version = packageJson.version || '未知版本';
            const description = packageJson.description || '';
            
            await vscode.window.showInformationMessage(
                `Markdown to Word v${version}\n${description}`
            );
        } catch (error) {
            await this.errorHandler.handleError(error, '显示版本信息失败');
        }
    }

    /**
     * 生成帮助页面的 HTML 内容
     */
    private generateHelpHTML(helpMessage: string): string {
        const convertMarkdownToHTML = (text: string): string => {
            return text.split('\n').map(line => {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('# ')) {
                    return `<h1>${this.escapeHtml(trimmedLine.substring(2))}</h1>`;
                } else if (trimmedLine.startsWith('## ')) {
                    return `<h2>${this.escapeHtml(trimmedLine.substring(3))}</h2>`;
                } else if (trimmedLine.startsWith('- ')) {
                    return `<li>${this.escapeHtml(trimmedLine.substring(2))}</li>`;
                } else if (trimmedLine.match(/^\d+\. /)) {
                    return `<li>${this.escapeHtml(trimmedLine.substring(trimmedLine.indexOf(' ') + 1))}</li>`;
                } else if (trimmedLine === '') {
                    return '<br>';
                } else {
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

    /**
     * HTML 转义函数
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * 处理转换为HTML命令
     */
    private async handleConvertToHtmlCommand(uri?: vscode.Uri): Promise<void> {
        try {
            // 获取当前活动的编辑器或使用传入的URI
            const editor = vscode.window.activeTextEditor;
            const filePath = uri?.fsPath || editor?.document.fileName;
            
            if (!filePath) {
                notifyError('请先打开一个 Markdown 文件');
                return;
            }

            if (!this.conversionService.isSupportedFile(filePath)) {
                notifyError('当前文件不是 Markdown 文件');
                return;
            }

            // 保存文件（如果有未保存的更改）
            if (editor?.document.isDirty) {
                await editor.document.save();
            }

            // 使用NodeMarkdownConverter进行HTML转换
            const { NodeMarkdownConverter } = require('../core/nodeConverter');
            const converter = NodeMarkdownConverter.getInstance();
            
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: '转换为HTML',
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ message: '准备转换...', increment: 10 });
                    
                    // 确定输出路径
                    const inputDir = path.dirname(filePath);
                    const baseName = path.basename(filePath, '.md');
                    const outputPath = path.join(inputDir, `${baseName}.html`);
                    
                    progress.report({ message: '正在转换...', increment: 50 });
                    
                    // 执行转换
                    const result = await converter.convertToHtml(filePath, {
                        outputDirectory: inputDir,
                        onProgress: (message: string) => {
                            progress.report({ message });
                        }
                    });
                    
                    progress.report({ message: '转换完成', increment: 100 });
                    
                    if (result.success) {
                        // 显示成功消息并提供打开文件选项
                        const choice = await vscode.window.showInformationMessage(
                            `HTML文件已生成: ${path.basename(outputPath)}`,
                            '打开文件',
                            '显示文件夹'
                        );
                        
                        if (choice === '打开文件') {
                            await vscode.env.openExternal(vscode.Uri.file(outputPath));
                        } else if (choice === '显示文件夹') {
                            await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
                        }
                    } else {
                        throw new Error(result.message || '转换失败');
                    }
                } catch (conversionError) {
                    throw new Error(`转换过程中出错: ${conversionError instanceof Error ? conversionError.message : String(conversionError)}`);
                }
            });
            
        } catch (error) {
            await this.errorHandler.handleError(error, '转换为HTML失败');
        }
    }

    /**
     * 处理转换为Excel命令
     */
    private async handleConvertToExcelCommand(uri?: vscode.Uri): Promise<void> {
        try {
            // 获取当前活动的编辑器或使用传入的URI
            const editor = vscode.window.activeTextEditor;
            const filePath = uri?.fsPath || editor?.document.fileName;
            
            if (!filePath) {
                notifyError('请先打开一个 Markdown 文件');
                return;
            }

            if (!this.conversionService.isSupportedFile(filePath)) {
                notifyError('当前文件不是 Markdown 文件');
                return;
            }

            // 保存文件（如果有未保存的更改）
            if (editor?.document.isDirty) {
                await editor.document.save();
            }

            // 使用nodeexcel模块进行转换
            const { createConverter } = require('../../nodeexcel/src/index');
            
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: '转换为Excel',
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ message: '准备转换...', increment: 10 });
                    
                    // 创建转换器实例
                    const converter = createConverter();
                    await converter.initialize();
                    
                    progress.report({ message: '正在转换...', increment: 50 });
                    
                    // 确定输出路径
                    const inputDir = path.dirname(filePath);
                    const baseName = path.basename(filePath, '.md');
                    const outputPath = path.join(inputDir, `${baseName}.xlsx`);
                    
                    // 执行转换
                    const result = await converter.convertFile(filePath, outputPath);
                    
                    progress.report({ message: '转换完成', increment: 100 });
                    
                    if (result.success) {
                        // 显示成功消息并提供打开文件选项
                        const choice = await vscode.window.showInformationMessage(
                            `Excel文件已生成: ${path.basename(outputPath)}`,
                            '打开文件',
                            '显示文件夹'
                        );
                        
                        if (choice === '打开文件') {
                            await vscode.env.openExternal(vscode.Uri.file(outputPath));
                        } else if (choice === '显示文件夹') {
                            await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
                        }
                    } else {
                        throw new Error(result.message || '转换失败');
                    }
                } catch (conversionError) {
                    throw new Error(`转换过程中出错: ${conversionError instanceof Error ? conversionError.message : String(conversionError)}`);
                }
            });
            
        } catch (error) {
            await this.errorHandler.handleError(error, '转换为Excel失败');
        }
    }

    /**
     * 处理批量转换为Word命令
     */
    private async handleBatchConvertToWordCommand(uri?: vscode.Uri): Promise<void> {
        try {
            const folderPath = uri?.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            
            if (!folderPath) {
                notifyError('请选择一个文件夹');
                return;
            }

            // 批量转换为Word
            await vscode.window.showInformationMessage('批量Word转换功能正在开发中...');
            
        } catch (error) {
            await this.errorHandler.handleError(error, '批量转换为Word失败');
        }
    }

    /**
     * 处理批量转换为HTML命令
     */
    private async handleBatchConvertToHtmlCommand(uri?: vscode.Uri): Promise<void> {
        try {
            const folderPath = uri?.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            
            if (!folderPath) {
                notifyError('请选择一个文件夹');
                return;
            }

            // 使用NodeMarkdownConverter进行批量HTML转换
            const { NodeMarkdownConverter } = require('../core/nodeConverter');
            const converter = NodeMarkdownConverter.getInstance();
            
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: '批量转换为HTML',
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ message: '扫描文件...', increment: 10 });
                    
                    // 构建输出目录
                    const outputDir = path.join(folderPath, 'html-output');
                    
                    progress.report({ message: '开始批量转换...', increment: 30 });
                    
                    // 执行批量转换
                    const results = await converter.batchConvertToHtml(folderPath, outputDir, {
                        onProgress: (message: string) => {
                            progress.report({ message });
                        }
                    });
                    
                    progress.report({ message: '转换完成', increment: 100 });
                    
                    // 统计结果
                    const successCount = Object.values(results).filter(success => success).length;
                    const totalFiles = Object.keys(results).length;
                    const failureCount = totalFiles - successCount;
                    
                    if (totalFiles > 0) {
                        // 显示结果统计
                        const message = `批量HTML转换完成！\n成功: ${successCount}/${totalFiles} 个文件`;
                        const choice = await vscode.window.showInformationMessage(
                            message,
                            '打开输出文件夹',
                            '查看详情'
                        );
                        
                        if (choice === '打开输出文件夹') {
                            await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputDir));
                        } else if (choice === '查看详情') {
                            // 在输出面板显示详细结果
                            const outputChannel = vscode.window.createOutputChannel('Markdown to HTML - 批量转换结果');
                            outputChannel.clear();
                            outputChannel.appendLine('批量HTML转换结果:');
                            outputChannel.appendLine('='.repeat(50));
                            outputChannel.appendLine(`总文件数: ${totalFiles}`);
                            outputChannel.appendLine(`成功转换: ${successCount}`);
                            outputChannel.appendLine(`转换失败: ${failureCount}`);
                            outputChannel.appendLine('');
                            
                            Object.entries(results).forEach(([filePath, success], index) => {
                                if (success) {
                                    const outputFile = path.join(outputDir, path.relative(folderPath, filePath).replace(/\.md$/, '.html'));
                                    outputChannel.appendLine(`${index + 1}. ✅ ${filePath} -> ${outputFile}`);
                                } else {
                                    outputChannel.appendLine(`${index + 1}. ❌ ${filePath} - 转换失败`);
                                }
                            });
                            
                            outputChannel.show();
                        }
                    } else {
                        notifyWarning('未找到可转换的Markdown文件');
                    }
                } catch (conversionError) {
                    throw new Error(`批量转换过程中出错: ${conversionError instanceof Error ? conversionError.message : String(conversionError)}`);
                }
            });
            
        } catch (error) {
            await this.errorHandler.handleError(error, '批量转换为HTML失败');
        }
    }

    /**
     * 处理批量转换为Excel命令
     */
    private async handleBatchConvertToExcelCommand(uri?: vscode.Uri): Promise<void> {
        try {
            const folderPath = uri?.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            
            if (!folderPath) {
                notifyError('请选择一个文件夹');
                return;
            }

            // 使用nodeexcel模块进行批量转换
            const { createConverter } = require('../../nodeexcel/src/index');
            
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: '批量转换为Excel',
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ message: '扫描文件...', increment: 10 });
                    
                    // 创建转换器实例
                    const converter = createConverter();
                    await converter.initialize();
                    
                    // 构建输入模式和输出目录
                    const inputPattern = path.join(folderPath, '**/*.md');
                    const outputDir = path.join(folderPath, 'excel-output');
                    
                    progress.report({ message: '开始批量转换...', increment: 30 });
                    
                    // 执行批量转换
                    const result = await converter.convertBatch(inputPattern, outputDir);
                    
                    progress.report({ message: '转换完成', increment: 100 });
                    
                    if (result.success) {
                        // 显示结果统计
                        const message = `批量转换完成！\n成功: ${result.successCount}/${result.totalFiles} 个文件`;
                        const choice = await vscode.window.showInformationMessage(
                            message,
                            '打开输出文件夹',
                            '查看详情'
                        );
                        
                        if (choice === '打开输出文件夹') {
                            await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputDir));
                        } else if (choice === '查看详情') {
                            // 在输出面板显示详细结果
                            const outputChannel = vscode.window.createOutputChannel('Markdown to Excel - 批量转换结果');
                            outputChannel.clear();
                            outputChannel.appendLine('批量转换结果:');
                            outputChannel.appendLine('='.repeat(50));
                            outputChannel.appendLine(`总文件数: ${result.totalFiles}`);
                            outputChannel.appendLine(`成功转换: ${result.successCount}`);
                            outputChannel.appendLine(`转换失败: ${result.failureCount}`);
                            outputChannel.appendLine('');
                            
                            if (result.results) {
                                result.results.forEach((r: any, index: number) => {
                                    if (r.success) {
                                        outputChannel.appendLine(`${index + 1}. ✅ ${r.inputPath} -> ${r.outputPath}`);
                                    } else {
                                        outputChannel.appendLine(`${index + 1}. ❌ ${r.inputPath} - ${r.error}`);
                                    }
                                });
                            }
                            
                            outputChannel.show();
                        }
                    } else {
                        throw new Error(result.message || '批量转换失败');
                    }
                } catch (conversionError) {
                    throw new Error(`批量转换过程中出错: ${conversionError instanceof Error ? conversionError.message : String(conversionError)}`);
                }
            });
            
        } catch (error) {
            await this.errorHandler.handleError(error, '批量转换为Excel失败');
        }
    }

    /**
     * 处理编辑配置命令
     */
    private async handleEditConfigCommand(): Promise<void> {
        try {
            // 获取当前活动的编辑器
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                notifyError('请先打开一个 Markdown 文件');
                return;
            }

            const filePath = editor.document.fileName;
            ConfigPanel.createOrShow(this.context.extensionPath, filePath, async (_config: IDocumentConfig, cancelled: boolean) => {
                if (!cancelled) {
                    await vscode.window.showInformationMessage('配置已保存');
                }
            });
        } catch (error) {
            await this.errorHandler.handleError(error, '打开配置编辑器失败');
        }
    }

    /**
     * 处理Excel配置命令
     */
    private async handleConfigExcelCommand(): Promise<void> {
        try {
            // 提供Excel配置选项
            const choice = await vscode.window.showQuickPick([
                {
                    label: '$(gear) 创建Excel配置文件',
                    description: '在当前工作区创建默认的Excel转换配置文件',
                    action: 'create'
                },
                {
                    label: '$(eye) 查看当前配置',
                    description: '显示当前的Excel转换配置',
                    action: 'view'
                },
                {
                    label: '$(folder-opened) 打开配置文件',
                    description: '打开现有的Excel配置文件进行编辑',
                    action: 'open'
                },
                {
                    label: '$(info) 查看配置说明',
                    description: '显示Excel配置选项的详细说明',
                    action: 'help'
                }
            ], {
                placeHolder: '选择Excel配置操作'
            });

            if (!choice) {
                return;
            }

            switch (choice.action) {
                case 'create':
                    await this.createExcelConfig();
                    break;
                case 'view':
                    await this.viewExcelConfig();
                    break;
                case 'open':
                    await this.openExcelConfig();
                    break;
                case 'help':
                    await this.showExcelConfigHelp();
                    break;
            }
        } catch (error) {
            await this.errorHandler.handleError(error, 'Excel配置失败');
        }
    }

    /**
     * 创建Excel配置文件
     */
    private async createExcelConfig(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            notifyError('请先打开一个工作区');
            return;
        }

        const configPath = path.join(workspaceFolder.uri.fsPath, 'excel-config.yaml');
        
        if (await fs.pathExists(configPath)) {
            const choice = await vscode.window.showWarningMessage(
                '配置文件已存在，是否覆盖？',
                '覆盖',
                '取消'
            );
            if (choice !== '覆盖') {
                return;
            }
        }

        try {
            const { createDefaultConfigFile } = require('../../nodeexcel/src/index');
            await createDefaultConfigFile(configPath);
            
            const choice = await vscode.window.showInformationMessage(
                `Excel配置文件已创建: ${path.basename(configPath)}`,
                '打开编辑',
                '显示文件夹'
            );
            
            if (choice === '打开编辑') {
                const document = await vscode.workspace.openTextDocument(configPath);
                await vscode.window.showTextDocument(document);
            } else if (choice === '显示文件夹') {
                await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(configPath));
            }
        } catch (error) {
            notifyError(`创建配置文件失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 查看Excel配置
     */
    private async viewExcelConfig(): Promise<void> {
        try {
            const { ExcelConfig } = require('../../nodeexcel/src/index');
            const defaultConfig = ExcelConfig.getDefaultConfig();
            
            const outputChannel = vscode.window.createOutputChannel('Markdown to Excel - 配置');
            outputChannel.clear();
            outputChannel.appendLine('Excel转换配置:');
            outputChannel.appendLine('='.repeat(50));
            outputChannel.appendLine(JSON.stringify(defaultConfig, null, 2));
            outputChannel.show();
        } catch (error) {
            notifyError(`查看配置失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 打开Excel配置文件
     */
    private async openExcelConfig(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            notifyError('请先打开一个工作区');
            return;
        }

        const configPath = path.join(workspaceFolder.uri.fsPath, 'excel-config.yaml');
        
        if (await fs.pathExists(configPath)) {
            const document = await vscode.workspace.openTextDocument(configPath);
            await vscode.window.showTextDocument(document);
        } else {
            const choice = await vscode.window.showInformationMessage(
                '配置文件不存在，是否创建？',
                '创建',
                '取消'
            );
            if (choice === '创建') {
                await this.createExcelConfig();
            }
        }
    }

    /**
     * 显示Excel配置帮助
     */
    private async showExcelConfigHelp(): Promise<void> {
        const helpContent = `
# Excel配置选项说明

## 基础配置
- **outputPath**: 输出目录
- **filename**: 默认文件名
- **overwrite**: 是否覆盖已存在文件

## 工作表配置
- **worksheet.name**: 工作表名称
- **worksheet.splitByHeaders**: 是否按标题分割工作表
- **worksheet.maxRowsPerSheet**: 每个工作表最大行数

## 内容映射
- **contentMapping.includeType**: 是否包含内容类型列
- **contentMapping.includeLevel**: 是否包含标题层级列
- **contentMapping.includeContent**: 是否包含内容列
- **contentMapping.preserveFormatting**: 是否保留格式
- **contentMapping.maxCellLength**: 最大单元格长度

## 表格处理
- **tableHandling.separateTableSheets**: 是否为表格创建独立工作表
- **tableHandling.tableSheetPrefix**: 表格工作表前缀
- **tableHandling.preserveOriginalTables**: 是否保留原始表格

## 样式配置
- **styles.headers**: 标题样式
- **styles.content**: 内容样式
- **styles.table**: 表格样式

更多详细信息请查看配置文件中的注释说明。
        `;

        const outputChannel = vscode.window.createOutputChannel('Markdown to Excel - 配置帮助');
        outputChannel.clear();
        outputChannel.appendLine(helpContent);
        outputChannel.show();
    }

    /**
     * 处理在浏览器中打开命令
     */
    private async handleOpenInBrowserCommand(uri?: vscode.Uri): Promise<void> {
        try {
            // 获取要处理的文件路径
            let filePath: string;
            
            if (uri) {
                // 从右键菜单调用
                filePath = uri.fsPath;
            } else {
                // 从命令面板调用，获取当前活动的编辑器
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    notifyError('请先打开一个 Markdown 文件');
                    return;
                }
                filePath = editor.document.fileName;
            }

            // 检查文件是否为Markdown文件
            if (!this.conversionService.isSupportedFile(filePath)) {
                notifyError('当前文件不是 Markdown 文件');
                return;
            }

            // 如果文件有未保存的更改，提示保存
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.fileName === filePath && editor.document.isDirty) {
                const choice = await vscode.window.showInformationMessage(
                    '文件有未保存的更改，是否保存后在浏览器中打开？',
                    '保存并打开',
                    '直接打开',
                    '取消'
                );
                
                if (choice === '取消') {
                    return;
                } else if (choice === '保存并打开') {
                    await editor.document.save();
                }
            }

            // 直接在浏览器中打开Markdown文件
            await this.browserService.openInBrowser(filePath);

        } catch (error) {
            await this.errorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                '在浏览器中打开失败'
            );
        }
    }

    /**
     * 处理Word转Markdown命令
     */
    private async handleWordToMarkdownCommand(uri?: vscode.Uri): Promise<void> {
        try {
            // 获取要处理的文件路径
            let filePath: string;
            
            if (uri) {
                // 从右键菜单调用
                filePath = uri.fsPath;
            } else {
                // 从命令面板调用，获取当前活动的编辑器
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    notifyError('请先打开一个 Word 文档或从文件管理器中选择');
                    return;
                }
                filePath = editor.document.fileName;
            }

            // 检查文件是否为Word文档
            const ext = path.extname(filePath).toLowerCase();
            if (ext !== '.docx' && ext !== '.doc') {
                notifyError('当前文件不是 Word 文档（.docx 或 .doc）');
                return;
            }

            // 默认配置：保留图片，输出到同级目录
            const targetDir = path.dirname(filePath); // 默认输出到同级目录

            // 生成输出文件路径
            const inputBaseName = path.basename(filePath, ext);
            const outputPath = path.join(targetDir, `${inputBaseName}.md`);

            // 执行转换
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Word转Markdown',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: '正在转换Word文档...', increment: 0 });

                try {
                    // 使用 WorldToMD 项目的 API
                    await this.wordToMarkdownConverter.convertFile(filePath, outputPath);
                    
                    progress.report({ message: '转换完成', increment: 100 });
                    
                    const choice = await vscode.window.showInformationMessage(
                        `成功将 ${path.basename(filePath)} 转换为 ${path.basename(outputPath)}`,
                        '打开文件',
                        '显示文件夹'
                    );

                    if (choice === '打开文件') {
                        const document = await vscode.workspace.openTextDocument(outputPath);
                        await vscode.window.showTextDocument(document);
                    } else if (choice === '显示文件夹') {
                        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
                    }
                } catch (error) {
                    notifyError(`转换失败: ${error instanceof Error ? error.message : String(error)}`);
                }
            });

        } catch (error) {
            await this.errorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'Word转Markdown失败'
            );
        }
    }

    /**
     * 处理批量Word转Markdown命令
     */
    private async handleBatchWordToMarkdownCommand(uri?: vscode.Uri): Promise<void> {
        try {
            // 获取要处理的目录路径
            let dirPath: string;
            
            if (uri) {
                // 从右键菜单调用
                dirPath = uri.fsPath;
            } else {
                // 从命令面板调用，让用户选择目录
                const selectedFolder = await vscode.window.showOpenDialog({
                    canSelectFiles: false,
                    canSelectFolders: true,
                    canSelectMany: false,
                    openLabel: '选择包含Word文档的目录'
                });

                if (!selectedFolder || selectedFolder.length === 0) {
                    return; // 用户取消
                }
                dirPath = selectedFolder[0].fsPath;
            }

            // 检查是否为目录
            const stats = await fs.stat(dirPath);
            if (!stats.isDirectory()) {
                notifyError('请选择一个目录');
                return;
            }

            // 默认配置：输出到与源文件相同目录
            const targetDir = dirPath;

            // 执行批量转换
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: '批量Word转Markdown',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: '正在扫描Word文档...', increment: 0 });

                try {
                    // 使用 WorldToMD 项目的 API
                    const result = await this.wordToMarkdownConverter.convertDirectory(dirPath, targetDir);
                    
                    progress.report({ message: '批量转换完成', increment: 100 });

                    // 显示结果
                    const message = `批量转换完成: 成功 ${result.successCount} 个，失败 ${result.failureCount} 个`;

                    if (result.failureCount === 0) {
                        const choice = await vscode.window.showInformationMessage(
                            message,
                            '显示输出目录'
                        );

                        if (choice === '显示输出目录') {
                            await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(targetDir));
                        }
                    } else {
                        // 显示详细的错误信息
                        const outputChannel = vscode.window.createOutputChannel('Word转Markdown - 批量转换结果');
                        outputChannel.clear();
                        outputChannel.appendLine(message);
                        outputChannel.appendLine('='.repeat(50));
                        
                        result.results.forEach((fileResult: any, index: number) => {
                            outputChannel.appendLine(`[${index + 1}] ${fileResult.success ? '✓' : '✗'} ${fileResult.inputPath}`);
                            if (!fileResult.success && fileResult.error) {
                                outputChannel.appendLine(`    错误: ${fileResult.error}`);
                            }
                        });
                        
                        outputChannel.show();
                        notifyWarning(message);
                    }
                } catch (error) {
                    notifyError(`批量转换失败: ${error instanceof Error ? error.message : String(error)}`);
                }
            });

        } catch (error) {
            await this.errorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                '批量Word转Markdown失败'
            );
        }
    }



    /**
     * 清理资源
     */
    dispose(): void {
        // 清理浏览器服务
        if (this.browserService) {
            this.browserService.dispose();
        }
        
        // 命令会自动通过context.subscriptions清理
        console.log('CommandService已清理');
    }
}
