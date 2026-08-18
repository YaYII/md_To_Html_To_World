/**
 * @description 标题处理器模块
 * 处理HTML标题元素
 */
const { Paragraph, TextRun, HeadingLevel, Bookmark } = require('docx');

// 全局书签ID计数器
let globalBookmarkId = 100;

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
    
    // 为标题创建书签ID
    const bookmarkId = globalBookmarkId++;
    const bookmarkName = `heading-${bookmarkId}`;
    
    // 如果有目录处理器，添加标题信息（包含书签名称）
    if (this.converter.tocProcessor) {
      this.converter.tocProcessor.addHeading(text, level, bookmarkName);
    }
    
    // 获取配置（配置已由 defaultConfig 保证非空）
    const { fonts: fontsConfig, sizes: sizesConfig, colors: colorsConfig, paragraph: paragraphConfig } = this.config;
    
    // 标题字体和颜色
    const headingFont = fontsConfig.headings;
    const headingColor = colorsConfig.headings;
    
    // 根据级别获取字号
    let fontSize;
    switch (level) {
      case 1:
        fontSize = sizesConfig.heading1;
        break;
      case 2:
        fontSize = sizesConfig.heading2;
        break;
      case 3:
        fontSize = sizesConfig.heading3;
        break;
      case 4:
        fontSize = sizesConfig.heading4;
        break;
      case 5:
        fontSize = sizesConfig.heading5;
        break;
      case 6:
        fontSize = sizesConfig.heading6;
        break;
      default:
        fontSize = sizesConfig.default;
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
    // 注意：不设置固定的line间距，让Word自动处理行高
    // 标题段前/段后间距：政府公文规范标题需与正文有明显层级间距
    // （默认 12pt 段前 / 6pt 段后，可由 paragraph.heading_before / heading_after 配置）
    const headingBefore = (paragraphConfig.heading_before != null ? paragraphConfig.heading_before : 12) * 20;
    const headingAfter = (paragraphConfig.heading_after != null ? paragraphConfig.heading_after : 6) * 20;
    const paragraph = new Paragraph({
      heading: headingLevel,
      spacing: {
        before: headingBefore,
        after: headingAfter
        // 移除 line 属性，避免固定行高遮挡文字
      },
      children: [
        // 添加书签以便目录可以链接
        new Bookmark({
          id: bookmarkName,
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
        })
      ]
    });
    
    // 估算标题高度并传入以更新页面位置追踪
    const estimatedHeight = this.converter.estimateParagraphHeight
      ? this.converter.estimateParagraphHeight(text, fontSize)
      : 0;
    this.converter.addDocElement(paragraph, estimatedHeight);
  }
}

module.exports = HeadingProcessor; 
