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
import * as os from 'os';

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
                        keepHtml: false,
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
                    keepHtml: false,
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
                    
                    // 如果HTML文件已存在，先尝试删除
                    if (fs.existsSync(outputHtmlFile)) {
                        try {
                            fs.unlinkSync(outputHtmlFile);
                        } catch (err) {
                            console.warn('无法删除已存在的HTML文件:', err);
                        }
                    }
                    
                    // 创建一个简单的Markdown到HTML转换脚本
                    const tempScriptDir = path.join(os.tmpdir(), 'markdown-to-word');
                    if (!fs.existsSync(tempScriptDir)) {
                        fs.mkdirSync(tempScriptDir, { recursive: true });
                    }
                    
                    const tempScriptPath = path.join(tempScriptDir, 'simple_md_to_html.py');
                    
                    // 创建一个简单的Python脚本直接处理Markdown到HTML的转换
                    const scriptContent = `
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import markdown
from bs4 import BeautifulSoup

def md_to_html(input_file, output_file=None):
    """将Markdown文件转换为HTML
    
    Args:
        input_file: Markdown文件路径
        output_file: 输出HTML文件路径，如果不提供则只返回HTML内容
    
    Returns:
        如果output_file为None，则返回HTML内容字符串
    """
    try:
        # 读取Markdown文件
        with open(input_file, 'r', encoding='utf-8') as f:
            md_content = f.read()
        
        # 转换为HTML
        html = markdown.markdown(
            md_content,
            extensions=[
                'markdown.extensions.extra',
                'markdown.extensions.toc',
                'markdown.extensions.tables',
                'markdown.extensions.fenced_code'
            ]
        )
        
        # 使用BeautifulSoup美化HTML
        soup = BeautifulSoup(f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{os.path.basename(input_file)}</title>
    <style>
        body {{ 
            font-family: 'Microsoft YaHei', 'SimSun', sans-serif; 
            margin: 0 auto; 
            max-width: 960px; 
            padding: 20px; 
            line-height: 1.6;
        }}
        pre {{ 
            background-color: #f8f8f8; 
            border: 1px solid #ddd; 
            padding: 10px; 
            border-radius: 3px; 
            overflow: auto; 
        }}
        code {{ 
            font-family: Consolas, Monaco, monospace; 
            background-color: #f8f8f8; 
            padding: 2px 5px; 
            border-radius: 3px; 
        }}
        table {{ 
            border-collapse: collapse; 
            width: 100%; 
            margin-bottom: 20px;
        }}
        th, td {{ 
            border: 1px solid #ddd; 
            padding: 8px; 
        }}
        th {{ 
            background-color: #f2f2f2; 
            text-align: left; 
        }}
        tr:nth-child(even) {{ 
            background-color: #f9f9f9; 
        }}
        img {{ 
            max-width: 100%; 
            height: auto; 
        }}
    </style>
</head>
<body>
    {html}
</body>
</html>
        """, 'html.parser')
        
        html_pretty = soup.prettify()
        
        # 如果提供了输出文件路径，则写入文件
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(html_pretty)
            return True
        else:
            return html_pretty
            
    except Exception as e:
        print(f"错误: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python simple_md_to_html.py <input_file> [output_file]", file=sys.stderr)
        sys.exit(1)
        
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    result = md_to_html(input_file, output_file)
    if not output_file:
        print(result)
`;
                    
                    // 写入临时脚本
                    fs.writeFileSync(tempScriptPath, scriptContent, 'utf8');
                    
                    // 设置执行权限
                    if (os.platform() !== 'win32') {
                        try {
                            fs.chmodSync(tempScriptPath, 0o755);
                        } catch (err) {
                            console.warn('无法设置脚本执行权限:', err);
                        }
                    }
                    
                    progress.report({ message: '正在转换为HTML...' });
                    
                    // 执行Python命令
                    const pythonCmd = envManager.getEnvironmentInfo().pythonCmd;
                    const result = await execWithDetails(`${pythonCmd} "${tempScriptPath}" "${inputFile}" "${outputHtmlFile}"`);
                    
                    if (result.success) {
                        // 检查HTML文件是否生成
                        if (fs.existsSync(outputHtmlFile)) {
                            progress.report({ message: 'HTML生成成功！' });
                            await progressUI.showSuccess('Markdown 文件已成功转换为 HTML！', outputHtmlFile);
                        } else {
                            throw new Error(`未能写入HTML文件: ${outputHtmlFile}`);
                        }
                    } else {
                        // 显示详细错误
                        console.error('Python脚本错误:', result.stderr);
                        throw new Error(`转换失败: ${result.stderr || '未知错误'}`);
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

    // 注册批量Word转换命令
    const batchWordConvertCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.batchConvertToWord', async (uri?: vscode.Uri) => {
        try {
            // 确定输入目录
            if (!uri || !uri.fsPath) {
                throw new Error('未选择文件夹。请在文件资源管理器中右键单击文件夹。');
            }

            const inputDir = uri.fsPath;
            
            // 检查是否为目录
            const stat = await vscode.workspace.fs.stat(uri);
            if (stat.type !== vscode.FileType.Directory) {
                throw new Error('所选项目不是文件夹。请选择一个文件夹。');
            }

            // 步骤 1: 检查环境
            await checkEnvironment(envManager, context);

            // 直接执行批量转换，不显示配置面板
            await progressUI.withProgress('批量Markdown转Word', async (progress) => {
                progress.report({ message: '执行批量转换...' });
                
                try {
                    // 使用Python脚本直接执行批处理
                    const envInfo = envManager.getEnvironmentInfo();
                    const pythonCmd = envInfo.pythonCmd;
                    const scriptPath = path.join(envInfo.extensionPath, 'scripts', 'run.py');
                    
                    // 构建参数
                    let cmdArgs = [
                        `"${scriptPath}"`,
                        `--input "${inputDir}"`,
                        `--output "${inputDir}"`,
                        '--batch'
                    ];
                    
                    // 默认不保留HTML文件
                    cmdArgs.push('--no-html');
                    
                    // 执行命令
                    const cmd = `${pythonCmd} ${cmdArgs.join(' ')}`;
                    console.log('执行批处理命令:', cmd);
                    
                    const result = await execWithDetails(cmd);
                    
                    if (result.success) {
                        progress.report({ message: '批量转换完成！' });
                        vscode.window.showInformationMessage(`目录 ${path.basename(inputDir)} 中的Markdown文件已成功转换为Word文档！`);
                    } else {
                        throw new Error(result.stderr || '批量转换失败，未知错误');
                    }
                } catch (err) {
                    console.error('批量转换执行错误:', err);
                    throw err;
                }
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('批量转换失败:', errorMessage);
            
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

    // 注册批量HTML转换命令
    const batchHtmlConvertCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.batchConvertToHtml', async (uri?: vscode.Uri) => {
        try {
            // 确定输入目录
            if (!uri || !uri.fsPath) {
                throw new Error('未选择文件夹。请在文件资源管理器中右键单击文件夹。');
            }

            const inputDir = uri.fsPath;
            
            // 检查是否为目录
            const stat = await vscode.workspace.fs.stat(uri);
            if (stat.type !== vscode.FileType.Directory) {
                throw new Error('所选项目不是文件夹。请选择一个文件夹。');
            }

            // 步骤 1: 检查环境
            await checkEnvironment(envManager, context);
            
            // 步骤 2: 直接执行批量HTML转换
            await progressUI.withProgress('批量Markdown转HTML', async (progress) => {
                progress.report({ message: '执行批量HTML转换...' });
                
                try {
                    // 创建一个临时脚本处理HTML转换
                    const tempScriptDir = path.join(os.tmpdir(), 'markdown-to-word');
                    if (!fs.existsSync(tempScriptDir)) {
                        fs.mkdirSync(tempScriptDir, { recursive: true });
                    }
                    
                    const tempScriptPath = path.join(tempScriptDir, 'batch_md_to_html.py');
                    
                    const scriptContent = `
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import glob
import markdown
from bs4 import BeautifulSoup

def md_to_html(input_file, output_file=None):
    """将Markdown文件转换为HTML
    
    Args:
        input_file: Markdown文件路径
        output_file: 输出HTML文件路径，如果不提供则只返回HTML内容
    
    Returns:
        如果output_file为None，则返回HTML内容字符串
    """
    try:
        # 读取Markdown文件
        with open(input_file, 'r', encoding='utf-8') as f:
            md_content = f.read()
        
        # 转换为HTML
        html = markdown.markdown(
            md_content,
            extensions=[
                'markdown.extensions.extra',
                'markdown.extensions.toc',
                'markdown.extensions.tables',
                'markdown.extensions.fenced_code'
            ]
        )
        
        # 使用BeautifulSoup美化HTML
        soup = BeautifulSoup(f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{os.path.basename(input_file)}</title>
    <style>
        body {{ 
            font-family: 'Microsoft YaHei', 'SimSun', sans-serif; 
            margin: 0 auto; 
            max-width: 960px; 
            padding: 20px; 
            line-height: 1.6;
        }}
        pre {{ 
            background-color: #f8f8f8; 
            border: 1px solid #ddd; 
            padding: 10px; 
            border-radius: 3px; 
            overflow: auto; 
        }}
        code {{ 
            font-family: Consolas, Monaco, monospace; 
            background-color: #f8f8f8; 
            padding: 2px 5px; 
            border-radius: 3px; 
        }}
        table {{ 
            border-collapse: collapse; 
            width: 100%; 
            margin-bottom: 20px;
        }}
        th, td {{ 
            border: 1px solid #ddd; 
            padding: 8px; 
        }}
        th {{ 
            background-color: #f2f2f2; 
            text-align: left; 
        }}
        tr:nth-child(even) {{ 
            background-color: #f9f9f9; 
        }}
        img {{ 
            max-width: 100%; 
            height: auto; 
        }}
    </style>
</head>
<body>
    {html}
</body>
</html>
        """, 'html.parser')
        
        html_pretty = soup.prettify()
        
        # 如果提供了输出文件路径，则写入文件
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(html_pretty)
            return True
        else:
            return html_pretty
            
    except Exception as e:
        print(f"处理{input_file}时出错: {str(e)}", file=sys.stderr)
        return False

def main():
    input_dir = "${inputDir.replace(/\\/g, '\\\\')}"
    
    # 找到所有的md文件
    md_files = glob.glob(os.path.join(input_dir, "**", "*.md"), recursive=True)
    
    print(f"找到 {len(md_files)} 个Markdown文件...")
    
    success_count = 0
    for md_file in md_files:
        base_name = os.path.splitext(os.path.basename(md_file))[0]
        dir_name = os.path.dirname(md_file)
        html_file = os.path.join(dir_name, f"{base_name}.html")
        
        # 删除可能已经存在的HTML文件，确保重新生成
        if os.path.exists(html_file):
            try:
                os.remove(html_file)
            except Exception as e:
                print(f"无法删除已存在的HTML文件 {html_file}: {str(e)}", file=sys.stderr)
                
        # 转换MD到HTML
        print(f"处理: {md_file}")
        try:
            result = md_to_html(md_file, html_file)
            if result:
                success_count += 1
                print(f"成功生成HTML: {html_file}")
            else:
                print(f"转换失败: {md_file}", file=sys.stderr)
        except Exception as e:
            print(f"处理{md_file}时出错: {str(e)}", file=sys.stderr)
    
    print(f"完成! 成功处理 {success_count}/{len(md_files)} 个文件。")
    return 0 if success_count > 0 else 1

if __name__ == "__main__":
    sys.exit(main())
`;
                    
                    // 写入临时脚本
                    fs.writeFileSync(tempScriptPath, scriptContent, 'utf8');
                    
                    // 确保脚本可执行
                    if (os.platform() !== 'win32') {
                        try {
                            fs.chmodSync(tempScriptPath, 0o755);
                        } catch (err) {
                            console.error('无法设置脚本权限:', err);
                        }
                    }
                    
                    // 执行临时脚本
                    console.log('执行批量HTML转换脚本:', tempScriptPath);
                    const pythonCmd = envManager.getEnvironmentInfo().pythonCmd;
                    const result = await execWithDetails(`${pythonCmd} "${tempScriptPath}"`);
                    
                    if (result.success) {
                        progress.report({ message: '批量HTML转换完成！' });
                        vscode.window.showInformationMessage(`目录 ${path.basename(inputDir)} 中的Markdown文件已成功转换为HTML文档！`);
                    } else {
                        console.error('批量转换错误输出:', result.stderr);
                        throw new Error(result.stderr || '批量HTML转换失败，未知错误');
                    }
                } catch (err) {
                    console.error('批量HTML转换执行错误:', err);
                    throw err;
                }
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('批量HTML转换失败:', errorMessage);
            
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

    context.subscriptions.push(
        disposable, 
        diagnosticsCmd, 
        checkEnvCmd, 
        installDepsCmd, 
        htmlConvertCmd, 
        directConvertCmd,
        batchWordConvertCmd, 
        batchHtmlConvertCmd
    );
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