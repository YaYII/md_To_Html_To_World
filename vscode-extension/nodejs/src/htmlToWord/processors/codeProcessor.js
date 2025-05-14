/**
 * @description 代码处理器模块
 * 处理代码块元素
 */
const { Paragraph, TextRun, BorderStyle } = require('docx');
// 引入新的代码表格构建器
const { buildCodeTable } = require('./codeTableBuilder');

/**
 * @class CodeProcessor
 * @description 处理代码块元素的类
 */
class CodeProcessor {
  /**
   * @constructor
   * @param {Object} config - 配置对象
   * @param {Object} converter - 转换器实例
   */
  constructor(config, converter) {
    this.config = config;
    this.converter = converter;
    // 确保 code_block 配置存在，并提供一个空对象作为默认值
    this.codeBlockConfig = this.config.code_block || {};
  }

  /**
   * @method process
   * @description 处理代码块元素
   * @param {Cheerio} $el - Cheerio元素
   * @param {CheerioAPI} $ - Cheerio实例
   */
  process($el, $) {
    // 获取代码文本和语言
    let code = $el.text();
    let language = '';
    
    // 尝试从class属性中提取语言信息
    const codeElement = $el.find('code').first();
    if (codeElement.length > 0) {
      const className = codeElement.attr('class') || '';
      const langMatch = className.match(/language-(\w+)/);
      if (langMatch && langMatch[1]) {
        language = langMatch[1];
      }
      
      // 如果找到了code元素，使用它的文本内容
      const codeText = codeElement.text();
      if (codeText) {
        code = codeText;
      }
    }
    
    // 获取基本配置
    const fontsConfig = this.config.fonts || {};
    const sizesConfig = this.config.sizes || {};
    const colorsConfig = this.config.colors || {};
    const paragraphConfig = this.config.paragraph || {};
    
    // 获取代码块样式配置
    const codeBlockSettings = this.codeBlockConfig;
    const codeBackgroundColor = codeBlockSettings.background_color || 'F8F8F8';
    const codeBorderColor = codeBlockSettings.border_color || 'DDDDDD';
    
    // 代码字体、字号和颜色
    const codeFont = fontsConfig.code || 'Consolas';
    const codeSize = sizesConfig.code || 10;
    const codeColor = colorsConfig.code || '#333333';
    
    // 处理代码文本，确保换行符被正确保留
    const codeLines = code.split('\n');
    
    // 检查配置中是否启用了行号
    const showLineNumbers = codeBlockSettings.show_line_numbers || false;
    
    // 添加语言标识（如果有）
    if (language) {
      const langParagraph = new Paragraph({
        spacing: {
          before: 120,
          after: 0
        },
        children: [
          new TextRun({
            text: language,
            bold: true,
            font: {
              name: codeFont
            },
            size: codeSize * 2,
            color: codeBlockSettings.language_tag_color || colorsConfig.headings?.replace('#', '') || '000000'
          })
        ]
      });
      this.converter.addDocElement(langParagraph);
    }
    
    // 创建代码块容器段落
    const containerParagraph = new Paragraph({
      style: "Code",
      spacing: {
        before: language ? 60 : 120,
        after: 0,
        line: paragraphConfig.line_spacing ? paragraphConfig.line_spacing * 240 : 240,
      },
      shading: {
        fill: codeBackgroundColor
      },
      border: {
        top: {
          color: codeBorderColor,
          style: BorderStyle.SINGLE,
          size: 1
        },
        left: {
          color: codeBorderColor,
          style: BorderStyle.SINGLE,
          size: 1
        },
        right: {
          color: codeBorderColor,
          style: BorderStyle.SINGLE,
          size: 1
        }
      }
    });
    
    // 添加容器段落
    this.converter.addDocElement(containerParagraph);
    
    // 如果启用了行号，使用表格布局
    if (showLineNumbers) {
      // 使用新的codeTableBuilder来处理代码
      const codeTable = buildCodeTable(
        codeLines,
        codeFont,
        codeSize,
        codeColor,
        codeBlockSettings,
        paragraphConfig,
        (text) => this.preserveIndentation(text)
      );
      this.converter.addDocElement(codeTable);
    } else {
      // 逐行处理代码，每行创建一个段落
      this.processCodeLines(codeLines, codeFont, codeSize, codeColor, codeBackgroundColor);
    }
    
    // 添加代码块结束边框
    const endParagraph = new Paragraph({
      style: "Code",
      spacing: {
        before: 0,
        after: 120
      },
      shading: {
        fill: codeBackgroundColor
      },
      border: {
        bottom: {
          color: codeBorderColor,
          style: BorderStyle.SINGLE,
          size: 1
        }
      }
    });
    
    this.converter.addDocElement(endParagraph);
  }
  
  /**
   * @method processCodeLines
   * @description 处理代码行，不包含行号
   * @param {Array<string>} codeLines - 代码行数组
   * @param {string} codeFont - 代码字体
   * @param {number} codeSize - 代码字号
   * @param {string} codeColor - 代码颜色
   * @param {string} backgroundColor - 代码背景色
   * @private
   */
  processCodeLines(codeLines, codeFont, codeSize, codeColor, backgroundColor) {
    // 逐行处理代码，每行创建一个段落
    // 这样可以确保换行和空格都被正确保留
    for (let i = 0; i < codeLines.length; i++) {
      const line = codeLines[i];
      
      // 处理每行代码，保留缩进
      const processedLine = this.preserveIndentation(line);
      
      // 创建代码行段落
      const codeParagraph = new Paragraph({
        style: "Code",
        spacing: {
          before: 0,
          after: 0,
          line: 240, // 固定行距，确保代码行间距一致
        },
        shading: {
          fill: backgroundColor
        },
        children: [
          new TextRun({
            text: processedLine,
            font: {
              name: codeFont
            },
            size: codeSize * 2,
            color: codeColor.replace('#', '')
          })
        ]
      });
      
      this.converter.addDocElement(codeParagraph);
    }
  }
  
  /**
   * @method preserveIndentation
   * @description 保留代码缩进，将空格和制表符转换为不间断空格
   * @param {string} text - 代码文本
   * @returns {string} - 处理后的文本
   * @private
   */
  preserveIndentation(text) {
    // 使用特殊空格字符保留缩进
    // Word中普通空格可能会被压缩，使用不间断空格确保缩进正确显示
    
    // 首先处理制表符，默认将每个制表符转换为4个不间断空格
    const tabSize = this.codeBlockConfig.tab_size || 4;
    let processedText = text.replace(/\t/g, '\u00A0'.repeat(tabSize));
    
    // 然后处理开头的空格，保留缩进
    processedText = processedText.replace(/^(\s+)/, (match) => {
      return '\u00A0'.repeat(match.length);
    });
    
    return processedText;
  }
}

module.exports = CodeProcessor;
