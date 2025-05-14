/**
 * @description 文本处理器模块
 * 处理段落和内联文本元素
 */
const { Paragraph, TextRun } = require('docx');

/**
 * @class TextProcessor
 * @description 处理文本相关元素的类
 */
class TextProcessor {
  /**
   * @constructor
   * @param {Object} config - 配置对象
   * @param {Object} converter - 转换器实例
   */
  constructor(config, converter) {
    this.config = config;
    this.converter = converter;
  }

  /**
   * @method processParagraph
   * @description 处理段落元素
   * @param {Cheerio} $el - Cheerio元素
   * @param {CheerioAPI} $ - Cheerio实例
   */
  processParagraph($el, $) {
    // 获取段落样式配置
    const paragraphConfig = this.config.paragraph || {};
    const firstLineIndent = paragraphConfig.first_line_indent || 0;
    const spaceBefore = paragraphConfig.space_before || 0;
    const spaceAfter = paragraphConfig.space_after || 6;
    const lineSpacing = paragraphConfig.line_spacing || 1.5;
    
    // 创建段落，应用配置
    const paragraph = new Paragraph({
      spacing: {
        before: spaceBefore * 20,  // 转换为twip单位
        after: spaceAfter * 20,    // 转换为twip单位
        line: lineSpacing * 240,   // 转换为twip单位
        lineRule: 'exact'
      },
      indent: firstLineIndent > 0 ? {
        firstLine: firstLineIndent * 20 // 转换为twip单位
      } : undefined
    });
    
    // 处理段落内的元素（包括文本、链接、强调等）
    this.processInlineElements($el, paragraph, $);
    
    // 添加到文档元素数组
    this.converter.addDocElement(paragraph);
  }

  /**
   * @method processInlineElements
   * @description 处理行内元素（文本、链接、强调等）
   * @param {Cheerio} $el - Cheerio元素
   * @param {Paragraph} paragraph - Word段落对象
   * @param {CheerioAPI} $ - Cheerio实例
   */
  processInlineElements($el, paragraph, $) {
    // 获取配置
    const fontsConfig = this.config.fonts || {};
    const sizesConfig = this.config.sizes || {};
    const colorsConfig = this.config.colors || {};
    
    // 默认字体、字号和颜色
    const defaultFont = fontsConfig.default || '微软雅黑';
    const defaultSize = sizesConfig.default || 12;
    const defaultColor = colorsConfig.default || '#000000';
    const codeFont = fontsConfig.code || 'Consolas';
    const codeSize = sizesConfig.code || 10;
    const codeColor = colorsConfig.code || '#333333';
    const linkColor = colorsConfig.link || '#0563C1';
    
    // 获取所有内容（包括文本节点和元素节点）
    const contents = $el.contents().toArray();
    
    for (const node of contents) {
      if (node.type === 'text') {
        // 纯文本节点
        const text = $(node).text();
        if (text.trim()) {
          paragraph.addChildElement(new TextRun({
            text: text,
            font: {
              name: defaultFont
            },
            size: defaultSize * 2, // 转换为半点单位
            color: defaultColor.replace('#', '')
          }));
        }
      } else if (node.type === 'tag') {
        const $node = $(node);
        const tagName = node.tagName?.toLowerCase();
        
        // 检查是否是特殊处理的标签，避免重复处理内容
        const isSpecialTag = ['strong', 'b', 'em', 'i', 'u', 'a', 'code', 'img'].includes(tagName);
        
        switch (tagName) {
          case 'strong':
          case 'b':
            // 处理粗体文本
            paragraph.addChildElement(new TextRun({
              text: $node.text(),
              bold: true,
              font: {
                name: defaultFont
              },
              size: defaultSize * 2,
              color: defaultColor.replace('#', '')
            }));
            break;
          case 'em':
          case 'i':
            // 处理斜体文本
            paragraph.addChildElement(new TextRun({
              text: $node.text(),
              italics: true,
              font: {
                name: defaultFont
              },
              size: defaultSize * 2,
              color: defaultColor.replace('#', '')
            }));
            break;
          case 'u':
            // 处理下划线文本
            paragraph.addChildElement(new TextRun({
              text: $node.text(),
              underline: {},
              font: {
                name: defaultFont
              },
              size: defaultSize * 2,
              color: defaultColor.replace('#', '')
            }));
            break;
          case 'a':
            // 处理链接
            const url = $node.attr('href') || '';
            paragraph.addChildElement(new TextRun({
              text: $node.text(),
              style: 'Hyperlink',
              font: {
                name: defaultFont
              },
              size: defaultSize * 2,
              color: linkColor.replace('#', ''),
              hyperlink: {
                url
              }
            }));
            break;
          case 'code':
            // 处理行内代码
            paragraph.addChildElement(new TextRun({
              text: $node.text(),
              font: {
                name: codeFont
              },
              size: codeSize * 2,
              color: codeColor.replace('#', '')
            }));
            break;
          case 'img':
            // 单独处理图片
            this.converter.mediaProcessor.processImage($node);
            break;
          case 'br':
            // 处理换行符
            paragraph.addChildElement(new TextRun({
              text: "",
              break: 1
            }));
            break;
          default:
            // 只有当不是特殊处理的标签时，才递归处理其内容
            // 这避免了重复处理已经专门处理过的标签内容
            if (!isSpecialTag && $node.contents().length > 0) {
              this.processInlineElements($node, paragraph, $);
            } else if (!isSpecialTag) {
              // 如果是普通标签且没有子元素，直接添加文本
              const text = $node.text().trim();
              if (text) {
                paragraph.addChildElement(new TextRun({
                  text: text,
                  font: {
                    name: defaultFont
                  },
                  size: defaultSize * 2,
                  color: defaultColor.replace('#', '')
                }));
              }
            }
        }
      }
    }
  }
}

module.exports = TextProcessor; 