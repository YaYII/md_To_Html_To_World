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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigPresetManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ConfigPresetManager {
    constructor(context) {
        this.PRESETS_FILE = 'config_presets.json';
        this.context = context;
        this.presets = new Map();
        this.loadPresets();
    }
    static getInstance(context) {
        if (!ConfigPresetManager.instance) {
            ConfigPresetManager.instance = new ConfigPresetManager(context);
        }
        return ConfigPresetManager.instance;
    }
    loadPresets() {
        try {
            const presetsPath = path.join(this.context.globalStoragePath, this.PRESETS_FILE);
            if (fs.existsSync(presetsPath)) {
                const data = fs.readFileSync(presetsPath, 'utf8');
                const presets = JSON.parse(data);
                presets.forEach(preset => {
                    this.presets.set(preset.name, preset);
                });
            }
            else {
                this.createDefaultPresets();
            }
        }
        catch (error) {
            console.error('加载预设失败:', error);
        }
    }
    createDefaultPresets() {
        const defaultPresets = [
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
    savePresets() {
        try {
            const presetsPath = path.join(this.context.globalStoragePath, this.PRESETS_FILE);
            const data = JSON.stringify(Array.from(this.presets.values()), null, 2);
            fs.writeFileSync(presetsPath, data, 'utf8');
        }
        catch (error) {
            console.error('保存预设失败:', error);
        }
    }
    getAllPresets() {
        return Array.from(this.presets.values());
    }
    getPreset(name) {
        return this.presets.get(name);
    }
    async addPreset(preset) {
        this.presets.set(preset.name, preset);
        await this.savePresets();
    }
    async deletePreset(name) {
        this.presets.delete(name);
        await this.savePresets();
    }
    async exportPresets(filePath) {
        try {
            const data = JSON.stringify(Array.from(this.presets.values()), null, 2);
            fs.writeFileSync(filePath, data, 'utf8');
        }
        catch (error) {
            throw new Error(`导出预设失败: ${error}`);
        }
    }
    async importPresets(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            const importedPresets = JSON.parse(data);
            if (!Array.isArray(importedPresets)) {
                throw new Error('无效的预设文件格式');
            }
            importedPresets.forEach(preset => {
                this.presets.set(preset.name, preset);
            });
            await this.savePresets();
        }
        catch (error) {
            throw new Error(`导入预设失败: ${error}`);
        }
    }
}
exports.ConfigPresetManager = ConfigPresetManager;
//# sourceMappingURL=configPresetManager.js.map