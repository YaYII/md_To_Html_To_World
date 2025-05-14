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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const environmentManager_1 = require("./environmentManager");
const converter_1 = require("./core/converter");
const progressUI_1 = require("./ui/progressUI");
const configPanel_1 = require("./ui/configPanel");
const path = __importStar(require("path"));
const execUtils_1 = require("./utils/execUtils");
const fs = __importStar(require("fs"));
async function activate(context) {
    console.log('插件 "Markdown to Word Converter" 正在激活...');
    const envManager = environmentManager_1.EnvironmentManager.getInstance();
    try {
        await envManager.initialize(context);
        console.log('环境初始化成功');
    }
    catch (error) {
        console.error('环境初始化失败:', error);
        vscode.window.showErrorMessage(`Markdown to Word 插件初始化失败: ${error instanceof Error ? error.message : String(error)}`, '查看诊断信息', '查看解决方案').then(selection => {
            if (selection === '查看诊断信息') {
                showDiagnostics(envManager);
            }
            else if (selection === '查看解决方案') {
                showTroubleshooting();
            }
        });
    }
    const converter = converter_1.MarkdownConverter.getInstance();
    const progressUI = progressUI_1.ProgressUI.getInstance();
    const disposable = vscode.commands.registerCommand('markdowntoword.markdown-to-word.convert', async (uri) => {
        try {
            const editor = vscode.window.activeTextEditor;
            const inputFileUri = uri || editor?.document.uri;
            if (!inputFileUri) {
                throw new Error('无法确定要转换的 Markdown 文件。请在编辑器中打开一个 Markdown 文件，或在文件资源管理器中右键单击它。');
            }
            const inputFile = inputFileUri.fsPath;
            if (!inputFile.toLowerCase().endsWith('.md')) {
                throw new Error(`选择的文件不是 Markdown (.md) 文件: ${inputFile}`);
            }
            await checkEnvironment(envManager, context);
            console.log('准备显示配置面板, 输入文件:', inputFile);
            configPanel_1.ConfigPanel.createOrShow(context.extensionPath, inputFile, async (config, cancelled) => {
                console.log('配置面板回调, 取消状态:', cancelled);
                if (cancelled) {
                    console.log('用户取消了转换');
                    return;
                }
                await progressUI.withProgress('Markdown 转 Word', async (progress) => {
                    progress.report({ message: '执行转换...' });
                    const result = await converter.convert(inputFile, {
                        showProgress: true,
                        useConfig: config,
                        onComplete: (conversionResult) => {
                            if (conversionResult.success && conversionResult.outputFile) {
                                progressUI.showSuccess(conversionResult.message, conversionResult.outputFile);
                            }
                        }
                    });
                    progress.report({ message: '转换完成！' });
                    progressUI.showSuccess('Markdown 文件已成功转换为 Word 文档！', result.outputFile);
                });
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('转换失败:', errorMessage);
            if (errorMessage.includes('ModuleNotFoundError') ||
                errorMessage.includes('ImportError') ||
                errorMessage.includes('No module named')) {
                vscode.window.showErrorMessage(`缺少必要的Python依赖: ${errorMessage}`, '自动安装依赖', '查看解决方案').then(selection => {
                    if (selection === '自动安装依赖') {
                        installDependencies(context);
                    }
                    else if (selection === '查看解决方案') {
                        showTroubleshooting();
                    }
                });
            }
            else {
                await progressUI.showError(error instanceof Error ? error : new Error(String(error)));
            }
        }
    });
    const diagnosticsCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.diagnostics', async () => {
        showDiagnostics(envManager);
    });
    const checkEnvCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.checkEnvironment', async () => {
        try {
            await checkEnvironment(envManager, context, true);
            vscode.window.showInformationMessage('环境检查通过');
        }
        catch (error) {
            vscode.window.showErrorMessage(`环境检查失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    const installDepsCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.installDependencies', async () => {
        installDependencies(context);
    });
    const directConvertCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.convertDirect', async (uri) => {
        try {
            const editor = vscode.window.activeTextEditor;
            const inputFileUri = uri || editor?.document.uri;
            if (!inputFileUri) {
                throw new Error('无法确定要转换的 Markdown 文件。请在编辑器中打开一个 Markdown 文件，或在文件资源管理器中右键单击它。');
            }
            const inputFile = inputFileUri.fsPath;
            if (!inputFile.toLowerCase().endsWith('.md')) {
                throw new Error(`选择的文件不是 Markdown (.md) 文件: ${inputFile}`);
            }
            await checkEnvironment(envManager, context);
            await progressUI.withProgress('Markdown 直接转 Word', async (progress) => {
                progress.report({ message: '执行转换...' });
                const result = await converter.convert(inputFile, {
                    showProgress: true,
                    onComplete: (conversionResult) => {
                        if (conversionResult.success && conversionResult.outputFile) {
                            progressUI.showSuccess(conversionResult.message, conversionResult.outputFile);
                        }
                    }
                });
                progress.report({ message: '转换完成！' });
                await progressUI.showSuccess('Markdown 文件已成功转换为 Word 文档！', result.outputFile);
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('直接转换失败:', errorMessage);
            if (errorMessage.includes('ModuleNotFoundError') ||
                errorMessage.includes('ImportError') ||
                errorMessage.includes('No module named')) {
                vscode.window.showErrorMessage(`缺少必要的Python依赖: ${errorMessage}`, '自动安装依赖', '查看解决方案').then(selection => {
                    if (selection === '自动安装依赖') {
                        installDependencies(context);
                    }
                    else if (selection === '查看解决方案') {
                        showTroubleshooting();
                    }
                });
            }
            else {
                await progressUI.showError(error instanceof Error ? error : new Error(String(error)));
            }
        }
    });
    const htmlConvertCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.convertToHtml', async (uri) => {
        try {
            const editor = vscode.window.activeTextEditor;
            const inputFileUri = uri || editor?.document.uri;
            if (!inputFileUri) {
                throw new Error('无法确定要转换的 Markdown 文件。请在编辑器中打开一个 Markdown 文件，或在文件资源管理器中右键单击它。');
            }
            const inputFile = inputFileUri.fsPath;
            if (!inputFile.toLowerCase().endsWith('.md')) {
                throw new Error(`选择的文件不是 Markdown (.md) 文件: ${inputFile}`);
            }
            await checkEnvironment(envManager, context);
            await progressUI.withProgress('Markdown 转 HTML', async (progress) => {
                try {
                    const baseName = path.basename(inputFile, '.md');
                    const outputDir = path.dirname(inputFile);
                    const outputHtmlFile = path.join(outputDir, `${baseName}.html`);
                    const pythonCmd = envManager.getEnvironmentInfo().pythonCmd;
                    const scriptPath = path.join(context.extensionPath, 'scripts', 'run.py');
                    progress.report({ message: '正在转换为HTML...' });
                    const result = await (0, execUtils_1.execWithDetails)(`${pythonCmd} "${scriptPath}" --input "${inputFile}" --output "${path.join(outputDir, baseName + '.docx')}"`);
                    if (result.success) {
                        if (fs.existsSync(outputHtmlFile)) {
                            progress.report({ message: 'HTML生成成功！' });
                            await progressUI.showSuccess('Markdown 文件已成功转换为 HTML！', outputHtmlFile);
                        }
                        else {
                            throw new Error(`未找到生成的HTML文件: ${outputHtmlFile}`);
                        }
                    }
                    else {
                        throw new Error(result.stderr || '转换失败，未知错误');
                    }
                }
                catch (error) {
                    console.error('HTML转换失败:', error);
                    throw error;
                }
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('转换到HTML失败:', errorMessage);
            await progressUI.showError(error instanceof Error ? error : new Error(String(error)));
        }
    });
    context.subscriptions.push(disposable, diagnosticsCmd, checkEnvCmd, installDepsCmd, htmlConvertCmd, directConvertCmd);
    console.log('插件 "Markdown to Word Converter" 已成功激活。');
}
exports.activate = activate;
async function checkEnvironment(envManager, context, showSuccess = false) {
    try {
        await envManager.initialize(context);
        if (showSuccess) {
            vscode.window.showInformationMessage('环境检查通过');
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`环境检查失败: ${errorMessage}`);
    }
}
async function showDiagnostics(envManager) {
    try {
        const diagnostics = await envManager.getDiagnostics();
        const doc = await vscode.workspace.openTextDocument({
            content: diagnostics,
            language: 'plaintext'
        });
        await vscode.window.showTextDocument(doc);
    }
    catch (error) {
        vscode.window.showErrorMessage(`无法获取诊断信息: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function showTroubleshooting() {
    const troubleshootingContent = `# Markdown 转 Word 故障排除指南

## 常见问题

### 1. Python相关问题

#### 找不到Python环境
- 确保已安装Python 3.6或更高版本
- 检查VS Code设置中的markdown-to-word.pythonPath是否正确
- 尝试使用"Markdown to Word: 检查环境"命令重新检测环境

#### ModuleNotFoundError或ImportError
- 使用"Markdown to Word: 安装依赖"命令安装所需的Python包
- 确认已安装以下依赖: python-docx, markdown, beautifulsoup4, lxml

### 2. 转换问题

#### 图片无法显示
- 确保图片路径正确且可访问
- 检查图片格式是否为常见格式(JPG, PNG, GIF)

#### 中文显示为方块或乱码
- 在设置中配置正确的中文字体
- 确保所用字体支持中文

## 如何获取帮助

1. 使用"Markdown to Word: 环境诊断"命令获取环境信息
2. 在GitHub Issues中提交问题，并附上诊断信息

## 手动安装Python依赖

如果自动安装依赖失败，可以尝试手动执行:

\`\`\`
pip install python-docx markdown beautifulsoup4 opencc-python-reimplemented pyyaml lxml
\`\`\`
`;
    const doc = await vscode.workspace.openTextDocument({
        content: troubleshootingContent,
        language: 'markdown'
    });
    await vscode.window.showTextDocument(doc);
}
async function installDependencies(context) {
    const envManager = environmentManager_1.EnvironmentManager.getInstance();
    try {
        await envManager.initialize(context);
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "安装Python依赖",
            cancellable: false
        }, async (progress) => {
            try {
                const envInfo = envManager.getEnvironmentInfo();
                const installScript = path.join(envInfo.extensionPath, 'scripts', 'install_dependencies.py');
                progress.report({ message: "正在安装依赖..." });
                const result = await (0, execUtils_1.execWithDetails)(`${envInfo.pythonCmd} "${installScript}"`);
                if (result.success) {
                    vscode.window.showInformationMessage("依赖安装成功");
                }
                else {
                    throw new Error(result.stderr);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`依赖安装失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`无法初始化环境: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function deactivate() {
    console.log('插件 "Markdown to Word Converter" 已停用。');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map