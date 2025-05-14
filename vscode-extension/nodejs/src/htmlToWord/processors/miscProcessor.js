/**
 * @description 其他元素处理器模块
 * 处理引用块、水平线等其他元素
 */
const { Paragraph, BorderStyle } = require('docx');

/**
 * @class MiscProcessor
 * @description 处理其他元素的类
 */
class MiscProcessor {
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
   * @method processBlockquote
   * @description 处理引用块元素
   * @param {Cheerio} $el - Cheerio元素
   * @param {CheerioAPI} $ - Cheerio实例
   */
  processBlockquote($el, $) {
    // 创建引用段落
    const paragraph = new Paragraph({
      border: {
        left: {
          color: "999999",
          space: 15,
          style: BorderStyle.SINGLE,
          size: 15
        }
      },
      indent: {
        left: 240  // 20pt (240 dxa)
      }
    });
    
    // 处理引用块内容
    this.converter.textProcessor.processInlineElements($el, paragraph, $);
    
    // 添加到文档元素数组
    this.converter.addDocElement(paragraph);
  }

  /**
   * @method processHorizontalRule
   * @description 处理水平线元素
   */
  processHorizontalRule() {
    // 创建水平线段落
    const paragraph = new Paragraph({
      border: {
        bottom: {
          color: "999999",
          style: BorderStyle.SINGLE,
          size: 1
        }
      },
      spacing: {
        after: 240,
        before: 240
      }
    });
    
    // 添加到文档元素数组
    this.converter.addDocElement(paragraph);
  }
}

module.exports = MiscProcessor; 