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
exports.ConfigService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs-extra"));
const yaml = __importStar(require("js-yaml"));
const nodeConverter_1 = require("../core/nodeConverter");
class ConfigService {
    constructor() {
    }
    getUserConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const converter = nodeConverter_1.NodeMarkdownConverter.getInstance();
                const configFilePath = converter.getConfigFilePath();
                console.log('尝试从统一配置文件加载:', configFilePath);
                if (fs.existsSync(configFilePath)) {
                    try {
                        const configContent = fs.readFileSync(configFilePath, 'utf8');
                        const config = yaml.load(configContent);
                        if (config && typeof config === 'object' && config.fonts && config.sizes) {
                            console.log('成功从统一配置文件加载配置');
                            return config;
                        }
                    }
                    catch (error) {
                        console.error('读取配置文件失败:', error);
                    }
                }
                const vscodeConfig = vscode.workspace.getConfiguration('markdown-to-word');
                const userConfig = vscodeConfig.get('markdownToWordUserConfig');
                if (userConfig && typeof userConfig === 'object' && userConfig.fonts && userConfig.sizes) {
                    console.log('从VS Code设置加载配置');
                    return userConfig;
                }
                console.log('使用默认配置');
                const defaultConfig = this.getDefaultConfig();
                try {
                    yield converter.saveConfig(defaultConfig);
                    console.log('默认配置已保存');
                }
                catch (err) {
                    console.error('保存默认配置失败:', err);
                }
                return defaultConfig;
            }
            catch (error) {
                console.error('获取配置失败:', error);
                return this.getMinimalConfig();
            }
        });
    }
    saveConfig(config) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const converter = nodeConverter_1.NodeMarkdownConverter.getInstance();
                yield converter.saveConfig(config);
                const vscodeConfig = vscode.workspace.getConfiguration('markdown-to-word');
                yield vscodeConfig.update('markdownToWordUserConfig', config, vscode.ConfigurationTarget.Global);
                console.log('配置保存成功');
            }
            catch (error) {
                console.error('保存配置失败:', error);
                throw error;
            }
        });
    }
    getDefaultConfig() {
        return {
            fonts: {
                default: '微软雅黑',
                code: 'Courier New',
                headings: '微软雅黑'
            },
            sizes: {
                default: 12,
                code: 10,
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
                line_spacing: 1.5,
                space_before: 0,
                space_after: 6,
                first_line_indent: 0
            },
            document: {
                page_size: 'A4',
                margin_top: 2.54,
                margin_bottom: 2.54,
                margin_left: 3.18,
                margin_right: 3.18,
                generate_toc: false,
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
                keepHtml: false
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
    }
    getMinimalConfig() {
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
    validateConfig(config) {
        return config &&
            typeof config === 'object' &&
            config.fonts &&
            config.sizes &&
            config.colors &&
            config.paragraph &&
            config.document;
    }
    mergeConfig(userConfig, defaultConfig) {
        return Object.assign(Object.assign(Object.assign({}, defaultConfig), userConfig), { fonts: Object.assign(Object.assign({}, defaultConfig.fonts), userConfig.fonts), sizes: Object.assign(Object.assign({}, defaultConfig.sizes), userConfig.sizes), colors: Object.assign(Object.assign({}, defaultConfig.colors), userConfig.colors), paragraph: Object.assign(Object.assign({}, defaultConfig.paragraph), userConfig.paragraph), document: Object.assign(Object.assign({}, defaultConfig.document), userConfig.document), chinese: Object.assign(Object.assign({}, defaultConfig.chinese), userConfig.chinese), table_styles: Object.assign(Object.assign({}, defaultConfig.table_styles), userConfig.table_styles), enhanced_table_styles: Object.assign(Object.assign({}, defaultConfig.enhanced_table_styles), userConfig.enhanced_table_styles), markdown: Object.assign(Object.assign({}, defaultConfig.markdown), userConfig.markdown), output: Object.assign(Object.assign({}, defaultConfig.output), userConfig.output), debug: Object.assign(Object.assign({}, defaultConfig.debug), userConfig.debug) });
    }
    resetToDefault() {
        return __awaiter(this, void 0, void 0, function* () {
            const defaultConfig = this.getDefaultConfig();
            yield this.saveConfig(defaultConfig);
        });
    }
    importConfig(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!fs.existsSync(filePath)) {
                    throw new Error(`配置文件不存在: ${filePath}`);
                }
                const fileContent = fs.readFileSync(filePath, 'utf8');
                let config;
                if (filePath.endsWith('.json')) {
                    config = JSON.parse(fileContent);
                }
                else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
                    config = yaml.load(fileContent);
                }
                else {
                    throw new Error('不支持的配置文件格式，请使用 .json 或 .yaml 文件');
                }
                if (!this.validateConfig(config)) {
                    throw new Error('配置文件格式不正确');
                }
                yield this.saveConfig(config);
            }
            catch (error) {
                throw new Error(`导入配置失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    exportConfig(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const config = yield this.getUserConfig();
                if (filePath.endsWith('.json')) {
                    const jsonContent = JSON.stringify(config, null, 2);
                    fs.writeFileSync(filePath, jsonContent, 'utf8');
                }
                else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
                    const yamlContent = yaml.dump(config, { indent: 2 });
                    fs.writeFileSync(filePath, yamlContent, 'utf8');
                }
                else {
                    throw new Error('不支持的配置文件格式，请使用 .json 或 .yaml 文件');
                }
            }
            catch (error) {
                throw new Error(`导出配置失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    getConfigFilePath() {
        const converter = nodeConverter_1.NodeMarkdownConverter.getInstance();
        return converter.getConfigFilePath();
    }
}
exports.ConfigService = ConfigService;
//# sourceMappingURL=configService.js.map