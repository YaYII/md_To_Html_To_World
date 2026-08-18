/**
 * @description 目录处理器模块
 * 专门处理Word文档中的目录生成功能
 */
const { Paragraph, TextRun, HeadingLevel, InternalHyperlink, SimpleField } = require('docx');

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
    const maxDepth = this.config.document.toc_depth;

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
                name: this.config.fonts.default
              },
              size: 22 // 11pt
            }),
            new TextRun({
              text: " ........................ ",
              font: {
                name: this.config.fonts.default
              },
              size: 22
            }),
            new TextRun({
              text: `${index + 2}`, // 简单的页码模拟
              font: {
                name: this.config.fonts.default
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
  
    // 如果有标题，生成实际的目录条目（带超链接）
    if (this.headings.length > 0) {
      const maxDepth = this.config.document.toc_depth;
        
      this.headings.forEach((heading, index) => {
        if (heading.level <= maxDepth) {
          const indent = (heading.level - 1) * 400;
          const bookmarkName = heading.id || `heading-${index + 100}`;
            
          // 创建带超链接的目录条目
          tocElements.push(new Paragraph({
            children: [
              // 使用InternalHyperlink创建可点击的链接
              new InternalHyperlink({
                anchor: bookmarkName,
                children: [
                  new TextRun({
                    text: heading.text,
                    font: {
                      name: this.config.fonts.default
                    },
                    size: 22,
                    color: "0563C1",  // 超链接颜色
                    underline: {}  // 下划线
                  })
                ]
              }),
              new TextRun({
                text: " ........................ ",
                font: {
                  name: this.config.fonts.default
                },
                size: 22
              }),
              // 真实页码：PAGEREF 域引用标题书签（Word 打开后全选按 F9 更新域显示准确页码）
              // 旧实现 `${index + 2}` 是模拟页码，与实际页数不符，误导读者
              // 注：docx SimpleField 构造为 (instruction, cachedValue)，且为段落级子元素
              new SimpleField(`PAGEREF ${bookmarkName} \\h`)
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
            text: "[点击目录条目可跳转到对应章节；页码为 Word 域，全选后按 F9 自动更新]",
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
   * @description 生成封面页（第一页），基于文档实际内容
   * @param {Object} documentInfo - 从文档中提取的信息
   * @returns {Array} - 封面页段落数组
   */
  generateCoverPage(documentInfo = {}) {
    const coverElements = [];
    
    console.log('📋 生成封面页（基于文档内容）');
    
    // 使用文档的实际标题（来自第一个H1标题）
    const title = documentInfo.title || '文档标题';
    
    // 添加一些空行让标题居中显示
    for (let i = 0; i < 5; i++) {
      coverElements.push(new Paragraph({
        text: "",
        spacing: { after: 100 }
      }));
    }
    
    // 封面标题 - 不设置固定行高
    coverElements.push(new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 48, // 24pt
          font: {
            name: this.config.fonts.headings
          }
        })
      ],
      alignment: 'center',
      spacing: {
        before: 200,
        after: 400
        // 不设置line，让Word自动处理行高
      }
    }));
    
    // 添加一些空行
    for (let i = 0; i < 3; i++) {
      coverElements.push(new Paragraph({
        text: "",
        spacing: { after: 200 }
      }));
    }
    
    // 如果用户文档有明确的简介内容，显示简介
    if (documentInfo.description) {
      coverElements.push(new Paragraph({
        children: [
          new TextRun({
            text: documentInfo.description,
            size: 24,
            font: {
              name: this.config.fonts.default
            }
          })
        ],
        alignment: 'center',
        spacing: { after: 400 }
      }));
    }
    
    // 添加一些空行填充页面
    for (let i = 0; i < 8; i++) {
      coverElements.push(new Paragraph({
        text: "",
        spacing: { after: 200 }
      }));
    }
    
    // 只有用户明确提供了日期信息才显示日期
    if (documentInfo.date) {
      coverElements.push(new Paragraph({
        children: [
          new TextRun({
            text: documentInfo.date,
            size: 22,
            italics: true,
            font: {
              name: this.config.fonts.default
            }
          })
        ],
        alignment: 'center',
        spacing: { after: 200 }
      }));
    }
    
    console.log('📋 封面页生成完成（使用文档实际内容）');
    return coverElements;
  }

  /**
   * @method extractDocumentInfo
   * @description 从文档内容中提取封面信息
   * @returns {Object} - 文档信息对象
   */
  extractDocumentInfo() {
    const documentInfo = {};
    
    // 提取标题（使用第一个标题作为文档标题）
    if (this.headings.length > 0) {
      documentInfo.title = this.headings[0].text;
    }
    
    console.log('📋 提取到文档信息:', documentInfo);
    return documentInfo;
  }
}

module.exports = TocProcessor; 
