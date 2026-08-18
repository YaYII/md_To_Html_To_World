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
    // 获取字体配置（配置已由 defaultConfig 保证非空）
    const { fonts: fontsConfig, sizes: sizesConfig } = this.config;
    const defaultFont = fontsConfig.default;
    const defaultSize = sizesConfig.default;
    
    // 检查引用块内是否有多个段落
    const innerParagraphs = $el.find('p').toArray();
    
    if (innerParagraphs.length > 0) {
      // 引用块内有多个 <p> 标签，为每个创建独立段落
      for (const p of innerParagraphs) {
        const $p = $(p);
        const paragraph = new Paragraph({
          border: {
            left: {
              color: "666666",
              space: 10,
              style: BorderStyle.SINGLE,
              size: 18  // 更明显的边框
            }
          },
          indent: {
            left: 360,  // 30pt 缩进
            right: 180
          },
          spacing: {
            before: 120,
            after: 120
          },
          shading: {
            fill: "F5F5F5"  // 浅灰色背景
          }
        });
        
        this.converter.textProcessor.processInlineElements($p, paragraph, $);
        
        // 估算引用块段落高度
        const pHeight = this.converter.estimateParagraphHeight
          ? this.converter.estimateParagraphHeight($p.text())
          : 0;
        this.converter.addDocElement(paragraph, pHeight);
      }
    } else {
      // 引用块内没有 <p> 标签，直接处理内容
      // 先获取文本内容，检查是否需要拆分
      const text = $el.text();
      
      // 创建引用段落
      const paragraph = new Paragraph({
        border: {
          left: {
            color: "666666",
            space: 10,
            style: BorderStyle.SINGLE,
            size: 18  // 更明显的边框
          }
        },
        indent: {
          left: 360,  // 30pt 缩进
          right: 180
        },
        spacing: {
          before: 120,
          after: 120
        },
        shading: {
          fill: "F5F5F5"  // 浅灰色背景
        }
      });
      
      // 处理引用块内容
      this.converter.textProcessor.processInlineElements($el, paragraph, $);
      
      // 估算引用块高度
      const blockquoteHeight = this.converter.estimateParagraphHeight
        ? this.converter.estimateParagraphHeight($el.text())
        : 0;
      this.converter.addDocElement(paragraph, blockquoteHeight);
    }
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
    
    // 添加到文档元素数组（水平线占用约一行高度）
    const hrHeight = this.converter.estimateParagraphHeight
      ? this.converter.estimateParagraphHeight()
      : 0;
    this.converter.addDocElement(paragraph, hrHeight);
  }
}

module.exports = MiscProcessor; 