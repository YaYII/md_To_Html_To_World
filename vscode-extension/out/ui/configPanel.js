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
exports.ConfigPanel = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
class ConfigPanel {
    constructor(panel, extensionPath, inputFile, onConfigDone) {
        this._disposables = [];
        this._storageKey = 'markdownToWordUserConfig';
        this._panel = panel;
        this._extensionPath = extensionPath;
        this._inputFile = inputFile;
        this._onConfigDone = onConfigDone;
        console.log(`ConfigPanel初始化: ${this._inputFile}, 扩展路径: ${this._extensionPath}`);
        this._loadDefaultConfig();
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(message => {
            console.log('接收到WebView消息:', message);
            switch (message.command) {
                case 'saveConfig':
                    console.log('保存配置:', message.config);
                    this._saveUserConfig(message.config);
                    this._onConfigDone(message.config, false);
                    this._panel.dispose();
                    break;
                case 'cancel':
                    console.log('取消配置');
                    this._onConfigDone({}, true);
                    this._panel.dispose();
                    break;
            }
        }, null, this._disposables);
    }
    _loadDefaultConfig() {
        try {
            const savedConfig = this._loadUserConfig();
            if (savedConfig) {
                console.log('从用户配置中加载配置');
                this._defaultConfig = savedConfig;
                return;
            }
            const configPath = path.join(this._extensionPath, 'scripts', 'config_example.yaml');
            console.log('尝试加载配置文件:', configPath);
            if (fs.existsSync(configPath)) {
                const configContent = fs.readFileSync(configPath, 'utf8');
                this._defaultConfig = yaml.load(configContent);
                console.log('成功加载配置文件:', configPath);
            }
            else {
                console.error('配置文件不存在:', configPath);
                this._defaultConfig = {
                    fonts: { default: '蒙纳宋体', headings: '蒙纳宋体', code: 'Courier New' },
                    sizes: { default: 12, code: 6.5 },
                    colors: { default: '#000000', headings: '#000000', code: '#333333', link: '#0563C1' }
                };
            }
        }
        catch (error) {
            console.error('加载配置文件失败:', error);
            this._defaultConfig = {
                fonts: { default: '蒙纳宋体', headings: '蒙纳宋体', code: 'Courier New' },
                sizes: { default: 12, code: 6.5 },
                colors: { default: '#000000', headings: '#000000', code: '#333333', link: '#0563C1' }
            };
        }
    }
    _loadUserConfig() {
        try {
            const config = vscode.workspace.getConfiguration('markdown-to-word');
            const savedConfig = config.get(this._storageKey);
            if (savedConfig) {
                return JSON.parse(savedConfig);
            }
            return null;
        }
        catch (error) {
            console.error('加载用户配置失败:', error);
            return null;
        }
    }
    _saveUserConfig(config) {
        try {
            const configPath = path.join(this._extensionPath, 'scripts', 'config_example.yaml');
            const yamlStr = yaml.dump(config, {
                indent: 2,
                lineWidth: -1,
                noRefs: true,
            });
            const yamlWithComments = `# World MD 配置文件
# 此文件包含World MD工具的所有配置项
# 您可以根据需要修改这些设置

${yamlStr}`;
            fs.writeFileSync(configPath, yamlWithComments, 'utf8');
            console.log('用户配置已保存到文件:', configPath);
            const vscodeConfig = vscode.workspace.getConfiguration('markdown-to-word');
            vscodeConfig.update(this._storageKey, JSON.stringify(config), vscode.ConfigurationTarget.Global);
        }
        catch (error) {
            console.error('保存用户配置失败:', error);
            vscode.window.showErrorMessage(`保存配置失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    static createOrShow(extensionPath, inputFile, onConfigDone) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (ConfigPanel.currentPanel) {
            ConfigPanel.currentPanel._panel.reveal(column);
            ConfigPanel.currentPanel._inputFile = inputFile;
            ConfigPanel.currentPanel._onConfigDone = onConfigDone;
            ConfigPanel.currentPanel._update();
            return ConfigPanel.currentPanel;
        }
        const panel = vscode.window.createWebviewPanel('configPanel', '配置Word文档样式', column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.file(extensionPath),
                vscode.Uri.file(path.join(extensionPath, 'media')),
                vscode.Uri.file(path.join(extensionPath, 'scripts'))
            ]
        });
        ConfigPanel.currentPanel = new ConfigPanel(panel, extensionPath, inputFile, onConfigDone);
        return ConfigPanel.currentPanel;
    }
    dispose() {
        ConfigPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _update() {
        this._panel.title = `配置 - ${path.basename(this._inputFile)}`;
        this._panel.webview.html = this._getHtmlForWebview();
    }
    _getHtmlForWebview() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42, _43, _44, _45, _46, _47, _48, _49, _50, _51, _52, _53, _54, _55, _56, _57, _58, _59, _60, _61, _62, _63, _64, _65;
        const config = this._defaultConfig || {};
        console.log('加载配置:', config);
        console.log('扩展路径:', this._extensionPath);
        console.log('输入文件:', this._inputFile);
        const nonce = this._getNonce();
        return `<!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src *; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src * data:;">
            <title>配置Word文档样式</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 20px;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                }
                
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                }
                
                .form-group {
                    margin-bottom: 15px;
                }
                
                label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: bold;
                }
                
                input, select {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border-radius: 2px;
                }
                
                input[type="checkbox"] {
                    width: auto;
                    margin-right: 8px;
                }
                
                .checkbox-label {
                    display: flex;
                    align-items: center;
                }
                
                .button-container {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 20px;
                }
                
                button {
                    padding: 8px 16px;
                    margin-left: 10px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                }
                
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                .section-title {
                    border-bottom: 1px solid var(--vscode-activityBar-border);
                    padding-bottom: 5px;
                    margin-top: 20px;
                    margin-bottom: 15px;
                }
                
                .color-preview {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border: 1px solid #ccc;
                    vertical-align: middle;
                    margin-left: 10px;
                }
                
                .tabs {
                    display: flex;
                    margin-bottom: 20px;
                    border-bottom: 1px solid var(--vscode-activityBar-border);
                }
                
                .tab {
                    padding: 8px 16px;
                    cursor: pointer;
                    border: 1px solid transparent;
                    border-bottom: none;
                    margin-right: 5px;
                    border-top-left-radius: 3px;
                    border-top-right-radius: 3px;
                }
                
                .tab.active {
                    background-color: var(--vscode-tab-activeBackground);
                    border-color: var(--vscode-activityBar-border);
                    color: var(--vscode-tab-activeForeground);
                    position: relative;
                    bottom: -1px;
                }
                
                .tab-content {
                    display: none;
                }
                
                .tab-content.active {
                    display: block;
                }
                
                .sub-section {
                    margin-left: 20px;
                    margin-bottom: 20px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>配置Word文档样式</h2>
                <p>为文件 <strong>${path.basename(this._inputFile)}</strong> 设置转换选项</p>
                
                <div class="tabs">
                    <div class="tab active" data-tab="basic">基本设置</div>
                    <div class="tab" data-tab="paragraph">段落与中文</div>
                    <div class="tab" data-tab="table">表格样式</div>
                    <div class="tab" data-tab="document">文档设置</div>
                    <div class="tab" data-tab="markdown">Markdown</div>
                    <div class="tab" data-tab="advanced">高级</div>
                </div>
                
                <!-- 基本设置 -->
                <div class="tab-content active" id="basic">
                    <h3 class="section-title">字体设置</h3>
                    
                    <div class="form-group">
                        <label for="fonts.default">正文字体</label>
                        <input type="text" id="fonts.default" value="${((_a = config.fonts) === null || _a === void 0 ? void 0 : _a.default) || '蒙纳宋体'}">
                    </div>
                    
                    <div class="form-group">
                        <label for="fonts.headings">标题字体</label>
                        <input type="text" id="fonts.headings" value="${((_b = config.fonts) === null || _b === void 0 ? void 0 : _b.headings) || '蒙纳宋体'}">
                    </div>
                    
                    <div class="form-group">
                        <label for="fonts.code">代码字体</label>
                        <input type="text" id="fonts.code" value="${((_c = config.fonts) === null || _c === void 0 ? void 0 : _c.code) || 'Courier New'}">
                    </div>
                    
                    <h3 class="section-title">字号设置</h3>
                    
                    <div class="form-group">
                        <label for="sizes.default">正文字号 (pt)</label>
                        <input type="number" id="sizes.default" min="8" max="72" value="${((_d = config.sizes) === null || _d === void 0 ? void 0 : _d.default) || 12}">
                    </div>
                    
                    <div class="form-group">
                        <label for="sizes.code">代码字号 (pt)</label>
                        <input type="number" id="sizes.code" min="6" max="72" value="${((_e = config.sizes) === null || _e === void 0 ? void 0 : _e.code) || 6.5}">
                    </div>
                    
                    <h3 class="section-title">颜色设置</h3>
                    
                    <div class="form-group">
                        <label for="colors.default">正文颜色</label>
                        <input type="text" id="colors.default" value="${((_f = config.colors) === null || _f === void 0 ? void 0 : _f.default) || '#000000'}">
                        <span class="color-preview" style="background-color: ${((_g = config.colors) === null || _g === void 0 ? void 0 : _g.default) || '#000000'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="colors.headings">标题颜色</label>
                        <input type="text" id="colors.headings" value="${((_h = config.colors) === null || _h === void 0 ? void 0 : _h.headings) || '#000000'}">
                        <span class="color-preview" style="background-color: ${((_j = config.colors) === null || _j === void 0 ? void 0 : _j.headings) || '#000000'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="colors.code">代码颜色</label>
                        <input type="text" id="colors.code" value="${((_k = config.colors) === null || _k === void 0 ? void 0 : _k.code) || '#333333'}">
                        <span class="color-preview" style="background-color: ${((_l = config.colors) === null || _l === void 0 ? void 0 : _l.code) || '#333333'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="colors.link">链接颜色</label>
                        <input type="text" id="colors.link" value="${((_m = config.colors) === null || _m === void 0 ? void 0 : _m.link) || '#0563C1'}">
                        <span class="color-preview" style="background-color: ${((_o = config.colors) === null || _o === void 0 ? void 0 : _o.link) || '#0563C1'};"></span>
                    </div>
                </div>
                
                <!-- 段落与中文 -->
                <div class="tab-content" id="paragraph">
                    <h3 class="section-title">段落设置</h3>
                    
                    <div class="form-group">
                        <label for="paragraph.line_spacing">行间距</label>
                        <input type="number" id="paragraph.line_spacing" min="1" max="3" step="0.1" value="${((_p = config.paragraph) === null || _p === void 0 ? void 0 : _p.line_spacing) || 1.5}">
                    </div>
                    
                    <div class="form-group">
                        <label for="paragraph.space_before">段前间距 (pt)</label>
                        <input type="number" id="paragraph.space_before" min="0" max="72" value="${((_q = config.paragraph) === null || _q === void 0 ? void 0 : _q.space_before) || 0}">
                    </div>
                    
                    <div class="form-group">
                        <label for="paragraph.space_after">段后间距 (pt)</label>
                        <input type="number" id="paragraph.space_after" min="0" max="72" value="${((_r = config.paragraph) === null || _r === void 0 ? void 0 : _r.space_after) || 6}">
                    </div>
                    
                    <div class="form-group">
                        <label for="paragraph.first_line_indent">首行缩进字符数</label>
                        <input type="number" id="paragraph.first_line_indent" min="0" max="10" value="${((_s = config.paragraph) === null || _s === void 0 ? void 0 : _s.first_line_indent) || 0}">
                    </div>
                    
                    <h3 class="section-title">中文设置</h3>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="chinese.convert_to_traditional" ${((_t = config.chinese) === null || _t === void 0 ? void 0 : _t.convert_to_traditional) !== false ? 'checked' : ''}>
                            转换为繁体中文
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="chinese.punctuation_spacing" ${((_u = config.chinese) === null || _u === void 0 ? void 0 : _u.punctuation_spacing) !== false ? 'checked' : ''}>
                            优化标点符号间距
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="chinese.auto_spacing" ${((_v = config.chinese) === null || _v === void 0 ? void 0 : _v.auto_spacing) !== false ? 'checked' : ''}>
                            中英文之间自动添加空格
                        </label>
                    </div>
                </div>
                
                <!-- 表格样式 -->
                <div class="tab-content" id="table">
                    <h3 class="section-title">HTML表格样式</h3>
                    
                    <div class="form-group">
                        <label for="table_styles.even_row_color">偶数行背景色</label>
                        <input type="text" id="table_styles.even_row_color" value="${((_w = config.table_styles) === null || _w === void 0 ? void 0 : _w.even_row_color) || '#f2f2f2'}">
                        <span class="color-preview" style="background-color: ${((_x = config.table_styles) === null || _x === void 0 ? void 0 : _x.even_row_color) || '#f2f2f2'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="table_styles.odd_row_color">奇数行背景色</label>
                        <input type="text" id="table_styles.odd_row_color" value="${((_y = config.table_styles) === null || _y === void 0 ? void 0 : _y.odd_row_color) || '#ffffff'}">
                        <span class="color-preview" style="background-color: ${((_z = config.table_styles) === null || _z === void 0 ? void 0 : _z.odd_row_color) || '#ffffff'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="table_styles.header_bg_color">表头背景色</label>
                        <input type="text" id="table_styles.header_bg_color" value="${((_0 = config.table_styles) === null || _0 === void 0 ? void 0 : _0.header_bg_color) || '#e0e0e0'}">
                        <span class="color-preview" style="background-color: ${((_1 = config.table_styles) === null || _1 === void 0 ? void 0 : _1.header_bg_color) || '#e0e0e0'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="table_styles.border_color">边框颜色</label>
                        <input type="text" id="table_styles.border_color" value="${((_2 = config.table_styles) === null || _2 === void 0 ? void 0 : _2.border_color) || '#dddddd'}">
                        <span class="color-preview" style="background-color: ${((_3 = config.table_styles) === null || _3 === void 0 ? void 0 : _3.border_color) || '#dddddd'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="table_styles.cell_height">单元格高度</label>
                        <input type="text" id="table_styles.cell_height" value="${((_4 = config.table_styles) === null || _4 === void 0 ? void 0 : _4.cell_height) || '0.95em'}">
                    </div>
                    
                    <div class="form-group">
                        <label for="table_styles.table_width">表格宽度</label>
                        <input type="text" id="table_styles.table_width" value="${((_5 = config.table_styles) === null || _5 === void 0 ? void 0 : _5.table_width) || '100%'}">
                    </div>
                    
                    <h3 class="section-title">Word表格样式</h3>
                    
                    <div class="form-group">
                        <label for="enhanced_table_styles.style">表格样式名称</label>
                        <input type="text" id="enhanced_table_styles.style" value="${((_6 = config.enhanced_table_styles) === null || _6 === void 0 ? void 0 : _6.style) || 'Table Grid'}">
                    </div>
                    
                    <div class="form-group">
                        <label for="enhanced_table_styles.width">表格宽度(厘米)</label>
                        <input type="number" id="enhanced_table_styles.width" min="1" max="30" step="0.1" value="${((_7 = config.enhanced_table_styles) === null || _7 === void 0 ? void 0 : _7.width) || 16.0}">
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="enhanced_table_styles.border" ${((_8 = config.enhanced_table_styles) === null || _8 === void 0 ? void 0 : _8.border) !== false ? 'checked' : ''}>
                            显示边框
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label for="enhanced_table_styles.border_size">边框粗细(磅)</label>
                        <input type="number" id="enhanced_table_styles.border_size" min="0.5" max="6" step="0.5" value="${((_9 = config.enhanced_table_styles) === null || _9 === void 0 ? void 0 : _9.border_size) || 1}">
                    </div>
                    
                    <div class="form-group">
                        <label for="enhanced_table_styles.border_color">边框颜色</label>
                        <input type="text" id="enhanced_table_styles.border_color" value="${((_10 = config.enhanced_table_styles) === null || _10 === void 0 ? void 0 : _10.border_color) || '#dddddd'}">
                        <span class="color-preview" style="background-color: ${((_11 = config.enhanced_table_styles) === null || _11 === void 0 ? void 0 : _11.border_color) || '#dddddd'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="enhanced_table_styles.header_bg_color">表头背景色</label>
                        <input type="text" id="enhanced_table_styles.header_bg_color" value="${((_12 = config.enhanced_table_styles) === null || _12 === void 0 ? void 0 : _12.header_bg_color) || '#E7E6E6'}">
                        <span class="color-preview" style="background-color: ${((_13 = config.enhanced_table_styles) === null || _13 === void 0 ? void 0 : _13.header_bg_color) || '#E7E6E6'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="enhanced_table_styles.even_row_color">偶数行背景色</label>
                        <input type="text" id="enhanced_table_styles.even_row_color" value="${((_14 = config.enhanced_table_styles) === null || _14 === void 0 ? void 0 : _14.even_row_color) || '#F2F2F2'}">
                        <span class="color-preview" style="background-color: ${((_15 = config.enhanced_table_styles) === null || _15 === void 0 ? void 0 : _15.even_row_color) || '#F2F2F2'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="enhanced_table_styles.text_align">文本水平对齐</label>
                        <select id="enhanced_table_styles.text_align">
                            <option value="left" ${(((_16 = config.enhanced_table_styles) === null || _16 === void 0 ? void 0 : _16.text_align) || 'left') === 'left' ? 'selected' : ''}>左对齐</option>
                            <option value="center" ${(((_17 = config.enhanced_table_styles) === null || _17 === void 0 ? void 0 : _17.text_align) || '') === 'center' ? 'selected' : ''}>居中</option>
                            <option value="right" ${(((_18 = config.enhanced_table_styles) === null || _18 === void 0 ? void 0 : _18.text_align) || '') === 'right' ? 'selected' : ''}>右对齐</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="enhanced_table_styles.vertical_align">文本垂直对齐</label>
                        <select id="enhanced_table_styles.vertical_align">
                            <option value="top" ${(((_19 = config.enhanced_table_styles) === null || _19 === void 0 ? void 0 : _19.vertical_align) || '') === 'top' ? 'selected' : ''}>顶部对齐</option>
                            <option value="center" ${(((_20 = config.enhanced_table_styles) === null || _20 === void 0 ? void 0 : _20.vertical_align) || 'center') === 'center' ? 'selected' : ''}>居中</option>
                            <option value="bottom" ${(((_21 = config.enhanced_table_styles) === null || _21 === void 0 ? void 0 : _21.vertical_align) || '') === 'bottom' ? 'selected' : ''}>底部对齐</option>
                        </select>
                    </div>
                </div>
                
                <!-- 文档设置 -->
                <div class="tab-content" id="document">
                    <h3 class="section-title">页面设置</h3>
                    
                    <div class="form-group">
                        <label for="document.page_size">页面大小</label>
                        <select id="document.page_size">
                            <option value="A4" ${(((_22 = config.document) === null || _22 === void 0 ? void 0 : _22.page_size) || 'A4') === 'A4' ? 'selected' : ''}>A4</option>
                            <option value="Letter" ${(((_23 = config.document) === null || _23 === void 0 ? void 0 : _23.page_size) || 'A4') === 'Letter' ? 'selected' : ''}>Letter</option>
                            <option value="Legal" ${(((_24 = config.document) === null || _24 === void 0 ? void 0 : _24.page_size) || 'A4') === 'Legal' ? 'selected' : ''}>Legal</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="document.margin_top">上边距 (英寸)</label>
                        <input type="number" id="document.margin_top" min="0.1" max="5" step="0.1" value="${((_25 = config.document) === null || _25 === void 0 ? void 0 : _25.margin_top) || 1}">
                    </div>
                    
                    <div class="form-group">
                        <label for="document.margin_bottom">下边距 (英寸)</label>
                        <input type="number" id="document.margin_bottom" min="0.1" max="5" step="0.1" value="${((_26 = config.document) === null || _26 === void 0 ? void 0 : _26.margin_bottom) || 1}">
                    </div>
                    
                    <div class="form-group">
                        <label for="document.margin_left">左边距 (英寸)</label>
                        <input type="number" id="document.margin_left" min="0.1" max="5" step="0.1" value="${((_27 = config.document) === null || _27 === void 0 ? void 0 : _27.margin_left) || 1}">
                    </div>
                    
                    <div class="form-group">
                        <label for="document.margin_right">右边距 (英寸)</label>
                        <input type="number" id="document.margin_right" min="0.1" max="5" step="0.1" value="${((_28 = config.document) === null || _28 === void 0 ? void 0 : _28.margin_right) || 1}">
                    </div>
                    
                    <h3 class="section-title">其他文档设置</h3>
                    
                    <div class="form-group">
                        <label for="document.header">页眉</label>
                        <input type="text" id="document.header" value="${((_29 = config.document) === null || _29 === void 0 ? void 0 : _29.header) || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="document.footer">页脚</label>
                        <input type="text" id="document.footer" value="${((_30 = config.document) === null || _30 === void 0 ? void 0 : _30.footer) || ''}">
                    </div>
                    
                    <div class="form-group">
                        <div class="checkbox-label">
                            <input type="checkbox" id="document.generate_toc" ${((_31 = config.document) === null || _31 === void 0 ? void 0 : _31.generate_toc) ? 'checked' : ''}>
                            <label for="document.generate_toc">生成目录</label>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <div class="checkbox-label">
                            <input type="checkbox" id="output.keepHtml" ${((_32 = config.output) === null || _32 === void 0 ? void 0 : _32.keepHtml) !== false ? 'checked' : ''}>
                            <label for="output.keepHtml">保留中间HTML文件</label>
                        </div>
                    </div>
                </div>
                
                <!-- Markdown设置 -->
                <div class="tab-content" id="markdown">
                    <h3 class="section-title">Markdown扩展</h3>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="markdown.extensions.tables" ${Array.isArray((_33 = config.markdown) === null || _33 === void 0 ? void 0 : _33.extensions) && ((_34 = config.markdown) === null || _34 === void 0 ? void 0 : _34.extensions.includes('tables')) ? 'checked' : ''}>
                            启用表格支持
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="markdown.extensions.fenced_code" ${Array.isArray((_35 = config.markdown) === null || _35 === void 0 ? void 0 : _35.extensions) && ((_36 = config.markdown) === null || _36 === void 0 ? void 0 : _36.extensions.includes('fenced_code')) ? 'checked' : ''}>
                            启用围栏式代码块
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="markdown.extensions.codehilite" ${Array.isArray((_37 = config.markdown) === null || _37 === void 0 ? void 0 : _37.extensions) && ((_38 = config.markdown) === null || _38 === void 0 ? void 0 : _38.extensions.includes('codehilite')) ? 'checked' : ''}>
                            启用代码高亮
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="markdown.extensions.toc" ${Array.isArray((_39 = config.markdown) === null || _39 === void 0 ? void 0 : _39.extensions) && ((_40 = config.markdown) === null || _40 === void 0 ? void 0 : _40.extensions.includes('toc')) ? 'checked' : ''}>
                            启用目录生成
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="markdown.extensions.footnotes" ${Array.isArray((_41 = config.markdown) === null || _41 === void 0 ? void 0 : _41.extensions) && ((_42 = config.markdown) === null || _42 === void 0 ? void 0 : _42.extensions.includes('footnotes')) ? 'checked' : ''}>
                            启用脚注支持
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="markdown.extensions.nl2br" ${Array.isArray((_43 = config.markdown) === null || _43 === void 0 ? void 0 : _43.extensions) && ((_44 = config.markdown) === null || _44 === void 0 ? void 0 : _44.extensions.includes('nl2br')) ? 'checked' : ''}>
                            将换行符转换为<br>标签
                        </label>
                    </div>
                    
                    <h3 class="section-title">代码高亮设置</h3>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="markdown.extension_configs.codehilite.linenums" ${((_47 = (_46 = (_45 = config.markdown) === null || _45 === void 0 ? void 0 : _45.extension_configs) === null || _46 === void 0 ? void 0 : _46.codehilite) === null || _47 === void 0 ? void 0 : _47.linenums) ? 'checked' : ''}>
                            显示行号
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="markdown.extension_configs.codehilite.use_pygments" ${((_50 = (_49 = (_48 = config.markdown) === null || _48 === void 0 ? void 0 : _48.extension_configs) === null || _49 === void 0 ? void 0 : _49.codehilite) === null || _50 === void 0 ? void 0 : _50.use_pygments) !== false ? 'checked' : ''}>
                            使用Pygments进行语法高亮
                        </label>
                    </div>
                </div>
                
                <!-- 高级设置 -->
                <div class="tab-content" id="advanced">
                    <h3 class="section-title">标题样式</h3>
                    
                    <div class="form-group">
                        <label for="sizes.heading1">一级标题字号 (pt)</label>
                        <input type="number" id="sizes.heading1" min="12" max="72" value="${((_51 = config.sizes) === null || _51 === void 0 ? void 0 : _51.heading1) || 18}">
                    </div>
                    
                    <div class="form-group">
                        <label for="sizes.heading2">二级标题字号 (pt)</label>
                        <input type="number" id="sizes.heading2" min="12" max="72" value="${((_52 = config.sizes) === null || _52 === void 0 ? void 0 : _52.heading2) || 16}">
                    </div>
                    
                    <div class="form-group">
                        <label for="sizes.heading3">三级标题字号 (pt)</label>
                        <input type="number" id="sizes.heading3" min="12" max="72" value="${((_53 = config.sizes) === null || _53 === void 0 ? void 0 : _53.heading3) || 14}">
                    </div>
                    
                    <div class="form-group">
                        <label for="sizes.heading4">四级标题字号 (pt)</label>
                        <input type="number" id="sizes.heading4" min="12" max="72" value="${((_54 = config.sizes) === null || _54 === void 0 ? void 0 : _54.heading4) || 12}">
                    </div>
                    
                    <div class="form-group">
                        <label for="sizes.heading5">五级标题字号 (pt)</label>
                        <input type="number" id="sizes.heading5" min="12" max="72" value="${((_55 = config.sizes) === null || _55 === void 0 ? void 0 : _55.heading5) || 12}">
                    </div>
                    
                    <div class="form-group">
                        <label for="sizes.heading6">六级标题字号 (pt)</label>
                        <input type="number" id="sizes.heading6" min="12" max="72" value="${((_56 = config.sizes) === null || _56 === void 0 ? void 0 : _56.heading6) || 12}">
                    </div>
                    
                    <h3 class="section-title">调试设置</h3>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="debug.enabled" ${((_57 = config.debug) === null || _57 === void 0 ? void 0 : _57.enabled) ? 'checked' : ''}>
                            启用调试模式
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label for="debug.log_level">日志级别</label>
                        <select id="debug.log_level">
                            <option value="DEBUG" ${(((_58 = config.debug) === null || _58 === void 0 ? void 0 : _58.log_level) || '') === 'DEBUG' ? 'selected' : ''}>DEBUG</option>
                            <option value="INFO" ${(((_59 = config.debug) === null || _59 === void 0 ? void 0 : _59.log_level) || 'INFO') === 'INFO' ? 'selected' : ''}>INFO</option>
                            <option value="WARNING" ${(((_60 = config.debug) === null || _60 === void 0 ? void 0 : _60.log_level) || '') === 'WARNING' ? 'selected' : ''}>WARNING</option>
                            <option value="ERROR" ${(((_61 = config.debug) === null || _61 === void 0 ? void 0 : _61.log_level) || '') === 'ERROR' ? 'selected' : ''}>ERROR</option>
                            <option value="CRITICAL" ${(((_62 = config.debug) === null || _62 === void 0 ? void 0 : _62.log_level) || '') === 'CRITICAL' ? 'selected' : ''}>CRITICAL</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="debug.log_to_file" ${((_63 = config.debug) === null || _63 === void 0 ? void 0 : _63.log_to_file) ? 'checked' : ''}>
                            将日志写入文件
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label for="debug.log_file">日志文件路径</label>
                        <input type="text" id="debug.log_file" value="${((_64 = config.debug) === null || _64 === void 0 ? void 0 : _64.log_file) || 'conversion.log'}">
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="debug.timing" ${((_65 = config.debug) === null || _65 === void 0 ? void 0 : _65.timing) !== false ? 'checked' : ''}>
                            记录处理时间统计
                        </label>
                    </div>
                </div>
                
                <div class="button-container">
                    <button id="cancelButton">取消</button>
                    <button id="saveButton">应用设置并转换</button>
                </div>
            </div>
            
            <script nonce="${nonce}">
                // 立即初始化vscode API
                const vscode = acquireVsCodeApi();
                
                // 保存状态
                vscode.setState({ loaded: true });
                
                // 页面加载完成后执行所有初始化逻辑
                document.addEventListener('DOMContentLoaded', function() {
                    console.log('配置面板DOM加载完成');
                    
                    // 标签页切换
                    document.querySelectorAll('.tab').forEach(tab => {
                        tab.addEventListener('click', () => {
                            // 移除所有活动状态
                            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                            
                            // 添加活动状态到当前标签
                            tab.classList.add('active');
                            const tabId = tab.getAttribute('data-tab');
                            document.getElementById(tabId).classList.add('active');
                        });
                    });
                    
                    // 更新颜色预览
                    document.querySelectorAll('input[type="text"]').forEach(input => {
                        if (input.value.startsWith('#')) {
                            const previewSpan = input.nextElementSibling;
                            if (previewSpan && previewSpan.classList.contains('color-preview')) {
                                input.addEventListener('input', () => {
                                    previewSpan.style.backgroundColor = input.value;
                                });
                            }
                        }
                    });
                    
                    // 保存配置
                    document.getElementById('saveButton').addEventListener('click', () => {
                        // 向扩展发送消息前的日志
                        console.log('发送配置到扩展...');
                        
                        // 构建配置对象
                        const config = {
                            fonts: {
                                default: document.getElementById('fonts.default').value,
                                headings: document.getElementById('fonts.headings').value,
                                code: document.getElementById('fonts.code').value
                            },
                            sizes: {
                                default: parseFloat(document.getElementById('sizes.default').value),
                                code: parseFloat(document.getElementById('sizes.code').value),
                                heading1: parseFloat(document.getElementById('sizes.heading1').value),
                                heading2: parseFloat(document.getElementById('sizes.heading2').value),
                                heading3: parseFloat(document.getElementById('sizes.heading3').value),
                                heading4: parseFloat(document.getElementById('sizes.heading4').value),
                                heading5: parseFloat(document.getElementById('sizes.heading5').value),
                                heading6: parseFloat(document.getElementById('sizes.heading6').value)
                            },
                            colors: {
                                default: document.getElementById('colors.default').value,
                                headings: document.getElementById('colors.headings').value,
                                code: document.getElementById('colors.code').value,
                                link: document.getElementById('colors.link').value
                            },
                            paragraph: {
                                line_spacing: parseFloat(document.getElementById('paragraph.line_spacing').value),
                                space_before: parseFloat(document.getElementById('paragraph.space_before').value),
                                space_after: parseFloat(document.getElementById('paragraph.space_after').value),
                                first_line_indent: parseFloat(document.getElementById('paragraph.first_line_indent').value)
                            },
                            chinese: {
                                convert_to_traditional: document.getElementById('chinese.convert_to_traditional').checked,
                                punctuation_spacing: document.getElementById('chinese.punctuation_spacing').checked,
                                auto_spacing: document.getElementById('chinese.auto_spacing').checked
                            },
                            table_styles: {
                                even_row_color: document.getElementById('table_styles.even_row_color').value,
                                odd_row_color: document.getElementById('table_styles.odd_row_color').value,
                                header_bg_color: document.getElementById('table_styles.header_bg_color').value,
                                border_color: document.getElementById('table_styles.border_color').value,
                                cell_height: document.getElementById('table_styles.cell_height').value,
                                table_width: document.getElementById('table_styles.table_width').value
                            },
                            enhanced_table_styles: {
                                style: document.getElementById('enhanced_table_styles.style').value,
                                width: parseFloat(document.getElementById('enhanced_table_styles.width').value),
                                border: document.getElementById('enhanced_table_styles.border').checked,
                                border_size: parseFloat(document.getElementById('enhanced_table_styles.border_size').value),
                                border_color: document.getElementById('enhanced_table_styles.border_color').value,
                                header_bg_color: document.getElementById('enhanced_table_styles.header_bg_color').value,
                                even_row_color: document.getElementById('enhanced_table_styles.even_row_color').value,
                                text_align: document.getElementById('enhanced_table_styles.text_align').value,
                                vertical_align: document.getElementById('enhanced_table_styles.vertical_align').value,
                                cell_padding: 0,
                                cell_height: 0.95,
                                autofit: false,
                                first_row_as_header: true,
                                keep_header_visible: true,
                                row_height: {
                                    default: 0.95,
                                    header: 0.95,
                                    min: 0.5,
                                    max: 5.0,
                                    auto_adjust: true
                                }
                            },
                            markdown: {
                                extensions: [
                                    document.getElementById('markdown.extensions.tables').checked ? 'tables' : null,
                                    document.getElementById('markdown.extensions.fenced_code').checked ? 'fenced_code' : null,
                                    document.getElementById('markdown.extensions.codehilite').checked ? 'codehilite' : null,
                                    document.getElementById('markdown.extensions.toc').checked ? 'toc' : null,
                                    document.getElementById('markdown.extensions.footnotes').checked ? 'footnotes' : null,
                                    document.getElementById('markdown.extensions.nl2br').checked ? 'nl2br' : null
                                ].filter(ext => ext !== null),
                                extension_configs: {
                                    codehilite: {
                                        linenums: document.getElementById('markdown.extension_configs.codehilite.linenums').checked,
                                        use_pygments: document.getElementById('markdown.extension_configs.codehilite.use_pygments').checked
                                    }
                                }
                            },
                            document: {
                                page_size: document.getElementById('document.page_size').value,
                                margin_top: parseFloat(document.getElementById('document.margin_top').value),
                                margin_bottom: parseFloat(document.getElementById('document.margin_bottom').value),
                                margin_left: parseFloat(document.getElementById('document.margin_left').value),
                                margin_right: parseFloat(document.getElementById('document.margin_right').value),
                                header: document.getElementById('document.header').value,
                                footer: document.getElementById('document.footer').value,
                                generate_toc: document.getElementById('document.generate_toc').checked
                            },
                            output: {
                                keepHtml: document.getElementById('output.keepHtml').checked
                            },
                            debug: {
                                enabled: document.getElementById('debug.enabled').checked,
                                log_level: document.getElementById('debug.log_level').value,
                                log_to_file: document.getElementById('debug.log_to_file').checked,
                                log_file: document.getElementById('debug.log_file').value,
                                print_html_structure: false,
                                verbose_element_info: false,
                                timing: document.getElementById('debug.timing').checked
                            }
                        };
                        
                        vscode.postMessage({
                            command: 'saveConfig',
                            config: config
                        });
                    });
                    
                    // 取消
                    document.getElementById('cancelButton').addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'cancel'
                        });
                    });
                });
            </script>
        </body>
        </html>`;
    }
    _getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
exports.ConfigPanel = ConfigPanel;
//# sourceMappingURL=configPanel.js.map