/**
 * @description 标题处理器模块
 * 处理HTML标题元素
 */
const { Paragraph, TextRun, HeadingLevel } = require('docx');

/**
 * @class HeadingProcessor
 * @description 处理标题元素的类
 */
class HeadingProcessor {
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
   * @method process
   * @description 处理标题元素
   * @param {Cheerio} $el - Cheerio元素
   * @param {string} tagName - 标签名称
   * @param {CheerioAPI} $ - Cheerio实例
   */
  process($el, tagName, $) {
    const level = parseInt(tagName.substring(1));
    const text = $el.text().trim();
    
    // 如果有目录处理器，添加标题信息
    if (this.converter.tocProcessor) {
      this.converter.tocProcessor.addHeading(text, level);
    }
    
    // 获取配置
    const fontsConfig = this.config.fonts || {};
    const sizesConfig = this.config.sizes || {};
    const colorsConfig = this.config.colors || {};
    const paragraphConfig = this.config.paragraph || {};
    
    // 标题字体和颜色
    const headingFont = fontsConfig.headings || '微软雅黑';
    const headingColor = colorsConfig.headings || '#000000';
    
    // 根据级别获取字号
    let fontSize;
    switch (level) {
      case 1:
        fontSize = sizesConfig.heading1 || 18;
        break;
      case 2:
        fontSize = sizesConfig.heading2 || 16;
        break;
      case 3:
        fontSize = sizesConfig.heading3 || 14;
        break;
      case 4:
        fontSize = sizesConfig.heading4 || 12;
        break;
      case 5:
        fontSize = sizesConfig.heading5 || 12;
        break;
      case 6:
        fontSize = sizesConfig.heading6 || 12;
        break;
      default:
        fontSize = sizesConfig.default || 12;
    }
    
    // 映射HTML标题级别到Word标题级别
    let headingLevel;
    switch (level) {
      case 1:
        headingLevel = HeadingLevel.HEADING_1;
        break;
      case 2:
        headingLevel = HeadingLevel.HEADING_2;
        break;
      case 3:
        headingLevel = HeadingLevel.HEADING_3;
        break;
      case 4:
        headingLevel = HeadingLevel.HEADING_4;
        break;
      case 5:
        headingLevel = HeadingLevel.HEADING_5;
        break;
      case 6:
        headingLevel = HeadingLevel.HEADING_6;
        break;
      default:
        headingLevel = HeadingLevel.HEADING_1;
    }
    
    // 创建标题段落
    const paragraph = new Paragraph({
      heading: headingLevel,
      spacing: {
        before: paragraphConfig.space_before ? paragraphConfig.space_before * 20 : 240,
        after: paragraphConfig.space_after ? paragraphConfig.space_after * 20 : 120,
        line: paragraphConfig.line_spacing ? paragraphConfig.line_spacing * 240 : 360
      },
      children: [
        new TextRun({
          text: text,
          bold: true,
          size: fontSize * 2, // 转换为半点单位
          font: {
            name: headingFont
          },
          color: headingColor.replace('#', '')
        })
      ]
    });
    
    // 添加到文档元素数组
    this.converter.addDocElement(paragraph);
  }
}

module.exports = HeadingProcessor; 