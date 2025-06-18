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

// 导入Excel转换器
const ExcelModule = require('../nodeexcel/src/index');
const { convertFile, convertBatch } = ExcelModule;

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
     * @description 执行自动依赖安装检查
     */
    async checkAndInstallDependencies(): Promise<boolean> {
        try {
            this.outputChannel.appendLine('开始检查并安装依赖...');
            
            // 显示进度条
            return await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "初始化 Markdown to Word 插件",
                cancellable: false
            }, async (progress, token) => {
                progress.report({ increment: 0, message: "检查依赖环境..." });
                
                // 1. 检查并安装Node.js依赖
                progress.report({ increment: 20, message: "检查Node.js依赖..." });
                const nodeResult = await this.checkAndInstallNodeDependencies();
                
                if (!nodeResult.success) {
                    this.showInstallationError('Node.js依赖安装失败', nodeResult.message);
                    return false;
                }
                
                // 2. 检查并安装Python依赖
                progress.report({ increment: 50, message: "检查Python依赖..." });
                const pythonResult = await this.checkAndInstallPythonDependencies();
                
                if (!pythonResult.success) {
                    this.showInstallationError('Python依赖安装失败', pythonResult.message);
                    return false;
                }
                
                progress.report({ increment: 100, message: "依赖安装完成！" });
                
                // 显示成功消息
                vscode.window.showInformationMessage(
                    '🎉 Markdown to Word 插件依赖安装完成！现在可以正常使用所有功能了。',
                    '查看日志'
                ).then(selection => {
                    if (selection === '查看日志') {
                        this.outputChannel.show();
                    }
                });
                
                return true;
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.outputChannel.appendLine(`依赖安装过程中出错: ${errorMessage}`);
            this.showInstallationError('依赖安装失败', errorMessage);
            return false;
        }
    }

    /**
     * @description 检查并安装Node.js依赖
     */
    private async checkAndInstallNodeDependencies(): Promise<{success: boolean, message: string}> {
        const nodejsPath = path.join(this.context.extensionPath, 'nodejs');
        const packageJsonPath = path.join(nodejsPath, 'package.json');
        
        try {
            // 检查package.json是否存在
            if (!fs.existsSync(packageJsonPath)) {
                return {
                    success: false,
                    message: 'nodejs/package.json 文件不存在'
                };
            }
            
            // 检查node_modules是否存在或是否完整
            const nodeModulesPath = path.join(nodejsPath, 'node_modules');
            const shouldInstall = !fs.existsSync(nodeModulesPath) || await this.needsNodeDependencyInstall(nodejsPath);
            
            if (shouldInstall) {
                this.outputChannel.appendLine('正在安装Node.js依赖...');
                
                // 检测包管理器
                const packageManager = await this.detectPackageManager(nodejsPath);
                this.outputChannel.appendLine(`使用包管理器: ${packageManager}`);
                
                // 执行安装
                const installResult = await this.executeCommand(
                    `cd "${nodejsPath}" && ${packageManager} install`,
                    '安装Node.js依赖'
                );
                
                if (!installResult.success) {
                    return {
                        success: false,
                        message: `Node.js依赖安装失败: ${installResult.error}`
                    };
                }
                
                this.outputChannel.appendLine('Node.js依赖安装成功');
            } else {
                this.outputChannel.appendLine('Node.js依赖已存在，跳过安装');
            }
            
            return { success: true, message: 'Node.js依赖检查完成' };
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.outputChannel.appendLine(`Node.js依赖检查失败: ${errorMessage}`);
            return {
                success: false,
                message: `Node.js依赖检查失败: ${errorMessage}`
            };
        }
    }

    /**
     * @description 检查是否需要安装Node.js依赖
     */
    private async needsNodeDependencyInstall(projectPath: string): Promise<boolean> {
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const nodeModulesPath = path.join(projectPath, 'node_modules');
            
            if (!fs.existsSync(packageJsonPath) || !fs.existsSync(nodeModulesPath)) {
                return true;
            }
            
            // 读取package.json检查必要的依赖
            const packageJson = await fs.readJson(packageJsonPath);
            const requiredDeps = Object.keys(packageJson.dependencies || {});
            
            // 检查关键依赖是否存在
            const keyDependencies = ['axios', 'fs-extra', 'docx', 'markdown-it', 'cheerio'];
            
            for (const dep of keyDependencies) {
                const depPath = path.join(nodeModulesPath, dep);
                if (!fs.existsSync(depPath)) {
                    this.outputChannel.appendLine(`缺少关键依赖: ${dep}`);
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            this.outputChannel.appendLine(`检查Node.js依赖时出错: ${error}`);
            return true; // 出错时选择重新安装
        }
    }

    /**
     * @description 检测包管理器
     */
    private async detectPackageManager(projectPath: string): Promise<string> {
        // 检查是否存在特定的锁文件
        const lockFiles = [
            { file: 'pnpm-lock.yaml', manager: 'pnpm' },
            { file: 'yarn.lock', manager: 'yarn' },
            { file: 'package-lock.json', manager: 'npm' }
        ];
        
        for (const { file, manager } of lockFiles) {
            if (fs.existsSync(path.join(projectPath, file))) {
                // 验证包管理器是否可用
                const isAvailable = await this.isPackageManagerAvailable(manager);
                if (isAvailable) {
                    return manager;
                }
            }
        }
        
        // 检查全局pnpm-lock.yaml（项目根目录）
        const rootPnpmLock = path.join(this.context.extensionPath, 'pnpm-lock.yaml');
        if (fs.existsSync(rootPnpmLock)) {
            const isAvailable = await this.isPackageManagerAvailable('pnpm');
            if (isAvailable) {
                return 'pnpm';
            }
        }
        
        // 默认使用npm
        return 'npm';
    }

    /**
     * @description 检查包管理器是否可用
     */
    private async isPackageManagerAvailable(manager: string): Promise<boolean> {
        try {
            const result = await this.executeCommand(`${manager} --version`, `检查${manager}是否可用`);
            return result.success;
        } catch {
            return false;
        }
    }

    /**
     * @description 检查并安装Python依赖
     */
    private async checkAndInstallPythonDependencies(): Promise<{success: boolean, message: string}> {
        try {
            // 检查Python环境
            const pythonCheck = await this.checkPythonEnvironment();
            if (!pythonCheck.success) {
                return pythonCheck;
            }
            
            // 检查Python依赖
            const depsCheck = await this.checkPythonDeps(pythonCheck.pythonCmd!);
            if (!depsCheck.success) {
                // 尝试安装Python依赖
                this.outputChannel.appendLine('正在安装Python依赖...');
                const installResult = await this.installPythonDependencies(pythonCheck.pythonCmd!);
                
                if (!installResult.success) {
                    return installResult;
                }
                
                this.outputChannel.appendLine('Python依赖安装成功');
            } else {
                this.outputChannel.appendLine('Python依赖已存在，跳过安装');
            }
            
            return { success: true, message: 'Python依赖检查完成' };
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.outputChannel.appendLine(`Python依赖检查失败: ${errorMessage}`);
            return {
                success: false,
                message: `Python依赖检查失败: ${errorMessage}`
            };
        }
    }

    /**
     * @description 检查Python环境
     */
    private async checkPythonEnvironment(): Promise<{success: boolean, message: string, pythonCmd?: string}> {
        const pythonCommands = ['python3', 'python', 'py'];
        
        for (const cmd of pythonCommands) {
            try {
                const result = await this.executeCommand(`${cmd} --version`, `检查${cmd}`);
                if (result.success) {
                    this.outputChannel.appendLine(`找到Python: ${cmd} (${result.output?.trim()})`);
                    return {
                        success: true,
                        message: `Python环境可用: ${cmd}`,
                        pythonCmd: cmd
                    };
                }
            } catch {
                continue;
            }
        }
        
        return {
            success: false,
            message: '未找到可用的Python环境。请安装Python 3.7+并确保添加到系统PATH中。'
        };
    }

    /**
     * @description 检查Python依赖
     */
    private async checkPythonDeps(pythonCmd: string): Promise<{success: boolean, message: string}> {
        const requiredPackages = ['python-docx', 'markdown', 'beautifulsoup4', 'lxml'];
        const missingPackages: string[] = [];
        
        for (const pkg of requiredPackages) {
            try {
                const result = await this.executeCommand(
                    `${pythonCmd} -c "import ${pkg.replace('-', '_')}; print('${pkg} OK')"`,
                    `检查Python包: ${pkg}`
                );
                
                if (result.success) {
                    this.outputChannel.appendLine(`✓ ${pkg} 已安装`);
                } else {
                    this.outputChannel.appendLine(`✗ ${pkg} 未安装`);
                    missingPackages.push(pkg);
                }
            } catch {
                this.outputChannel.appendLine(`✗ ${pkg} 未安装`);
                missingPackages.push(pkg);
            }
        }
        
        if (missingPackages.length > 0) {
            return {
                success: false,
                message: `缺少Python依赖: ${missingPackages.join(', ')}`
            };
        }
        
        return { success: true, message: '所有Python依赖已安装' };
    }

    /**
     * @description 安装Python依赖
     */
    private async installPythonDependencies(pythonCmd: string): Promise<{success: boolean, message: string}> {
        const packages = ['python-docx', 'markdown', 'beautifulsoup4', 'lxml'];
        
        try {
            // 尝试使用requirements.txt安装
            const scriptsPath = path.join(this.context.extensionPath, 'scripts');
            const requirementsPath = path.join(scriptsPath, 'requirements.txt');
            
            if (fs.existsSync(requirementsPath)) {
                this.outputChannel.appendLine('使用requirements.txt安装Python依赖...');
                const result = await this.executeCommand(
                    `${pythonCmd} -m pip install -r "${requirementsPath}"`,
                    '从requirements.txt安装Python依赖'
                );
                
                if (result.success) {
                    return { success: true, message: 'Python依赖安装成功' };
                }
            }
            
            // 如果requirements.txt不存在或安装失败，逐个安装
            this.outputChannel.appendLine('逐个安装Python依赖包...');
            for (const pkg of packages) {
                const result = await this.executeCommand(
                    `${pythonCmd} -m pip install ${pkg}`,
                    `安装Python包: ${pkg}`
                );
                
                if (!result.success) {
                    return {
                        success: false,
                        message: `安装Python包 ${pkg} 失败: ${result.error}`
                    };
                }
                
                this.outputChannel.appendLine(`✓ ${pkg} 安装成功`);
            }
            
            return { success: true, message: 'Python依赖安装成功' };
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                message: `Python依赖安装失败: ${errorMessage}`
            };
        }
    }

    /**
     * @description 执行命令
     */
    private async executeCommand(command: string, description: string): Promise<{success: boolean, output?: string, error?: string}> {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            
            this.outputChannel.appendLine(`执行: ${description}`);
            this.outputChannel.appendLine(`命令: ${command}`);
            
            exec(command, { 
                encoding: 'utf8',
                timeout: 300000, // 5分钟超时
                maxBuffer: 1024 * 1024 * 10 // 10MB缓冲区
            }, (error: any, stdout: string, stderr: string) => {
                if (error) {
                    this.outputChannel.appendLine(`错误: ${error.message}`);
                    resolve({
                        success: false,
                        error: error.message,
                        output: stdout
                    });
                } else {
                    this.outputChannel.appendLine(`成功: ${description}`);
                    if (stdout) {
                        this.outputChannel.appendLine(`输出: ${stdout}`);
                    }
                    resolve({
                        success: true,
                        output: stdout
                    });
                }
            });
        });
    }

    /**
     * @description 显示安装错误信息
     */
    private showInstallationError(title: string, message: string): void {
        const fullMessage = `${title}\n\n${message}\n\n请查看输出面板获取详细信息。`;
        
        vscode.window.showErrorMessage(
            fullMessage,
            '查看日志',
            '手动安装指南'
        ).then(selection => {
            if (selection === '查看日志') {
                this.outputChannel.show();
            } else if (selection === '手动安装指南') {
                // 打开手动安装指南
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/yourusername/markdown-to-word/blob/main/README.md#troubleshooting'));
            }
        });
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

            // 步骤 2: 显示配置面板
            console.log('准备显示配置面板, 输入文件:', inputFile);
            ConfigPanel.createOrShow(context.extensionPath, inputFile, async (config, cancelled) => {
                console.log('配置面板回调, 取消状态:', cancelled);
                if (cancelled) {
                    console.log('用户取消了转换');
                    return;
                }

                // 步骤 3: 使用配置执行转换
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

                    // 步骤 4: 显示成功信息
                    progress.report({ message: '转换完成！' });
                    progressUI.showSuccess('Markdown 文件已成功转换为 Word 文档！', result.outputFile);
                });
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('转换失败:', errorMessage);
            await progressUI.showError(error instanceof Error ? error : new Error(String(error)));
        }
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

            // 步骤 2: 获取用户配置
            const config = vscode.workspace.getConfiguration('markdown-to-word');
            const userConfig = getUserConfig();
            
            // 步骤 3: 直接执行转换（不显示配置面板）
            await progressUI.withProgress('Markdown 直接转 Word', async (progress) => {
                progress.report({ message: '执行转换...' });
                
                const result = await converter.convert(inputFile, {
                    showProgress: true,
                    useConfig: userConfig,
                    keepHtml: config.get('keepHtml') || false,
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
                await progressUI.showError(error instanceof Error ? error : new Error(String(error)));
            }
    });

    // 注册转换为HTML命令
    const convertToHtmlCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.convertToHtml', async (uri?: vscode.Uri) => {
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

            // 步骤 2: 获取用户配置
            const userConfig = getUserConfig();

            // 步骤 3: 执行转换
            await progressUI.withProgress('Markdown 转 HTML', async (progress) => {
                progress.report({ message: '执行转换...' });
                
                const result = await converter.convertToHtml(inputFile, {
                    showProgress: true,
                    useConfig: userConfig,
                    onComplete: (conversionResult: any) => {
                        if (conversionResult.success && conversionResult.outputFile) {
                            progressUI.showSuccess(conversionResult.message, conversionResult.outputFile);
                        }
                    }
                });

                // 步骤 4: 显示成功信息
                progress.report({ message: '转换完成！' });
                await progressUI.showSuccess('Markdown 文件已成功转换为 HTML 文档！', result.outputFile);
            });
        } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('转换到HTML失败:', errorMessage);
            await progressUI.showError(error instanceof Error ? error : new Error(String(error)));
        }
    });

    // 注册批量转换为Word命令
    const batchConvertToWordCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.batchConvertToWord', async (uri?: vscode.Uri) => {
    try {
            // 步骤 1: 确定输入目录
            if (!uri) {
                throw new Error('未选择目录。请在文件资源管理器中右键单击一个目录。');
            }

            const inputDir = uri.fsPath;
            const stats = await fs.stat(inputDir);
            if (!stats.isDirectory()) {
                throw new Error(`选择的路径不是目录: ${inputDir}`);
            }

            // 步骤 2: 确定输出目录
            const outputDir = await vscode.window.showInputBox({
                prompt: '请输入输出目录路径',
                value: inputDir,
                validateInput: async (value) => {
                    if (!value) {
                        return '输出目录不能为空';
                    }
                    try {
                        await fs.ensureDir(value);
                        return null;
    } catch (error) {
                        return `无法创建目录: ${error instanceof Error ? error.message : String(error)}`;
    }
}
            });

            if (!outputDir) {
                return; // 用户取消了输入
            }

            // 步骤 3: 获取用户配置
            const config = vscode.workspace.getConfiguration('markdown-to-word');
            const userConfig = getUserConfig();

            // 步骤 4: 执行批量转换
            await progressUI.withProgress('批量转换 Markdown 到 Word', async (progress) => {
                progress.report({ message: '正在批量转换...' });
                
                const results = await converter.batchConvert(inputDir, outputDir, {
                    showProgress: true,
                    useConfig: userConfig,
                    keepHtml: config.get('keepHtml') || false,
                    onProgress: (message) => {
                        progress.report({ message });
                    }
                });

                // 步骤 5: 显示成功信息
                const successCount = Object.values(results).filter(Boolean).length;
                const totalCount = Object.keys(results).length;
                
                progress.report({ message: '批量转换完成！' });
                await progressUI.showSuccess(
                    `批量转换完成: 共 ${totalCount} 个文件, 成功 ${successCount} 个, 失败 ${totalCount - successCount} 个`,
                    outputDir
                );
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('批量转换失败:', errorMessage);
            await progressUI.showError(error instanceof Error ? error : new Error(String(error)));
        }
    });

    // 注册批量转换为HTML命令
    const batchConvertToHtmlCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.batchConvertToHtml', async (uri?: vscode.Uri) => {
        try {
            // 步骤 1: 确定输入目录
            if (!uri) {
                throw new Error('未选择目录。请在文件资源管理器中右键单击一个目录。');
            }

            const inputDir = uri.fsPath;
            const stats = await fs.stat(inputDir);
            if (!stats.isDirectory()) {
                throw new Error(`选择的路径不是目录: ${inputDir}`);
            }

            // 步骤 2: 确定输出目录
            const outputDir = await vscode.window.showInputBox({
                prompt: '请输入输出目录路径',
                value: inputDir,
                validateInput: async (value) => {
                    if (!value) {
                        return '输出目录不能为空';
                    }
                    try {
                        await fs.ensureDir(value);
                        return null;
                    } catch (error) {
                        return `无法创建目录: ${error instanceof Error ? error.message : String(error)}`;
                    }
                }
            });

            if (!outputDir) {
                return; // 用户取消了输入
            }

            // 步骤 3: 获取用户配置
            const userConfig = getUserConfig();
        
            // 步骤 4: 执行批量转换
            await progressUI.withProgress('批量转换 Markdown 到 HTML', async (progress) => {
                progress.report({ message: '正在批量转换...' });
                
                const results = await converter.batchConvertToHtml(inputDir, outputDir, {
                    showProgress: true,
                    useConfig: userConfig,
                    onProgress: (message) => {
                        progress.report({ message });
                    }
                });

                // 步骤 5: 显示成功信息
                const successCount = Object.values(results).filter(Boolean).length;
                const totalCount = Object.keys(results).length;
                
                progress.report({ message: '批量转换完成！' });
                await progressUI.showSuccess(
                    `批量转换完成: 共 ${totalCount} 个文件, 成功 ${successCount} 个, 失败 ${totalCount - successCount} 个`,
                    outputDir
                );
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('批量转换到HTML失败:', errorMessage);
            await progressUI.showError(error instanceof Error ? error : new Error(String(error)));
        }
    });

    // 注册编辑配置命令
    const editConfigCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.editConfig', async () => {
        try {
            await converter.editConfig();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('编辑配置失败:', errorMessage);
            vscode.window.showErrorMessage(`编辑配置失败: ${errorMessage}`);
        }
    });

    // 注册转换为Excel命令
    const convertToExcelCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.convertToExcel', async (uri?: vscode.Uri) => {
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

            // 步骤 2: 获取Excel转换配置
            const excelConfig = {
                // 可以根据VS Code配置设置Excel转换选项
                preserveFormatting: true,
                autoColumnWidth: true,
                freezeHeaders: true
            };

            // 步骤 3: 执行转换
            await progressUI.withProgress('Markdown 转 Excel', async (progress) => {
                progress.report({ message: '正在转换为Excel...' });
                
                const outputFile = inputFile.replace(/\.md$/i, '.xlsx');
                
                // 使用nodeexcel模块的便捷函数
                const result = await convertFile(inputFile, outputFile, excelConfig);

                // 步骤 4: 显示成功信息
                progress.report({ message: '转换完成！' });
                await progressUI.showSuccess('Markdown 文件已成功转换为 Excel 文档！', result.outputFile);
                
                // 尝试打开生成的文件
                try {
                    if (result.outputFile) {
                        const uri = vscode.Uri.file(result.outputFile);
                        await vscode.commands.executeCommand('vscode.open', uri);
                    }
                } catch (openError) {
                    console.error('无法打开生成的Excel文件:', openError);
                }
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('转换到Excel失败:', errorMessage);
            await progressUI.showError(error instanceof Error ? error : new Error(String(error)));
        }
    });

    // 注册批量转换为Excel命令
    const batchConvertToExcelCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.batchConvertToExcel', async (uri?: vscode.Uri) => {
        try {
            // 步骤 1: 确定输入目录
            if (!uri) {
                throw new Error('未选择目录。请在文件资源管理器中右键单击一个目录。');
            }

            const inputDir = uri.fsPath;
            const stats = await fs.stat(inputDir);
            if (!stats.isDirectory()) {
                throw new Error(`选择的路径不是目录: ${inputDir}`);
            }

            // 步骤 2: 确定输出目录
            const outputDir = await vscode.window.showInputBox({
                prompt: '请输入输出目录路径',
                value: inputDir,
                validateInput: async (value) => {
                    if (!value) {
                        return '输出目录不能为空';
                    }
                    try {
                        await fs.ensureDir(value);
                        return null;
                    } catch (error) {
                        return `无法创建目录: ${error instanceof Error ? error.message : String(error)}`;
                    }
                }
            });

            if (!outputDir) {
                return; // 用户取消了输入
            }

            // 步骤 3: 获取Excel转换配置
            const excelConfig = {
                preserveFormatting: true,
                autoColumnWidth: true,
                freezeHeaders: true,
                showProgress: true
            };

            // 步骤 4: 执行批量转换
            await progressUI.withProgress('批量转换 Markdown 到 Excel', async (progress) => {
                progress.report({ message: '正在扫描Markdown文件...' });
                
                // 构建输入模式
                const inputPattern = path.join(inputDir, '**/*.md');
                
                // 使用nodeexcel模块的批量转换功能
                const results = await convertBatch(inputPattern, outputDir, excelConfig);

                // 步骤 5: 显示成功信息
                const successCount = results.successful?.length || 0;
                const failedCount = results.failed?.length || 0;
                const totalCount = successCount + failedCount;
                
                progress.report({ message: '批量转换完成！' });
                
                if (totalCount === 0) {
                    await progressUI.showError(new Error('在指定目录中未找到Markdown文件'));
                    return;
                }
                
                await progressUI.showSuccess(
                    `批量转换完成: 共 ${totalCount} 个文件, 成功 ${successCount} 个, 失败 ${failedCount} 个`,
                    outputDir
                );
                
                // 如果有失败的文件，显示详细信息
                if (failedCount > 0 && results.failed) {
                    const failedFiles = results.failed.map((f: any) => `${f.file}: ${f.error}`).join('\n');
                    console.warn('转换失败的文件:\n', failedFiles);
                }
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('批量转换到Excel失败:', errorMessage);
            await progressUI.showError(error instanceof Error ? error : new Error(String(error)));
        }
    });

    // 注册Excel配置命令
    const configExcelCmd = vscode.commands.registerCommand('markdowntoword.markdown-to-word.configExcel', async () => {
        try {
            // 显示Excel配置选项
            const options = [
                { label: '$(gear) 打开配置工具', description: '在终端中启动交互式配置工具' },
                { label: '$(file-text) 查看当前配置', description: '显示当前Excel转换配置' },
                { label: '$(refresh) 重置为默认配置', description: '恢复Excel转换的默认设置' },
                { label: '$(folder-opened) 打开配置目录', description: '在文件管理器中打开配置文件目录' }
            ];

            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: '选择Excel配置操作',
                canPickMany: false
            });

            if (!selected) {
                return; // 用户取消了选择
            }

            switch (selected.label) {
                case '$(gear) 打开配置工具':
                    // 启动Excel配置工具
                    const terminal = vscode.window.createTerminal({
                        name: 'Excel配置工具',
                        cwd: path.join(context.extensionPath, 'nodeexcel')
                    });
                    
                    terminal.show();
                    terminal.sendText('node bin/config.js');
                    
                    vscode.window.showInformationMessage('Excel配置工具已在终端中启动');
                    break;

                case '$(file-text) 查看当前配置':
                    // 显示当前配置
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
                        const doc = await vscode.workspace.openTextDocument({
                            content: configText,
                            language: 'json'
                        });
                        await vscode.window.showTextDocument(doc);
                    } catch (error) {
                        vscode.window.showErrorMessage('无法获取配置信息');
                    }
                    break;

                case '$(refresh) 重置为默认配置':
                    // 重置配置
                    const confirm = await vscode.window.showWarningMessage(
                        '确定要重置Excel转换配置为默认设置吗？',
                        { modal: true },
                        '确定',
                        '取消'
                    );
                    
                    if (confirm === '确定') {
                        try {
                            const configPath = path.join(context.extensionPath, 'nodeexcel', 'config', 'excel-config.json');
                            await ExcelModule.createDefaultConfigFile(configPath);
                            vscode.window.showInformationMessage('Excel配置已重置为默认设置');
                        } catch (error) {
                            vscode.window.showErrorMessage('重置配置失败');
                        }
                    }
                    break;

                case '$(folder-opened) 打开配置目录':
                    // 打开配置目录
                    const configDir = path.join(context.extensionPath, 'nodeexcel', 'config');
                    await fs.ensureDir(configDir);
                    const uri = vscode.Uri.file(configDir);
                    await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false });
                    break;
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Excel配置操作失败:', errorMessage);
            vscode.window.showErrorMessage(`Excel配置操作失败: ${errorMessage}`);
        }
    });

    // 注册所有命令
    context.subscriptions.push(
        disposable,
        directConvertCmd,
        convertToHtmlCmd,
        batchConvertToWordCmd,
        batchConvertToHtmlCmd,
        editConfigCmd,
        convertToExcelCmd,
        batchConvertToExcelCmd,
        configExcelCmd
    );

    console.log('插件 "Markdown to Word Converter" 已激活');
}

/**
 * @description 插件停用时的清理工作
 */
export function deactivate(): void {
    console.log('插件 "Markdown to Word Converter" 已停用');
}