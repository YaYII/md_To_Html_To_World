/**
 * @description HTML转Word数学公式处理器
 * 处理HTML中的数学公式元素，转换为Word可显示的格式
 */

const { Paragraph, TextRun, AlignmentType, External } = require('docx');

/**
 * @class MathProcessor
 * @description 处理数学公式，转换为Word文档格式
 */
class MathProcessor {
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
   * @method processMathElement
   * @description 处理数学公式元素
   * @param {Cheerio} $el - Cheerio元素
   * @param {CheerioAPI} $ - Cheerio实例
   */
  processMathElement($el, $) {
    const isBlock = $el.hasClass('math-block');
    const formula = $el.attr('data-formula') || '';
    const textContent = $el.text().trim();
    
    // 获取字体配置
    const fontsConfig = this.config.fonts || {};
    const sizesConfig = this.config.sizes || {};
    const colorsConfig = this.config.colors || {};
    
    const mathFont = fontsConfig.math || 'Cambria Math';
    const defaultSize = sizesConfig.default || 12;
    const mathColor = colorsConfig.math || '000000';
    
    if (isBlock) {
      // 块级公式：创建居中的段落
      const paragraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 200,
          after: 200
        },
        shading: {
          fill: 'F9F9F9'
        },
        children: [
          new TextRun({
            text: textContent || formula,
            font: {
              name: mathFont
            },
            size: defaultSize * 2,
            color: mathColor
          })
        ]
      });
      const formulaHeight = this.converter.estimateParagraphHeight
        ? this.converter.estimateParagraphHeight(textContent || formula, defaultSize)
        : Math.round(defaultSize * 1.5 * 96 / 72);
      this.converter.addDocElement(paragraph, formulaHeight);
    } else {
      // 行内公式：返回文本运行对象
      return new TextRun({
        text: textContent || formula,
        font: {
          name: mathFont
        },
        size: defaultSize * 2,
        color: mathColor,
        shading: {
          fill: 'F0F0F0'
        }
      });
    }
    
    return null;
  }

  /**
   * @method processInlineMath
   * @description 处理行内数学公式，返回TextRun
   * @param {Cheerio} $el - Cheerio元素
   * @param {CheerioAPI} $ - Cheerio实例
   * @returns {TextRun|null} - TextRun对象或null
   */
  processInlineMath($el, $) {
    if ($el.hasClass('math-block')) {
      return null; // 块级公式不应该作为行内处理
    }
    
    return this.processMathElement($el, $);
  }

  /**
   * @method isMathElement
   * @description 检查元素是否为数学公式
   * @param {Cheerio} $el - Cheerio元素
   * @returns {boolean} - 是否为数学公式
   */
  isMathElement($el) {
    return $el.hasClass('math-formula');
  }

  /**
   * @method isBlockMath
   * @description 检查是否为块级数学公式
   * @param {Cheerio} $el - Cheerio元素
   * @returns {boolean} - 是否为块级公式
   */
  isBlockMath($el) {
    return $el.hasClass('math-formula') && $el.hasClass('math-block');
  }

  /**
   * @method isInlineMath
   * @description 检查是否为行内数学公式
   * @param {Cheerio} $el - Cheerio元素
   * @returns {boolean} - 是否为行内公式
   */
  isInlineMath($el) {
    return $el.hasClass('math-formula') && !$el.hasClass('math-block');
  }
}

module.exports = MathProcessor;
