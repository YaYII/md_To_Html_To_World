/**
 * @description HTML转Word核心转换器模块
 * 提供了将HTML内容转换为Word文档的核心功能
 */
const fs = require('fs-extra');
const path = require('path');
const docx = require('docx');
const cheerio = require('cheerio');

// 导入docx模块的组件
const { Document, Paragraph, Packer, HeadingLevel, TextRun, Footer, PageNumber, AlignmentType } = docx;

// 导入处理器模块
const TextProcessor = require('./processors/textProcessor');
const HeadingProcessor = require('./processors/headingProcessor');
const ListProcessor = require('./processors/listProcessor');
const TableProcessor = require('./processors/tableProcessor');
const MediaProcessor = require('./processors/mediaProcessor');
const CodeProcessor = require('./processors/codeProcessor');
const MermaidProcessor = require('./processors/mermaidProcessor');
const MiscProcessor = require('./processors/miscProcessor');
const TocProcessor = require('./processors/tocProcessor');
const IconProcessor = require('./processors/iconProcessor');
const MathProcessor = require('./processors/mathProcessor');

// 导入文件处理器
const FileHandler = require('../utils/fileHandler');
const { COMPLETE_DEFAULTS, deepMerge } = require('../utils/defaultConfig');
const logger = require('../utils/fileLogger');

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
    this.config = deepMerge(COMPLETE_DEFAULTS, config);
    this.imagesToProcess = [];
    this.basePath = process.cwd();
    this.docElements = [];
    
    // 初始化页面位置追踪（用于图片分割时计算当前页剩余空间）
    this.pageContentHeightPx = this._calculatePageContentHeightPx();
    this.pageContentHeightTwips = this._calculatePageContentHeightTwips();
    this.headerReserveTwips = 708; // OOXML默认页眉距离顶端
    this.footerReserveTwips = 708; // OOXML默认页脚距离底端
    this.currentPagePositionPx = 0;
    this.totalAccumulatedHeightPx = 0; // 累计总高度（不折页），用于推算页号
    this._lastLoggedPage = 0; // 用于页号变化日志
    
    // 初始化文件处理器
    this.fileHandler = new FileHandler({
      maxRetries: 3,           // 最大重试3次
      retryDelay: 1000,        // 重试间隔1秒
      autoRename: true         // 自动重命名冲突文件
    });
    
    // 初始化各种处理器
    this.initProcessors();
    
    // console.log('HTML到Word转换器初始化配置:', JSON.stringify({
    //   document: this.config.document,
    //   fonts: this.config.fonts,
    //   sizes: this.config.sizes,
    //   colors: this.config.colors,
    //   paragraph: this.config.paragraph,
    //   chinese: this.config.chinese,
    //   table_styles: this.config.table_styles,
    //   enhanced_table_styles: this.config.enhanced_table_styles
    // }, null, 2));
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
    this.mermaidProcessor = new MermaidProcessor(this.config, this);
    this.miscProcessor = new MiscProcessor(this.config, this);
    this.tocProcessor = new TocProcessor(this.config, this);
    this.iconProcessor = new IconProcessor(this.config);
    this.mathProcessor = new MathProcessor(this.config, this);
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
      await logger.init({ basePath, config: this.config });
      logger.i(`convertHtml 开始（basePath=${basePath}）`);
      // 如果提供了基础路径，设置为当前基础路径（用于处理相对路径的图片）
      if (basePath) {
        this.basePath = basePath;
      }
      
      // 重置文档元素数组、目录处理器和页面位置
      this.docElements = [];
      this.currentPagePositionPx = 0;
      this.totalAccumulatedHeightPx = 0;
      this._lastLoggedPage = 0;
      if (this.tocProcessor) {
        this.tocProcessor.reset();
      }
      
      // 解析HTML
      const $ = cheerio.load(htmlContent);

      // ===== 预渲染：并行渲染所有 mermaid 代码块为 PNG（避免 processElements 串行等待） =====
      // 大文档（98 图）串行渲染约 12s，预渲染并行可大幅提速；processElements 时从缓存取用
      try {
        const mermaidCodes = [];
        $('pre code.language-mermaid').each((_, el) => {
          mermaidCodes.push($(el).text().trim());
        });
        if (mermaidCodes.length > 0 && this.mermaidProcessor) {
          logger.i(`convertHtml: 检测到 ${mermaidCodes.length} 个 mermaid 代码块，开始预渲染`);
          await this.mermaidProcessor.preRenderMermaids(mermaidCodes);
          console.log(`📊 预渲染 mermaid 图: ${mermaidCodes.length} 个`);
          logger.i(`convertHtml: 预渲染完成，继续解析文档元素`);
        }
      } catch (e) {
        console.warn(`[convertHtml] mermaid 预渲染失败（不影响后续，processElements 会兜底）: ${e.message}`);
        logger.w(`convertHtml: mermaid 预渲染失败: ${e.message}`);
      }

      // ===== 预渲染：并行转换 gov-mermaid 内联 SVG → PNG（子进程池，避免 processSvg 串行等待） =====
      // HTML 链路已服务端把 mermaid 渲染成 SVG 内联（div.gov-mermaid > svg）；
      // Word 需要 PNG，这里用子进程池并行 svg→png，processSvg 从缓存取用，避免 98 图串行 resvg（~2min）
      this.svgPngCache = new Map();
      try {
        const svgEls = [];
        $('div.gov-mermaid svg').each((_, el) => {
          svgEls.push($.html(el));
        });
        if (svgEls.length > 0) {
          logger.i(`convertHtml: 检测到 ${svgEls.length} 个内联 SVG，开始子进程池并行转 PNG`);
          const t0 = Date.now();
          const pngs = await this._renderSvgPool(svgEls);
          for (let i = 0; i < svgEls.length; i++) {
            if (pngs[i]) this.svgPngCache.set(svgEls[i], pngs[i]);
          }
          logger.i(`convertHtml: 内联 SVG→PNG 完成 ${pngs.filter(Boolean).length}/${svgEls.length}，耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
          console.log(`📊 预渲染内联 SVG→PNG: ${pngs.filter(Boolean).length}/${svgEls.length}`);
        }
      } catch (e) {
        console.warn(`[convertHtml] 内联 SVG 预渲染失败（不影响后续，processSvg 会兜底）: ${e.message}`);
        logger.w(`convertHtml: 内联 SVG 预渲染失败: ${e.message}`);
      }
      
      // 处理HTML内容
      const children = $('body').children().toArray();
      await this.processElements(children, $);
      
      console.log(`📊 处理完成后docElements数量: ${this.docElements.length}`);
      
      // 获取页面大小和边距配置（配置已由 defaultConfig 保证非空）
      const docConfig = this.config.document;
      const pageSize = docConfig.page_size;
      const marginTop = docConfig.margin_top;
      const marginRight = docConfig.margin_right;
      const marginBottom = docConfig.margin_bottom;
      const marginLeft = docConfig.margin_left;
      const orientation = docConfig.orientation;
      const generateToc = docConfig.generate_toc;
      const tocDepth = docConfig.toc_depth;
      // [TOC] 标记是用户的显式目录请求：即使 generate_toc=false 也应生成目录
      // （旧实现 generate_toc=false 时把 toc-placeholder 过滤掉，[TOC] 被静默丢弃）
      const hasTocMarker = this.docElements.some(el => el.type === 'toc-placeholder');
      const shouldGenerateToc = generateToc || hasTocMarker;
      
      // console.log('应用文档配置:', {
      //   pageSize,
      //   orientation,
      //   margins: {
      //     top: marginTop,
      //     right: marginRight,
      //     bottom: marginBottom,
      //     left: marginLeft
      //   },
      //   generateToc,
      //   tocDepth,
      //   headingCount: this.tocProcessor ? this.tocProcessor.getHeadingCount() : 0
      // });
      
      // 决定文档内容
      let documentContent;
      if (shouldGenerateToc && this.tocProcessor && this.tocProcessor.getHeadingCount() > 0) {
        // 生成目录
        const tocElements = this.tocProcessor.generateSimpleToc();
        
        // 检查是否需要生成封面页
        const generateCover = docConfig.generate_cover !== false; // 默认生成封面
        
        // 查找TOC占位符的位置
        let tocPlaceholderIndex = -1;
        for (let i = 0; i < this.docElements.length; i++) {
          if (this.docElements[i].type === 'toc-placeholder') {
            tocPlaceholderIndex = i;
            // console.log(`📋 找到TOC占位符在位置: ${i}`);
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
            // console.log(`📋 已生成完整文档结构：第1页封面（基于文档内容）+ 第2页目录 + 第3页开始正文，共${this.tocProcessor.getHeadingCount()}个标题`);
          } else {
            // 只生成目录 + 正文
            documentContent = [...beforeToc, ...tocElements, ...afterToc];
            // console.log(`📋 目录已插入到[TOC]标记位置 (${tocPlaceholderIndex})，共${this.tocProcessor.getHeadingCount()}个标题`);
          }
        } else {
          // 如果没有找到TOC占位符，将目录放在文档开头
          if (generateCover) {
            // 生成完整的三页结构：封面 + 目录 + 正文
            // 从文档内容中提取信息用于封面页
            const documentInfo = this.tocProcessor.extractDocumentInfo();
            const coverElements = this.tocProcessor.generateCoverPage(documentInfo);
            documentContent = [...coverElements, ...tocElements, ...this.docElements];
            // console.log(`📋 已生成完整文档结构：第1页封面（基于文档内容）+ 第2页目录 + 第3页开始正文，共${this.tocProcessor.getHeadingCount()}个标题`);
          } else {
            // 只生成目录 + 正文
            documentContent = [...tocElements, ...this.docElements];
            // console.log(`📋 未找到[TOC]标记，目录已放置在文档开头，共${this.tocProcessor.getHeadingCount()}个标题`);
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
          // console.log('📋 已生成封面页（基于文档内容）+ 正文内容');
        } else {
          documentContent = filteredElements;
          // console.log('📋 未启用目录或无标题，直接使用文档内容');
        }
      }
      
      // 创建Word文档
      // 页脚页码（政府公文规范：正文页脚居中页码，Word 域实时计算）
      const showPageNumber = docConfig.show_page_number !== false;
      const footerElement = showPageNumber ? new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                children: [PageNumber.CURRENT],
                font: {
                  name: this.config.fonts.default,
                  eastAsia: this.config.fonts.default
                },
                size: 18 // 9pt，页码比正文小一号
              })
            ],
            spacing: {
              before: 0,
              after: 0
            }
          })
        ]
      }) : undefined;

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
                  width: this._getPageSizeTwips(pageSize, 'width'),
                  height: this._getPageSizeTwips(pageSize, 'height')
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
            children: documentContent,
            footers: footerElement ? { default: footerElement } : undefined
          }
        ]
      });
      
      return doc;
    } catch (error) {
      // console.error('转换HTML到Word失败:', error);
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
      // console.log(`开始转换HTML文件: ${inputFile}`);
      
      // 读取HTML文件
      const htmlContent = await fs.readFile(inputFile, 'utf-8');
      // console.log(`HTML文件读取完成，大小: ${htmlContent.length} 字符`);
      
      // 设置基础路径为HTML文件的目录（用于处理相对路径的图片）
      const basePath = path.dirname(inputFile);
      
      // 转换为Word文档
      const doc = await this.convertHtml(htmlContent, basePath);
      logger.i(`convertHtml 完成，docElements=${this.docElements.length}`);
      // console.log('HTML到Word转换完成，开始保存文件...');
      
      // 生成Word文档缓冲区
      const buffer = await Packer.toBuffer(doc);
      // console.log(`Word文档缓冲区生成完成，大小: ${buffer.length} 字节`);
      
      // 使用文件处理器保存文档
      const result = await this.fileHandler.writeWordDocument(outputFile, buffer);
      
      if (!result.success) {
        // 如果保存失败，抛出详细错误
        throw new Error(result.message);
      }
      
      // 如果文件路径发生了变化（自动重命名），更新输出路径
      if (result.filePath !== outputFile) {
        // console.log(`注意：由于原文件被占用，文档已保存到: ${result.filePath}`);
      }
      
      return doc;
    } catch (error) {
      // console.error('处理文件时出错:', error);
      
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
          // await：段落内可能含图片（跨页分割为异步 sharp 处理），必须等待完成
          await this.textProcessor.processParagraph($el, $);
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
          // mermaid 代码块 → 服务端渲染 PNG 嵌入 docx（HTML 端是浏览器渲染 SVG，Word 需要 PNG）
          if (this.mermaidProcessor.isMermaid($el, $)) {
            const codeText = $el.find('code').first().text();
            const ok = await this.mermaidProcessor.processMermaid(codeText.trim());
            if (!ok) {
              // 降级：按普通代码块显示
              this.codeProcessor.process($el, $);
            }
          } else {
            this.codeProcessor.process($el, $);
          }
          break;
        case 'hr':
          // 检查配置中是否启用了分隔线显示
          const showHorizontalRules = this.config.document?.show_horizontal_rules !== false;
          if (showHorizontalRules) {
            this.miscProcessor.processHorizontalRule();
          }
          break;
        case 'img':
          await this.mediaProcessor.processImage($el);
          break;
        case 'svg':
          await this.mediaProcessor.processSvg($el, $);
          break;
        case 'div':
          // 检查是否是TOC占位符
          if ($el.hasClass('toc-placeholder') && $el.attr('data-toc-marker') === 'true') {
            // console.log('📋 发现[TOC]标记，记录位置并插入目录占位符');
            this.insertTocPlaceholder();
          } else if ($el.hasClass('math-block')) {
            // 处理块级数学公式
            this.mathProcessor.processMathElement($el, $);
          } else {
            // 递归处理div内的元素
            await this.processElements($el.children().toArray(), $);
          }
          break;
        case 'span':
          // 检查是否是数学公式
          if ($el.hasClass('math-formula') && !$el.hasClass('math-block')) {
            // 行内数学公式在文本处理器中处理
            // 这里不单独处理，因为它们通常在段落内
          }
          // 递归处理span内的元素
          await this.processElements($el.children().toArray(), $);
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
    // console.log(`📋 TOC占位符已插入到位置: ${this.docElements.length - 1}`);
  }

  /**
   * @method addDocElement
   * @description 添加元素到文档元素数组，并追踪当前页位置
   * @param {Object} element - 要添加的元素
   * @param {number} estimatedHeightPx - 估算高度（像素），用于页面位置追踪
   */
  addDocElement(element, estimatedHeightPx = 0) {
    this.docElements.push(element);
    
    // 累积总高度（用于推算页号）
    this.totalAccumulatedHeightPx += estimatedHeightPx;
    
    // 更新当前页位置追踪（模运算方式——文本段落可自然跨页）
    this.currentPagePositionPx += estimatedHeightPx;
    
    // 如果超过页面高度，自动换页（循环减直到落在当前页范围内）
    while (this.currentPagePositionPx >= this.pageContentHeightPx) {
      this.currentPagePositionPx -= this.pageContentHeightPx;
    }
    
    this._logPageProgress();
  }

  /**
   * @method addImageSegment
   * @description 添加图片分割段（图片是原子元素，不能被截断跨页）
   * 如果段高度 > 当前页剩余空间，段从下一页页首开始放置
   * @param {Object} element - 图片段落元素
   * @param {number} imageHeightPx - 图片段高度
   * @returns {boolean} - 段是否被挤到下一页
   */
  addImageSegment(element, imageHeightPx = 0) {
    this.docElements.push(element);
    
    let wasPushed = false;
    
    if (imageHeightPx > 0) {
      // 累积总高度（用于推算页号）
      this.totalAccumulatedHeightPx += imageHeightPx;
      
      const remaining = this.pageContentHeightPx - this.currentPagePositionPx;
      
      if (imageHeightPx > remaining) {
        // 装不下→从下一页页首开始
        wasPushed = true;
        this.currentPagePositionPx = imageHeightPx;
      } else {
        this.currentPagePositionPx += imageHeightPx;
      }
      
      // 处理超出一页的元素
      while (this.currentPagePositionPx >= this.pageContentHeightPx) {
        this.currentPagePositionPx -= this.pageContentHeightPx;
      }
    }
    
    this._logPageProgress();
    return wasPushed;
  }

  /**
   * @method getPageNumber
   * @description 获取当前所在页号（从1开始）
   * @returns {number}
   */
  getPageNumber() {
    return Math.floor(this.totalAccumulatedHeightPx / this.pageContentHeightPx) + 1;
  }

  /**
   * @method getPageInfo
   * @description 获取当前页的完整状态信息
   * @returns {Object} { pageNumber, pageHeight, used, remaining }
   */
  getPageInfo() {
    return {
      pageNumber: this.getPageNumber(),
      pageHeight: this.pageContentHeightPx,
      used: this.pageContentHeightPx - this.getRemainingPageSpace(),
      remaining: this.getRemainingPageSpace()
    };
  }

  /**
   * @method _logPageProgress
   * @description 当页号变化时打印日志，以页号序列追踪进度
   * @private
   */
  _logPageProgress() {
    const currentPage = this.getPageNumber();
    if (currentPage !== this._lastLoggedPage) {
      console.log(`  📃 第${currentPage}页: 总高${this.totalAccumulatedHeightPx}px, 已用${Math.round(this.currentPagePositionPx)}px, 剩余${this.getRemainingPageSpace()}px`);
      this._lastLoggedPage = currentPage;
    }
  }

  /**
   * @method getRemainingPageSpace
   * @description 获取当前页面的剩余空间（像素）
   * @returns {number} - 剩余空间像素值
   */
  getRemainingPageSpace() {
    return Math.max(0, this.pageContentHeightPx - this.currentPagePositionPx);
  }

  /**
   * @method savePageCheckpoint
   * @description 保存当前页面位置检查点（用于图片分割回滚）
   * @returns {Object} - 检查点 { position, elementsCount }
   */
  savePageCheckpoint() {
    return {
      position: this.currentPagePositionPx,
      elementsCount: this.docElements.length
    };
  }

  /**
   * @method restorePageCheckpoint
   * @description 恢复页面位置检查点（用于图片分割回滚）
   * @param {Object} checkpoint - 之前保存的检查点
   */
  restorePageCheckpoint(checkpoint) {
    this.currentPagePositionPx = checkpoint.position;
    // 回滚：移除检查点之后添加的元素
    while (this.docElements.length > checkpoint.elementsCount) {
      this.docElements.pop();
    }
  }

  /**
   * @method getPageContentHeightPx
   * @description 获取页面内容区域高度（像素）
   * @returns {number} - 页面内容区域高度
   */
  getPageContentHeightPx() {
    return this.pageContentHeightPx;
  }

  /**
   * @method getPageContentHeightTwips
   * @description 获取页面内容区域高度（twips单位，与OOXML一致）
   * @returns {number} - 页面内容区域高度twips值
   */
  getPageContentHeightTwips() {
    return this.pageContentHeightTwips;
  }

  /**
   * @method _calculatePageContentHeightPx
   * @description 根据页面配置计算页面内容区域高度（像素）
   * @private
   * @returns {number} - 页面内容区域高度像素值
   */
  _calculatePageContentHeightTwips() {
    // 计算页面内容区高度（twips），使用与Document创建完全一致的OOXML转换逻辑
    const docConfig = this.config.document;
    const pageSize = docConfig.page_size || 'A4';
    const orientation = docConfig.orientation || 'portrait';
    
    // 与Document创建代码完全相同的页高计算（docx库用trunc截断匹配OOXML整数）
    let pageHeightTwips = this._getPageSizeTwips(pageSize, 'height');
    // 横向时交换宽高
    if (orientation === 'landscape') {
      pageHeightTwips = this._getPageSizeTwips(pageSize, 'width');
    }
    
    // 边距转换：与docx.convertMillimetersToTwip完全一致
    const marginTopTwips = Math.round(docConfig.margin_top * 10 * 1440 / 25.4);
    const marginBottomTwips = Math.round(docConfig.margin_bottom * 10 * 1440 / 25.4);
    
    return pageHeightTwips - marginTopTwips - marginBottomTwips;
  }

  /**
   * @method _calculatePageContentHeightPx
   * @description 根据页面配置计算页面内容区域高度（像素）
   * @private
   * @returns {number} - 页面内容区域高度像素值
   */
  _calculatePageContentHeightPx() {
    const twips = this._calculatePageContentHeightTwips();
    return Math.round(twips * 96 / 1440);
  }

  /**
   * @method _getPageSizeTwips
   * @description 获取纸张尺寸（twips）。支持 A3/A4/Letter/Legal，未知尺寸回退 A4
   * @param {string} pageSize - 页面大小标识
   * @param {'width'|'height'} dim - 宽或高
   * @returns {number} - twips 值
   * @private
   */
  _getPageSizeTwips(pageSize, dim) {
    // 英寸：A4 = 8.27x11.69", A3 = 11.69x16.54", Letter = 8.5x11", Legal = 8.5x14"
    const PAGE_DIMS_INCH = {
      A4: { width: 8.27, height: 11.69 },
      A3: { width: 11.69, height: 16.54 },
      Letter: { width: 8.5, height: 11 },
      Legal: { width: 8.5, height: 14 }
    };
    const dims = PAGE_DIMS_INCH[pageSize] || PAGE_DIMS_INCH.A4;
    return Math.trunc((dims[dim] || 0) * 1440);
  }

  /**
   * @method _renderSvgPool
   * @description 子进程池并行 SVG→PNG（避免主进程串行 resvg 慢，98 图约 2min → 数秒）
   * 复用 renderChild.js（新增 type='svg' 任务：sharp 直接转 PNG，无需跑 mermaid）
   * @param {string[]} svgs - SVG 字符串数组
   * @returns {Promise<Array<Buffer|null>>}
   * @private
   */
  async _renderSvgPool(svgs) {
    if (!svgs || svgs.length === 0) return [];
    const { fork } = require('child_process');
    const childPath = this.mermaidProcessor && this.mermaidProcessor._findRenderChild
      ? this.mermaidProcessor._findRenderChild()
      : null;
    if (!childPath) {
      // 兜底：主进程串行 svgToPng
      const { svgToPng } = require('./utils/svgToPng');
      const out = [];
      for (const svg of svgs) out.push(await svgToPng(svg));
      return out;
    }

    const childCount = Math.min(4, Math.max(1, svgs.length));
    const children = [];
    const results = new Map();
    let done = 0;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      children.forEach(c => { try { c.kill(); } catch (e) {} });
    };

    return await new Promise((resolve) => {
      let nextIdx = 0;
      let started = false;
      let failTimer = null;

      for (let i = 0; i < childCount; i++) {
        const c = fork(childPath, { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
        c.on('message', (msg) => {
          if (msg && msg.ready) return;
          if (msg && msg.id !== undefined) {
            results.set(msg.id, msg);
            done++;
            if (done === svgs.length) {
              if (failTimer) clearTimeout(failTimer);
              cleanup();
              const out = svgs.map((_, idx) => {
                const r = results.get(idx);
                return r && r.png ? Buffer.from(r.png, 'base64') : null;
              });
              resolve(out);
            }
          }
        });
        c.on('error', () => { cleanup(); if (failTimer) clearTimeout(failTimer); resolve(null); });
        c.on('exit', () => {
          if (done < svgs.length) { cleanup(); if (failTimer) clearTimeout(failTimer); resolve(null); }
        });
        children.push(c);
      }

      failTimer = setTimeout(() => {
        if (!started) {
          started = true;
          svgs.forEach((svg, idx) => {
            const c = children[nextIdx % childCount];
            if (c && c.connected) c.send({ id: idx, type: 'svg', svg });
            nextIdx++;
          });
        }
      }, 1200);
    });
  }

  /**
   * @method estimateParagraphHeight
   * @description 估算段落高度（像素），用于页面位置追踪
   * 通过文本长度、字号、行间距等参数估算段落实际需要的高度
   * @param {string} text - 段落文本内容
   * @param {number} fontSizePt - 字号（磅），默认使用配置值
   * @returns {number} - 估算高度（像素）
   */
  estimateParagraphHeight(text = '', fontSizePt = null) {
    const paraConfig = this.config.paragraph;
    const ptToPx = 96 / 72;
    
    // 段前/段后间距（像素）
    // spacing.before = space_before * 20 twips, 1 twip = 96/1440 px
    const spaceBeforePx = Math.round(paraConfig.space_before * 20 * 96 / 1440);
    const spaceAfterPx = Math.round(paraConfig.space_after * 20 * 96 / 1440);
    
    // 行高（像素）
    // spacing.line = line_spacing * 240 twips, 1 twip = 96/1440 px
    const lineSpacingPx = Math.round(paraConfig.line_spacing * 240 * 96 / 1440);
    
    if (!text) {
      return spaceBeforePx + lineSpacingPx + spaceAfterPx;
    }
    
    // 估算页面内容宽度（像素）
    const docConfig = this.config.document;
    const { calculateMaxImageSize } = require('../utils/imageUtils');
    const pageConfig = {
      page_size: docConfig.page_size,
      orientation: docConfig.orientation,
      margin_top: docConfig.margin_top,
      margin_bottom: docConfig.margin_bottom,
      margin_left: docConfig.margin_left,
      margin_right: docConfig.margin_right
    };
    const maxSize = calculateMaxImageSize(pageConfig);
    const pageContentWidthPx = Math.round(maxSize.maxWidth * ptToPx);
    
    // 估算平均字符宽度（像素）
    // 对于中文字体，字符宽度 ≈ 字号(pt) × 系数
    // 中文字符约等于字号大小，英文字符约 0.5 倍字号
    // 系数从配置中读取，默认0.85适合中文字符为主的文档
    const actualFontSizePt = fontSizePt || this.config.sizes.default;
    const charWidthRatio = paraConfig.char_width_ratio || 0.85;
    const avgCharWidthPx = Math.round(actualFontSizePt * charWidthRatio * ptToPx);
    const charsPerLine = Math.max(1, Math.floor(pageContentWidthPx / avgCharWidthPx));
    const numLines = Math.max(1, Math.ceil(text.length / charsPerLine));
    
    return spaceBeforePx + numLines * lineSpacingPx + spaceAfterPx;
  }

  /**
   * @method resetPagePosition
   * @description 重置页面位置（用于显式分页后）
   */
  resetPagePosition() {
    this.currentPagePositionPx = 0;
  }

  /**
   * @method generateDocumentStyles
   * @description 生成文档样式
   * @returns {Object} - 样式对象
   */
  generateDocumentStyles() {
    const { sizes, fonts, paragraph: para } = this.config;
    return {
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          run: {
            size: sizes.default * 2,
            font: {
              name: fonts.default
            }
          },
          paragraph: {
            spacing: {
              // 不设置固定的 line，避免图片段落被裁剪
              after: para.space_after * 20
            }
          }
        },
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: sizes.heading1 * 2,
            bold: true,
            font: {
              name: fonts.headings
            }
          },
          paragraph: {
            spacing: {
              before: para.space_before * 20,
              after: para.space_after * 20
            }
          }
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: sizes.heading2 * 2,
            bold: true,
            font: {
              name: fonts.headings
            }
          },
          paragraph: {
            spacing: {
              before: para.space_before * 20,
              after: para.space_after * 20
            }
          }
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: sizes.heading3 * 2,
            bold: true,
            font: {
              name: fonts.headings
            }
          },
          paragraph: {
            spacing: {
              before: para.space_before * 20,
              after: para.space_after * 20
            }
          }
        },
        {
          id: 'Code',
          name: 'Code',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: sizes.code * 2,
            font: {
              name: fonts.code
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
