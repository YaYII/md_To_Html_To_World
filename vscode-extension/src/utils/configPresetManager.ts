/**
 * @fileoverview 配置预设管理器
 * @description 管理文档转换配置的预设
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { IDocumentConversionConfig } from '../configurationUI';

/**
 * 配置预设接口
 */
export interface IConfigPreset {
    /** 预设名称 */
    name: string;
    /** 预设描述 */
    description: string;
    /** 预设配置 */
    config: IDocumentConversionConfig;
}

/**
 * 配置预设管理器类
 */
export class ConfigPresetManager {
    private static instance: ConfigPresetManager;
    private context: vscode.ExtensionContext;
    private presets: Map<string, IConfigPreset>;
    private readonly PRESETS_FILE = 'config_presets.json';
    
    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.presets = new Map();
        this.loadPresets();
    }
    
    /**
     * 获取配置预设管理器实例
     */
    public static getInstance(context: vscode.ExtensionContext): ConfigPresetManager {
        if (!ConfigPresetManager.instance) {
            ConfigPresetManager.instance = new ConfigPresetManager(context);
        }
        return ConfigPresetManager.instance;
    }
    
    /**
     * 加载预设
     */
    private loadPresets(): void {
        try {
            const presetsPath = path.join(this.context.globalStoragePath, this.PRESETS_FILE);
            if (fs.existsSync(presetsPath)) {
                const data = fs.readFileSync(presetsPath, 'utf8');
                const presets = JSON.parse(data) as IConfigPreset[];
                presets.forEach(preset => {
                    this.presets.set(preset.name, preset);
                });
            } else {
                // 创建默认预设
                this.createDefaultPresets();
            }
        } catch (error) {
            console.error('加载预设失败:', error);
        }
    }
    
    /**
     * 创建默认预设
     */
    private createDefaultPresets(): void {
        const defaultPresets: IConfigPreset[] = [
            {
                name: '标准文档',
                description: '标准A4文档格式',
                config: {
                    inputFile: '',
                    outputDirectory: '',
                    outputFileName: '',
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
                }
            },
            {
                name: '演示文稿',
                description: '适合演示的横向格式',
                config: {
                    inputFile: '',
                    outputDirectory: '',
                    outputFileName: '',
                    formatOptions: {
                        pageSize: 'A4',
                        orientation: 'landscape',
                        margins: {
                            top: 1.91,
                            bottom: 1.91,
                            left: 2.54,
                            right: 2.54
                        }
                    },
                    styleOptions: {
                        fontFamily: '微软雅黑',
                        fontSize: 14,
                        lineSpacing: 1.5,
                        enableCustomStyles: false
                    },
                    tocOptions: {
                        includeToc: false,
                        tocDepth: 2,
                        tocTitle: '目录'
                    },
                    advancedOptions: {
                        preserveImages: true,
                        imageMaxWidth: 1024,
                        preserveLinks: true,
                        preserveFootnotes: false
                    }
                }
            }
        ];
        
        defaultPresets.forEach(preset => {
            this.presets.set(preset.name, preset);
        });
        
        this.savePresets();
    }
    
    /**
     * 保存预设
     */
    private savePresets(): void {
        try {
            const presetsPath = path.join(this.context.globalStoragePath, this.PRESETS_FILE);
            const data = JSON.stringify(Array.from(this.presets.values()), null, 2);
            fs.writeFileSync(presetsPath, data, 'utf8');
        } catch (error) {
            console.error('保存预设失败:', error);
        }
    }
    
    /**
     * 获取所有预设
     */
    public getAllPresets(): IConfigPreset[] {
        return Array.from(this.presets.values());
    }
    
    /**
     * 获取预设
     */
    public getPreset(name: string): IConfigPreset | undefined {
        return this.presets.get(name);
    }
    
    /**
     * 添加预设
     */
    public async addPreset(preset: IConfigPreset): Promise<void> {
        this.presets.set(preset.name, preset);
        await this.savePresets();
    }
    
    /**
     * 删除预设
     */
    public async deletePreset(name: string): Promise<void> {
        this.presets.delete(name);
        await this.savePresets();
    }
    
    /**
     * 导出预设
     */
    public async exportPresets(filePath: string): Promise<void> {
        try {
            const data = JSON.stringify(Array.from(this.presets.values()), null, 2);
            fs.writeFileSync(filePath, data, 'utf8');
        } catch (error) {
            throw new Error(`导出预设失败: ${error}`);
        }
    }
    
    /**
     * 导入预设
     */
    public async importPresets(filePath: string): Promise<void> {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            const importedPresets = JSON.parse(data) as IConfigPreset[];
            
            // 验证导入的预设
            if (!Array.isArray(importedPresets)) {
                throw new Error('无效的预设文件格式');
            }
            
            // 合并预设
            importedPresets.forEach(preset => {
                this.presets.set(preset.name, preset);
            });
            
            await this.savePresets();
        } catch (error) {
            throw new Error(`导入预设失败: ${error}`);
        }
    }
} 