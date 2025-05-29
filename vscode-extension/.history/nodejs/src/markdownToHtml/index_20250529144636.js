/**
 * @description Markdown转HTML转换模块
 * 提供了将Markdown文件转换为HTML的功能
 */
const fs = require('fs-extra');
const path = require('path');
const MarkdownIt = require('markdown-it');
const cheerio = require('cheerio');
const OpenCC = require('opencc-js'); // 引入OpenCC简繁转换库

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
    const tocMarker = /^\s*\[TOC\]\s*$/gmi;
    const replacement = '<div class="toc-placeholder" data-toc-marker="true"><!-- TOC_PLACEHOLDER --></div>';
    
    const result = content.replace(tocMarker, replacement);
    
    // 添加调试信息
    const matches = content.match(tocMarker);
    if (matches && matches.length > 0) {
      console.log(`📋 检测到 ${matches.length} 个[TOC]标记:`, matches);
    }
    
    return result;
  }

  /**
   * @method convertString
   * @description 将Markdown字符串转换为HTML
   * @param {string} markdownContent - Markdown内容
   * @returns {string} - HTML内容
   */
  convertString(markdownContent) {
    try {
      // 检查是否需要进行简繁转换
      let processedContent = markdownContent;
      
      if (this.config.chinese && this.config.chinese.convert_to_traditional) {
        console.log('执行简体到繁体的转换');
        console.log('简繁转换配置:', JSON.stringify(this.config.chinese, null, 2));
        // 创建简转繁的转换器
        const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
        processedContent = converter(markdownContent);
      } else {
        console.log('未启用简繁转换');
      }
      
      // 处理[TOC]标记
      processedContent = this.processTocMarker(processedContent);
      
      // 转换为基本HTML
      const html = this.md.render(processedContent);
      
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
      
      // 完整HTML文档
      const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.config.title || 'Markdown转换文档'}</title>
  <style>
    body { 
      font-family: 'Microsoft YaHei', 'SimSun', sans-serif; 
      margin: 0 auto; 
      max-width: 960px; 
      padding: 20px; 
      line-height: 1.6;
    }
    pre { 
      background-color: #f8f8f8; 
      border: 1px solid #ddd; 
      padding: 10px; 
      border-radius: 3px; 
      overflow: auto; 
    }
    code { 
      font-family: Consolas, Monaco, monospace; 
      background-color: #f8f8f8; 
      padding: 2px 5px; 
      border-radius: 3px; 
    }
    table { 
      border-collapse: collapse; 
      width: 100%; 
      margin-bottom: 20px;
    }
    th, td { 
      border: 1px solid #ddd; 
      padding: 8px; 
    }
    th { 
      background-color: #f2f2f2; 
      text-align: left; 
    }
    tr:nth-child(even) { 
      background-color: #f9f9f9; 
    }
    img { 
      max-width: 100%; 
      height: auto; 
    }
    .toc-placeholder { 
      margin: 20px 0; 
      padding: 10px; 
      background-color: #f0f0f0; 
      border: 1px dashed #ccc; 
      text-align: center; 
      color: #666; 
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>
      `.trim();
      
      return fullHtml;
    } catch (error) {
      console.error('转换Markdown到HTML失败:', error);
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
      
      // 转换为HTML
      const htmlContent = this.convertString(markdownContent);
      
      // 如果指定了输出文件，则写入文件
      if (outputFile) {
        await fs.outputFile(outputFile, htmlContent, 'utf-8');
        console.log(`HTML已保存到: ${outputFile}`);
      }
      
      return htmlContent;
    } catch (error) {
      console.error('处理文件时出错:', error);
      throw new Error(`处理文件${inputFile}失败: ${error.message}`);
    }
  }
}

module.exports = MarkdownToHtml; 