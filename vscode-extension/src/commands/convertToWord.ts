/**
 * @fileoverview Markdown转Word命令处理器
 * @description 处理Markdown转Word的命令逻辑
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationUI, IDocumentConversionConfig } from '../configurationUI';
import { EnvironmentManager } from '../environmentManager';
import { PythonRunner } from '../utils/pythonRunner';

/**
 * 转换命令处理器
 */
export class ConvertToWordCommand {
    private static instance: ConvertToWordCommand;
    private configUI: ConfigurationUI;
    private envManager: EnvironmentManager;
    private pythonRunner: PythonRunner;
    private context: vscode.ExtensionContext;
    
    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.configUI = ConfigurationUI.getInstance();
        this.envManager = EnvironmentManager.getInstance();
        this.pythonRunner = new PythonRunner(this.envManager);
    }
    
    /**
     * 获取命令处理器实例
     */
    public static getInstance(context: vscode.ExtensionContext): ConvertToWordCommand {
        if (!ConvertToWordCommand.instance) {
            ConvertToWordCommand.instance = new ConvertToWordCommand(context);
        }
        return ConvertToWordCommand.instance;
    }
    
    /**
     * 执行转换命令
     */
    public async execute(): Promise<void> {
        try {
            // 检查环境
            await this.envManager.initialize(this.context);
            
            // 显示配置界面
            const config = await this.configUI.showConfigurationUI();
            if (!config) {
                return; // 用户取消了配置
            }
            
            // 开始转换
            await this.startConversion(config);
            
        } catch (error) {
            vscode.window.showErrorMessage(`转换失败: ${error}`);
        }
    }
    
    /**
     * 开始转换过程
     */
    private async startConversion(config: IDocumentConversionConfig): Promise<void> {
        // 显示进度
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "正在转换文档",
            cancellable: false
        }, async (progress) => {
            try {
                // 更新进度
                progress.report({ message: "准备转换..." });
                
                // 验证输入文件
                if (!await this.validateInputFile(config.inputFile)) {
                    throw new Error('输入文件无效');
                }
                
                // 确保输出目录存在
                await this.ensureOutputDirectory(config.outputDirectory);
                
                // 执行转换
                progress.report({ message: "正在转换..." });
                await this.convert(config);
                
                // 完成
                vscode.window.showInformationMessage(
                    `转换完成！文件已保存至: ${config.outputDirectory}/${config.outputFileName}`
                );
                
            } catch (error) {
                vscode.window.showErrorMessage(`转换过程出错: ${error}`);
            }
        });
    }
    
    /**
     * 验证输入文件
     */
    private async validateInputFile(filePath: string): Promise<boolean> {
        try {
            const stat = await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
            return stat.type === vscode.FileType.File;
        } catch {
            return false;
        }
    }
    
    /**
     * 确保输出目录存在
     */
    private async ensureOutputDirectory(dirPath: string): Promise<void> {
        try {
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
        } catch (error) {
            throw new Error(`无法创建输出目录: ${error}`);
        }
    }
    
    /**
     * 执行文档转换
     */
    private async convert(config: IDocumentConversionConfig): Promise<void> {
        // 获取转换脚本路径
        const scriptPath = path.join(this.context.extensionPath, 'scripts', 'convert.py');
        
        // 准备配置文件
        const configPath = await this.prepareConfigFile(config);
        
        // 构建脚本参数
        const args = [
            '--input', config.inputFile,
            '--output', path.join(config.outputDirectory, config.outputFileName),
            '--config', configPath
        ];
        
        // 执行转换
        const result = await this.pythonRunner.runScript(
            scriptPath,
            args,
            {
                cwd: path.dirname(config.inputFile),
                timeout: 30000 // 30秒超时
            }
        );
        
        // 检查结果
        if (!result.success) {
            throw new Error(`转换失败:\n${result.stderr}`);
        }
        
        // 清理临时文件
        await this.cleanupConfigFile(configPath);
    }
    
    /**
     * 准备配置文件
     */
    private async prepareConfigFile(config: IDocumentConversionConfig): Promise<string> {
        const configData = {
            format: {
                page_size: config.formatOptions.pageSize,
                orientation: config.formatOptions.orientation,
                margins: config.formatOptions.margins
            },
            style: {
                font_family: config.styleOptions.fontFamily,
                font_size: config.styleOptions.fontSize,
                line_spacing: config.styleOptions.lineSpacing,
                custom_style: config.styleOptions.enableCustomStyles ? config.styleOptions.customStylePath : null
            },
            toc: {
                include: config.tocOptions.includeToc,
                depth: config.tocOptions.tocDepth,
                title: config.tocOptions.tocTitle
            },
            advanced: {
                preserve_images: config.advancedOptions.preserveImages,
                image_max_width: config.advancedOptions.imageMaxWidth,
                preserve_links: config.advancedOptions.preserveLinks,
                preserve_footnotes: config.advancedOptions.preserveFootnotes
            }
        };
        
        // 创建临时配置文件
        const tempPath = path.join(this.context.globalStoragePath, `config_${Date.now()}.json`);
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(tempPath),
            Buffer.from(JSON.stringify(configData, null, 2))
        );
        
        return tempPath;
    }
    
    /**
     * 清理配置文件
     */
    private async cleanupConfigFile(configPath: string): Promise<void> {
        try {
            await vscode.workspace.fs.delete(vscode.Uri.file(configPath));
        } catch (error) {
            console.error('清理配置文件失败:', error);
        }
    }
} 