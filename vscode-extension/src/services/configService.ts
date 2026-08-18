/**
 * @file configService.ts
 * @description 配置管理服务 - 负责用户配置的读取、保存和验证
 */
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { IDocumentConfig } from '../ui/configPanel';
import { NodeMarkdownConverter } from '../core/nodeConverter';
// 单一权威配置源：所有默认值统一来自 mdtoworld/utils/defaultConfig.js
import { COMPLETE_DEFAULTS, deepMerge } from '../mdtoworld/utils/defaultConfig';

/**
 * 配置管理服务类
 */
export class ConfigService {
    constructor() {
        // No context needed for this service
    }

    /**
     * 从VS Code配置中获取用户配置
     */
    async getUserConfig(): Promise<IDocumentConfig> {
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
            const defaultConfig = this.getDefaultConfig();
            
            // 保存默认配置到文件
            try {
                await converter.saveConfig(defaultConfig as Record<string, unknown>);
                console.log('默认配置已保存');
            } catch (err) {
                console.error('保存默认配置失败:', err);
            }
            
            return defaultConfig;
        } catch (error) {
            console.error('获取配置失败:', error);
            // 如果发生错误，返回最小可用配置
            return this.getMinimalConfig();
        }
    }

    /**
     * 保存用户配置
     */
    async saveConfig(config: IDocumentConfig): Promise<void> {
        try {
            const converter = NodeMarkdownConverter.getInstance();
            await converter.saveConfig(config as Record<string, unknown>);
            
            // 同时保存到VS Code设置
            const vscodeConfig = vscode.workspace.getConfiguration('markdown-to-word');
            await vscodeConfig.update('markdownToWordUserConfig', config, vscode.ConfigurationTarget.Global);
            
            console.log('配置保存成功');
        } catch (error) {
            console.error('保存配置失败:', error);
            throw error;
        }
    }

    /**
     * 获取默认配置
     */
    getDefaultConfig(): IDocumentConfig {
        return deepMerge(COMPLETE_DEFAULTS, {}) as IDocumentConfig;
    }

    /**
     * 获取最小可用配置（错误恢复用）
     */
    private getMinimalConfig(): IDocumentConfig {
        return deepMerge(COMPLETE_DEFAULTS, {}) as IDocumentConfig;
    }

    /**
     * 验证配置的完整性
     */
    validateConfig(config: any): config is IDocumentConfig {
        return config && 
               typeof config === 'object' && 
               config.fonts && 
               config.sizes && 
               config.colors && 
               config.paragraph && 
               config.document;
    }

    /**
     * 合并配置（用于配置升级）
     */
    mergeConfig(userConfig: Partial<IDocumentConfig>, defaultConfig: IDocumentConfig): IDocumentConfig {
        return {
            ...defaultConfig,
            ...userConfig,
            fonts: { ...defaultConfig.fonts, ...userConfig.fonts },
            sizes: { ...defaultConfig.sizes, ...userConfig.sizes },
            colors: { ...defaultConfig.colors, ...userConfig.colors },
            paragraph: { ...defaultConfig.paragraph, ...userConfig.paragraph },
            document: { ...defaultConfig.document, ...userConfig.document },
            chinese: { ...defaultConfig.chinese, ...userConfig.chinese },
            table_styles: { ...defaultConfig.table_styles, ...userConfig.table_styles },
            enhanced_table_styles: { ...defaultConfig.enhanced_table_styles, ...userConfig.enhanced_table_styles },
            markdown: { ...defaultConfig.markdown, ...userConfig.markdown },
            output: { ...defaultConfig.output, ...userConfig.output },
            debug: { ...defaultConfig.debug, ...userConfig.debug }
        };
    }

    /**
     * 重置配置为默认值
     */
    async resetToDefault(): Promise<void> {
        const defaultConfig = this.getDefaultConfig();
        await this.saveConfig(defaultConfig);
    }

    /**
     * 从文件导入配置
     */
    async importConfig(filePath: string): Promise<void> {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`配置文件不存在: ${filePath}`);
            }

            const fileContent = fs.readFileSync(filePath, 'utf8');
            let config: IDocumentConfig;

            // 根据文件扩展名解析配置
            if (filePath.endsWith('.json')) {
                config = JSON.parse(fileContent);
            } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
                config = yaml.load(fileContent) as IDocumentConfig;
            } else {
                throw new Error('不支持的配置文件格式，请使用 .json 或 .yaml 文件');
            }

            // 验证配置
            if (!this.validateConfig(config)) {
                throw new Error('配置文件格式不正确');
            }

            // 保存配置
            await this.saveConfig(config);
        } catch (error) {
            throw new Error(`导入配置失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 导出配置到文件
     */
    async exportConfig(filePath: string): Promise<void> {
        try {
            const config = await this.getUserConfig();
            
            // 根据文件扩展名导出配置
            if (filePath.endsWith('.json')) {
                const jsonContent = JSON.stringify(config, null, 2);
                fs.writeFileSync(filePath, jsonContent, 'utf8');
            } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
                const yamlContent = yaml.dump(config, { indent: 2 });
                fs.writeFileSync(filePath, yamlContent, 'utf8');
            } else {
                throw new Error('不支持的配置文件格式，请使用 .json 或 .yaml 文件');
            }
        } catch (error) {
            throw new Error(`导出配置失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 获取配置文件路径
     */
    getConfigFilePath(): string {
        const converter = NodeMarkdownConverter.getInstance();
        return converter.getConfigFilePath();
    }
}
