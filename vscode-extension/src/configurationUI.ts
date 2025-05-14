/**
 * @fileoverview 配置界面管理器
 * @description 提供用户友好的配置界面，用于设置文档转换参数
 */

import * as vscode from 'vscode';
import * as path from 'path';

/**
 * 文档转换配置接口
 */
export interface IDocumentConversionConfig {
    // 输入文件配置
    inputFile: string;
    
    // 输出配置
    outputDirectory: string;
    outputFileName: string;
    
    // 格式化选项
    formatOptions: {
        pageSize: 'A4' | 'Letter' | 'Legal';
        orientation: 'portrait' | 'landscape';
        margins: {
            top: number;
            bottom: number;
            left: number;
            right: number;
        };
    };
    
    // 样式选项
    styleOptions: {
        fontFamily: string;
        fontSize: number;
        lineSpacing: number;
        enableCustomStyles: boolean;
        customStylePath?: string;
    };
    
    // 目录选项
    tocOptions: {
        includeToc: boolean;
        tocDepth: number;
        tocTitle: string;
    };
    
    // 高级选项
    advancedOptions: {
        preserveImages: boolean;
        imageMaxWidth?: number;
        preserveLinks: boolean;
        preserveFootnotes: boolean;
    };
}

export class ConfigurationUI {
    private static instance: ConfigurationUI;
    private currentConfig: IDocumentConversionConfig | undefined;
    
    // 私有构造函数，用于单例模式实现
    private constructor() {
        // 单例模式，无需初始化操作
    }
    
    /**
     * 获取ConfigurationUI实例
     */
    public static getInstance(): ConfigurationUI {
        if (!ConfigurationUI.instance) {
            ConfigurationUI.instance = new ConfigurationUI();
        }
        return ConfigurationUI.instance;
    }
    
    /**
     * 显示配置界面
     * @returns {Promise<IDocumentConversionConfig | undefined>} 用户配置
     */
    public async showConfigurationUI(): Promise<IDocumentConversionConfig | undefined> {
        // 获取当前打开的文档
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('请先打开一个Markdown文件');
            return undefined;
        }
        
        // 初始化默认配置
        const defaultConfig = this.getDefaultConfig(activeEditor.document.uri);
        
        try {
            // 显示配置步骤
            const config = await this.showConfigurationSteps(defaultConfig);
            if (config) {
                this.currentConfig = config;
                return config;
            }
        } catch (error: unknown) {
            vscode.window.showErrorMessage(`配置过程出错: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        return undefined;
    }
    
    /**
     * 获取默认配置
     */
    private getDefaultConfig(inputFileUri: vscode.Uri): IDocumentConversionConfig {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(inputFileUri);
        const outputDirectory = workspaceFolder ? workspaceFolder.uri.fsPath : path.dirname(inputFileUri.fsPath);
        
        return {
            inputFile: inputFileUri.fsPath,
            outputDirectory,
            outputFileName: path.basename(inputFileUri.fsPath, '.md') + '.docx',
            formatOptions: {
                pageSize: 'A4',
                orientation: 'portrait',
                margins: {
                    top: 2.54,
                    bottom: 2.54,
                    left: 3.18,
                    right: 3.18
                }
            },
            styleOptions: {
                fontFamily: '微软雅黑',
                fontSize: 12,
                lineSpacing: 1.5,
                enableCustomStyles: false
            },
            tocOptions: {
                includeToc: true,
                tocDepth: 3,
                tocTitle: '目录'
            },
            advancedOptions: {
                preserveImages: true,
                imageMaxWidth: 800,
                preserveLinks: true,
                preserveFootnotes: true
            }
        };
    }
    
    /**
     * 显示配置步骤
     */
    private async showConfigurationSteps(defaultConfig: IDocumentConversionConfig): Promise<IDocumentConversionConfig | undefined> {
        // 步骤1: 基本设置
        const outputDirectory = await vscode.window.showInputBox({
            prompt: '请输入输出目录路径',
            value: defaultConfig.outputDirectory,
            validateInput: (value) => {
                return value ? undefined : '输出目录不能为空';
            }
        });
        
        if (!outputDirectory) return undefined;
        
        const outputFileName = await vscode.window.showInputBox({
            prompt: '请输入输出文件名',
            value: defaultConfig.outputFileName,
            validateInput: (value) => {
                return value ? undefined : '文件名不能为空';
            }
        });
        
        if (!outputFileName) return undefined;
        
        // 步骤2: 页面格式
        const pageSize = await vscode.window.showQuickPick(
            ['A4', 'Letter', 'Legal'],
            {
                placeHolder: '选择页面大小',
                canPickMany: false
            }
        ) as 'A4' | 'Letter' | 'Legal';
        
        if (!pageSize) return undefined;
        
        const orientation = await vscode.window.showQuickPick(
            ['portrait', 'landscape'],
            {
                placeHolder: '选择页面方向',
                canPickMany: false
            }
        ) as 'portrait' | 'landscape';
        
        if (!orientation) return undefined;
        
        // 步骤3: 样式设置
        const fontFamily = await vscode.window.showQuickPick(
            ['微软雅黑', '宋体', '黑体', 'Times New Roman', 'Arial'],
            {
                placeHolder: '选择字体',
                canPickMany: false
            }
        );
        
        if (!fontFamily) return undefined;
        
        const fontSize = await vscode.window.showQuickPick(
            ['10', '11', '12', '14', '16', '18'],
            {
                placeHolder: '选择字号',
                canPickMany: false
            }
        );
        
        if (!fontSize) return undefined;
        
        // 步骤4: 目录设置
        const includeToc = await vscode.window.showQuickPick(
            ['是', '否'],
            {
                placeHolder: '是否包含目录',
                canPickMany: false
            }
        );
        
        if (!includeToc) return undefined;
        
        const tocDepth = includeToc === '是' ? await vscode.window.showQuickPick(
            ['1', '2', '3', '4', '5'],
            {
                placeHolder: '选择目录深度',
                canPickMany: false
            }
        ) : '3';
        
        if (!tocDepth) return undefined;
        
        // 返回配置
        return {
            ...defaultConfig,
            outputDirectory,
            outputFileName,
            formatOptions: {
                ...defaultConfig.formatOptions,
                pageSize,
                orientation
            },
            styleOptions: {
                ...defaultConfig.styleOptions,
                fontFamily,
                fontSize: parseInt(fontSize)
            },
            tocOptions: {
                ...defaultConfig.tocOptions,
                includeToc: includeToc === '是',
                tocDepth: parseInt(tocDepth)
            }
        };
    }
    
    /**
     * 获取当前配置
     */
    public getCurrentConfig(): IDocumentConversionConfig | undefined {
        return this.currentConfig;
    }
} 