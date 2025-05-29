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
    
    // 添加调试信息
    console.log(`📋 目录添加标题: [H${level}] ${text.trim()}`);
  }

  /**
   * @method generateToc
   * @description 生成详细目录段落数组（包含实际标题内容）
   * @returns {Array} - 目录段落数组
   */
  generateToc() {
    const tocElements = [];
    const maxDepth = this.config.document?.toc_depth || 3;

    console.log(`📋 开始生成目录，最大深度: ${maxDepth}, 标题数量: ${this.headings.length}`);

    // 添加目录前分页符（确保目录从新页面开始）
    tocElements.push(new Paragraph({
      text: "",
      pageBreakBefore: true
    }));

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
              text: " ........................ ",
              font: {
                name: this.config.fonts?.default || 'Microsoft YaHei'
              },
              size: 22
            }),
            new TextRun({
              text: `${index + 2}`, // 简单的页码模拟
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
        console.log(`📋 添加目录条目: [H${heading.level}] ${heading.text} (缩进: ${indent})`);
      }
    });

    // 添加目录后分页符（确保正文从新页面开始）
    tocElements.push(new Paragraph({
      text: "",
      pageBreakBefore: true
    }));

    console.log(`📋 目录生成完成，共 ${tocElements.length - 3} 个条目`);
    return tocElements;
  }

  /**
   * @method generateSimpleToc
   * @description 生成简化版目录（包含Word提示）
   * @returns {Array} - 简化目录段落数组
   */
  generateSimpleToc() {
    console.log(`📋 生成简化目录，标题数量: ${this.headings.length}`);
    
    const tocElements = [];
    
    // 添加目录前分页符（确保目录从新页面开始）
    tocElements.push(new Paragraph({
      text: "",
      pageBreakBefore: true
    }));
    
    // 添加目录标题
    tocElements.push(new Paragraph({
      text: "目录",
      heading: HeadingLevel.HEADING_1,
      spacing: {
        after: 200
      }
    }));
    
    // 如果有标题，生成实际的目录条目
    if (this.headings.length > 0) {
      const maxDepth = this.config.document?.toc_depth || 3;
      
      this.headings.forEach((heading, index) => {
        if (heading.level <= maxDepth) {
          const indent = (heading.level - 1) * 400;
          
          tocElements.push(new Paragraph({
            children: [
              new TextRun({
                text: heading.text,
                font: {
                  name: this.config.fonts?.default || 'Microsoft YaHei'
                },
                size: 22
              }),
              new TextRun({
                text: " ........................ ",
                font: {
                  name: this.config.fonts?.default || 'Microsoft YaHei'
                },
                size: 22
              }),
              new TextRun({
                text: `${index + 2}`,
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
          }));
        }
      });
      
      // 添加说明文字
      tocElements.push(new Paragraph({
        children: [
          new TextRun({
            text: "[在Microsoft Word中，您可以右键点击上方目录区域并选择'更新域'来自动生成准确的页码]",
            italics: true,
            color: "666666",
            size: 18
          })
        ],
        spacing: {
          before: 200,
          after: 400
        }
      }));
    } else {
      // 如果没有标题，显示提示信息
      tocElements.push(new Paragraph({
        children: [
          new TextRun({
            text: "[未检测到标题，目录为空。请确保您的文档包含标题（H1-H6）]",
            italics: true,
            color: "999999"
          })
        ],
        spacing: {
          after: 400
        }
      }));
    }
    
    // 添加目录后分页符（确保正文从新页面开始）
    tocElements.push(new Paragraph({
      text: "",
      pageBreakBefore: true
    }));

    return tocElements;
  }

  /**
   * @method reset
   * @description 重置标题列表
   */
  reset() {
    console.log('📋 重置目录处理器');
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
  
  /**
   * @method getHeadings
   * @description 获取所有标题信息
   * @returns {Array} - 标题数组
   */
  getHeadings() {
    return this.headings;
  }

  /**
   * @method generateCoverPage
   * @description 生成封面页（第一页）
   * @param {Object} coverInfo - 封面信息
   * @returns {Array} - 封面页段落数组
   */
  generateCoverPage(coverInfo = {}) {
    const coverElements = [];
    
    console.log('📋 生成封面页');
    
    // 文档标题
    const title = coverInfo.title || this.config.title || '文档标题';
    coverElements.push(new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 48, // 24pt
          font: {
            name: this.config.fonts?.headings || 'Microsoft YaHei'
          }
        })
      ],
      alignment: 'center',
      spacing: {
        after: 400
      }
    }));
    
    // 添加一些空行
    for (let i = 0; i < 3; i++) {
      coverElements.push(new Paragraph({
        text: "",
        spacing: { after: 200 }
      }));
    }
    
    // 版本信息
    if (coverInfo.version) {
      coverElements.push(new Paragraph({
        children: [
          new TextRun({
            text: `版本：${coverInfo.version}`,
            size: 24,
            font: {
              name: this.config.fonts?.default || 'Microsoft YaHei'
            }
          })
        ],
        alignment: 'center',
        spacing: { after: 200 }
      }));
    }
    
    // 作者信息
    if (coverInfo.author) {
      coverElements.push(new Paragraph({
        children: [
          new TextRun({
            text: `作者：${coverInfo.author}`,
            size: 24,
            font: {
              name: this.config.fonts?.default || 'Microsoft YaHei'
            }
          })
        ],
        alignment: 'center',
        spacing: { after: 200 }
      }));
    }
    
    // 日期信息
    const date = coverInfo.date || new Date().toLocaleDateString('zh-CN');
    coverElements.push(new Paragraph({
      children: [
        new TextRun({
          text: `日期：${date}`,
          size: 24,
          font: {
            name: this.config.fonts?.default || 'Microsoft YaHei'
          }
        })
      ],
      alignment: 'center',
      spacing: { after: 400 }
    }));
    
    // 添加一些空行填充页面
    for (let i = 0; i < 10; i++) {
      coverElements.push(new Paragraph({
        text: "",
        spacing: { after: 200 }
      }));
    }
    
    // 其他信息
    if (coverInfo.description) {
      coverElements.push(new Paragraph({
        children: [
          new TextRun({
            text: coverInfo.description,
            size: 22,
            italics: true,
            font: {
              name: this.config.fonts?.default || 'Microsoft YaHei'
            }
          })
        ],
        alignment: 'center',
        spacing: { after: 200 }
      }));
    }
    
    console.log('📋 封面页生成完成');
    return coverElements;
  }
}

module.exports = TocProcessor; 