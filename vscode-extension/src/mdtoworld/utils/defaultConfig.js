/**
 * @description 完整默认配置模块
 * 单一配置定义源，所有模块统一从此读取默认值
 * 修改样式只需修改此文件一处
 */
const COMPLETE_DEFAULTS = {
  // 字体配置
  fonts: {
    default: 'SimSun',
    code: 'Consolas',
    headings: 'SimHei',
    english: 'Times New Roman',
    icon: 'Segoe UI Emoji'
  },

  // 字号配置（磅/pt）
  sizes: {
    default: 11,
    code: 10,
    heading1: 15,
    heading2: 13,
    heading3: 12,
    heading4: 12,
    heading5: 12,
    heading6: 12,
    icon: 12
  },

  // 颜色配置
  colors: {
    default: '#000000',
    headings: '#000000',
    code: '#333333',
    link: '#0563C1',
    icon: '#666666'
  },

  // 段落配置
  paragraph: {
    line_spacing: 1.5,
    space_before: 3,
    space_after: 3,
    first_line_indent: 2,
    // 标题段前/段后间距（磅/pt）：政府公文规范标题与正文需有足够层级间距
    heading_before: 12,
    heading_after: 6,
    // 字符宽度系数：中文为1.0，英文为0.5，混合文本取中间值
    // 默认0.85适合中文字符为主的文档
    char_width_ratio: 0.85
  },

  // 中文配置
  chinese: {
    convert_to_traditional: false,
    punctuation_spacing: true,
    auto_spacing: true
  },

  // 表格样式
  table_styles: {
    even_row_color: '#ffffff',
    odd_row_color: '#ffffff',
    header_bg_color: '#E0E0E0',
    border_color: '#BFBFBF',
    cell_height: '0.95em',
    table_width: '100%'
  },

  // 增强表格样式
  enhanced_table_styles: {
    style: 'Table Grid',
    width: 16.0,
    border: true,
    border_size: 1,
    border_color: '#BFBFBF',
    header_bg_color: '#D9D9D9',
    header_font_color: '#000000',
    even_row_color: '#FFFFFF',
    text_align: 'left',
    vertical_align: 'center',
    cell_padding: 60,
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

  // 文档配置
  document: {
    // 默认 A3 纸张：内容区更大，一页容纳更多内容，减少 A4 每页空余与打印浪费
    page_size: 'A3',
    orientation: 'portrait',
    margin_top: 2.54,
    margin_bottom: 2.54,
    margin_left: 3.17,
    margin_right: 3.17,
    generate_toc: false,
    toc_depth: 3,
    generate_cover: true,
    generate_cover_without_toc: false,
    show_horizontal_rules: true,
    show_page_number: true,
    header: '',
    footer: '',
    language: 'zh-CN'
  },

  // 图表配置
  charts: {
    enabled: true,
    service: 'kroki',
    kroki_url: 'https://kroki.io',
    output_format: 'png',
    cache_enabled: true,
    cache_dir: './chart_cache',
    timeout: 10000,
    supported_types: [
      'mermaid', 'plantuml', 'graphviz', 'blockdiag', 'seqdiag',
      'actdiag', 'nwdiag', 'c4plantuml', 'ditaa', 'erd',
      'nomnoml', 'svgbob', 'wavedrom'
    ]
  },

  // Markdown 配置
  markdown: {
    extensions: [
      'tables',
      'fenced_code',
      'codehilite',
      'footnotes',
      'nl2br'
    ],
    extension_configs: {
      codehilite: {
        linenums: false,
        use_pygments: true
      }
    }
  },

  // 输出配置
  output: {
    keepHtml: false
  },

  // 图片配置
  images: {
    preserve: true,
    max_width: 800
  },

  // 调试配置
  debug: {
    enabled: false,
    log_level: 'INFO',
    log_to_file: false,
    log_file: 'conversion.log',
    print_html_structure: false,
    verbose_element_info: false,
    timing: true
  },

  // 通用配置
  creator: 'Markdown To Word Converter',
  title: 'Converted Document',
  description: 'Document converted from Markdown/HTML'
};

/**
 * 深度合并两个对象
 * 递归合并嵌套对象，替代浅层 Object.assign
 * @param {Object} target - 基准对象（默认值）
 * @param {Object} source - 用户配置（覆盖基准值）
 * @returns {Object} - 合并后的新对象
 */
function deepMerge(target, source) {
  const result = { ...target };
  if (!source || typeof source !== 'object') return result;

  for (const key of Object.keys(source)) {
    if (source[key] === undefined || source[key] === null) continue;

    if (
      typeof result[key] === 'object' &&
      typeof source[key] === 'object' &&
      !Array.isArray(result[key]) &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

module.exports = { COMPLETE_DEFAULTS, deepMerge };
