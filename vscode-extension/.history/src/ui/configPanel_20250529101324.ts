/**
 * @description 配置面板UI组件
 * 用于在转换前配置Word文档的样式和字体
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml'; // 需要添加这个依赖
import { NodeMarkdownConverter } from '../core/nodeConverter';

/**
 * @description 配置类型定义，与config_example.yaml完全一致
 */
export interface IDocumentConfig {
    fonts: {
        default: string;
        code: string;
        headings: string;
    };
    sizes: {
        default: number;
        code: number;
        heading1: number;
        heading2: number;
        heading3: number;
        heading4: number;
        heading5: number;
        heading6: number;
    };
    colors: {
        default: string;
        headings: string;
        code: string;
        link: string;
    };
    paragraph: {
        line_spacing: number;
        space_before: number;
        space_after: number;
        first_line_indent: number;
    };
    chinese: {
        convert_to_traditional: boolean;
        punctuation_spacing: boolean;
        auto_spacing: boolean;
    };
    table_styles: {
        even_row_color: string;
        odd_row_color: string;
        header_bg_color: string;
        border_color: string;
        cell_height: string;
        table_width: string;
    };
    enhanced_table_styles: {
        style: string;
        width: number;
        border: boolean;
        border_size: number;
        border_color: string;
        header_bg_color: string;
        even_row_color: string;
        text_align: string;
        vertical_align: string;
        cell_padding: number;
        cell_height: number;
        autofit: boolean;
        first_row_as_header: boolean;
        keep_header_visible: boolean;
        row_height: {
            default: number;
            header: number;
            min: number;
            max: number;
            auto_adjust: boolean;
        };
    };
    markdown: {
        extensions: string[];
        extension_configs: {
            codehilite: {
                linenums: boolean;
                use_pygments: boolean;
            };
        };
    };
    document: {
        page_size: string;
        margin_top: number;
        margin_bottom: number;
        margin_left: number;
        margin_right: number;
        header: string;
        footer: string;
        generate_toc: boolean;
        show_horizontal_rules: boolean;
    };
    output: {
        keepHtml: boolean;  // 是否保留中间HTML文件
    };
    debug: {
        enabled: boolean;
        log_level: string;
        log_to_file: boolean;
        log_file: string;
        print_html_structure: boolean;
        verbose_element_info: boolean;
        timing: boolean;
    };
}

/**
 * @description 配置面板类
 */
export class ConfigPanel {
    public static currentPanel: ConfigPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private _inputFile: string;
    private _onConfigDone: (config: IDocumentConfig, cancelled: boolean) => void;
    private _extensionPath: string;
    private _defaultConfig: any;
    private _configFilePath: string;

    /**
     * @description 私有构造函数，通过静态方法创建实例
     */
    private constructor(
        panel: vscode.WebviewPanel,
        extensionPath: string,
        inputFile: string,
        onConfigDone: (config: IDocumentConfig, cancelled: boolean) => void
    ) {
        this._panel = panel;
        this._extensionPath = extensionPath;
        this._inputFile = inputFile;
        this._onConfigDone = onConfigDone;

        // 获取统一的配置文件路径
        this._configFilePath = NodeMarkdownConverter.getInstance().getConfigFilePath();

        // 调试输出初始化信息
        console.log(`ConfigPanel初始化: ${this._inputFile}, 扩展路径: ${this._extensionPath}, 配置文件: ${this._configFilePath}`);

        // 加载默认配置
        this._loadDefaultConfig();

        // 设置Webview内容
        this._update();

        // 监听面板关闭事件
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // 处理Webview发送的消息
        this._panel.webview.onDidReceiveMessage(
            message => {
                console.log('接收到WebView消息:', message);
                switch (message.command) {
                    case 'saveConfig':
                        console.log('保存配置:', message.config);
                        // 保存用户配置
                        this._saveUserConfig(message.config);
                        // 通知外部处理逻辑
                        this._onConfigDone(message.config, false);
                        this._panel.dispose();
                        break;
                    case 'cancel':
                        console.log('取消配置');
                        this._onConfigDone({} as IDocumentConfig, true);
                        this._panel.dispose();
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    /**
     * @description 加载默认配置文件
     */
    private _loadDefaultConfig() {
        try {
            // 首先尝试从统一配置文件加载
            if (fs.existsSync(this._configFilePath)) {
                console.log('从统一配置文件加载:', this._configFilePath);
                const configContent = fs.readFileSync(this._configFilePath, 'utf8');
                this._defaultConfig = yaml.load(configContent);
                console.log('成功加载配置文件');
                return;
            }
            
            // 如果统一配置文件不存在，尝试从用户配置中加载
            const savedConfig = this._loadUserConfig();
            if (savedConfig) {
                console.log('从用户配置中加载配置');
                this._defaultConfig = savedConfig;
                return;
            }
            
            // 如果没有用户配置，则加载示例配置文件
            const configPath = path.join(this._extensionPath, 'nodejs', 'config_example.yaml');
            console.log('尝试加载示例配置文件:', configPath);
            
            if (fs.existsSync(configPath)) {
                const configContent = fs.readFileSync(configPath, 'utf8');
                this._defaultConfig = yaml.load(configContent);
                console.log('成功加载示例配置文件');
                
                // 保存到统一配置文件
                this._saveConfigToFile(this._defaultConfig, this._configFilePath);
            } else {
                console.error('配置文件不存在:', configPath);
                this._defaultConfig = {
                    fonts: { default: '微软雅黑', headings: '微软雅黑', code: 'Courier New' },
                    sizes: { default: 12, code: 10 },
                    colors: { default: '#000000', headings: '#000000', code: '#333333', link: '#0563C1' }
                };
            }
        } catch (error) {
            console.error('加载配置文件失败:', error);
            this._defaultConfig = {
                fonts: { default: '微软雅黑', headings: '微软雅黑', code: 'Courier New' },
                sizes: { default: 12, code: 10 },
                colors: { default: '#000000', headings: '#000000', code: '#333333', link: '#0563C1' }
            };
        }
    }

    /**
     * @description 从用户设置中加载配置
     * @returns 用户配置对象或 null
     */
    private _loadUserConfig(): IDocumentConfig | null {
        try {
            const config = vscode.workspace.getConfiguration('markdown-to-word');
            const savedConfig = config.get('markdownToWordUserConfig');
            
            if (savedConfig && typeof savedConfig === 'object') {
                // 直接使用对象
                return savedConfig as IDocumentConfig;
            }
            return null;
        } catch (error) {
            console.error('加载用户配置失败:', error);
            return null;
        }
    }

    /**
     * @description 保存用户配置到设置和文件
     * @param config 用户配置对象
     */
    private _saveUserConfig(config: IDocumentConfig): void {
        try {
            // 将配置保存到 VS Code 设置中
            const vscodeConfig = vscode.workspace.getConfiguration('markdown-to-word');
            vscodeConfig.update('markdownToWordUserConfig', config, vscode.ConfigurationTarget.Global)
                .then(() => {
                    console.log('用户配置已保存到VS Code设置');
                    
                    // 同时保存到统一配置文件
                    this._saveConfigToFile(config, this._configFilePath);
                    
                    // 通知NodeMarkdownConverter更新配置
                    NodeMarkdownConverter.getInstance().saveConfig(config)
                        .catch((err: Error) => {
                            console.error('通知转换器更新配置失败:', err);
                        });
                    
                }, (error: Error) => {
                    console.error('保存配置到VS Code设置失败:', error);
                });
        } catch (error) {
            console.error('保存用户配置失败:', error);
            vscode.window.showErrorMessage(`保存配置失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * @description 保存配置到文件
     * @param config 配置对象
     * @param filePath 文件路径
     */
    private _saveConfigToFile(config: any, filePath: string): void {
        try {
            // 确保目录存在
            const dirPath = path.dirname(filePath);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            
            // 将配置对象转换为YAML格式
            const yamlStr = yaml.dump(config, {
                indent: 2,
                lineWidth: -1,
                noRefs: true
            });
            
            // 添加注释头
            const yamlWithComments = `# Markdown to Word 配置文件
# 此文件由VS Code扩展自动生成和维护
# 上次更新时间: ${new Date().toISOString()}

${yamlStr}`;
            
            // 写入文件
            fs.writeFileSync(filePath, yamlWithComments, 'utf8');
            console.log('配置已保存到文件:', filePath);
        } catch (error) {
            console.error('保存配置到文件失败:', error);
        }
    }

    /**
     * @description 创建或显示配置面板
     */
    public static createOrShow(
        extensionPath: string,
        inputFile: string,
        onConfigDone: (config: IDocumentConfig, cancelled: boolean) => void
    ): ConfigPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // 如果已经有面板，直接显示
        if (ConfigPanel.currentPanel) {
            ConfigPanel.currentPanel._panel.reveal(column);
            ConfigPanel.currentPanel._inputFile = inputFile;
            ConfigPanel.currentPanel._onConfigDone = onConfigDone;
            ConfigPanel.currentPanel._update();
            return ConfigPanel.currentPanel;
        }

        // 创建新面板
        const panel = vscode.window.createWebviewPanel(
            'configPanel',
            '配置Word文档样式',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(extensionPath),
                    vscode.Uri.file(path.join(extensionPath, 'media')),
                    vscode.Uri.file(path.join(extensionPath, 'scripts'))
                ]
            }
        );

        ConfigPanel.currentPanel = new ConfigPanel(panel, extensionPath, inputFile, onConfigDone);
        return ConfigPanel.currentPanel;
    }

    /**
     * @description 处理面板关闭
     */
    public dispose() {
        ConfigPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    /**
     * @description 更新面板内容
     */
    private _update() {
        this._panel.title = `配置 - ${path.basename(this._inputFile)}`;
        this._panel.webview.html = this._getHtmlForWebview();
    }

    /**
     * @description 生成Webview的HTML内容
     */
    private _getHtmlForWebview() {
        // 从默认配置中获取值
        const config = this._defaultConfig || {};
        
        // 输出调试信息
        console.log('加载配置:', config);
        console.log('扩展路径:', this._extensionPath);
        console.log('输入文件:', this._inputFile);
        
        // 为webview内容创建nonce
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
                
                .form-help {
                    display: block;
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 4px;
                    font-style: italic;
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
                        <input type="text" id="fonts.default" value="${config.fonts?.default || '微软雅黑'}">
                    </div>
                    
                    <div class="form-group">
                        <label for="fonts.headings">标题字体</label>
                        <input type="text" id="fonts.headings" value="${config.fonts?.headings || '微软雅黑'}">
                    </div>
                    
                    <div class="form-group">
                        <label for="fonts.code">代码字体</label>
                        <input type="text" id="fonts.code" value="${config.fonts?.code || 'Courier New'}">
                    </div>
                    
                    <h3 class="section-title">字号设置</h3>
                    
                    <div class="form-group">
                        <label for="sizes.default">正文字号 (pt)</label>
                        <input type="number" id="sizes.default" min="8" max="72" value="${config.sizes?.default || 12}">
                    </div>
                    
                    <div class="form-group">
                        <label for="sizes.code">代码字号 (pt)</label>
                        <input type="number" id="sizes.code" min="6" max="72" value="${config.sizes?.code || 10}">
                    </div>
                    
                    <h3 class="section-title">颜色设置</h3>
                    
                    <div class="form-group">
                        <label for="colors.default">正文颜色</label>
                        <input type="text" id="colors.default" value="${config.colors?.default || '#000000'}">
                        <span class="color-preview" style="background-color: ${config.colors?.default || '#000000'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="colors.headings">标题颜色</label>
                        <input type="text" id="colors.headings" value="${config.colors?.headings || '#000000'}">
                        <span class="color-preview" style="background-color: ${config.colors?.headings || '#000000'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="colors.code">代码颜色</label>
                        <input type="text" id="colors.code" value="${config.colors?.code || '#333333'}">
                        <span class="color-preview" style="background-color: ${config.colors?.code || '#333333'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="colors.link">链接颜色</label>
                        <input type="text" id="colors.link" value="${config.colors?.link || '#0563C1'}">
                        <span class="color-preview" style="background-color: ${config.colors?.link || '#0563C1'};"></span>
                    </div>
                </div>
                
                <!-- 段落与中文 -->
                <div class="tab-content" id="paragraph">
                    <h3 class="section-title">段落设置</h3>
                    
                    <div class="form-group">
                        <label for="paragraph.line_spacing">行间距</label>
                        <input type="number" id="paragraph.line_spacing" min="1" max="3" step="0.1" value="${config.paragraph?.line_spacing || 1.5}">
                    </div>
                    
                    <div class="form-group">
                        <label for="paragraph.space_before">段前间距 (pt)</label>
                        <input type="number" id="paragraph.space_before" min="0" max="72" value="${config.paragraph?.space_before || 0}">
                    </div>
                    
                    <div class="form-group">
                        <label for="paragraph.space_after">段后间距 (pt)</label>
                        <input type="number" id="paragraph.space_after" min="0" max="72" value="${config.paragraph?.space_after || 6}">
                    </div>
                    
                    <div class="form-group">
                        <label for="paragraph.first_line_indent">首行缩进字符数</label>
                        <input type="number" id="paragraph.first_line_indent" min="0" max="10" value="${config.paragraph?.first_line_indent || 0}">
                    </div>
                    
                    <h3 class="section-title">中文设置</h3>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="chinese.convert_to_traditional" ${config.chinese?.convert_to_traditional !== false ? 'checked' : ''}>
                            转换为繁体中文
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="chinese.punctuation_spacing" ${config.chinese?.punctuation_spacing !== false ? 'checked' : ''}>
                            优化标点符号间距
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="chinese.auto_spacing" ${config.chinese?.auto_spacing !== false ? 'checked' : ''}>
                            中英文之间自动添加空格
                        </label>
                    </div>
                </div>
                
                <!-- 表格样式 -->
                <div class="tab-content" id="table">
                    <h3 class="section-title">HTML表格样式</h3>
                    
                    <div class="form-group">
                        <label for="table_styles.even_row_color">偶数行背景色</label>
                        <input type="text" id="table_styles.even_row_color" value="${config.table_styles?.even_row_color || '#f2f2f2'}">
                        <span class="color-preview" style="background-color: ${config.table_styles?.even_row_color || '#f2f2f2'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="table_styles.odd_row_color">奇数行背景色</label>
                        <input type="text" id="table_styles.odd_row_color" value="${config.table_styles?.odd_row_color || '#ffffff'}">
                        <span class="color-preview" style="background-color: ${config.table_styles?.odd_row_color || '#ffffff'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="table_styles.header_bg_color">表头背景色</label>
                        <input type="text" id="table_styles.header_bg_color" value="${config.table_styles?.header_bg_color || '#e0e0e0'}">
                        <span class="color-preview" style="background-color: ${config.table_styles?.header_bg_color || '#e0e0e0'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="table_styles.border_color">边框颜色</label>
                        <input type="text" id="table_styles.border_color" value="${config.table_styles?.border_color || '#dddddd'}">
                        <span class="color-preview" style="background-color: ${config.table_styles?.border_color || '#dddddd'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="table_styles.cell_height">单元格高度</label>
                        <input type="text" id="table_styles.cell_height" value="${config.table_styles?.cell_height || '0.95em'}">
                    </div>
                    
                    <div class="form-group">
                        <label for="table_styles.table_width">表格宽度</label>
                        <input type="text" id="table_styles.table_width" value="${config.table_styles?.table_width || '100%'}">
                    </div>
                    
                    <h3 class="section-title">Word表格样式</h3>
                    
                    <div class="form-group">
                        <label for="enhanced_table_styles.style">表格样式名称</label>
                        <input type="text" id="enhanced_table_styles.style" value="${config.enhanced_table_styles?.style || 'Table Grid'}">
                    </div>
                    
                    <div class="form-group">
                        <label for="enhanced_table_styles.width">表格宽度(厘米)</label>
                        <input type="number" id="enhanced_table_styles.width" min="1" max="30" step="0.1" value="${config.enhanced_table_styles?.width || 16.0}">
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="enhanced_table_styles.border" ${config.enhanced_table_styles?.border !== false ? 'checked' : ''}>
                            显示边框
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label for="enhanced_table_styles.border_size">边框粗细(磅)</label>
                        <input type="number" id="enhanced_table_styles.border_size" min="0.5" max="6" step="0.5" value="${config.enhanced_table_styles?.border_size || 1}">
                    </div>
                    
                    <div class="form-group">
                        <label for="enhanced_table_styles.border_color">边框颜色</label>
                        <input type="text" id="enhanced_table_styles.border_color" value="${config.enhanced_table_styles?.border_color || '#dddddd'}">
                        <span class="color-preview" style="background-color: ${config.enhanced_table_styles?.border_color || '#dddddd'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="enhanced_table_styles.header_bg_color">表头背景色</label>
                        <input type="text" id="enhanced_table_styles.header_bg_color" value="${config.enhanced_table_styles?.header_bg_color || '#E7E6E6'}">
                        <span class="color-preview" style="background-color: ${config.enhanced_table_styles?.header_bg_color || '#E7E6E6'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="enhanced_table_styles.even_row_color">偶数行背景色</label>
                        <input type="text" id="enhanced_table_styles.even_row_color" value="${config.enhanced_table_styles?.even_row_color || '#F2F2F2'}">
                        <span class="color-preview" style="background-color: ${config.enhanced_table_styles?.even_row_color || '#F2F2F2'};"></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="enhanced_table_styles.text_align">文本水平对齐</label>
                        <select id="enhanced_table_styles.text_align">
                            <option value="left" ${(config.enhanced_table_styles?.text_align || 'left') === 'left' ? 'selected' : ''}>左对齐</option>
                            <option value="center" ${(config.enhanced_table_styles?.text_align || '') === 'center' ? 'selected' : ''}>居中</option>
                            <option value="right" ${(config.enhanced_table_styles?.text_align || '') === 'right' ? 'selected' : ''}>右对齐</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="enhanced_table_styles.vertical_align">文本垂直对齐</label>
                        <select id="enhanced_table_styles.vertical_align">
                            <option value="top" ${(config.enhanced_table_styles?.vertical_align || '') === 'top' ? 'selected' : ''}>顶部对齐</option>
                            <option value="center" ${(config.enhanced_table_styles?.vertical_align || 'center') === 'center' ? 'selected' : ''}>居中</option>
                            <option value="bottom" ${(config.enhanced_table_styles?.vertical_align || '') === 'bottom' ? 'selected' : ''}>底部对齐</option>
                        </select>
                    </div>
                </div>
                
                <!-- 文档设置 -->
                <div class="tab-content" id="document">
                    <h3 class="section-title">页面设置</h3>
                    
                    <div class="form-group">
                        <label for="document.page_size">页面大小</label>
                        <select id="document.page_size">
                            <option value="A4" ${(config.document?.page_size || 'A4') === 'A4' ? 'selected' : ''}>A4</option>
                            <option value="Letter" ${(config.document?.page_size || 'A4') === 'Letter' ? 'selected' : ''}>Letter</option>
                            <option value="Legal" ${(config.document?.page_size || 'A4') === 'Legal' ? 'selected' : ''}>Legal</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="document.margin_top">上边距 (英寸)</label>
                        <input type="number" id="document.margin_top" min="0.1" max="5" step="0.1" value="${config.document?.margin_top || 1}">
                    </div>
                    
                    <div class="form-group">
                        <label for="document.margin_bottom">下边距 (英寸)</label>
                        <input type="number" id="document.margin_bottom" min="0.1" max="5" step="0.1" value="${config.document?.margin_bottom || 1}">
                    </div>
                    
                    <div class="form-group">
                        <label for="document.margin_left">左边距 (英寸)</label>
                        <input type="number" id="document.margin_left" min="0.1" max="5" step="0.1" value="${config.document?.margin_left || 1}">
                    </div>
                    
                    <div class="form-group">
                        <label for="document.margin_right">右边距 (英寸)</label>
                        <input type="number" id="document.margin_right" min="0.1" max="5" step="0.1" value="${config.document?.margin_right || 1}">
                    </div>
                    
                    <h3 class="section-title">内容设置</h3>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="document.generate_toc" ${config.document?.generate_toc !== false ? 'checked' : ''}>
                            生成目录
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="document.show_horizontal_rules" ${config.document?.show_horizontal_rules !== false ? 'checked' : ''}>
                            显示章节分隔线
                        </label>
                        <span class="form-help">在标题下方显示水平分隔线，用于区分不同章节</span>
                    </div>
                    
                    <div class="form-group">
                        <div class="checkbox-label">
                            <input type="checkbox" id="output.keepHtml" ${config.output?.keepHtml !== false ? 'checked' : ''}>
                            <label for="output.keepHtml">保留中间HTML文件</label>
                        </div>
                    </div>
                </div>
                
                <!-- Markdown设置 -->
                <div class="tab-content" id="markdown">
                    <h3 class="section-title">Markdown扩展</h3>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="markdown.extensions.tables" ${Array.isArray(config.markdown?.extensions) && config.markdown?.extensions.includes('tables') ? 'checked' : ''}>
                            启用表格支持
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="markdown.extensions.fenced_code" ${Array.isArray(config.markdown?.extensions) && config.markdown?.extensions.includes('fenced_code') ? 'checked' : ''}>
                            启用围栏式代码块
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="markdown.extensions.codehilite" ${Array.isArray(config.markdown?.extensions) && config.markdown?.extensions.includes('codehilite') ? 'checked' : ''}>
                            启用代码高亮
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="markdown.extensions.toc" ${Array.isArray(config.markdown?.extensions) && config.markdown?.extensions.includes('toc') ? 'checked' : ''}>
                            启用目录生成
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="markdown.extensions.footnotes" ${Array.isArray(config.markdown?.extensions) && config.markdown?.extensions.includes('footnotes') ? 'checked' : ''}>
                            启用脚注支持
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="markdown.extensions.nl2br" ${Array.isArray(config.markdown?.extensions) && config.markdown?.extensions.includes('nl2br') ? 'checked' : ''}>
                            将换行符转换为<br>标签
                        </label>
                    </div>
                    
                    <h3 class="section-title">代码高亮设置</h3>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="markdown.extension_configs.codehilite.linenums" ${config.markdown?.extension_configs?.codehilite?.linenums ? 'checked' : ''}>
                            显示行号
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="markdown.extension_configs.codehilite.use_pygments" ${config.markdown?.extension_configs?.codehilite?.use_pygments !== false ? 'checked' : ''}>
                            使用Pygments进行语法高亮
                        </label>
                    </div>
                </div>
                
                <!-- 高级设置 -->
                <div class="tab-content" id="advanced">
                    <h3 class="section-title">标题样式</h3>
                    
                    <div class="form-group">
                        <label for="sizes.heading1">一级标题字号 (pt)</label>
                        <input type="number" id="sizes.heading1" min="12" max="72" value="${config.sizes?.heading1 || 18}">
                    </div>
                    
                    <div class="form-group">
                        <label for="sizes.heading2">二级标题字号 (pt)</label>
                        <input type="number" id="sizes.heading2" min="12" max="72" value="${config.sizes?.heading2 || 16}">
                    </div>
                    
                    <div class="form-group">
                        <label for="sizes.heading3">三级标题字号 (pt)</label>
                        <input type="number" id="sizes.heading3" min="12" max="72" value="${config.sizes?.heading3 || 14}">
                    </div>
                    
                    <div class="form-group">
                        <label for="sizes.heading4">四级标题字号 (pt)</label>
                        <input type="number" id="sizes.heading4" min="12" max="72" value="${config.sizes?.heading4 || 12}">
                    </div>
                    
                    <div class="form-group">
                        <label for="sizes.heading5">五级标题字号 (pt)</label>
                        <input type="number" id="sizes.heading5" min="12" max="72" value="${config.sizes?.heading5 || 12}">
                    </div>
                    
                    <div class="form-group">
                        <label for="sizes.heading6">六级标题字号 (pt)</label>
                        <input type="number" id="sizes.heading6" min="12" max="72" value="${config.sizes?.heading6 || 12}">
                    </div>
                    
                    <h3 class="section-title">调试设置</h3>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="debug.enabled" ${config.debug?.enabled ? 'checked' : ''}>
                            启用调试模式
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label for="debug.log_level">日志级别</label>
                        <select id="debug.log_level">
                            <option value="DEBUG" ${(config.debug?.log_level || '') === 'DEBUG' ? 'selected' : ''}>DEBUG</option>
                            <option value="INFO" ${(config.debug?.log_level || 'INFO') === 'INFO' ? 'selected' : ''}>INFO</option>
                            <option value="WARNING" ${(config.debug?.log_level || '') === 'WARNING' ? 'selected' : ''}>WARNING</option>
                            <option value="ERROR" ${(config.debug?.log_level || '') === 'ERROR' ? 'selected' : ''}>ERROR</option>
                            <option value="CRITICAL" ${(config.debug?.log_level || '') === 'CRITICAL' ? 'selected' : ''}>CRITICAL</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="debug.log_to_file" ${config.debug?.log_to_file ? 'checked' : ''}>
                            将日志写入文件
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label for="debug.log_file">日志文件路径</label>
                        <input type="text" id="debug.log_file" value="${config.debug?.log_file || 'conversion.log'}">
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="debug.timing" ${config.debug?.timing !== false ? 'checked' : ''}>
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
                                header: '',
                                footer: '',
                                generate_toc: document.getElementById('document.generate_toc').checked,
                                show_horizontal_rules: document.getElementById('document.show_horizontal_rules').checked
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
    
    /**
     * @description 生成nonce值用于内容安全策略
     */
    private _getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
} 