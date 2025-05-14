/**
 * @description VS Code扩展的主入口文件
 */
import * as vscode from 'vscode';
import { EnvironmentManager } from './environmentManager';
import { MarkdownConverter } from './core/converter';
import { ProgressUI } from './ui/progressUI';
import { ConfigPanel } from './ui/configPanel';
import * as path from 'path';
import { execWithDetails } from './utils/execUtils';
import * as fs from 'fs';

/**
 * @description VS Code插件的激活入口点
 * @param context 插件的上下文对象
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('插件 "Markdown to Word Converter" 正在激活...');

    // 初始化环境管理器
    const envManager = EnvironmentManager.getInstance();
    
    try {
        await envManager.initialize(context);
        console.log('环境初始化成功');
    } catch (error) {
        console.error('环境初始化失败:', error);
        // 显示友好错误消息并提供解决方案
        vscode.window.showErrorMessage(
            `Markdown to Word 插件初始化失败: ${error instanceof Error ? error.message : String(error)}`, 
            '查看诊断信息', '查看解决方案'
        ).then(selection => {
            if (selection === '查看诊断信息') {
                // 显示诊断信息
                showDiagnostics(envManager);
            } else if (selection === '查看解决方案') {
                // 打开帮助文档
                showTroubleshooting();
            }
        });
        // 继续注册命令，因为错误可能是暂时的或可修复的
    }

    // 获取其他组件实例
    const converter = MarkdownConverter.getInstance();
    const progressUI = ProgressUI.getInstance();

    // 注册核心命令
    const disposable = vscode.commands.registerCommand('markdowntoword.markdown-to-word.convert', async (uri?: vscode.Uri) => {
        try {
            // 步骤 1: 确定输入文件
            const editor = vscode.window.activeTextEditor;
            const inputFileUri = uri || editor?.document.uri;

            if (!inputFileUri) {
                throw new Error('无法确定要转换的 Markdown 文件。请在编辑器中打开一个 Markdown 文件，或在文件资源管理器中右键单击它。');
            }

            const inputFile = inputFileUri.fsPath;
            if (!inputFile.toLowerCase().endsWith('.md')) {
                throw new Error(`选择的文件不是 Markdown (.md) 文件: ${inputFile}`);
            }

            // 步骤 2: 检查环境
            await checkEnvironment(envManager, context);

            // 步骤 3: 显示配置面板
            console.log('准备显示配置面板, 输入文件:', inputFile);
            ConfigPanel.createOrShow(context.extensionPath, inputFile, async (config, cancelled) => {
                console.log('配置面板回调, 取消状态:', cancelled);
                if (cancelled) {
                    console.log('用户取消了转换');
                    return;
                }

                // 步骤 4: 使用配置执行转换
                await progressUI.withProgress('Markdown 转 Word', async (progress) => {
                    progress.report({ message: '执行转换...' });
                    
                    const result = await converter.convert(inputFile, {
                        showProgress: true,
                        useConfig: config,
                        onComplete: (conversionResult: any) => {
                            if (conversionResult.success && conversionResult.outputFile) {
                                progressUI.showSuccess(conversionResult.message, conversionResult.outputFile);
                            }
                        }
                    });

                    // 步骤 5: 显示成功信息
                    progress.report({ message: '转换完成！' });
                    progressUI.showSuccess('Markdown 文件已成功转换为 Word 文档！', result.outputFile);
                });
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('转换失败:', errorMessage);
            
            if (errorMessage.includes('ModuleNotFoundError') || 
                errorMessage.includes('ImportError') || 
                errorMessage.includes('No module named')) {
                // Python模块相关错误
                vscode.window.showErrorMessage(
                    `缺少必要的Python依赖: ${errorMessage}`, 
                    '自动安装依赖', '查看解决方案'
                ).then(selection => {
                    if (selection === '自动安装依赖') {
                        installDependencies(context);
                    } else if (selection === '查看解决方案') {
                        showTroubleshooting();
                    }
                });
            } else {
                // 其他一般错误
                await progressUI.showError(error instanceof Error ? error : new Error(String(error)));
            }
        }
    });

    // 注册诊断命令
    const diagnosticsCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.diagnostics', async () => {
        showDiagnostics(envManager);
    });

    // 注册环境检查命令
    const checkEnvCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.checkEnvironment', async () => {
        try {
            await checkEnvironment(envManager, context, true);
            vscode.window.showInformationMessage('环境检查通过');
        } catch (error) {
            vscode.window.showErrorMessage(`环境检查失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    });

    // 注册依赖安装命令
    const installDepsCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.installDependencies', async () => {
        installDependencies(context);
    });

    // 注册直接转换命令
    const directConvertCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.convertDirect', async (uri?: vscode.Uri) => {
        try {
            // 步骤 1: 确定输入文件
            const editor = vscode.window.activeTextEditor;
            const inputFileUri = uri || editor?.document.uri;

            if (!inputFileUri) {
                throw new Error('无法确定要转换的 Markdown 文件。请在编辑器中打开一个 Markdown 文件，或在文件资源管理器中右键单击它。');
            }

            const inputFile = inputFileUri.fsPath;
            if (!inputFile.toLowerCase().endsWith('.md')) {
                throw new Error(`选择的文件不是 Markdown (.md) 文件: ${inputFile}`);
            }

            // 步骤 2: 检查环境
            await checkEnvironment(envManager, context);

            // 步骤 3: 直接执行转换（不显示配置面板）
            await progressUI.withProgress('Markdown 直接转 Word', async (progress) => {
                progress.report({ message: '执行转换...' });
                
                const result = await converter.convert(inputFile, {
                    showProgress: true,
                    onComplete: (conversionResult: any) => {
                        if (conversionResult.success && conversionResult.outputFile) {
                            progressUI.showSuccess(conversionResult.message, conversionResult.outputFile);
                        }
                    }
                });

                // 步骤 4: 显示成功信息
                progress.report({ message: '转换完成！' });
                await progressUI.showSuccess('Markdown 文件已成功转换为 Word 文档！', result.outputFile);
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('直接转换失败:', errorMessage);
            
            if (errorMessage.includes('ModuleNotFoundError') || 
                errorMessage.includes('ImportError') || 
                errorMessage.includes('No module named')) {
                // Python模块相关错误
                vscode.window.showErrorMessage(
                    `缺少必要的Python依赖: ${errorMessage}`, 
                    '自动安装依赖', '查看解决方案'
                ).then(selection => {
                    if (selection === '自动安装依赖') {
                        installDependencies(context);
                    } else if (selection === '查看解决方案') {
                        showTroubleshooting();
                    }
                });
            } else {
                // 其他一般错误
                await progressUI.showError(error instanceof Error ? error : new Error(String(error)));
            }
        }
    });

    // 注册HTML转换命令
    const htmlConvertCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.convertToHtml', async (uri?: vscode.Uri) => {
        try {
            // 获取文件路径
            const editor = vscode.window.activeTextEditor;
            const inputFileUri = uri || editor?.document.uri;
            
            if (!inputFileUri) {
                throw new Error('无法确定要转换的 Markdown 文件。请在编辑器中打开一个 Markdown 文件，或在文件资源管理器中右键单击它。');
            }
            
            const inputFile = inputFileUri.fsPath;
            if (!inputFile.toLowerCase().endsWith('.md')) {
                throw new Error(`选择的文件不是 Markdown (.md) 文件: ${inputFile}`);
            }
            
            // 检查环境
            await checkEnvironment(envManager, context);
            
            // 执行转换，显示进度
            await progressUI.withProgress('Markdown 转 HTML', async (progress) => {
                try {
                    // 计算路径
                    const baseName = path.basename(inputFile, '.md');
                    const outputDir = path.dirname(inputFile);
                    const outputHtmlFile = path.join(outputDir, `${baseName}.html`);
                    
                    // 构建命令
                    const pythonCmd = envManager.getEnvironmentInfo().pythonCmd;
                    const scriptPath = path.join(context.extensionPath, 'scripts', 'run.py');
                    
                    // 执行命令
                    progress.report({ message: '正在转换为HTML...' });
                    
                    // 执行Python命令
                    const result = await execWithDetails(`${pythonCmd} "${scriptPath}" --input "${inputFile}" --output "${path.join(outputDir, baseName + '.docx')}"`);
                    
                    if (result.success) {
                        // 检查HTML文件是否生成
                        if (fs.existsSync(outputHtmlFile)) {
                            progress.report({ message: 'HTML生成成功！' });
                            await progressUI.showSuccess('Markdown 文件已成功转换为 HTML！', outputHtmlFile);
                        } else {
                            throw new Error(`未找到生成的HTML文件: ${outputHtmlFile}`);
                        }
                    } else {
                        throw new Error(result.stderr || '转换失败，未知错误');
                    }
                } catch (error) {
                    console.error('HTML转换失败:', error);
                    throw error;
                }
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('转换到HTML失败:', errorMessage);
            await progressUI.showError(error instanceof Error ? error : new Error(String(error)));
        }
    });

    context.subscriptions.push(disposable, diagnosticsCmd, checkEnvCmd, installDepsCmd, htmlConvertCmd, directConvertCmd);
    console.log('插件 "Markdown to Word Converter" 已成功激活。');
}

/**
 * @description 检查环境
 * @param envManager 环境管理器实例
 * @param context 扩展上下文
 * @param showSuccess 是否显示成功消息
 */
async function checkEnvironment(
    envManager: EnvironmentManager, 
    context: vscode.ExtensionContext, 
    showSuccess = false
): Promise<void> {
    try {
        // 重新初始化环境
        await envManager.initialize(context);
        if (showSuccess) {
            vscode.window.showInformationMessage('环境检查通过');
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`环境检查失败: ${errorMessage}`);
    }
}

/**
 * @description 显示诊断信息
 * @param envManager 环境管理器实例
 */
async function showDiagnostics(envManager: EnvironmentManager): Promise<void> {
    try {
        const diagnostics = await envManager.getDiagnostics();
        
        // 创建并显示诊断信息文档
        const doc = await vscode.workspace.openTextDocument({ 
            content: diagnostics,
            language: 'plaintext'
        });
        await vscode.window.showTextDocument(doc);
    } catch (error) {
        vscode.window.showErrorMessage(`无法获取诊断信息: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * @description 显示故障排除指南
 */
async function showTroubleshooting(): Promise<void> {
    // 创建并显示故障排除指南
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

/**
 * @description 安装依赖
 * @param context 扩展上下文
 */
async function installDependencies(context: vscode.ExtensionContext): Promise<void> {
    const envManager = EnvironmentManager.getInstance();
    
    try {
        // 重新初始化环境，确保有正确的Python路径
        await envManager.initialize(context);
        
        // 使用进度UI执行安装
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "安装Python依赖",
            cancellable: false
        }, async (progress) => {
            try {
                // 获取Python环境信息
                const envInfo = envManager.getEnvironmentInfo();
                const installScript = path.join(envInfo.extensionPath, 'scripts', 'install_dependencies.py');
                
                progress.report({ message: "正在安装依赖..." });
                
                const result = await execWithDetails(`${envInfo.pythonCmd} "${installScript}"`);
                
                if (result.success) {
                    vscode.window.showInformationMessage("依赖安装成功");
                } else {
                    throw new Error(result.stderr);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`依赖安装失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`无法初始化环境: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * @description VS Code插件的停用入口点
 */
export function deactivate(): void {
    console.log('插件 "Markdown to Word Converter" 已停用。');
} 