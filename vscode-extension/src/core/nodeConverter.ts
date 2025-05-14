/**
 * @description 基于Node.js的转换器，替代Python实现
 */
import * as path from 'path';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import * as os from 'os';
import { IDocumentConfig } from '../ui/configPanel';

// 导入 Node.js 模块
// 注意：这里使用相对路径导入，假设nodejs目录位于扩展根目录下
const NodeJsConverter = require('../../nodejs/src/converter');
const ConfigManager = require('../../nodejs/src/utils/configManager');
const ConfigUI = require('../../nodejs/src/utils/configUI');

// 定义配置文件路径
const CONFIG_FILE_PATH = path.join(os.tmpdir(), 'markdown-to-word', 'user-config.yaml');

/**
 * @description 转换选项接口
 */
export interface IConversionOptions {
    showProgress?: boolean;
    outputDirectory?: string;
    useConfig?: IDocumentConfig; // 添加用户配置支持
    keepHtml?: boolean; // 是否保留HTML文件
    onProgress?: (message: string) => void;
    onComplete?: (result: IConversionResult) => void;
}

/**
 * @description 转换结果接口
 */
export interface IConversionResult {
    success: boolean;
    message: string;
    outputFile?: string;
    error?: Error;
}

/**
 * @description Node.js版Markdown转换器类
 */
export class NodeMarkdownConverter {
    private static instance: NodeMarkdownConverter;
    private nodeConverter: any;
    private configManager: any;
    
    private constructor() {
        // 确保临时目录存在
        const tempDir = path.dirname(CONFIG_FILE_PATH);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // 创建配置管理器
        this.configManager = new ConfigManager();
        
        // 尝试从配置文件加载配置
        if (fs.existsSync(CONFIG_FILE_PATH)) {
            try {
                this.configManager.loadFromYaml(CONFIG_FILE_PATH);
                console.log('从文件加载配置成功:', CONFIG_FILE_PATH);
            } catch (error) {
                console.error('加载配置文件失败:', error);
            }
        } else {
            // 如果配置文件不存在，尝试从VS Code设置加载
            const vscodeConfig = vscode.workspace.getConfiguration('markdown-to-word');
            const userConfig = vscodeConfig.get('markdownToWordUserConfig');
            
            if (userConfig && typeof userConfig === 'object') {
                this.configManager.config = userConfig;
                // 保存到配置文件
                this.configManager.saveToYaml(CONFIG_FILE_PATH)
                    .then(() => console.log('配置已保存到文件:', CONFIG_FILE_PATH))
                    .catch((err: Error) => console.error('保存配置文件失败:', err));
                console.log('从VS Code设置加载配置成功');
            } else {
                console.log('未找到现有配置，使用默认配置');
            }
        }
        
        // 创建Node.js转换器实例，传入配置
        this.nodeConverter = new NodeJsConverter(this.configManager.getAll());
    }
    
    /**
     * @description 获取单例实例
     */
    static getInstance(): NodeMarkdownConverter {
        if (!NodeMarkdownConverter.instance) {
            NodeMarkdownConverter.instance = new NodeMarkdownConverter();
        }
        return NodeMarkdownConverter.instance;
    }
    
    /**
     * @method convert
     * @description 转换Markdown文件为Word文档
     * @param {string} inputFile 输入文件路径
     * @param {IConversionOptions} options 转换选项
     */
    async convert(inputFile: string, options: IConversionOptions = {}): Promise<IConversionResult> {
        try {
            // 准备输出目录和文件
            const outputDir = options.outputDirectory || path.dirname(inputFile);
            const inputBaseName = path.basename(inputFile, '.md');
            const outputFile = path.join(outputDir, `${inputBaseName}.docx`);
            
            // 确保输出目录存在
            await fs.ensureDir(outputDir);
            
            // 如果有配置选项，更新配置
            if (options.useConfig) {
                console.log('转换时提供了配置:', JSON.stringify({
                    document: options.useConfig.document,
                    fonts: options.useConfig.fonts,
                    sizes: options.useConfig.sizes,
                    chinese: options.useConfig.chinese
                }, null, 2));
                
                const nodeConfig = this.convertConfig(options.useConfig);
                
                console.log('转换后的Node配置:', JSON.stringify({
                    document: nodeConfig.document,
                    fonts: nodeConfig.fonts,
                    sizes: nodeConfig.sizes,
                    chinese: nodeConfig.chinese
                }, null, 2));
                
                this.configManager.config = nodeConfig;
                this.nodeConverter = new NodeJsConverter(nodeConfig);
                
                // 保存配置到文件
                await this.configManager.saveToYaml(CONFIG_FILE_PATH);
                console.log('更新配置并保存到文件:', CONFIG_FILE_PATH);
                
                // 同步更新VS Code设置
                await this.updateVSCodeConfig(nodeConfig);
            } else {
                console.log('未提供配置，使用默认配置');
            }
            
            // 进度报告
            if (options.onProgress) {
                options.onProgress('正在执行转换...');
            }
            
            // 执行转换
            console.log(`开始转换 ${inputFile} 到 ${outputFile}`);
            const result = await this.nodeConverter.convert_file(
                inputFile, 
                outputFile, 
                options.keepHtml || false
            );
            
            if (result.success) {
                const message = `成功将 ${inputBaseName}.md 转换为 ${path.basename(outputFile)}`;
                console.log(message);
                
                if (options.onComplete) {
                    options.onComplete({
                        success: true,
                        message,
                        outputFile: result.outputFile
                    });
                }
                
                return {
                    success: true,
                    message,
                    outputFile: result.outputFile
                };
            } else {
                throw new Error(result.message || '转换失败，未知错误');
            }
        } catch (error) {
            console.error('转换失败:', error);
            
            const message = error instanceof Error ? error.message : String(error);
            
            if (options.onComplete) {
                options.onComplete({
                    success: false,
                    message: `转换失败: ${message}`,
                    error: error instanceof Error ? error : new Error(String(error))
                });
            }
            
            throw error;
        }
    }
    
    /**
     * @description 批量转换Markdown文件为Word文档
     * @param inputDir 输入目录路径
     * @param outputDir 输出目录路径
     * @param options 转换选项
     */
    async batchConvert(inputDir: string, outputDir: string, options: IConversionOptions = {}): Promise<Record<string, boolean>> {
        try {
            // 确保输出目录存在
            await fs.ensureDir(outputDir);
            
            // 如果有配置选项，转换为Node.js模块可用的配置
            if (options.useConfig) {
                const nodeConfig = this.convertConfig(options.useConfig);
                this.nodeConverter = new NodeJsConverter(nodeConfig);
            }
            
            // 进度报告
            if (options.onProgress) {
                options.onProgress('正在批量转换...');
            }
            
            // 执行批量转换
            const results = await this.nodeConverter.batch_convert(
                inputDir, 
                outputDir, 
                options.keepHtml || false
            );
            
            return results;
        } catch (error) {
            console.error('批量转换失败:', error);
            throw error;
        }
    }
    
    /**
     * @description 转换Markdown到HTML
     * @param inputFile 输入文件路径
     * @param options 转换选项
     */
    async convertToHtml(inputFile: string, options: IConversionOptions = {}): Promise<IConversionResult> {
        try {
            // 准备输出目录和文件
            const outputDir = options.outputDirectory || path.dirname(inputFile);
            const inputBaseName = path.basename(inputFile, '.md');
            const outputFile = path.join(outputDir, `${inputBaseName}.html`);
            
            // 确保输出目录存在
            await fs.ensureDir(outputDir);
            
            // 如果有配置选项，转换为Node.js模块可用的配置
            if (options.useConfig) {
                const nodeConfig = this.convertConfig(options.useConfig);
                this.nodeConverter = new NodeJsConverter(nodeConfig);
            }
            
            // 进度报告
            if (options.onProgress) {
                options.onProgress('正在转换为HTML...');
            }
            
            // 执行转换
            const htmlContent = await this.nodeConverter.md_to_html.convertFile(inputFile, outputFile);
            
            if (htmlContent) {
                const message = `成功将 ${inputBaseName}.md 转换为 ${path.basename(outputFile)}`;
                
                if (options.onComplete) {
                    options.onComplete({
                        success: true,
                        message,
                        outputFile
                    });
                }
                
                return {
                    success: true,
                    message,
                    outputFile
                };
            } else {
                throw new Error('转换失败，未能生成HTML内容');
            }
        } catch (error) {
            console.error('转换到HTML失败:', error);
            
            const message = error instanceof Error ? error.message : String(error);
            
            if (options.onComplete) {
                options.onComplete({
                    success: false,
                    message: `转换到HTML失败: ${message}`,
                    error: error instanceof Error ? error : new Error(String(error))
                });
            }
            
            throw error;
        }
    }
    
    /**
     * @description 批量转换Markdown到HTML
     * @param inputDir 输入目录路径
     * @param outputDir 输出目录路径
     * @param options 转换选项
     */
    async batchConvertToHtml(inputDir: string, outputDir: string, options: IConversionOptions = {}): Promise<Record<string, boolean>> {
        try {
            // 确保输出目录存在
            await fs.ensureDir(outputDir);
            
            // 如果有配置选项，转换为Node.js模块可用的配置
            if (options.useConfig) {
                const nodeConfig = this.convertConfig(options.useConfig);
                this.nodeConverter = new NodeJsConverter(nodeConfig);
            }
            
            // 进度报告
            if (options.onProgress) {
                options.onProgress('正在批量转换为HTML...');
            }
            
            // 使用glob查找所有Markdown文件
            const glob = require('glob');
            const files = glob.sync(path.join(inputDir, '**', '*.md'));
            const results: Record<string, boolean> = {};
            
            for (const file of files) {
                try {
                    // 计算相对路径，用于构建输出路径
                    const relPath = path.relative(inputDir, file);
                    const baseName = path.basename(relPath, '.md');
                    const dirName = path.dirname(relPath);
                    
                    // 构建输出文件路径
                    const outputFile = path.join(outputDir, dirName, `${baseName}.html`);
                    
                    // 确保输出目录存在
                    await fs.ensureDir(path.dirname(outputFile));
                    
                    // 执行转换
                    const htmlContent = await this.nodeConverter.md_to_html.convertFile(file, outputFile);
                    results[relPath] = !!htmlContent;
                } catch (error) {
                    console.error(`转换文件 ${file} 失败:`, error);
                    results[path.relative(inputDir, file)] = false;
                }
            }
            
            return results;
        } catch (error) {
            console.error('批量转换到HTML失败:', error);
            throw error;
        }
    }
    
    /**
     * @description 编辑配置文件
     */
    async editConfig(): Promise<void> {
        try {
            // 获取VS Code配置
            const config = vscode.workspace.getConfiguration('markdown-to-word');
            
            // 转换为Node.js模块可用的配置
            const nodeConfig = this.getNodeConfigFromVSCode(config);
            
            // 更新配置
            this.configManager.config = nodeConfig;
            
            // 保存配置到文件
            await this.configManager.saveToYaml(CONFIG_FILE_PATH);
            console.log('配置已保存到文件:', CONFIG_FILE_PATH);
            
            // 创建配置界面实例
            const configUI = new ConfigUI();
            
            // 启动配置界面
            await configUI.start(CONFIG_FILE_PATH);
            
            // 读取更新后的配置
            await this.configManager.loadFromYaml(CONFIG_FILE_PATH);
            const updatedConfig = this.configManager.getAll();
            
            // 更新VS Code配置
            await this.updateVSCodeConfig(updatedConfig);
            
            // 更新转换器配置
            this.nodeConverter = new NodeJsConverter(updatedConfig);
            
            vscode.window.showInformationMessage('配置已更新');
        } catch (error) {
            console.error('编辑配置失败:', error);
            vscode.window.showErrorMessage(`编辑配置失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * @description 获取配置文件路径
     * @returns 配置文件路径
     */
    getConfigFilePath(): string {
        return CONFIG_FILE_PATH;
    }
    
    /**
     * @description 加载配置
     * @param configPath 配置文件路径，如果不提供则使用默认路径
     */
    async loadConfig(configPath?: string): Promise<boolean> {
        try {
            const pathToLoad = configPath || CONFIG_FILE_PATH;
            if (!fs.existsSync(pathToLoad)) {
                console.log('配置文件不存在:', pathToLoad);
                return false;
            }
            
            const success = await this.configManager.loadFromYaml(pathToLoad);
            if (success) {
                // 更新转换器配置
                this.nodeConverter = new NodeJsConverter(this.configManager.getAll());
                console.log('成功加载配置文件:', pathToLoad);
                return true;
            }
            return false;
        } catch (error) {
            console.error('加载配置失败:', error);
            return false;
        }
    }
    
    /**
     * @description 保存配置
     * @param config 配置对象
     * @param configPath 配置文件路径，如果不提供则使用默认路径
     */
    async saveConfig(config: any, configPath?: string): Promise<boolean> {
        try {
            // 更新内部配置
            this.configManager.config = config;
            
            // 保存到文件
            const pathToSave = configPath || CONFIG_FILE_PATH;
            await this.configManager.saveToYaml(pathToSave);
            console.log('配置已保存到文件:', pathToSave);
            
            // 更新VS Code设置
            await this.updateVSCodeConfig(config);
            
            // 更新转换器
            this.nodeConverter = new NodeJsConverter(config);
            
            return true;
        } catch (error) {
            console.error('保存配置失败:', error);
            return false;
        }
    }
    
    /**
     * @description 将VS Code配置转换为Node.js模块可用的配置
     * @param vsConfig VS Code配置
     */
    private getNodeConfigFromVSCode(vsConfig: vscode.WorkspaceConfiguration): any {
        // 首先尝试获取完整的用户配置
        const userConfig = vsConfig.get('markdownToWordUserConfig');
        if (userConfig && typeof userConfig === 'object') {
            console.log('使用完整的用户配置');
            return userConfig;
        }
        
        // 如果没有完整配置，则使用单独的配置项构建
        console.log('使用单独的配置项构建配置');
        return {
            fonts: {
                default: vsConfig.get('defaultFontFamily') || '微软雅黑',
                code: 'Courier New',
                headings: vsConfig.get('defaultFontFamily') || '微软雅黑'
            },
            sizes: {
                default: vsConfig.get('defaultFontSize') || 12,
                code: (vsConfig.get('defaultFontSize') as number || 12) - 2,
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
                line_spacing: vsConfig.get('defaultLineSpacing') || 1.5,
                space_before: 0,
                space_after: 6,
                first_line_indent: 0
            },
            document: {
                page_size: vsConfig.get('defaultPageSize') || 'A4',
                orientation: vsConfig.get('defaultOrientation') || 'portrait',
                margin_top: 2.54,
                margin_bottom: 2.54,
                margin_left: 3.18,
                margin_right: 3.18,
                generate_toc: vsConfig.get('includeToc') || false,
                toc_depth: vsConfig.get('tocDepth') || 3
            },
            images: {
                preserve: vsConfig.get('preserveImages') || true,
                max_width: vsConfig.get('imageMaxWidth') || 800
            },
            output: {
                keepHtml: vsConfig.get('keepHtml') || false
            }
        };
    }
    
    /**
     * @description 将IDocumentConfig转换为Node.js模块可用的配置
     * @param config 用户配置
     */
    private convertConfig(config: IDocumentConfig): any {
        // 输出调试信息，帮助排查问题
        console.log('转换配置:', JSON.stringify(config, null, 2));
        
        // 构建基本配置结构
        const convertedConfig: any = {
            fonts: {
                default: config.fonts?.default || '微软雅黑',
                code: config.fonts?.code || 'Courier New',
                headings: config.fonts?.headings || '微软雅黑'
            },
            sizes: {
                default: config.sizes?.default || 12,
                code: config.sizes?.code || 10,
                heading1: config.sizes?.heading1 || 18,
                heading2: config.sizes?.heading2 || 16,
                heading3: config.sizes?.heading3 || 14,
                heading4: config.sizes?.heading4 || 12,
                heading5: config.sizes?.heading5 || 12,
                heading6: config.sizes?.heading6 || 12
            },
            colors: {
                default: config.colors?.default || '#000000',
                headings: config.colors?.headings || '#000000',
                code: config.colors?.code || '#333333',
                link: config.colors?.link || '#0563C1'
            },
            paragraph: {
                line_spacing: config.paragraph?.line_spacing || 1.5,
                space_before: config.paragraph?.space_before || 0,
                space_after: config.paragraph?.space_after || 6,
                first_line_indent: config.paragraph?.first_line_indent || 0
            },
            document: {
                page_size: config.document?.page_size || 'A4',
                orientation: 'portrait',  // 默认值
                margin_top: config.document?.margin_top || 2.54,
                margin_bottom: config.document?.margin_bottom || 2.54,
                margin_left: config.document?.margin_left || 3.18,
                margin_right: config.document?.margin_right || 3.18,
                generate_toc: config.document?.generate_toc || false,
                toc_depth: 3  // 默认值
            },
            images: {
                preserve: true,  // 默认值
                max_width: 800   // 默认值
            },
            chinese: {
                // 确保繁体转换配置正确传递
                convert_to_traditional: config.chinese?.convert_to_traditional || false,
                punctuation_spacing: config.chinese?.punctuation_spacing || true,
                auto_spacing: config.chinese?.auto_spacing || true
            }
        };
        
        // 添加其他可选配置
        if (config.table_styles) {
            convertedConfig.table_styles = config.table_styles;
        }
        
        if (config.enhanced_table_styles) {
            convertedConfig.enhanced_table_styles = config.enhanced_table_styles;
        }
        
        if (config.markdown) {
            convertedConfig.markdown = config.markdown;
        }
        
        if (config.output) {
            convertedConfig.output = config.output;
        }
        
        if (config.debug) {
            convertedConfig.debug = config.debug;
        }
        
        console.log('转换后的配置:', JSON.stringify(convertedConfig, null, 2));
        return convertedConfig;
    }
    
    /**
     * @description 更新VS Code配置
     * @param nodeConfig Node.js模块配置
     */
    private async updateVSCodeConfig(nodeConfig: any): Promise<void> {
        const config = vscode.workspace.getConfiguration('markdown-to-word');
        
        try {
            // 更新字体设置
            if (nodeConfig.fonts?.default) {
                await config.update('defaultFontFamily', nodeConfig.fonts.default, vscode.ConfigurationTarget.Global);
            }
            
            // 更新字号设置
            if (nodeConfig.sizes?.default) {
                await config.update('defaultFontSize', nodeConfig.sizes.default, vscode.ConfigurationTarget.Global);
            }
            
            // 更新行间距
            if (nodeConfig.paragraph?.line_spacing) {
                await config.update('defaultLineSpacing', nodeConfig.paragraph.line_spacing, vscode.ConfigurationTarget.Global);
            }
            
            // 更新页面大小
            if (nodeConfig.document?.page_size) {
                await config.update('defaultPageSize', nodeConfig.document.page_size, vscode.ConfigurationTarget.Global);
            }
            
            // 更新页面方向
            if (nodeConfig.document?.orientation) {
                await config.update('defaultOrientation', nodeConfig.document.orientation, vscode.ConfigurationTarget.Global);
            }
            
            // 更新目录设置
            if (nodeConfig.document?.generate_toc !== undefined) {
                await config.update('includeToc', nodeConfig.document.generate_toc, vscode.ConfigurationTarget.Global);
            }
            
            // 更新目录深度
            if (nodeConfig.document?.toc_depth) {
                await config.update('tocDepth', nodeConfig.document.toc_depth, vscode.ConfigurationTarget.Global);
            }
            
            // 更新图片设置
            if (nodeConfig.images?.preserve !== undefined) {
                await config.update('preserveImages', nodeConfig.images.preserve, vscode.ConfigurationTarget.Global);
            }
            
            // 更新图片最大宽度
            if (nodeConfig.images?.max_width) {
                await config.update('imageMaxWidth', nodeConfig.images.max_width, vscode.ConfigurationTarget.Global);
            }
            
            // 保存完整配置到用户配置
            await config.update('markdownToWordUserConfig', nodeConfig, vscode.ConfigurationTarget.Global);
        } catch (error) {
            console.error('更新VS Code配置失败:', error);
            throw error;
        }
    }
} 