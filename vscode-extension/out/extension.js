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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const environmentManager_1 = require("./environmentManager");
const converter_1 = require("./core/converter");
const progressUI_1 = require("./ui/progressUI");
const configPanel_1 = require("./ui/configPanel");
const path = __importStar(require("path"));
const execUtils_1 = require("./utils/execUtils");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('插件 "Markdown to Word Converter" 正在激活...');
        const envManager = environmentManager_1.EnvironmentManager.getInstance();
        try {
            yield envManager.initialize(context);
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
                yield checkEnvironment(envManager, context);
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
                    yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                }
            }
        }));
        const diagnosticsCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.diagnostics', () => __awaiter(this, void 0, void 0, function* () {
            showDiagnostics(envManager);
        }));
        const checkEnvCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.checkEnvironment', () => __awaiter(this, void 0, void 0, function* () {
            try {
                yield checkEnvironment(envManager, context, true);
                vscode.window.showInformationMessage('环境检查通过');
            }
            catch (error) {
                vscode.window.showErrorMessage(`环境检查失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        }));
        const installDepsCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.installDependencies', () => __awaiter(this, void 0, void 0, function* () {
            installDependencies(context);
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
                yield checkEnvironment(envManager, context);
                yield progressUI.withProgress('Markdown 直接转 Word', (progress) => __awaiter(this, void 0, void 0, function* () {
                    progress.report({ message: '执行转换...' });
                    const result = yield converter.convert(inputFile, {
                        showProgress: true,
                        keepHtml: false,
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
                    yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                }
            }
        }));
        const htmlConvertCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.convertToHtml', (uri) => __awaiter(this, void 0, void 0, function* () {
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
                yield checkEnvironment(envManager, context);
                yield progressUI.withProgress('Markdown 转 HTML', (progress) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const baseName = path.basename(inputFile, '.md');
                        const outputDir = path.dirname(inputFile);
                        const outputHtmlFile = path.join(outputDir, `${baseName}.html`);
                        if (fs.existsSync(outputHtmlFile)) {
                            try {
                                fs.unlinkSync(outputHtmlFile);
                            }
                            catch (err) {
                                console.warn('无法删除已存在的HTML文件:', err);
                            }
                        }
                        const tempScriptDir = path.join(os.tmpdir(), 'markdown-to-word');
                        if (!fs.existsSync(tempScriptDir)) {
                            fs.mkdirSync(tempScriptDir, { recursive: true });
                        }
                        const tempScriptPath = path.join(tempScriptDir, 'simple_md_to_html.py');
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
                        fs.writeFileSync(tempScriptPath, scriptContent, 'utf8');
                        if (os.platform() !== 'win32') {
                            try {
                                fs.chmodSync(tempScriptPath, 0o755);
                            }
                            catch (err) {
                                console.warn('无法设置脚本执行权限:', err);
                            }
                        }
                        progress.report({ message: '正在转换为HTML...' });
                        const pythonCmd = envManager.getEnvironmentInfo().pythonCmd;
                        const result = yield (0, execUtils_1.execWithDetails)(`${pythonCmd} "${tempScriptPath}" "${inputFile}" "${outputHtmlFile}"`);
                        if (result.success) {
                            if (fs.existsSync(outputHtmlFile)) {
                                progress.report({ message: 'HTML生成成功！' });
                                yield progressUI.showSuccess('Markdown 文件已成功转换为 HTML！', outputHtmlFile);
                            }
                            else {
                                throw new Error(`未能写入HTML文件: ${outputHtmlFile}`);
                            }
                        }
                        else {
                            console.error('Python脚本错误:', result.stderr);
                            throw new Error(`转换失败: ${result.stderr || '未知错误'}`);
                        }
                    }
                    catch (error) {
                        console.error('HTML转换失败:', error);
                        throw error;
                    }
                }));
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('转换到HTML失败:', errorMessage);
                yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
            }
        }));
        const batchWordConvertCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.batchConvertToWord', (uri) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!uri || !uri.fsPath) {
                    throw new Error('未选择文件夹。请在文件资源管理器中右键单击文件夹。');
                }
                const inputDir = uri.fsPath;
                const stat = yield vscode.workspace.fs.stat(uri);
                if (stat.type !== vscode.FileType.Directory) {
                    throw new Error('所选项目不是文件夹。请选择一个文件夹。');
                }
                yield checkEnvironment(envManager, context);
                yield progressUI.withProgress('批量Markdown转Word', (progress) => __awaiter(this, void 0, void 0, function* () {
                    progress.report({ message: '执行批量转换...' });
                    try {
                        const envInfo = envManager.getEnvironmentInfo();
                        const pythonCmd = envInfo.pythonCmd;
                        const scriptPath = path.join(envInfo.extensionPath, 'scripts', 'run.py');
                        let cmdArgs = [
                            `"${scriptPath}"`,
                            `--input "${inputDir}"`,
                            `--output "${inputDir}"`,
                            '--batch'
                        ];
                        cmdArgs.push('--no-html');
                        const cmd = `${pythonCmd} ${cmdArgs.join(' ')}`;
                        console.log('执行批处理命令:', cmd);
                        const result = yield (0, execUtils_1.execWithDetails)(cmd);
                        if (result.success) {
                            progress.report({ message: '批量转换完成！' });
                            vscode.window.showInformationMessage(`目录 ${path.basename(inputDir)} 中的Markdown文件已成功转换为Word文档！`);
                        }
                        else {
                            throw new Error(result.stderr || '批量转换失败，未知错误');
                        }
                    }
                    catch (err) {
                        console.error('批量转换执行错误:', err);
                        throw err;
                    }
                }));
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('批量转换失败:', errorMessage);
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
                    yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                }
            }
        }));
        const batchHtmlConvertCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.batchConvertToHtml', (uri) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!uri || !uri.fsPath) {
                    throw new Error('未选择文件夹。请在文件资源管理器中右键单击文件夹。');
                }
                const inputDir = uri.fsPath;
                const stat = yield vscode.workspace.fs.stat(uri);
                if (stat.type !== vscode.FileType.Directory) {
                    throw new Error('所选项目不是文件夹。请选择一个文件夹。');
                }
                yield checkEnvironment(envManager, context);
                yield progressUI.withProgress('批量Markdown转HTML', (progress) => __awaiter(this, void 0, void 0, function* () {
                    progress.report({ message: '执行批量HTML转换...' });
                    try {
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
                        fs.writeFileSync(tempScriptPath, scriptContent, 'utf8');
                        if (os.platform() !== 'win32') {
                            try {
                                fs.chmodSync(tempScriptPath, 0o755);
                            }
                            catch (err) {
                                console.error('无法设置脚本权限:', err);
                            }
                        }
                        console.log('执行批量HTML转换脚本:', tempScriptPath);
                        const pythonCmd = envManager.getEnvironmentInfo().pythonCmd;
                        const result = yield (0, execUtils_1.execWithDetails)(`${pythonCmd} "${tempScriptPath}"`);
                        if (result.success) {
                            progress.report({ message: '批量HTML转换完成！' });
                            vscode.window.showInformationMessage(`目录 ${path.basename(inputDir)} 中的Markdown文件已成功转换为HTML文档！`);
                        }
                        else {
                            console.error('批量转换错误输出:', result.stderr);
                            throw new Error(result.stderr || '批量HTML转换失败，未知错误');
                        }
                    }
                    catch (err) {
                        console.error('批量HTML转换执行错误:', err);
                        throw err;
                    }
                }));
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('批量HTML转换失败:', errorMessage);
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
                    yield progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                }
            }
        }));
        context.subscriptions.push(disposable, diagnosticsCmd, checkEnvCmd, installDepsCmd, htmlConvertCmd, directConvertCmd, batchWordConvertCmd, batchHtmlConvertCmd);
        console.log('插件 "Markdown to Word Converter" 已成功激活。');
    });
}
exports.activate = activate;
function checkEnvironment(envManager, context, showSuccess = false) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield envManager.initialize(context);
            if (showSuccess) {
                vscode.window.showInformationMessage('环境检查通过');
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`环境检查失败: ${errorMessage}`);
        }
    });
}
function showDiagnostics(envManager) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const diagnostics = yield envManager.getDiagnostics();
            const doc = yield vscode.workspace.openTextDocument({
                content: diagnostics,
                language: 'plaintext'
            });
            yield vscode.window.showTextDocument(doc);
        }
        catch (error) {
            vscode.window.showErrorMessage(`无法获取诊断信息: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
}
function showTroubleshooting() {
    return __awaiter(this, void 0, void 0, function* () {
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
        const doc = yield vscode.workspace.openTextDocument({
            content: troubleshootingContent,
            language: 'markdown'
        });
        yield vscode.window.showTextDocument(doc);
    });
}
function installDependencies(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const envManager = environmentManager_1.EnvironmentManager.getInstance();
        try {
            yield envManager.initialize(context);
            yield vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "安装Python依赖",
                cancellable: false
            }, (progress) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const envInfo = envManager.getEnvironmentInfo();
                    const installScript = path.join(envInfo.extensionPath, 'scripts', 'install_dependencies.py');
                    progress.report({ message: "正在安装依赖..." });
                    const result = yield (0, execUtils_1.execWithDetails)(`${envInfo.pythonCmd} "${installScript}"`);
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
            }));
        }
        catch (error) {
            vscode.window.showErrorMessage(`无法初始化环境: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
}
function deactivate() {
    console.log('插件 "Markdown to Word Converter" 已停用。');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map