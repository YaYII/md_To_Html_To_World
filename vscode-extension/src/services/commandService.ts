/**
 * @file commandService.ts
 * @description 命令服务 - 负责注册和处理VS Code命令
 */
import * as vscode from 'vscode';

import { DependencyService } from './dependencyService';
import { ConfigService } from './configService';
import { ConversionService } from './conversionService';
import { ErrorHandler } from '../utils/errorHandler';

import { ConfigurationUI } from '../configurationUI';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 命令服务类
 */
export class CommandService {
    private context: vscode.ExtensionContext;
    private dependencyService: DependencyService;
    private configService: ConfigService;
    private conversionService: ConversionService;
    private errorHandler: ErrorHandler;
    private configUI: ConfigurationUI;

    constructor(
        context: vscode.ExtensionContext,
        dependencyService: DependencyService,
        configService: ConfigService,
        conversionService: ConversionService
    ) {
        this.context = context;
        this.dependencyService = dependencyService;
        this.configService = configService;
        this.conversionService = conversionService;
        this.errorHandler = new ErrorHandler();
        this.configUI = ConfigurationUI.getInstance();
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
            
            // 配置相关命令
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
            
            // 批量处理命令
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
            // 检查依赖
            const dependencyCheck = await this.dependencyService.checkAndInstallDependencies();
            if (!dependencyCheck) {
                await vscode.window.showErrorMessage('依赖检查失败，请手动安装依赖');
                return;
            }

            // 获取当前活动的编辑器
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                await vscode.window.showErrorMessage('请先打开一个 Markdown 文件');
                return;
            }

            const filePath = editor.document.fileName;
            if (!this.conversionService.isSupportedFile(filePath)) {
                await vscode.window.showErrorMessage('当前文件不是 Markdown 文件');
                return;
            }

            // 保存文件（如果有未保存的更改）
            if (editor.document.isDirty) {
                await editor.document.save();
            }

            // 打开配置界面
            await this.configUI.showConfigurationUI();
            
            // 等待用户配置完成后进行转换
            // 注意：实际的转换会在配置界面中触发
            
        } catch (error) {
            await this.errorHandler.handleError(error, '转换命令执行失败');
        }
    }

    /**
     * 处理直接转换命令（使用默认配置）
     */
    private async handleConvertDirectCommand(): Promise<void> {
        try {
            // 检查依赖
            const dependencyCheck = await this.dependencyService.checkAndInstallDependencies();
            if (!dependencyCheck) {
                vscode.window.showErrorMessage('依赖检查失败，无法执行转换');
                return;
            }

            // 获取当前活动的编辑器
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                await vscode.window.showErrorMessage('请先打开一个 Markdown 文件');
                return;
            }

            const filePath = editor.document.fileName;
            if (!this.conversionService.isSupportedFile(filePath)) {
                await vscode.window.showErrorMessage('当前文件不是 Markdown 文件');
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
            await this.configUI.showConfigurationUI();
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
            const result = await this.dependencyService.checkAndInstallDependencies();
            
            if (result) {
                await vscode.window.showInformationMessage('所有依赖都已正确安装！');
            } else {
                await vscode.window.showErrorMessage('依赖安装失败，请查看输出面板了解详情');
            }
        } catch (error) {
            await this.errorHandler.handleError(error, '检查依赖失败');
        }
    }

    /**
     * 处理安装依赖命令
     */
    private async handleInstallDependenciesCommand(): Promise<void> {
        try {
            await this.dependencyService.checkAndInstallDependencies();
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
            await this.dependencyService.showManualInstallationInstructions();  
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
            const dependencyCheck = await this.dependencyService.checkAndInstallDependencies();
            if (!dependencyCheck) {
                vscode.window.showErrorMessage('依赖检查失败，无法执行转换');
                return;
            }

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
            // 检查依赖
            const dependencyCheck = await this.dependencyService.checkAndInstallDependencies();
            if (!dependencyCheck) {
                vscode.window.showErrorMessage('依赖检查失败，无法执行转换');
                return;
            }

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
     * 清理资源
     */
    dispose(): void {
        // 清理错误处理器资源
        if (this.errorHandler && typeof this.errorHandler.dispose === 'function') {
            this.errorHandler.dispose();
        }
        
        // 注意：configUI 没有 dispose 方法，无需清理
    }
}