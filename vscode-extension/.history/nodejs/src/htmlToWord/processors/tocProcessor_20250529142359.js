/**
 * @description 目录处理器模块
 * 专门处理Word文档中的目录生成功能
 */
const { Paragraph, TextRun, HeadingLevel } = require('docx');

/**
 * @class TocProcessor
 * @description 目录处理器类
 */
class TocProcessor {
  /**
   * @constructor
   * @param {Object} config - 配置对象
   * @param {Object} converter - 转换器实例
   */
  constructor(config, converter) {
    this.config = config;
    this.converter = converter;
    this.headings = []; // 存储所有标题信息
  }

  /**
   * @method addHeading
   * @description 添加标题到目录
   * @param {string} text - 标题文本
   * @param {number} level - 标题级别 (1-6)
   * @param {string} id - 标题ID（可选）
   */
  addHeading(text, level, id = null) {
    this.headings.push({
      text: text.trim(),
      level: level,
      id: id || `heading-${this.headings.length + 1}`
    });
  }

  /**
   * @method generateToc
   * @description 生成目录段落数组
   * @returns {Array} - 目录段落数组
   */
  generateToc() {
    const tocElements = [];
    const maxDepth = this.config.document?.toc_depth || 3;

    // 添加目录标题
    tocElements.push(new Paragraph({
      text: "目录",
      heading: HeadingLevel.HEADING_1,
      spacing: {
        after: 300
      }
    }));

    // 生成目录条目
    this.headings.forEach((heading, index) => {
      if (heading.level <= maxDepth) {
        const indent = (heading.level - 1) * 400; // 每级缩进400单位
        const dotCount = Math.max(20 - heading.text.length, 3);
        const dots = '.'.repeat(dotCount);
        
        // 创建目录条目
        const tocEntry = new Paragraph({
          children: [
            new TextRun({
              text: heading.text,
              font: {
                name: this.config.fonts?.default || 'Microsoft YaHei'
              },
              size: 22 // 11pt
            }),
            new TextRun({
              text: " ",
              font: {
                name: this.config.fonts?.default || 'Microsoft YaHei'
              }
            }),
            // 添加制表符和页码
            new TextRun({
              text: `\t${index + 2}`, // 简单的页码模拟
              font: {
                name: this.config.fonts?.default || 'Microsoft YaHei'
              },
              size: 22
            })
          ],
          indent: {
            left: indent
          },
          spacing: {
            after: 120
          }
        });
        
        tocElements.push(tocEntry);
      }
    });

    // 添加分页符
    tocElements.push(new Paragraph({
      text: "",
      pageBreakBefore: true
    }));

    return tocElements;
  }

  /**
   * @method generateSimpleToc
   * @description 生成简化版目录（仅包含说明文字）
   * @returns {Array} - 简化目录段落数组
   */
  generateSimpleToc() {
    return [
      new Paragraph({
        text: "目录",
        heading: HeadingLevel.HEADING_1,
        spacing: {
          after: 200
        }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "[目录将在Microsoft Word中自动生成。打开文档后，请将光标置于此处，然后依次选择 引用 > 目录 > 自动目录 来插入完整目录]",
            italics: true,
            color: "666666"
          })
        ],
        spacing: {
          after: 400
        }
      }),
      new Paragraph({
        text: "",
        pageBreakBefore: true
      })
    ];
  }

  /**
   * @method reset
   * @description 重置标题列表
   */
  reset() {
    this.headings = [];
  }

  /**
   * @method getHeadingCount
   * @description 获取标题数量
   * @returns {number} - 标题数量
   */
  getHeadingCount() {
    return this.headings.length;
  }
}

module.exports = TocProcessor; 