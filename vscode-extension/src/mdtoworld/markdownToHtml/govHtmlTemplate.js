/**
 * @file govHtmlTemplate.js
 * @description 政府公文规范 HTML 渲染模板（单文件自包含、完全离线）
 *
 * 设计依据：
 * - 样式参考 Readmdvue 项目（/home/as-workstation01/Documents/project/Readmdvue/src/styles/）
 *   content-variables.css 已明确的政府公文规范：正文宋体系 serif、标题黑体系、
 *   正文首行缩进 2em、两端对齐（text-justify: inter-ideograph）、表格严谨无斑马纹。
 * - 去掉 Readmdvue 的苹果 Liquid Glass 花哨效果（text-shadow / 玻璃拟态 / hover 动画 /
 *   强调色渐变），保持黑白严谨的公文排版，杜绝"出戏"。
 * - 渲染：内嵌 marked.min.js（v15.0.12，UMD），浏览器打开时 JS 渲染 markdown 原文。
 * - 离线：marked / KaTeX 均内嵌进单文件，无任何外部 CDN 请求。
 * - 公式：检测到 $..$ / $$..$$ 时按需内嵌 KaTeX（katex.min.js + katex.min.css）。
 * - 目录：支持 [TOC] 标记，渲染后自动生成缩进式目录并注入。
 */

const fs = require('fs-extra');
const path = require('path');
const hljs = require('highlight.js/lib/common'); // Node 端代码高亮（36 种常用语言）

/**
 * 服务端代码高亮：将 markdown 原文中的 ```lang 代码块高亮为带 hljs span 的 HTML
 * （无需在浏览器内嵌 highlight.js，体积最优；高亮后由 marked 原样保留）
 * 特殊处理：mermaid 代码块跳过 hljs 高亮（保留原始源码，交给浏览器端 mermaid 渲染）
 * @param {string} markdown - markdown 原文
 * @returns {string} - 高亮后的 markdown（代码块替换为 <pre><code class="hljs ...">）
 */
function highlightMarkdownCode(markdown) {
  return String(markdown).replace(/```([\w+-]*)\n([\s\S]*?)```/g, (m, lang, code) => {
    const trimmed = code.replace(/\n$/, '');
    // mermaid：不做 hljs 高亮（hljs 无 mermaid 语法会误判为 CSS/HTML 污染源码），
    // 原样保留并标记 language-mermaid，浏览器端由内嵌 mermaid.min.js 渲染为 SVG
    if (lang && lang.toLowerCase() === 'mermaid') {
      return `<pre><code class="language-mermaid">${escapeHtml(trimmed)}</code></pre>`;
    }
    try {
      let highlighted;
      if (lang && hljs.getLanguage(lang.toLowerCase())) {
        highlighted = hljs.highlight(trimmed, { language: lang.toLowerCase() }).value;
      } else {
        highlighted = hljs.highlightAuto(trimmed).value;
      }
      return `<pre><code class="hljs language-${lang || ''}">${highlighted}</code></pre>`;
    } catch (e) {
      return m; // 高亮失败保留原样
    }
  });
}

/** HTML 转义（用于 mermaid 源码内嵌到 <pre> 时防止标签注入） */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 检测 markdown 原文是否包含 mermaid 代码块 */
function hasMermaid(markdown) {
  return /```\s*mermaid\s*\n/i.test(String(markdown || ''));
}

/** 读取 node_modules 内文件内容 */
function readModuleFile(pkgName, relPath) {
  try {
    const pkgDir = path.dirname(require.resolve(`${pkgName}/package.json`));
    return fs.readFileSync(path.join(pkgDir, relPath), 'utf-8');
  } catch (e) {
    // 兜底：相对本文件路径
    try {
      const fallback = path.join(__dirname, '..', '..', '..', 'node_modules', pkgName, relPath);
      return fs.readFileSync(fallback, 'utf-8');
    } catch (e2) {
      console.warn(`[govHtmlTemplate] 读取 ${pkgName}/${relPath} 失败: ${e2.message}`);
      return '';
    }
  }
}

/** 读取 marked.min.js 浏览器版（UMD，<script> 内嵌即用） */
function loadMarkedMin() {
  return readModuleFile('marked', 'marked.min.js');
}

/** 读取 katex.min.js 浏览器版 */
function loadKatexMin() {
  return readModuleFile('katex', 'dist/katex.min.js');
}

/** 读取 katex.min.css */
function loadKatexCss() {
  return readModuleFile('katex', 'dist/katex.min.css');
}

/** 读取 mermaid.min.js 浏览器版（UMD 全量包，含所有 diagram 类型，file:// 零动态 import） */
function loadMermaidMin() {
  // 候选路径（纯 fs 探测，避免 webpack 打包时 require.resolve 静态解析失败）：
  // 1. node_modules 正常安装（src 直跑：src/mdtoworld/markdownToHtml/../../.. = vscode-extension）
  // 2. 项目内 vendor/ —— 同一表达式自动覆盖两种运行时：
  //    - src 直跑：__dirname = src/mdtoworld/markdownToHtml/ → vendor/ 在旁
  //    - webpack 打包后：__dirname = dist/ → dist/vendor/（由 webpack afterEmit 复制）
  const candidates = [
    path.join(__dirname, '..', '..', '..', 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'),
    path.join(__dirname, 'vendor', 'mermaid.min.js')
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, 'utf-8');
      }
    } catch (e) {
      /* 尝试下一个 */
    }
  }
  console.warn('[govHtmlTemplate] 读取 mermaid.min.js 失败（node_modules 与 vendor 均不存在）');
  return '';
}

/**
 * 政府公文规范样式表
 * 黑色严谨、无阴影、无动画、无渐变；正文宋体、标题黑体；表格严谨全边框。
 */
const GOV_CSS = `
:root {
  /* 字体：正文宋体系 serif，标题黑体系（政府公文规范，与 Readmdvue 一致） */
  --gov-font-body: 'Noto Serif CJK SC', 'Source Han Serif SC', 'Source Han Serif CN',
    '仿宋', 'FangSong', '仿宋_GB2312', 'FangSong_GB2312',
    '宋体', 'SimSun', 'STSong', 'Times New Roman', serif;
  --gov-font-heading: 'Noto Sans CJK SC', 'Source Han Sans SC', 'Source Han Sans CN',
    '黑体', 'SimHei', 'PingFang SC', 'Microsoft YaHei', 'Microsoft YaHei UI', sans-serif;
  --gov-font-mono: 'SF Mono', 'Cascadia Code', Consolas, 'Courier New', monospace;

  /* 布局 */
  --gov-max-width: 1000px;
  --gov-font-size: 16px;
  --gov-line-height: 1.8;

  /* 颜色：黑白严谨，无强调色 */
  --gov-color-text: #1a1a1a;
  --gov-color-heading: #000000;
  --gov-color-secondary: #4a4a4a;
  --gov-color-border: #8a8a8a;
  --gov-color-border-light: #d0d0d0;
  --gov-color-table-header-bg: #eaeaea;
  --gov-color-code-bg: #f5f5f5;
  --gov-color-quote-bg: #f7f7f7;
  --gov-color-link: #0563c1;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--gov-font-body);
  font-size: var(--gov-font-size);
  line-height: var(--gov-line-height);
  color: var(--gov-color-text);
  background: #ffffff;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.gov-container {
  max-width: var(--gov-max-width);
  margin: 0 auto;
  padding: 48px 56px 80px;
}

/* ===== 标题：黑体、黑色、无阴影无动画（公文规范） ===== */
.gov-container h1,
.gov-container h2,
.gov-container h3,
.gov-container h4,
.gov-container h5,
.gov-container h6 {
  font-family: var(--gov-font-heading);
  font-weight: 700;
  line-height: 1.35;
  color: var(--gov-color-heading);
  margin: 1.6em 0 0.6em;
  scroll-margin-top: 20px;
}

.gov-container h1 {
  font-size: var(--gov-heading1-size, 1.5em);
  border-bottom: 1px solid #333333;
  padding-bottom: 0.3em;
}

.gov-container h2 {
  font-size: var(--gov-heading2-size, 1.25em);
  border-left: 4px solid #333333;
  padding-left: 0.5em;
}

.gov-container h3 { font-size: var(--gov-heading3-size, 1.1em); }
.gov-container h4 { font-size: var(--gov-heading4-size, 1em); }
.gov-container h5 { font-size: var(--gov-heading5-size, 0.95em); }
.gov-container h6 { font-size: var(--gov-heading6-size, 0.9em); }

/* ===== 正文段落：首行缩进 2 字符、两端对齐（公文规范） ===== */
.gov-container p {
  margin: 0 0 0.75em;
  text-align: justify;
  text-justify: inter-ideograph;
  text-indent: 2em;
}

/* 列表/引用/表格/目录/代码块内段落不缩进 */
.gov-container li p,
.gov-container blockquote p,
.gov-container td p,
.gov-container .gov-toc p {
  text-indent: 0;
}

/* ===== 列表 ===== */
.gov-container ul,
.gov-container ol {
  margin: 0.5em 0 1em;
  padding-left: 2em;
}

.gov-container li {
  margin: 0.25em 0;
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: normal;
}

/* ===== 表格：严谨全边框、表头浅灰居中、无斑马纹 ===== */
.gov-container table {
  border-collapse: collapse;
  width: 100%;
  max-width: 100%;
  table-layout: auto;
  margin: 1em 0;
  font-size: 0.95em;
}

.gov-container th,
.gov-container td {
  border: 1px solid var(--gov-color-border);
  padding: 8px 12px;
  text-align: left;
  vertical-align: top;
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: normal;
}

.gov-container th {
  background: var(--gov-color-table-header-bg);
  font-weight: 700;
  text-align: center;
  color: var(--gov-color-table-header-text, var(--gov-color-heading));
}

.gov-container tbody tr:nth-child(even) {
  background: transparent;
}

.gov-container tbody tr:hover {
  background: transparent;
}

/* ===== Mermaid 图表容器：居中、防溢出、黑白严谨 ===== */
.gov-container .gov-mermaid {
  margin: 1em 0;
  text-align: center;
  overflow-x: auto;
}

.gov-container .gov-mermaid svg {
  max-width: 100%;
  height: auto;
}

.gov-container .gov-mermaid-error {
  border: 1px solid #d33;
  background: #fdf2f2;
  color: #a00;
  padding: 8px 12px;
  font-size: 0.9em;
  margin: 1em 0;
  text-align: left;
}

/* ===== 图片点击放大（与 Readmdvue 一致：双击图片 → 全屏模态框） ===== */
.gov-container img {
  cursor: zoom-in;
}

.gov-image-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  cursor: zoom-out;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.gov-image-modal.show {
  opacity: 1;
}

.gov-image-modal .gov-image-modal-content {
  max-width: 94%;
  max-height: 94%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}

.gov-image-modal img {
  max-width: 90vw;
  max-height: 90vh;
  width: auto;
  height: auto;
  object-fit: contain;
  cursor: default;
  background: #ffffff;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

/* ===== 代码块：简洁灰底等宽，不做彩色高亮（公文不花哨） ===== */
.gov-container pre {
  background: var(--gov-color-code-bg);
  border: 1px solid var(--gov-color-border-light);
  border-radius: 3px;
  padding: 12px 16px;
  overflow-x: auto;
  font-size: 0.9em;
  line-height: 1.6;
  margin: 1em 0;
}

.gov-container code {
  font-family: var(--gov-font-mono);
  background: var(--gov-color-code-bg);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.92em;
}

.gov-container pre code {
  background: transparent;
  padding: 0;
  border-radius: 0;
  font-size: 1em;
}

/* ===== 代码高亮主题（GitHub 风格浅色，黑白灰为主，公文不花哨） ===== */
.hljs {
  color: #24292e;
}
.hljs-keyword,
.hljs-selector-tag,
.hljs-doctag,
.hljs-name {
  color: #d73a49;
}
.hljs-string,
.hljs-regexp,
.hljs-addition {
  color: #032f62;
}
.hljs-title,
.hljs-section,
.hljs-title.class_,
.hljs-title.function_ {
  color: #6f42c1;
}
.hljs-number,
.hljs-literal,
.hljs-symbol,
.hljs-bullet {
  color: #005cc5;
}
.hljs-comment,
.hljs-quote {
  color: #6a737d;
  font-style: italic;
}
.hljs-variable,
.hljs-template-variable,
.hljs-attr,
.hljs-attribute {
  color: #e36209;
}
.hljs-built_in,
.hljs-type {
  color: #005cc5;
}
.hljs-meta {
  color: #6a737d;
}
.hljs-emphasis {
  font-style: italic;
}
.hljs-strong {
  font-weight: 700;
}

/* ===== 引用：左侧深灰线 + 浅灰底 ===== */
.gov-container blockquote {
  margin: 1em 0;
  padding: 0.5em 1em;
  background: var(--gov-color-quote-bg);
  border-left: 3px solid var(--gov-color-border);
  color: var(--gov-color-secondary);
}

/* ===== 链接：严谨下划线，不花哨 ===== */
.gov-container a {
  color: var(--gov-color-link);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ===== 图片 ===== */
.gov-container img {
  max-width: 100%;
  height: auto;
}

/* ===== 水平线 ===== */
.gov-container hr {
  border: none;
  border-top: 1px solid var(--gov-color-border);
  margin: 1.5em 0;
}

/* ===== 目录：简洁容器 + 缩进层级 ===== */
.gov-toc {
  border: 1px solid var(--gov-color-border-light);
  background: #fafafa;
  padding: 1em 1.5em;
  margin: 1em 0 2em;
}

.gov-toc-title {
  font-family: var(--gov-font-heading);
  font-weight: 700;
  font-size: 1.1em;
  color: var(--gov-color-heading);
  text-align: center;
  letter-spacing: 0.5em;
  margin-bottom: 0.8em;
}

.gov-toc .gov-toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.gov-toc .gov-toc-list ul {
  list-style: none;
  margin: 0;
  padding-left: 1.5em;
}

.gov-toc li {
  margin: 0.2em 0;
}

.gov-toc a {
  color: var(--gov-color-text);
  text-decoration: none;
}

.gov-toc a:hover {
  color: var(--gov-color-link);
  text-decoration: underline;
}

/* ===== 公式（KaTeX 渲染后补充） ===== */
.gov-container .math-formula {
  font-family: 'Times New Roman', 'KaTeX_Main', serif;
}

.gov-container .math-block {
  display: block;
  text-align: center;
  margin: 1em 0;
  padding: 0.5em;
  overflow-x: auto;
  background: #f9f9f9;
  border-radius: 4px;
}

/* ===== 打印支持（政府文档经常转 PDF） ===== */
@media print {
  body {
    font-size: 12pt;
  }
  .gov-container {
    max-width: none;
    padding: 0;
  }
  .gov-container a {
    color: #000;
  }
}

/* ===== 移动端 ===== */
@media (max-width: 768px) {
  .gov-container {
    padding: 24px 16px 48px;
  }
}
`;

/**
 * 从用户配置（defaultConfig.js 结构）生成 CSS 变量覆盖
 * 政府公文规范 + 用户自定义参数（字体/字号/行高/缩进/表格/颜色）
 * @param {Object} config - 完整配置（COMPLETE_DEFAULTS 合并后）
 * @returns {string} - CSS :root 变量块
 */
function buildConfigCss(config = {}) {
  const fonts = config.fonts || {};
  const sizes = config.sizes || {};
  const colors = config.colors || {};
  const paragraph = config.paragraph || {};
  const doc = config.document || {};
  // 表格样式：优先 enhanced_table_styles，回退 table_styles
  const table = config.enhanced_table_styles || config.table_styles || {};

  const ptToPx = 96 / 72; // 1pt = 4/3px
  const bodySize = (sizes.default || 12) * ptToPx;

  const fontBody = [
    fonts.default || 'SimSun',
    'Noto Serif CJK SC', 'Source Han Serif SC', 'Source Han Serif CN',
    '仿宋', 'FangSong', '仿宋_GB2312', 'FangSong_GB2312',
    '宋体', 'SimSun', 'STSong',
    fonts.english || 'Times New Roman',
    'serif'
  ].join(', ');

  const fontHeading = [
    fonts.headings || 'SimHei',
    'Noto Sans CJK SC', 'Source Han Sans SC', 'Source Han Sans CN',
    '黑体', 'SimHei', 'PingFang SC', 'Microsoft YaHei',
    'sans-serif'
  ].join(', ');

  const fontMono = [
    fonts.code || 'Consolas',
    'SF Mono', 'Cascadia Code', 'Consolas', 'Courier New',
    'monospace'
  ].join(', ');

  const css = [];
  css.push(`:root {`);
  css.push(`  --gov-font-body: ${fontBody};`);
  css.push(`  --gov-font-heading: ${fontHeading};`);
  css.push(`  --gov-font-mono: ${fontMono};`);
  css.push(`  --gov-font-size: ${Math.round(bodySize * 100) / 100}px;`);
  css.push(`  --gov-line-height: ${paragraph.line_spacing || 1.5};`);
  css.push(`  --gov-text-indent: ${paragraph.first_line_indent || 2}em;`);
  css.push(`  --gov-heading1-size: ${Math.round(((sizes.heading1 || 16) * ptToPx) * 100) / 100}px;`);
  css.push(`  --gov-heading2-size: ${Math.round(((sizes.heading2 || 14) * ptToPx) * 100) / 100}px;`);
  css.push(`  --gov-heading3-size: ${Math.round(((sizes.heading3 || 13) * ptToPx) * 100) / 100}px;`);
  css.push(`  --gov-heading4-size: ${Math.round(((sizes.heading4 || 12) * ptToPx) * 100) / 100}px;`);
  css.push(`  --gov-heading5-size: ${Math.round(((sizes.heading5 || 12) * ptToPx) * 100) / 100}px;`);
  css.push(`  --gov-heading6-size: ${Math.round(((sizes.heading6 || 12) * ptToPx) * 100) / 100}px;`);
  css.push(`  --gov-color-text: ${colors.default || '#1a1a1a'};`);
  css.push(`  --gov-color-heading: ${colors.headings || '#000000'};`);
  css.push(`  --gov-color-link: ${colors.link || '#0563c1'};`);
  css.push(`  --gov-color-border: ${table.border_color || '#8a8a8a'};`);
  css.push(`  --gov-color-table-header-bg: ${table.header_bg_color || '#eaeaea'};`);
  css.push(`  --gov-color-table-header-text: ${table.header_font_color || '#000000'};`);
  css.push(`}`);
  return css.join('\n');
}

/**
 * 渲染脚本（浏览器端执行）
 * 1. 读取 <script type="text/markdown"> 中的 markdown 原文
 * 2. [TOC] 标记 → 占位
 * 3. 公式（可选，若内嵌 KaTeX）：先块级 $$..$$ 再行内 $..$ 替换
 * 4. marked 渲染
 * 5. 标题锚点 + 自动目录注入
 * 6. 图片路径规范化
 */
const GOV_JS = `
(function () {
  'use strict';

  var srcEl = document.getElementById('md-source');
  if (!srcEl) return;
  var src = srcEl.textContent;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ===== 0. 读取 gov 配置（目录开关/深度） =====
  var govConfig = { generateToc: false, tocDepth: 3 };
  try {
    var cfgEl = document.getElementById('gov-config');
    if (cfgEl) govConfig = JSON.parse(cfgEl.textContent);
  } catch (e) {
    /* 使用默认配置 */
  }

  // ===== 1. [TOC] 标记 → 占位；或按配置自动生成目录 =====
  var hasToc = /^[ \\t]*\\[TOC\\][ \\t]*$/m.test(src);
  if (hasToc) {
    src = src.replace(/^[ \\t]*\\[TOC\\][ \\t]*$/m, '<div id="gov-toc-slot"></div>');
  } else if (govConfig.generateToc) {
    src = '<div id="gov-toc-slot"></div>\\n' + src;
  }

  // ===== 2. 公式渲染（若内嵌 KaTeX） =====
  if (window.katex) {
    try {
      // 块级 $$...$$
      src = src.replace(/\\$\\$([\\s\\S]*?)\\$\\$/g, function (m, formula) {
        try {
          return '<div class="math-formula math-block">' +
            katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false }) +
            '</div>';
        } catch (e) {
          return m;
        }
      });
      // 行内 $...$（仅当包含 LaTeX 特征才渲染，避免误判 PHP 变量/货币 $）
      src = src.replace(/(?<!\\$)\\$(?!\\$)([^\\$\\n]+?)\\$(?!\\$)/g, function (m, formula) {
        var f = formula.trim();
        if (/^[\\d,]+\\\\.?\\d*$/.test(f)) return m; // 货币/数字跳过
        // LaTeX 特征门控：含反斜杠命令 / 上下标 / \frac 等才视为公式
        if (!/\\\\[a-zA-Z]/.test(f) && !/[\\^_][{0-9a-zA-Z]/.test(f)) return m;
        try {
          return katex.renderToString(f, { displayMode: false, throwOnError: false });
        } catch (e) {
          return m;
        }
      });
    } catch (e) {
      // 公式渲染失败不阻断
    }
  }

  // ===== 3. marked 渲染 =====
  var container = document.getElementById('md-content');
  if (!container || typeof marked === 'undefined') return;
  var html = marked.parse(src, { breaks: true, gfm: true });
  container.innerHTML = html;

  // ===== 4. 标题锚点 + 目录收集 =====
  var tocItems = [];
  var used = {};
  var maxLevel = govConfig.tocDepth || 3;
  var headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  for (var i = 0; i < headings.length; i++) {
    var h = headings[i];
    var text = h.textContent.trim();
    if (!text) continue;
    var level = parseInt(h.tagName.charAt(1), 10);
    if (level > maxLevel) continue;
    var id = text.replace(/\\s+/g, '-');
    if (used[id]) id = id + '-' + i;
    used[id] = true;
    h.id = id;
    tocItems.push({ level: level, text: text, id: id });
  }

  // ===== 5. 目录注入 =====
  if (hasToc) {
    var slot = document.getElementById('gov-toc-slot');
    if (slot) {
      var listHtml = '<ul class="gov-toc-list">';
      var lastLevel = 1;
      for (var j = 0; j < tocItems.length; j++) {
        var item = tocItems[j];
        while (lastLevel < item.level) { listHtml += '<ul>'; lastLevel++; }
        while (lastLevel > item.level) { listHtml += '</ul>'; lastLevel--; }
        listHtml += '<li><a href="#' + item.id + '">' + escapeHtml(item.text) + '</a></li>';
      }
      while (lastLevel > 1) { listHtml += '</ul>'; lastLevel--; }
      listHtml += '</ul>';
      slot.innerHTML = '<div class="gov-toc"><div class="gov-toc-title">目 录</div>' + listHtml + '</div>';
    }
  }

  // ===== 6. 图片路径规范化（兼容中文/空格路径） =====
  var imgs = container.querySelectorAll('img');
  for (var k = 0; k < imgs.length; k++) {
    var img = imgs[k];
    var s = img.getAttribute('src');
    if (s && !/^(https?:|data:|file:|blob:)/i.test(s)) {
      try {
        img.setAttribute('src', decodeURIComponent(s));
      } catch (e) {
        /* 保持原样 */
      }
    }
  }

  // ===== 7. 表格字号动态计算（每表独立、按内容比例、多行兜底） =====
  // 目标（用户需求）：
  // 1. 字号按「表格」为单位独立计算——每个表格根据自身内容算出自己的字号，
  //    不是全部表格/全部列统一字号（内容少→大字号，内容多→小字号）
  // 2. 检测：一次性测量表格内容不换行时的需求宽度，与可用宽度对比
  // 3. 超出 → 按比例缩小该表字号（最小 10.5px，保证可读），换行由 word-break 兜底
  // 4. 到下限仍放不下 → 接受内容换行成两行/多行适配（用行数换宽度，不再继续缩小字号）
  (function fitTableFont() {
    var MIN_FONT = 10.5; // 可读下限（px）：9px 太小影响阅读，10.5px 中文可辨识
    var tables = container.querySelectorAll('table');
    for (var t = 0; t < tables.length; t++) {
      var table = tables[t];
      var cells = Array.prototype.slice.call(table.querySelectorAll('th, td'));
      if (cells.length === 0) continue;

      var current = parseFloat(window.getComputedStyle(table).fontSize) || 16;
      if (current <= MIN_FONT) continue;
      var avail = table.clientWidth;
      if (avail <= 0) continue;

      // 一次性测量整表内容不换行的需求宽度（每表仅 2 次强制布局，O(表数) 非 O(单元格×循环)）
      var originals = cells.map(function (c) { return c.style.whiteSpace; });
      cells.forEach(function (c) { c.style.whiteSpace = 'nowrap'; });
      var needWidth = table.scrollWidth;
      cells.forEach(function (c, i) { c.style.whiteSpace = originals[i]; });

      if (needWidth <= avail + 1) continue; // 当前字号放得下，保持

      // 按比例缩字号（单行适配）：目标字号 ≈ 当前字号 × 可用宽 / 需求宽，乘 0.97 留余量
      var target = current * (avail / needWidth) * 0.97;
      target = Math.max(MIN_FONT, target);
      table.style.fontSize = target + 'px';
      // 到 MIN_FONT 仍超：剩余宽度压力由 word-break 多行换行吸收（不继续缩小字号）
    }
  })();

  // ===== 8. Mermaid 图表渲染（内嵌 mermaid.min.js，浏览器端渲染为 SVG） =====
  (function renderMermaidCharts() {
    if (typeof window.mermaid === 'undefined') return;
    var blocks = container.querySelectorAll('pre code.language-mermaid');
    if (!blocks.length) return;

    // 初始化 mermaid（与 Readmdvue 同款配置：跟随浅色主题、中文字体）
    try {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'PingFang SC, Microsoft YaHei UI, Noto Serif CJK SC, SimSun, sans-serif',
        fontSize: 14,
        flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
        sequence: { useMaxWidth: true, wrap: true },
        gantt: { useMaxWidth: true },
        journey: { useMaxWidth: true },
        gitGraph: { useMaxWidth: true }
      });
    } catch (e) {
      console.warn('mermaid initialize 失败:', e && e.message);
      return;
    }

    for (var i = 0; i < blocks.length; i++) {
      (function (el, idx) {
        var code = (el.textContent || '').trim();
        var pre = el.closest('pre');
        if (!code || !pre) return;
        var chartId = 'gov-mermaid-' + Date.now() + '-' + idx;
        window.mermaid.render(chartId, code).then(function (res) {
          var wrapper = document.createElement('div');
          wrapper.className = 'gov-mermaid';
          wrapper.innerHTML = res.svg;
          pre.parentNode.replaceChild(wrapper, pre);
        }).catch(function (err) {
          var errBox = document.createElement('div');
          errBox.className = 'gov-mermaid-error';
          errBox.textContent = 'Mermaid 渲染失败: ' + ((err && err.message) || err || '未知错误');
          pre.parentNode.insertBefore(errBox, pre);
          // 保留原始代码块供查看
          pre.style.display = 'block';
        });
      })(blocks[i], i);
    }
  })();

  // ===== 9. 图片点击放大（与 Readmdvue 一致：双击图片 → 全屏模态框） =====
  (function setupImageZoom() {
    var modal = null;

    function closeModal() {
      if (!modal) return;
      modal.classList.remove('show');
      setTimeout(function () { if (modal && modal.parentNode) modal.parentNode.removeChild(modal); modal = null; }, 250);
    }

    function openModal(img) {
      if (modal) { closeModal(); return; }
      modal = document.createElement('div');
      modal.className = 'gov-image-modal';
      var content = document.createElement('div');
      content.className = 'gov-image-modal-content';
      var cloned = img.cloneNode(true);
      cloned.removeAttribute('style');
      content.appendChild(cloned);
      modal.appendChild(content);
      document.body.appendChild(modal);
      setTimeout(function () { modal.classList.add('show'); }, 10);
      // 点击背景关闭
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
      });
      // ESC 关闭
      var escHandler = function (e) {
        if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
      };
      document.addEventListener('keydown', escHandler);
    }

    // 事件委托：双击图片放大（兼容 mermaid 图、普通图片）
    document.addEventListener('dblclick', function (e) {
      var target = e.target;
      if (target && target.tagName === 'IMG' && target.closest('.gov-container')) {
        e.preventDefault();
        openModal(target);
      }
    });
  })();
})();
`;

/**
 * 组装政府公文规范 HTML 单文件
 * @param {Object} params
 * @param {string} params.title - 文档标题（<title>）
 * @param {string} params.markdownContent - markdown 原文（已处理简繁转换/[TOC] 前）
 * @param {Object} [params.config] - 完整配置（defaultConfig.js 结构，样式参数从配置生成）
 * @param {Object} [params.options]
 * @param {boolean} [params.options.useKatex] - 检测到公式时内嵌 KaTeX（默认 true）
 * @returns {string} - 完整 HTML
 */
function buildGovHtml({ title, markdownContent, config = {}, options = {} }) {
  const useKatex = options.useKatex !== false;
  const useMermaid = options.useMermaid === true;
  const katexCss = useKatex ? `<style>${loadKatexCss()}</style>` : '';
  const katexJs = useKatex ? `<script>${loadKatexMin()}</script>` : '';
  const mermaidJs = useMermaid ? `<script>${loadMermaidMin()}</script>` : '';
  const configCss = buildConfigCss(config);
  const govConfigJson = JSON.stringify({
    generateToc: !!(config.document && config.document.generate_toc),
    tocDepth: (config.document && config.document.toc_depth) || 3
  });

  // markdown 原文放 <script type="text/markdown">，转义 </script> 防止提前闭合
  const escapedMarkdown = String(markdownContent || '')
    .replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Markdown 转换文档'}</title>
  <style>${GOV_CSS}
${configCss}</style>
  ${katexCss}
</head>
<body>
  <div class="gov-container">
    <div id="md-content"></div>
  </div>
  <script type="text/markdown" id="md-source">${escapedMarkdown}</script>
  <script id="gov-config" type="application/json">${govConfigJson}</script>
  <script>${loadMarkedMin()}</script>
  ${katexJs}
  ${mermaidJs}
  <script>${GOV_JS}</script>
</body>
</html>`;
}

/**
 * 静态 HTML 增强脚本（供 Word 转换链路的中间 HTML 使用）
 * 背景：convertString 输出 gov 样式的「服务端静态渲染」HTML（marked 已生成 DOM），
 * 浏览器打开时无需 marked 重渲染；但仍需两段增强 JS 与 gov 模板保持一致：
 * 1. fitTableFont —— 表格字号按内容动态计算（每表独立、下限 10.5px、多行兜底）
 * 2. renderMermaidCharts —— 若存在 mermaid 代码块（未被图表处理器转图）则渲染 SVG
 * 与 GOV_JS 的区别：不依赖 #md-source/#md-content（静态 DOM 直接用 document 根查询）。
 */
const GOV_STATIC_JS = `
(function () {
  'use strict';

  // ===== 1. 表格字号动态计算（与 gov 模板同一逻辑） =====
  var MIN_FONT = 10.5;
  var tables = document.querySelectorAll('.gov-container table');
  for (var t = 0; t < tables.length; t++) {
    var table = tables[t];
    var cells = Array.prototype.slice.call(table.querySelectorAll('th, td'));
    if (cells.length === 0) continue;

    var current = parseFloat(window.getComputedStyle(table).fontSize) || 16;
    if (current <= MIN_FONT) continue;
    var avail = table.clientWidth;
    if (avail <= 0) continue;

    var originals = cells.map(function (c) { return c.style.whiteSpace; });
    cells.forEach(function (c) { c.style.whiteSpace = 'nowrap'; });
    var needWidth = table.scrollWidth;
    cells.forEach(function (c, i) { c.style.whiteSpace = originals[i]; });

    if (needWidth <= avail + 1) continue;
    var target = current * (avail / needWidth) * 0.97;
    target = Math.max(MIN_FONT, target);
    table.style.fontSize = target + 'px';
  }

  // ===== 2. Mermaid 渲染（若有内嵌 mermaid.min.js 且存在未转图的 mermaid 代码块） =====
  if (typeof window.mermaid !== 'undefined') {
    var blocks = document.querySelectorAll('.gov-container pre code.language-mermaid');
    if (blocks.length) {
      try {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'PingFang SC, Microsoft YaHei UI, Noto Serif CJK SC, SimSun, sans-serif',
          fontSize: 14,
          flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
          sequence: { useMaxWidth: true, wrap: true },
          gantt: { useMaxWidth: true },
          journey: { useMaxWidth: true },
          gitGraph: { useMaxWidth: true }
        });
      } catch (e) { /* 忽略 */ }

      for (var i = 0; i < blocks.length; i++) {
        (function (el, idx) {
          var code = (el.textContent || '').trim();
          var pre = el.closest('pre');
          if (!code || !pre) return;
          var chartId = 'gov-mermaid-' + Date.now() + '-' + idx;
          window.mermaid.render(chartId, code).then(function (res) {
            var wrapper = document.createElement('div');
            wrapper.className = 'gov-mermaid';
            wrapper.innerHTML = res.svg;
            pre.parentNode.replaceChild(wrapper, pre);
          }).catch(function (err) {
            var errBox = document.createElement('div');
            errBox.className = 'gov-mermaid-error';
            errBox.textContent = 'Mermaid 渲染失败: ' + ((err && err.message) || err || '未知错误');
            pre.parentNode.insertBefore(errBox, pre);
          });
        })(blocks[i], i);
      }
    }
  }

  // ===== 3. 图片点击放大（与 gov 模板 / Readmdvue 一致：双击图片 → 全屏模态框） =====
  var modal = null;
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(function () { if (modal && modal.parentNode) modal.parentNode.removeChild(modal); modal = null; }, 250);
  }
  function openModal(img) {
    if (modal) { closeModal(); return; }
    modal = document.createElement('div');
    modal.className = 'gov-image-modal';
    var content = document.createElement('div');
    content.className = 'gov-image-modal-content';
    var cloned = img.cloneNode(true);
    cloned.removeAttribute('style');
    content.appendChild(cloned);
    modal.appendChild(content);
    document.body.appendChild(modal);
    setTimeout(function () { modal.classList.add('show'); }, 10);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    var escHandler = function (e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);
  }
  document.addEventListener('dblclick', function (e) {
    var target = e.target;
    if (target && target.tagName === 'IMG' && target.closest('.gov-container')) {
      e.preventDefault();
      openModal(target);
    }
  });
})();
`;

module.exports = { buildGovHtml, buildConfigCss, GOV_CSS, GOV_JS, GOV_STATIC_JS, highlightMarkdownCode, hasMermaid, loadMermaidMin };
