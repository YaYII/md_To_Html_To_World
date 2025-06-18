/**
 * @description VS Code扩展的主入口文件
 */
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { ProgressUI } from './ui/progressUI';
import { ConfigPanel } from './ui/configPanel';
import { NodeMarkdownConverter } from './core/nodeConverter';
import { IDocumentConfig } from './ui/configPanel';
import * as yaml from 'js-yaml';
import * as path from 'path';

// 导入Excel转换器（暂时注释掉未使用的导入）
// const ExcelModule = require('../nodeexcel/src/index');

/**
 * @description 自动依赖安装器类
 */
class AutoDependencyInstaller {
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('Markdown to Word - 依赖安装');
    }

    /**
     * @description 检查并安装所有依赖
     */
    async checkAndInstallDependencies(): Promise<boolean> {
        try {
            this.outputChannel.show(true);
            this.outputChannel.appendLine('开始检查依赖环境...');

            // 只检查和安装 Node.js 依赖
            const nodeSuccess = await this.checkAndInstallNodeDependencies();

            if (nodeSuccess) {
                this.outputChannel.appendLine('✅ 所有依赖安装完成！');
                return true;
            } else {
                this.outputChannel.appendLine('❌ Node.js 依赖安装失败');
                return false;
            }
        } catch (error) {
            this.outputChannel.appendLine(`依赖安装过程中出现错误: ${error}`);
            return false;
        }
    }

    /**
     * @description 检查并安装Node.js依赖
     */
    private async checkAndInstallNodeDependencies(): Promise<boolean> {
        try {
            this.outputChannel.appendLine('🔍 检查 Node.js 依赖...');

            const nodejsPath = path.join(this.context.extensionPath, 'nodejs');
            const packageJsonPath = path.join(nodejsPath, 'package.json');
            const nodeModulesPath = path.join(nodejsPath, 'node_modules');

            // 检查 package.json 是否存在
            if (!await fs.pathExists(packageJsonPath)) {
                this.outputChannel.appendLine('❌ 未找到 nodejs/package.json 文件');
                return false;
            }

            // 检查关键依赖是否存在
            const keyDependencies = [
                'axios', 'fs-extra', 'docx', 'markdown-it', 'cheerio'
            ];

            let needsInstall = false;

            if (!await fs.pathExists(nodeModulesPath)) {
                this.outputChannel.appendLine('📦 node_modules 目录不存在，需要安装依赖');
                needsInstall = true;
            } else {
                // 检查关键依赖
                for (const dep of keyDependencies) {
                    const depPath = path.join(nodeModulesPath, dep);
                    if (!await fs.pathExists(depPath)) {
                        this.outputChannel.appendLine(`📦 缺少关键依赖: ${dep}`);
                        needsInstall = true;
                        break;
                    }
                }
            }

            if (!needsInstall) {
                this.outputChannel.appendLine('✅ Node.js 依赖已满足');
                return true;
            }

            // 检测包管理器
            const packageManager = await this.detectPackageManager();
            this.outputChannel.appendLine(`📦 检测到包管理器: ${packageManager}`);

            // 安装依赖
            this.outputChannel.appendLine('🚀 开始安装 Node.js 依赖...');
            const installCommand = `${packageManager} install`;

            return new Promise<boolean>((resolve) => {
                const { exec } = require('child_process');
                exec(installCommand, {
                    cwd: nodejsPath,
                    timeout: 300000, // 5分钟超时
                    maxBuffer: 1024 * 1024 * 10 // 10MB缓冲区
                }, (error: any, stdout: string) => {
                    if (error) {
                        this.outputChannel.appendLine(`错误: ${error.message}`);
                        this.outputChannel.appendLine('建议手动运行以下命令:');
                        this.outputChannel.appendLine(`cd ${nodejsPath}`);
                        this.outputChannel.appendLine(`${packageManager} install`);
                        resolve(false);
                    } else {
                        this.outputChannel.appendLine('✅ Node.js 依赖安装成功');
                        this.outputChannel.appendLine(`输出: ${stdout}`);
                        resolve(true);
                    }
                });
            });

        } catch (error) {
            this.outputChannel.appendLine(`Node.js依赖检查失败: ${error}`);
            return false;
        }
    }

    /**
     * @description 检测可用的包管理器
     */
    private async detectPackageManager(): Promise<string> {
        const packageManagers = ['pnpm', 'yarn', 'npm'];
        
        for (const manager of packageManagers) {
            try {
                // 首先检查锁文件
                const nodejsPath = path.join(this.context.extensionPath, 'nodejs');
                const lockFiles = {
                    'pnpm': 'pnpm-lock.yaml',
                    'yarn': 'yarn.lock',
                    'npm': 'package-lock.json'
                };

                const lockFile = path.join(nodejsPath, lockFiles[manager as keyof typeof lockFiles]);
                if (await fs.pathExists(lockFile)) {
                    this.outputChannel.appendLine(`找到 ${lockFiles[manager as keyof typeof lockFiles]}，优先使用 ${manager}`);
                    
                    // 验证包管理器是否可用
                    const isAvailable = await this.checkPackageManagerAvailable(manager);
                    if (isAvailable) {
                        return manager;
                    } else {
                        this.outputChannel.appendLine(`⚠️ ${manager} 不可用，尝试下一个包管理器`);
                    }
                }

                // 检查包管理器命令是否可用
                const isAvailable = await this.checkPackageManagerAvailable(manager);
                if (isAvailable) {
                    this.outputChannel.appendLine(`✅ ${manager} 可用`);
                    return manager;
                }
            } catch (error) {
                this.outputChannel.appendLine(`❌ ${manager} 检测失败: ${error instanceof Error ? error.message : String(error)}`);
                // 继续尝试下一个包管理器
            }
        }

        this.outputChannel.appendLine('⚠️ 未找到可用的包管理器，使用默认的 npm');
        return 'npm';
    }

    /**
     * @description 检查包管理器是否可用
     */
    private async checkPackageManagerAvailable(manager: string): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            const { exec } = require('child_process');
            
            // Windows环境下可能需要添加.cmd后缀
            const command = process.platform === 'win32' ? `${manager}.cmd --version` : `${manager} --version`;
            
            // 设置超时和环境
            const execOptions = {
                timeout: 10000, // 10秒超时
                windowsHide: true, // Windows下隐藏命令窗口
                env: { ...process.env }
            };

            exec(command, execOptions, (error: any, stdout: string, stderr: string) => {
                if (!error && stdout) {
                    this.outputChannel.appendLine(`  ${manager} 版本: ${stdout.trim()}`);
                    resolve(true);
                } else {
                    this.outputChannel.appendLine(`  ${manager} 不可用: ${error?.message || stderr || '未知错误'}`);
                    resolve(false);
                }
            });
        });
    }

    /**
     * @description 手动检查依赖状态
     */
    async checkDependencyStatus(): Promise<void> {
        this.outputChannel.show(true);
        this.outputChannel.appendLine('=== 依赖状态检查 ===');

        // 检查 Node.js 依赖状态
        await this.checkNodeDependencyStatus();

        this.outputChannel.appendLine('=== 检查完成 ===');
    }

    /**
     * @description 检查Node.js依赖状态
     */
    private async checkNodeDependencyStatus(): Promise<void> {
        this.outputChannel.appendLine('\n📦 Node.js 依赖状态:');

        const nodejsPath = path.join(this.context.extensionPath, 'nodejs');
        const packageJsonPath = path.join(nodejsPath, 'package.json');
        const nodeModulesPath = path.join(nodejsPath, 'node_modules');

        // 检查目录和文件
        this.outputChannel.appendLine(`- nodejs 目录: ${await fs.pathExists(nodejsPath) ? '✅' : '❌'}`);
        this.outputChannel.appendLine(`- package.json: ${await fs.pathExists(packageJsonPath) ? '✅' : '❌'}`);
        this.outputChannel.appendLine(`- node_modules: ${await fs.pathExists(nodeModulesPath) ? '✅' : '❌'}`);

        // 检查关键依赖
        const keyDependencies = [
            'axios', 'fs-extra', 'docx', 'markdown-it', 'cheerio', 
            'js-yaml', 'yargs', 'inquirer'
        ];

        this.outputChannel.appendLine('\n关键依赖检查:');
        for (const dep of keyDependencies) {
            const depPath = path.join(nodeModulesPath, dep);
            const exists = await fs.pathExists(depPath);
            this.outputChannel.appendLine(`  ${dep}: ${exists ? '✅' : '❌'}`);
        }

                 // 检测包管理器
         const packageManager = await this.detectPackageManager();
         this.outputChannel.appendLine(`\n包管理器: ${packageManager}`);
     }

     /**
      * @description 释放资源
      */
     dispose(): void {
         this.outputChannel.dispose();
     }
}

/**
 * @description 检查是否需要运行依赖安装
 */
async function shouldRunDependencyInstall(context: vscode.ExtensionContext): Promise<boolean> {
    // 检查是否已经安装过依赖
    const dependenciesInstalled = context.globalState.get<boolean>('dependenciesInstalled', false);
    const lastInstallTime = context.globalState.get<number>('lastInstallTime', 0);
    
    // 如果从未安装过，需要安装
    if (!dependenciesInstalled) {
        return true;
    }
    
    // 检查是否超过30天未检查（可选的定期检查）
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    if (lastInstallTime < thirtyDaysAgo) {
        return true;
    }
    
    // 检查关键文件是否存在
    const nodejsPath = path.join(context.extensionPath, 'nodejs');
    const nodeModulesPath = path.join(nodejsPath, 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
        return true;
    }
    
    // 检查关键Node.js依赖是否存在
    const keyDependencies = ['axios', 'fs-extra', 'docx', 'markdown-it', 'cheerio'];
    for (const dep of keyDependencies) {
        const depPath = path.join(nodeModulesPath, dep);
        if (!fs.existsSync(depPath)) {
            return true;
        }
    }
    
    return false;
}

/**
 * @description VS Code插件的激活入口点
 * @param context 插件的上下文对象
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('插件 "Markdown to Word Converter" 正在激活...');

    // 创建自动依赖安装器
    const dependencyInstaller = new AutoDependencyInstaller(context);
    
    // 检查是否是首次激活或需要重新安装依赖
    const needsInstall = await shouldRunDependencyInstall(context);
    
    if (needsInstall) {
        console.log('检测到需要安装依赖，开始自动安装...');
        
        // 执行自动依赖安装
        const installSuccess = await dependencyInstaller.checkAndInstallDependencies();
        
        if (installSuccess) {
            // 记录安装成功状态
            await context.globalState.update('dependenciesInstalled', true);
            await context.globalState.update('lastInstallTime', Date.now());
        } else {
            // 安装失败，但仍然继续激活插件
            console.warn('依赖安装失败，插件可能无法正常工作');
        }
    } else {
        console.log('依赖已安装，跳过自动安装过程');
    }

    // 注册依赖安装器到context，在插件deactivate时清理
    context.subscriptions.push(dependencyInstaller);

    // 获取转换器实例
    const converter = NodeMarkdownConverter.getInstance();
    const progressUI = ProgressUI.getInstance();

    /**
     * @description 处理命令行参数，支持直接执行转换
     */
    async function handleCommandLineArgs() {
        // 检查是否是命令行启动VS Code的场景
        const args = process.argv;
        console.log('命令行参数:', args);
        
        // 寻找可能的Markdown文件路径（支持中文路径和空格）
        const mdFilePaths: string[] = [];
        
        for (const arg of args) {
            try {
                // 解码URI编码的路径
                const decodedArg = decodeURIComponent(arg);
                
                // 检查是否是Markdown文件
                if (decodedArg.toLowerCase().endsWith('.md')) {
                    // 尝试规范化路径
                    try {
                        const normalizedPath = path.normalize(decodedArg);
                        console.log(`找到可能的Markdown文件路径: ${normalizedPath}`);
                        mdFilePaths.push(normalizedPath);
                    } catch (e) {
                        console.log(`无法规范化路径 ${decodedArg}，使用原始路径`);
                        mdFilePaths.push(decodedArg);
                    }
                }
            } catch (e) {
                // 如果解码失败，尝试直接检查
                if (arg.toLowerCase().endsWith('.md')) {
                    console.log(`找到可能的Markdown文件路径(未解码): ${arg}`);
                    mdFilePaths.push(arg);
                }
            }
        }
        
        if (mdFilePaths.length > 0) {
            // 找到了Markdown文件路径，执行直接转换
            console.log('检测到命令行启动并传入Markdown文件:', mdFilePaths);
            
            for (const mdFilePath of mdFilePaths) {
                try {
                    // 检查文件是否存在
                    console.log(`检查文件是否存在: ${mdFilePath}`);
                    if (!fs.existsSync(mdFilePath)) {
                        console.error(`文件不存在: ${mdFilePath}`);
                        continue;
                    }
                    
                    // 获取用户配置
                    console.log('获取用户配置...');
                    const userConfig = getUserConfig();
                    
                    // 直接执行转换
                    await progressUI.withProgress(`转换文件: ${path.basename(mdFilePath)}`, async (progress) => {
                        progress.report({ message: '执行转换...' });
                        
                        // 增加日志输出
                        console.log(`开始转换文件: ${mdFilePath}`);
                        console.log('使用配置:', JSON.stringify({
                            fonts: userConfig.fonts,
                            document: userConfig.document,
                            chinese: userConfig.chinese
                        }, null, 2));
                        
                        // 确保输出目录存在
                        const outputDir = path.dirname(mdFilePath);
                        await fs.ensureDir(outputDir);
                        
                        // 执行转换，不明确传入outputDirectory，让内部逻辑处理
                        const result = await converter.convert(mdFilePath, {
                            showProgress: true,
                            useConfig: userConfig,
                            keepHtml: false,
                            onComplete: (conversionResult: any) => {
                                if (conversionResult.success && conversionResult.outputFile) {
                                    progressUI.showSuccess(conversionResult.message, conversionResult.outputFile);
                                }
                            }
                        });
                        
                        // 显示成功信息
                        progress.report({ message: '转换完成！' });
                        await progressUI.showSuccess('Markdown 文件已成功转换为 Word 文档！', result.outputFile);
                        
                        // 尝试打开生成的文件
                        try {
                            if (result.outputFile) {
                                const uri = vscode.Uri.file(result.outputFile);
                                await vscode.commands.executeCommand('vscode.open', uri);
                            }
                        } catch (openError) {
                            console.error('无法打开生成的文件:', openError);
                        }
                    });
                    
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`转换文件 ${mdFilePath} 失败:`, errorMessage);
                    await progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                }
            }
        }
    }
    
    // 在激活时尝试处理命令行参数
    await handleCommandLineArgs();

    /**
     * @description 从VS Code配置中获取用户配置
     * @returns 用户配置对象
     */
    function getUserConfig(): IDocumentConfig {
        try {
            // 获取转换器实例
            const converter = NodeMarkdownConverter.getInstance();
            
            // 尝试加载配置
            const configFilePath = converter.getConfigFilePath();
            console.log('尝试从统一配置文件加载:', configFilePath);
            
            // 读取YAML文件
            if (fs.existsSync(configFilePath)) {
                try {
                    const configContent = fs.readFileSync(configFilePath, 'utf8');
                    const config = yaml.load(configContent) as IDocumentConfig;
                    if (config && typeof config === 'object' && config.fonts && config.sizes) {
                        console.log('成功从统一配置文件加载配置');
                        return config;
                    }
                } catch (error) {
                    console.error('读取配置文件失败:', error);
                }
            }
            
            // 如果配置文件不存在或读取失败，则从VS Code设置获取
            const vscodeConfig = vscode.workspace.getConfiguration('markdown-to-word');
            const userConfig = vscodeConfig.get('markdownToWordUserConfig') as IDocumentConfig;
            
            // 如果存在完整的用户配置，直接返回
            if (userConfig && typeof userConfig === 'object' && userConfig.fonts && userConfig.sizes) {
                console.log('从VS Code设置加载配置');
                return userConfig;
            }
            
            // 否则构建默认配置
            console.log('使用默认配置');
            const defaultConfig: IDocumentConfig = {
                fonts: {
                    default: vscodeConfig.get('defaultFontFamily') as string || '微软雅黑',
                    code: 'Courier New',
                    headings: vscodeConfig.get('defaultFontFamily') as string || '微软雅黑'
                },
                sizes: {
                    default: vscodeConfig.get('defaultFontSize') as number || 12,
                    code: ((vscodeConfig.get('defaultFontSize') as number) || 12) - 2,
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
                    line_spacing: vscodeConfig.get('defaultLineSpacing') as number || 1.5,
                    space_before: 0,
                    space_after: 6,
                    first_line_indent: 0
                },
                document: {
                    page_size: vscodeConfig.get('defaultPageSize') as string || 'A4',
                    margin_top: 2.54,
                    margin_bottom: 2.54,
                    margin_left: 3.18,
                    margin_right: 3.18,
                    generate_toc: vscodeConfig.get('includeToc') as boolean || false,
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
                    keepHtml: vscodeConfig.get('keepHtml') as boolean || false
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
            
            // 保存默认配置到文件和VS Code设置
            converter.saveConfig(defaultConfig)
                .then(() => console.log('默认配置已保存'))
                .catch((err: Error) => console.error('保存默认配置失败:', err));
            
            return defaultConfig;
        } catch (error) {
            console.error('获取配置失败:', error);
            // 如果发生错误，返回最小可用配置
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

    // 注册所有命令
    const commands = [
        // 现有命令
                 vscode.commands.registerCommand('markdowntoword.markdown-to-word.convert', async (uri?: vscode.Uri) => {
             const filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.uri.fsPath;
             if (filePath && filePath.endsWith('.md')) {
                 // 使用ConfigPanel的静态工厂方法创建实例
                 ConfigPanel.createOrShow(context.extensionPath, filePath, async (config, cancelled) => {
                     if (!cancelled) {
                         try {
                             const userConfig = config;
                             await progressUI.withProgress(`转换文件: ${path.basename(filePath)}`, async (progress) => {
                                 progress.report({ message: '执行转换...' });
                                 const result = await converter.convert(filePath, {
                                     showProgress: true,
                                     useConfig: userConfig,
                                     keepHtml: false
                                 });
                                 
                                 await progressUI.showSuccess('Markdown 文件已成功转换为 Word 文档！', result.outputFile);
                             });
                         } catch (error: unknown) {
                             await progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                         }
                     }
                 });
             } else {
                 vscode.window.showErrorMessage('请选择一个Markdown文件');
             }
         }),

        vscode.commands.registerCommand('markdowntoword.markdown-to-word.convertDirect', async (uri?: vscode.Uri) => {
            const filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.uri.fsPath;
            if (filePath && filePath.endsWith('.md')) {
                try {
                    const userConfig = getUserConfig();
                    await progressUI.withProgress(`转换文件: ${path.basename(filePath)}`, async (progress) => {
                        progress.report({ message: '执行转换...' });
                        const result = await converter.convert(filePath, {
                            showProgress: true,
                            useConfig: userConfig,
                            keepHtml: false
                        });
                        
                        await progressUI.showSuccess('Markdown 文件已成功转换为 Word 文档！', result.outputFile);
                    });
                } catch (error: unknown) {
                    await progressUI.showError(error instanceof Error ? error : new Error(String(error)));
                }
            } else {
                vscode.window.showErrorMessage('请选择一个Markdown文件');
            }
        }),

        // 新增手动依赖安装命令
        vscode.commands.registerCommand('markdowntoword.markdown-to-word.installDependencies', async () => {
            try {
                const installer = new AutoDependencyInstaller(context);
                const success = await installer.checkAndInstallDependencies();
                
                if (success) {
                    // 更新状态
                    await context.globalState.update('dependenciesInstalled', true);
                    await context.globalState.update('lastInstallTime', Date.now());
                } else {
                    vscode.window.showWarningMessage('依赖安装失败，请查看输出面板获取详细信息');
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`手动安装依赖失败: ${errorMessage}`);
            }
        }),

        // 添加依赖检查命令
        vscode.commands.registerCommand('markdowntoword.markdown-to-word.checkDependencies', async () => {
            try {
                const outputChannel = vscode.window.createOutputChannel('Markdown to Word - 依赖检查');
                outputChannel.show();
                
                outputChannel.appendLine('开始检查依赖状态...\n');
                
                // 检查Node.js依赖
                const nodejsPath = path.join(context.extensionPath, 'nodejs');
                const nodeModulesPath = path.join(nodejsPath, 'node_modules');
                
                outputChannel.appendLine('=== Node.js 依赖检查 ===');
                if (fs.existsSync(nodeModulesPath)) {
                    outputChannel.appendLine('✓ node_modules 目录存在');
                    
                    const keyDependencies = ['axios', 'fs-extra', 'docx', 'markdown-it', 'cheerio'];
                    for (const dep of keyDependencies) {
                        const depPath = path.join(nodeModulesPath, dep);
                        if (fs.existsSync(depPath)) {
                            outputChannel.appendLine(`✓ ${dep} 已安装`);
                        } else {
                            outputChannel.appendLine(`✗ ${dep} 未安装`);
                        }
                    }
                } else {
                    outputChannel.appendLine('✗ node_modules 目录不存在');
                }
                
                outputChannel.appendLine('\n=== Python 依赖检查 ===');
                // 简单的Python依赖检查
                const pythonCommands = ['python3', 'python', 'py'];
                let pythonFound = false;
                
                for (const cmd of pythonCommands) {
                    try {
                        const { exec } = require('child_process');
                                                 await new Promise<void>((resolve) => {
                            exec(`${cmd} --version`, (error: any, stdout: string) => {
                                if (!error) {
                                    outputChannel.appendLine(`✓ Python 可用: ${cmd} (${stdout.trim()})`);
                                    pythonFound = true;
                                }
                                resolve();
                            });
                        });
                        if (pythonFound) break;
                    } catch {
                        continue;
                    }
                }
                
                if (!pythonFound) {
                    outputChannel.appendLine('✗ 未找到可用的Python环境');
                }
                
                outputChannel.appendLine('\n依赖检查完成！');
                
                vscode.window.showInformationMessage('依赖检查完成，请查看输出面板', '查看结果').then(selection => {
                    if (selection === '查看结果') {
                        outputChannel.show();
                    }
                });
                
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`依赖检查失败: ${errorMessage}`);
            }
        }),

        // ... 其他现有命令 ...
    ];

    // 注册所有命令到context
    commands.forEach(command => context.subscriptions.push(command));

    console.log('插件 "Markdown to Word Converter" 激活完成！');
}

/**
 * @description 插件停用时的清理工作
 */
export function deactivate(): void {
    console.log('插件 "Markdown to Word Converter" 已停用');
}