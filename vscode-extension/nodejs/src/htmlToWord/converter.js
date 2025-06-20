/**
 * @description HTML转Word核心转换器模块
 * 提供了将HTML内容转换为Word文档的核心功能
 */
const fs = require('fs-extra');
const path = require('path');
const docx = require('docx');
const cheerio = require('cheerio');

// 导入docx模块的组件
const { Document, Paragraph, Packer, HeadingLevel, TextRun } = docx;

// 导入处理器模块
const TextProcessor = require('./processors/textProcessor');
const HeadingProcessor = require('./processors/headingProcessor');
const ListProcessor = require('./processors/listProcessor');
const TableProcessor = require('./processors/tableProcessor');
const MediaProcessor = require('./processors/mediaProcessor');
const CodeProcessor = require('./processors/codeProcessor');
const MiscProcessor = require('./processors/miscProcessor');
const TocProcessor = require('./processors/tocProcessor');

// 导入文件处理器
const FileHandler = require('../utils/fileHandler');

/**
 * @class HtmlToWordConverter
 * @description HTML到Word的转换类
 */
class HtmlToWordConverter {
  /**
   * @constructor
   * @param {Object} config - 配置对象
   */
  constructor(config = {}) {
    this.config = config;
    this.imagesToProcess = [];
    this.basePath = process.cwd();
    this.docElements = [];
    
    // 初始化文件处理器
    this.fileHandler = new FileHandler({
      maxRetries: 3,           // 最大重试3次
      retryDelay: 1000,        // 重试间隔1秒
      autoRename: true         // 自动重命名冲突文件
    });
    
    // 初始化各种处理器
    this.initProcessors();
    
    console.log('HTML到Word转换器初始化配置:', JSON.stringify({
      document: this.config.document,
      fonts: this.config.fonts,
      sizes: this.config.sizes,
      colors: this.config.colors,
      paragraph: this.config.paragraph,
      chinese: this.config.chinese,
      table_styles: this.config.table_styles,
      enhanced_table_styles: this.config.enhanced_table_styles
    }, null, 2));
  }
  
  /**
   * @method initProcessors
   * @description 初始化各种元素处理器
   * @private
   */
  initProcessors() {
    this.textProcessor = new TextProcessor(this.config, this);
    this.headingProcessor = new HeadingProcessor(this.config, this);
    this.listProcessor = new ListProcessor(this.config, this);
    this.tableProcessor = new TableProcessor(this.config, this);
    this.mediaProcessor = new MediaProcessor(this.config, this);
    this.codeProcessor = new CodeProcessor(this.config, this);
    this.miscProcessor = new MiscProcessor(this.config, this);
    this.tocProcessor = new TocProcessor(this.config, this);
  }

  /**
   * @method convertHtml
   * @description 将HTML内容转换为Word文档
   * @param {string} htmlContent - HTML内容
   * @param {string} basePath - 基础路径，用于处理相对路径的图片
   * @returns {Document} - 生成的Word文档对象
   */
  async convertHtml(htmlContent, basePath = '') {
    try {
      // 如果提供了基础路径，设置为当前基础路径（用于处理相对路径的图片）
      if (basePath) {
        this.basePath = basePath;
      }
      
      // 重置文档元素数组和目录处理器
      this.docElements = [];
      if (this.tocProcessor) {
        this.tocProcessor.reset();
      }
      
      // 解析HTML
      const $ = cheerio.load(htmlContent);
      
      // 处理HTML内容
      const children = $('body').children().toArray();
      await this.processElements(children, $);
      
      // 获取页面大小和边距配置
      const docConfig = this.config.document || {};
      const pageSize = docConfig.page_size || 'A4';
      const marginTop = docConfig.margin_top || 2.54;
      const marginRight = docConfig.margin_right || 3.18;
      const marginBottom = docConfig.margin_bottom || 2.54;
      const marginLeft = docConfig.margin_left || 3.18;
      const orientation = docConfig.orientation || 'portrait';
      const generateToc = docConfig.generate_toc || false;
      const tocDepth = docConfig.toc_depth || 3;
      
      console.log('应用文档配置:', {
        pageSize,
        orientation,
        margins: {
          top: marginTop,
          right: marginRight,
          bottom: marginBottom,
          left: marginLeft
        },
        generateToc,
        tocDepth,
        headingCount: this.tocProcessor ? this.tocProcessor.getHeadingCount() : 0
      });
      
      // 决定文档内容
      let documentContent;
      if (generateToc && this.tocProcessor && this.tocProcessor.getHeadingCount() > 0) {
        // 生成目录
        const tocElements = this.tocProcessor.generateSimpleToc();
        
        // 检查是否需要生成封面页
        const generateCover = docConfig.generate_cover !== false; // 默认生成封面
        
        // 查找TOC占位符的位置
        let tocPlaceholderIndex = -1;
        for (let i = 0; i < this.docElements.length; i++) {
          if (this.docElements[i].type === 'toc-placeholder') {
            tocPlaceholderIndex = i;
            console.log(`📋 找到TOC占位符在位置: ${i}`);
            break;
          }
        }
        
        if (tocPlaceholderIndex >= 0) {
          // 如果找到了TOC占位符，组织文档结构
          const beforeToc = this.docElements.slice(0, tocPlaceholderIndex);
          const afterToc = this.docElements.slice(tocPlaceholderIndex + 1);
          
          if (generateCover) {
            // 生成完整的三页结构：封面 + 目录 + 正文
            // 从文档内容中提取信息用于封面页
            const documentInfo = this.tocProcessor.extractDocumentInfo();
            const coverElements = this.tocProcessor.generateCoverPage(documentInfo);
            documentContent = [...coverElements, ...beforeToc, ...tocElements, ...afterToc];
            console.log(`📋 已生成完整文档结构：第1页封面（基于文档内容）+ 第2页目录 + 第3页开始正文，共${this.tocProcessor.getHeadingCount()}个标题`);
          } else {
            // 只生成目录 + 正文
            documentContent = [...beforeToc, ...tocElements, ...afterToc];
            console.log(`📋 目录已插入到[TOC]标记位置 (${tocPlaceholderIndex})，共${this.tocProcessor.getHeadingCount()}个标题`);
          }
        } else {
          // 如果没有找到TOC占位符，将目录放在文档开头
          if (generateCover) {
            // 生成完整的三页结构：封面 + 目录 + 正文
            // 从文档内容中提取信息用于封面页
            const documentInfo = this.tocProcessor.extractDocumentInfo();
            const coverElements = this.tocProcessor.generateCoverPage(documentInfo);
            documentContent = [...coverElements, ...tocElements, ...this.docElements];
            console.log(`📋 已生成完整文档结构：第1页封面（基于文档内容）+ 第2页目录 + 第3页开始正文，共${this.tocProcessor.getHeadingCount()}个标题`);
          } else {
            // 只生成目录 + 正文
            documentContent = [...tocElements, ...this.docElements];
            console.log(`📋 未找到[TOC]标记，目录已放置在文档开头，共${this.tocProcessor.getHeadingCount()}个标题`);
          }
        }
      } else {
        // 不生成目录，过滤掉TOC占位符
        const filteredElements = this.docElements.filter(element => element.type !== 'toc-placeholder');
        
        // 检查是否仍需要生成封面页
        const generateCover = docConfig.generate_cover !== false && docConfig.generate_cover_without_toc;
        
        if (generateCover) {
          // 从文档内容中提取信息用于封面页
          const documentInfo = this.tocProcessor.extractDocumentInfo();
          const coverElements = this.tocProcessor.generateCoverPage(documentInfo);
          documentContent = [...coverElements, ...filteredElements];
          console.log('📋 已生成封面页（基于文档内容）+ 正文内容');
        } else {
          documentContent = filteredElements;
          console.log('📋 未启用目录或无标题，直接使用文档内容');
        }
      }
      
      // 创建Word文档
      const doc = new Document({
        creator: this.config.creator || 'Markdown To Word Converter',
        title: this.config.title || 'Converted Document',
        description: this.config.description || 'Document converted from Markdown/HTML',
        styles: this.generateDocumentStyles(),
        sections: [
          {
            properties: {
              page: {
                size: {
                  // 设置页面大小
                  orientation: orientation === 'landscape' ? docx.PageOrientation.LANDSCAPE : docx.PageOrientation.PORTRAIT,
                  // 设置页面尺寸
                  width: pageSize === 'Letter' ? 8.5 * 1440 : (pageSize === 'Legal' ? 8.5 * 1440 : 8.27 * 1440), // A4 = 8.27", Letter/Legal = 8.5"
                  height: pageSize === 'Letter' ? 11 * 1440 : (pageSize === 'Legal' ? 14 * 1440 : 11.69 * 1440), // A4 = 11.69", Letter = 11", Legal = 14"
                },
                margin: {
                  // 设置页边距（转换为twip单位，1厘米约等于567 twip）
                  top: docx.convertMillimetersToTwip(marginTop * 10),
                  right: docx.convertMillimetersToTwip(marginRight * 10),
                  bottom: docx.convertMillimetersToTwip(marginBottom * 10),
                  left: docx.convertMillimetersToTwip(marginLeft * 10)
                }
              }
            },
            children: documentContent
          }
        ]
      });
      
      return doc;
    } catch (error) {
      console.error('转换HTML到Word失败:', error);
      throw new Error(`转换失败: ${error.message}`);
    }
  }

  /**
   * @method convertFile
   * @description 将HTML文件转换为Word文档并保存
   * @param {string} inputFile - 输入HTML文件路径
   * @param {string} outputFile - 输出Word文件路径
   * @returns {Document} - 生成的Word文档对象
   */
  async convertFile(inputFile, outputFile) {
    try {
      console.log(`开始转换HTML文件: ${inputFile}`);
      
      // 读取HTML文件
      const htmlContent = await fs.readFile(inputFile, 'utf-8');
      console.log(`HTML文件读取完成，大小: ${htmlContent.length} 字符`);
      
      // 设置基础路径为HTML文件的目录（用于处理相对路径的图片）
      const basePath = path.dirname(inputFile);
      
      // 转换为Word文档
      const doc = await this.convertHtml(htmlContent, basePath);
      console.log('HTML到Word转换完成，开始保存文件...');
      
      // 生成Word文档缓冲区
      const buffer = await Packer.toBuffer(doc);
      console.log(`Word文档缓冲区生成完成，大小: ${buffer.length} 字节`);
      
      // 使用文件处理器保存文档
      const result = await this.fileHandler.writeWordDocument(outputFile, buffer);
      
      if (!result.success) {
        // 如果保存失败，抛出详细错误
        throw new Error(result.message);
      }
      
      // 如果文件路径发生了变化（自动重命名），更新输出路径
      if (result.filePath !== outputFile) {
        console.log(`注意：由于原文件被占用，文档已保存到: ${result.filePath}`);
      }
      
      return doc;
    } catch (error) {
      console.error('处理文件时出错:', error);
      
      // 提供更详细的错误信息
      let errorMessage = `处理文件${inputFile}失败`;
      
      if (error.code === 'EBUSY') {
        errorMessage += `：目标文件正在被其他程序使用。请关闭 "${path.basename(outputFile)}" 文件后重试。`;
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        errorMessage += `：没有权限访问目标文件。请检查文件权限。`;
      } else {
        errorMessage += `：${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * @method processElements
   * @description 处理HTML元素列表并添加到Word文档中
   * @param {Array} elements - HTML元素数组
   * @param {CheerioAPI} $ - Cheerio实例
   */
  async processElements(elements, $) {
    for (const element of elements) {
      const $el = $(element);
      const tagName = element.tagName?.toLowerCase();
      
      // 根据元素类型进行处理
      switch (tagName) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          this.headingProcessor.process($el, tagName, $);
          break;
        case 'p':
          this.textProcessor.processParagraph($el, $);
          break;
        case 'ul':
        case 'ol':
          this.listProcessor.process($el, $, tagName === 'ol');
          break;
        case 'table':
          this.tableProcessor.process($el, $);
          break;
        case 'blockquote':
          this.miscProcessor.processBlockquote($el, $);
          break;
        case 'pre':
          this.codeProcessor.process($el, $);
          break;
        case 'hr':
          // 检查配置中是否启用了分隔线显示
          const showHorizontalRules = this.config.document?.show_horizontal_rules !== false;
          if (showHorizontalRules) {
            this.miscProcessor.processHorizontalRule();
          }
          break;
        case 'img':
          this.mediaProcessor.processImage($el);
          break;
        case 'svg':
          await this.mediaProcessor.processSvg($el, $);
          break;
        case 'div':
          // 检查是否是TOC占位符
          if ($el.hasClass('toc-placeholder') && $el.attr('data-toc-marker') === 'true') {
            console.log('📋 发现[TOC]标记，记录位置并插入目录占位符');
            this.insertTocPlaceholder();
          } else {
            // 递归处理div内的元素
            await this.processElements($el.children().toArray(), $);
          }
          break;
      }
    }
  }

  /**
   * @method insertTocPlaceholder
   * @description 在当前位置插入目录占位符
   */
  insertTocPlaceholder() {
    // 添加一个特殊的占位符元素，用于标记目录位置
    const tocPlaceholder = {
      type: 'toc-placeholder',
      position: this.docElements.length
    };
    this.docElements.push(tocPlaceholder);
    console.log(`📋 TOC占位符已插入到位置: ${this.docElements.length - 1}`);
  }

  /**
   * @method addDocElement
   * @description 添加元素到文档元素数组
   * @param {Object} element - 要添加的元素
   */
  addDocElement(element) {
    this.docElements.push(element);
  }

  /**
   * @method generateDocumentStyles
   * @description 生成文档样式
   * @returns {Object} - 样式对象
   */
  generateDocumentStyles() {
    return {
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          run: {
            size: this.config.sizes?.default ? this.config.sizes.default * 2 : 24,
            font: {
              name: this.config.fonts?.default || 'Microsoft YaHei'
            }
          },
          paragraph: {
            spacing: {
              line: this.config.paragraph?.line_spacing ? this.config.paragraph.line_spacing * 240 : 276,
              after: this.config.paragraph?.space_after ? this.config.paragraph.space_after * 20 : 160
            }
          }
        },
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: this.config.sizes?.heading1 ? this.config.sizes.heading1 * 2 : 36,
            bold: true,
            font: {
              name: this.config.fonts?.headings || 'Microsoft YaHei'
            }
          },
          paragraph: {
            spacing: {
              before: this.config.paragraph?.space_before ? this.config.paragraph.space_before * 20 : 240,
              after: this.config.paragraph?.space_after ? this.config.paragraph.space_after * 20 : 120
            }
          }
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: this.config.sizes?.heading2 ? this.config.sizes.heading2 * 2 : 32,
            bold: true,
            font: {
              name: this.config.fonts?.headings || 'Microsoft YaHei'
            }
          },
          paragraph: {
            spacing: {
              before: this.config.paragraph?.space_before ? this.config.paragraph.space_before * 20 : 240,
              after: this.config.paragraph?.space_after ? this.config.paragraph.space_after * 20 : 120
            }
          }
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: this.config.sizes?.heading3 ? this.config.sizes.heading3 * 2 : 28,
            bold: true,
            font: {
              name: this.config.fonts?.headings || 'Microsoft YaHei'
            }
          },
          paragraph: {
            spacing: {
              before: this.config.paragraph?.space_before ? this.config.paragraph.space_before * 20 : 240,
              after: this.config.paragraph?.space_after ? this.config.paragraph.space_after * 20 : 120
            }
          }
        },
        {
          id: 'Code',
          name: 'Code',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: this.config.sizes?.code ? this.config.sizes.code * 2 : 20,
            font: {
              name: 'Consolas'
            }
          },
          paragraph: {
            spacing: {
              line: 240,
              before: 120,
              after: 120
            }
          }
        }
      ]
    };
  }
}

module.exports = HtmlToWordConverter;