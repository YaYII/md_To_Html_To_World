/**
 * @description Markdown转HTML转换模块
 * 提供了将Markdown文件转换为HTML的功能
 */
const fs = require('fs-extra');
const path = require('path');
const MarkdownIt = require('markdown-it');
const marked = require('marked'); // 与 gov 模板同一渲染引擎（marked v15）
const cheerio = require('cheerio');
const OpenCC = require('opencc-js'); // 引入OpenCC简繁转换库
const ChartProcessor = require('./chartProcessor'); // 引入图表处理器
const MathProcessor = require('./mathProcessor'); // 引入数学公式处理器
const { imagePathPlugin, createImagePathFixer } = require('./imagePathPlugin'); // 引入图片路径处理插件
const { buildGovHtml, buildConfigCss, highlightMarkdownCode, hasMermaid, GOV_CSS, GOV_STATIC_JS, loadMermaidMin } = require('./govHtmlTemplate'); // 政府公文规范 HTML 模板
const { renderOfflineSvg } = require('../htmlToWord/processors/mermaidProcessor'); // 服务端 mermaid→SVG（Word/HTML 共用离线渲染）

/**
 * @class MarkdownToHtml
 * @description Markdown到HTML的转换类
 */
class MarkdownToHtml {
  /**
   * @constructor
   * @param {Object} config - 配置对象
   */
  constructor(config = {}) {
    this.config = config;
    this.md = new MarkdownIt({
      html: true,
      xhtmlOut: true,
      breaks: true,
      linkify: true,
      typographer: true
    });

    // 使用图片路径处理插件
    this.md.use(imagePathPlugin);

    // 初始化图表处理器
    this.chartProcessor = new ChartProcessor(config);
    
    // 初始化数学公式处理器
    this.mathProcessor = new MathProcessor(config);
    
    // 初始化图片路径修复器
    this.imagePathFixer = createImagePathFixer();

    // 注意：暂时不加载可能有问题的扩展
    // 只使用基本的markdown-it功能
    // 后续可以根据需要添加已验证工作的插件
  }

  /**
   * @method processTocMarker
   * @description 处理[TOC]标记，将其转换为HTML占位符
   * @param {string} content - Markdown内容
   * @returns {string} - 处理后的内容
   */
  processTocMarker(content) {
    // 改进的[TOC]标记处理：
    // 1. 允许行前有空白字符
    // 2. 只处理独占一行的[TOC]标记（更安全）
    // 3. 支持大小写不敏感
    // 只吞空格/tab（保留 [TOC] 前后的换行）：若吞掉换行，替换后的 <div> 与后续
    // markdown 标题无空行分隔，marked 会把 `## 标题` 当作 HTML 块延续输出原文
    const tocMarker = /^[ \t]*\[TOC\][ \t]*$/gmi;
    const replacement = '<div class="toc-placeholder" data-toc-marker="true"><!-- TOC_PLACEHOLDER --></div>';
    
    const result = content.replace(tocMarker, replacement);
    
    // 添加调试信息
    const matches = content.match(tocMarker);
    if (matches && matches.length > 0) {
      // console.log(`📋 检测到 ${matches.length} 个[TOC]标记:`, matches);
    }
    
    return result;
  }

  /**
   * @method processMermaidSvgInline
   * @description 服务端静态渲染 mermaid → SVG 内联（一劳永逸方案）
   * 把 markdown 中的 ```mermaid 代码块替换为 <div class="gov-mermaid">SVG</div>：
   * - HTML 完全静态：流程图已是 SVG 内联，不依赖浏览器执行 mermaid.min.js
   * - 任何服务器（nginx/Live Server/python http.server）原样返回都能显示，
   *   甚至禁用 JS 也能看（根治 Live Server 改写破坏内嵌脚本的问题）
   * - 渲染失败的代码块保留原样（降级为代码块显示）
   * @param {string} markdownContent - markdown 内容
   * @returns {Promise<string>} - 处理后的 markdown（mermaid 代码块已替换为 SVG div）
   */
  async processMermaidSvgInline(markdownContent) {
    if (!markdownContent || !hasMermaid(markdownContent)) return markdownContent;

    const re = /```\s*mermaid\s*\n([\s\S]*?)```/g;
    const blocks = [];
    let m;
    while ((m = re.exec(markdownContent)) !== null) {
      blocks.push({ full: m[0], code: m[1] });
    }
    if (!blocks.length) return markdownContent;

    console.log(`📊 服务端渲染 mermaid 图（SVG 内联）: ${blocks.length} 个`);
    // 并发渲染（限制并发数避免 jsdom/mermaid 竞争，id 已随机隔离）
    const CONCURRENCY = 4;
    const results = new Array(blocks.length).fill(null);
    let nextIdx = 0;
    async function worker() {
      while (nextIdx < blocks.length) {
        const i = nextIdx++;
        const b = blocks[i];
        try {
          results[i] = await renderOfflineSvg(b.code.trim());
        } catch (e) {
          console.warn(`[processMermaidSvgInline] 渲染异常: ${e.message}`);
          results[i] = null;
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, blocks.length) }, () => worker())
    );

    let result = markdownContent;
    let success = 0;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const svg = results[i];
      if (svg) {
        const replacement = `<div class="gov-mermaid">\n${svg}\n</div>`;
        const idx = result.indexOf(b.full);
        if (idx >= 0) {
          result = result.slice(0, idx) + replacement + result.slice(idx + b.full.length);
          success++;
        }
      } else {
        console.warn(`[processMermaidSvgInline] 渲染失败，保留代码块: ${b.code.slice(0, 50)}`);
      }
    }
    console.log(`✅ 服务端 mermaid→SVG: ${success}/${blocks.length} 成功`);
    return result;
  }

  /**
   * @method convertString
   * @description 将Markdown字符串转换为HTML
   * @param {string} markdownContent - Markdown内容
   * @param {string} outputDir - 输出目录（可选，用于保存图片文件）
   * @returns {Promise<string>} - HTML内容
   */
  async convertString(markdownContent, outputDir = null) {
    try {
      // 检查是否需要进行简繁转换
      let processedContent = markdownContent;
      
      if (this.config.chinese && this.config.chinese.convert_to_traditional) {
        // console.log('执行简体到繁体的转换');
        // console.log('简繁转换配置:', JSON.stringify(this.config.chinese, null, 2));
        // 创建简转繁的转换器
        const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
        processedContent = converter(markdownContent);
      } else {
        // console.log('未启用简繁转换');
      }
      
      // 处理[TOC]标记
      processedContent = this.processTocMarker(processedContent);
      
      // 处理图表（在Markdown渲染之前）
      // 注意：mermaid 保留代码块（不转 PNG 文件）——HTML 端由浏览器内嵌 mermaid.min.js 渲染为 SVG
      // （单文件自包含，不依赖 images/ 目录）；Word 端由 htmlToWord 服务端渲染 PNG 嵌入 docx
      processedContent = await this.chartProcessor.processCharts(processedContent, outputDir, { skipMermaid: true });

      // 服务端静态渲染 mermaid → SVG 内联（一劳永逸方案）：
      // 生成 HTML 时直接把流程图渲染成 SVG 嵌进 HTML，HTML 完全静态——
      // 不依赖浏览器执行 mermaid.min.js，任何服务器（含 Live Server）原样返回都能显示。
      // Word 附带生成的 HTML 与「生成 HTML 文档」走同一链路（convertString），功能一致。
      processedContent = await this.processMermaidSvgInline(processedContent);
      
      // 处理数学公式（在Markdown渲染之前）
      processedContent = await this.mathProcessor.processMathFormulas(processedContent, outputDir);
      
      // 服务端代码高亮（与 gov 模板同一逻辑：hljs 36 种语言，mermaid 跳过留给图表处理）
      processedContent = highlightMarkdownCode(processedContent);

      // 转换为基本HTML —— 使用与 gov 模板一致的 marked 引擎（breaks/gfm 与浏览器端一致）
      // 保证 Word 转换链路的 HTML 中间产物与「生成HTML文档」同源同构
      let html = marked.parse(processedContent, { breaks: true, gfm: true });

      // 修复图片路径中的中文编码问题
      html = this.imagePathFixer(html);
      
      // 使用cheerio美化和处理HTML
      const $ = cheerio.load(html);
      
      // 为代码块添加语法高亮类
      $('pre code').each((i, el) => {
        const $el = $(el);
        const className = $el.attr('class') || '';
        const lang = className.replace('language-', '');
        if (lang) {
          $el.parent().addClass(`language-${lang}`);
          $el.parent().addClass('line-numbers');
        }
      });
      
      // 根据配置对内容进行处理
      if (this.config.stylesheets) {
        const head = $('head');
        this.config.stylesheets.forEach(stylesheet => {
          head.append(`<link rel="stylesheet" href="${stylesheet}">`);
        });
      }
      
      // 完整HTML文档 —— 使用 gov 公文规范样式（与「生成HTML文档」同一样式体系）
      // mermaid 已服务端静态渲染成 SVG 内联，不再内嵌 mermaid.min.js、不依赖浏览器脚本
      // （mermaid 图是纯静态 SVG，任何服务器/禁用 JS 都能显示）
      // 注入用户配置 CSS 变量（字体/字号/行高/缩进/表格颜色）——与「生成HTML文档」(convertGovString) 行为一致，
      // 保证 Word 转换链路附带产出的 gov HTML 与 Word 文档排版参数统一
      const configCss = buildConfigCss(this.config);
      const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.getDocumentTitle(markdownContent)}</title>
  <style>${GOV_CSS}
${configCss}</style>
</head>
<body>
  <div class="gov-container">
    ${html}
  </div>
  <script>${GOV_STATIC_JS}</script>
</body>
</html>`;
      
      return fullHtml;
    } catch (error) {
      // console.error('转换Markdown到HTML失败:', error);
      throw new Error(`转换失败: ${error.message}`);
    }
  }


  /**
   * @method convertFile
   * @description 将Markdown文件转换为HTML并可选择保存到文件
   * @param {string} inputFile - 输入文件路径
   * @param {string} [outputFile] - 输出文件路径(可选)
   * @returns {string} - HTML内容
   */
  async convertFile(inputFile, outputFile = null) {
    try {
      // 读取Markdown文件
      const markdownContent = await fs.readFile(inputFile, 'utf-8');
      
      // 确定输出目录
      let outputDir = null;
      if (outputFile) {
        outputDir = path.dirname(outputFile);
      } else {
        // 如果没有指定输出文件，使用输入文件的目录
        outputDir = path.dirname(inputFile);
      }
      
      // 转换为HTML
      const htmlContent = await this.convertString(markdownContent, outputDir);
      
      // 如果指定了输出文件，则写入文件
      if (outputFile) {
        await fs.outputFile(outputFile, htmlContent, 'utf-8');
        // console.log(`HTML已保存到: ${outputFile}`);
      }
      
      return htmlContent;
    } catch (error) {
      // console.error('处理文件时出错:', error);
      throw new Error(`处理文件${inputFile}失败: ${error.message}`);
    }
  }

  /**
   * @method getDocumentTitle
   * @description 从 markdown 内容提取文档标题（首个 # 标题），无则返回配置标题
   * @param {string} markdownContent - markdown 内容
   * @returns {string} - 标题
   * @private
   */
  getDocumentTitle(markdownContent) {
    const match = String(markdownContent || '').match(/^\s*#\s+(.+?)\s*$/m);
    return match ? match[1].trim() : (this.config.title || 'Markdown 转换文档');
  }

  /**
   * @method hasLatexFormula
   * @description 检测 markdown 是否包含真 LaTeX 公式（避免误判 PHP 变量/货币 $）
   * 判据：块级 $$..$$，或行内 $..$ 含反斜杠命令/上下标
   * @param {string} content - markdown 内容
   * @returns {boolean}
   * @private
   */
  hasLatexFormula(content) {
    const text = String(content || '');
    if (/\$\$[\s\S]*?\$\$/.test(text)) return true; // 块级公式明确
    // 已知 LaTeX 数学命令白名单（避免误判 PHP 命名空间 \Repository 等）
    const mathCmd = /\\\\(?:frac|dfrac|sum|int|sqrt|alpha|beta|gamma|delta|lambda|sigma|omega|pi|theta|infty|times|cdot|leq|geq|neq|partial|prod|begin|end|text|mathrm|mathbb|left|right|rightarrow|to|pm|div|approx|equiv)/;
    if (mathCmd.test(text)) return true;
    // 行内公式上下标：^ 或 _ 后跟 { 或数字（避免误判 PHP 变量名 _x）
    return /(?<!\$)\$(?!\$)[^$\n]*[\^_][{0-9][^$\n]*\$(?!\$)/.test(text);
  }

  /**
   * @method convertGovString
   * @description 政府公文规范 HTML 转换（单文件自包含、完全静态、完全离线）
   * 与「Word 附带生成的 HTML」(convertString) 完全同一链路：
   * - 服务端 marked 渲染 + mermaid 服务端静态渲染成 SVG 内联 + 公式服务端处理
   * - HTML 完全静态：流程图是内联 SVG，不依赖浏览器执行脚本，
   *   任何服务器（nginx / Live Server / python http.server）原样返回都能显示流程图
   * @param {string} markdownContent - Markdown内容
   * @param {string|null} outputDir - 输出目录（保留参数，兼容调用）
   * @returns {Promise<string>} - HTML内容
   */
  async convertGovString(markdownContent, outputDir = null) {
    try {
      // 与 convertString 完全同一链路（服务端静态渲染 + mermaid SVG 内联），
      // 保证「生成 HTML 文档」与「Word 附带 HTML」功能一致
      return await this.convertString(markdownContent, outputDir);
    } catch (error) {
      throw new Error(`转换失败: ${error.message}`);
    }
  }

  /**
   * @method convertGovFile
   * @description 将Markdown文件转换为政府公文规范 HTML 并可选择保存到文件
   * @param {string} inputFile - 输入文件路径
   * @param {string} [outputFile] - 输出文件路径(可选)
   * @returns {Promise<string>} - HTML内容
   */
  async convertGovFile(inputFile, outputFile = null) {
    try {
      const markdownContent = await fs.readFile(inputFile, 'utf-8');

      let outputDir = null;
      if (outputFile) {
        outputDir = path.dirname(outputFile);
      } else {
        outputDir = path.dirname(inputFile);
      }

      const htmlContent = await this.convertGovString(markdownContent, outputDir);

      if (outputFile) {
        await fs.outputFile(outputFile, htmlContent, 'utf-8');
      }

      return htmlContent;
    } catch (error) {
      throw new Error(`处理文件${inputFile}失败: ${error.message}`);
    }
  }
}

module.exports = MarkdownToHtml;
