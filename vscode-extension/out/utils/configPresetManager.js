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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
    addPreset(preset) {
        return __awaiter(this, void 0, void 0, function* () {
            this.presets.set(preset.name, preset);
            yield this.savePresets();
        });
    }
    deletePreset(name) {
        return __awaiter(this, void 0, void 0, function* () {
            this.presets.delete(name);
            yield this.savePresets();
        });
    }
    exportPresets(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = JSON.stringify(Array.from(this.presets.values()), null, 2);
                fs.writeFileSync(filePath, data, 'utf8');
            }
            catch (error) {
                throw new Error(`导出预设失败: ${error}`);
            }
        });
    }
    importPresets(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = fs.readFileSync(filePath, 'utf8');
                const importedPresets = JSON.parse(data);
                if (!Array.isArray(importedPresets)) {
                    throw new Error('无效的预设文件格式');
                }
                importedPresets.forEach(preset => {
                    this.presets.set(preset.name, preset);
                });
                yield this.savePresets();
            }
            catch (error) {
                throw new Error(`导入预设失败: ${error}`);
            }
        });
    }
}
exports.ConfigPresetManager = ConfigPresetManager;
//# sourceMappingURL=configPresetManager.js.map