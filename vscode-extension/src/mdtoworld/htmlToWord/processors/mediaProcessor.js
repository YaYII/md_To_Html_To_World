/**
 * @description 媒体处理器模块
 * 处理图片等媒体元素 - 修复版
 * 核心修复：
 * 1. 使用页面配置动态计算图片最大尺寸（而非硬编码600×450）
 * 2. 支持网络图片下载
 * 3. DPI感知的尺寸计算
 * 4. 图片尺寸不再溢出A4内容区
 */
const fs = require('fs');
const path = require('path');
const { Paragraph, TextRun, ImageRun, AlignmentType, LineRuleType } = require('docx');
const { getImageDimensions, calculateWordImageSize, parseImageAttributes } = require('../../utils/imageUtils');
const { getSharp } = require('../utils/sharpLoader');
const { svgToPng } = require('../utils/svgToPng');

// Sharp库将在需要时动态加载
let sharp = null;
let sharpLoadAttempted = false;

// 网络图片下载的axios实例（延迟加载）
let axiosInstance = null;

/**
 * @function loadSharp
 * @description 动态加载sharp库
 * @returns {Promise<Object|null>} sharp实例或null
 */
async function loadSharp() {
  if (sharpLoadAttempted) {
    return sharp;
  }
  
  sharpLoadAttempted = true;
  
  try {
    sharp = await getSharp();
    if (!sharp) {
      console.warn('⚠️ sharp 库不可用（vendor/sharp-deps 或 node_modules 均未找到）');
      return null;
    }
    console.log('✅ sharp 库加载成功，将用于SVG转换');
    return sharp;
  } catch (error) {
    console.warn('⚠️ sharp 库未安装:', error.message);
    console.warn('SVG图表将使用文本占位符显示');
    console.warn('如需SVG转换功能，请运行: npm install sharp');
    sharp = null;
    return null;
  }
}

/**
 * @function loadAxios
 * @description 动态加载axios库用于下载网络图片
 * @returns {Object|null} axios实例或null
 */
function loadAxios() {
  if (axiosInstance !== null) {
    return axiosInstance;
  }
  
  try {
    axiosInstance = require('axios');
    return axiosInstance;
  } catch (error) {
    console.warn('⚠️ axios 库未安装，无法下载网络图片');
    axiosInstance = false;
    return null;
  }
}

/**
 * @function getPageConfigFromConverter
 * @description 从converter的配置中提取页面配置
 * @param {Object} converter - 转换器实例
 * @returns {Object} 页面配置
 */
function getPageConfigFromConverter(converter) {
  const docConfig = converter.config.document;
  return {
    page_size: docConfig.page_size,
    orientation: docConfig.orientation,
    margin_top: docConfig.margin_top,
    margin_bottom: docConfig.margin_bottom,
    margin_left: docConfig.margin_left,
    margin_right: docConfig.margin_right
  };
}

/**
 * @class MediaProcessor
 * @description 处理媒体元素的类
 */
class MediaProcessor {
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
   * @method getImageSizeOptions
   * @description 获取图片尺寸计算的选项，基于页面配置
   * @returns {Object} 尺寸计算选项
   */
  getImageSizeOptions() {
    const pageConfig = getPageConfigFromConverter(this.converter);
    
    return {
      pageConfig
    };
  }

  /**
   * @method processSvg
   * @description 处理SVG元素 - 优化版本，直接使用HTML中的SVG内容
   * 核心修复：使用页面配置计算图片尺寸
   * @param {Cheerio} $el - Cheerio元素
   * @param {CheerioAPI} $ - Cheerio实例
   */
  async processSvg($el, $) {
    try {
      // 获取完整的SVG元素HTML（包括属性）
      let svgContent = $.html($el);
      
      if (!svgContent) {
        console.warn('SVG元素为空');
        return;
      }
      
      // 获取SVG的显示文本（如果有alt属性或title）
      const displayText = $el.attr('alt') || $el.attr('title') || $el.find('title').text() || 'SVG图表';
      
      try {
        // 确保SVG有正确的命名空间
        if (!svgContent.includes('xmlns="http://www.w3.org/2000/svg"')) {
          svgContent = svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        
        // 使用 svgToPng 转换 SVG→PNG（resvg 优先无 GLib 冲突，sharp fallback）
        // 优先用 convertHtml 子进程池预渲染缓存（98 图并行 SVG→PNG，避免串行 resvg 慢）
        const cachedPng = this.converter.svgPngCache ? this.converter.svgPngCache.get(svgContent) : null;
        const pngBuffer = cachedPng || await svgToPng(svgContent);
        
        if (!pngBuffer || pngBuffer.length === 0) {
          const fallbackParagraph = new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `[${displayText} - SVG转换库不可用]`,
                bold: true,
                color: "FF6600"
              })
            ]
          });
          this.converter.addDocElement(fallbackParagraph);
          return;
        }
        
        // 获取图片尺寸 - 使用DPI感知的计算
        const originalSize = getImageDimensions(pngBuffer);
        const sizeOptions = this.getImageSizeOptions();
        const wordSize = calculateWordImageSize(originalSize, {}, sizeOptions);
        
        console.log(`📐 图片尺寸: 原始 ${originalSize.width}x${originalSize.height}, Word ${Math.round(wordSize.width * 72 / 96)}x${Math.round(wordSize.height * 72 / 96)} pt`);
        
        await this._addImageToDocument(pngBuffer, 'png', wordSize, '', originalSize);
        
        // 如果有描述文字，添加描述段落
        if (displayText && displayText !== 'SVG图表') {
          const descFontSizePt = 10; // 说明文字使用10pt（size=20表示半点）
          const descLineHeightPx = Math.round(descFontSizePt * 1.5 * 96 / 72);
          const descSpaceBeforePx = Math.round(80 * 96 / 1440);
          const descSpaceAfterPx = Math.round(240 * 96 / 1440);
          const descAvgCharWidthPx = Math.round(descFontSizePt * 0.85 * 96 / 72);
          const descPageWidthPx = Math.round(this.converter.getPageContentHeightPx ? 
            this.converter.getPageContentHeightPx() * 0.69 : 643);
          const descCharsPerLine = Math.max(1, Math.floor(descPageWidthPx / descAvgCharWidthPx));
          const descNumLines = Math.max(1, Math.ceil((displayText || '').length / descCharsPerLine));
          const descHeightPx = descSpaceBeforePx + descNumLines * descLineHeightPx + descSpaceAfterPx;
          const descParagraph = new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: displayText,
                italics: true,
                size: 20,
                color: "666666"
              })
            ],
            spacing: {
              before: 80,
              after: 240
            }
          });
          this.converter.addDocElement(descParagraph, descHeightPx);
        }
        
      } catch (conversionError) {
        console.error('SVG转换失败:', conversionError.message);
        
        // 降级为文本占位符
        const fallbackParagraph = new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `[${displayText} - SVG转换失败: ${conversionError.message}]`,
              bold: true,
              color: "FF6600"
            })
          ]
        });
        
        this.converter.addDocElement(fallbackParagraph);
      }
      
    } catch (error) {
      console.error('处理SVG失败:', error);
      const errorParagraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: '[SVG图表 - 处理失败]',
            color: "FF0000"
          })
        ]
      });
      this.converter.addDocElement(errorParagraph);
    }
  }

  /**
   * @method processImage
   * @description 处理图片元素
   * 核心修复：
   * 1. 支持网络图片下载（而非只显示占位文本）
   * 2. 使用页面配置动态计算图片尺寸
   * 3. DPI感知的尺寸计算，避免图片溢出
   * @param {Cheerio} $el - Cheerio元素
   */
  async processImage($el) {
    try {
      // 获取图片源路径
      const src = $el.attr('src') || '';
      if (!src) return;
      
      // 获取图片描述
      const alt = $el.attr('alt') || '';
      
      // 获取尺寸计算选项
      const sizeOptions = this.getImageSizeOptions();
      
      // 处理网络图片
      if (src.startsWith('http://') || src.startsWith('https://')) {
        await this._processNetworkImage(src, alt, $el, sizeOptions);
        return;
      }
      
      // 处理base64图片
      if (src.startsWith('data:image/')) {
        await this._processBase64Image(src, alt, $el, sizeOptions);
        return;
      }
      
      // 处理本地图片
      await this._processLocalImage(src, alt, $el, sizeOptions);
    } catch (error) {
      console.error('处理图片时出错:', error);
      const errorParagraph = new Paragraph({
        children: [
          new TextRun({
            text: `[图片处理错误: ${error.message}]`,
            color: "FF0000"
          })
        ]
      });
      this.converter.addDocElement(errorParagraph);
    }
  }
  
  /**
   * @method _processNetworkImage
   * @description 处理网络图片（下载后嵌入Word）
   * @private
   */
  async _processNetworkImage(src, alt, $el, sizeOptions) {
    const axios = loadAxios();
    
    if (!axios) {
      // axios不可用，降级为占位文本
      const paragraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `[网络图片: ${alt || src}]` })
        ]
      });
      this.converter.addDocElement(paragraph);
      return;
    }
    
    try {
      const response = await axios.get(src, {
        timeout: 15000,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MarkdownToWord/1.0)',
          'Accept': 'image/*'
        }
      });
      
      if (response.status === 200 && response.data) {
        const imageBuffer = Buffer.from(response.data);
        const attributes = parseImageAttributes($el);
        const originalSize = getImageDimensions(imageBuffer);
        const wordSize = calculateWordImageSize(originalSize, attributes, sizeOptions);
        
        console.log(`📐 图片尺寸: 原始 ${originalSize.width}x${originalSize.height}, Word ${Math.round(wordSize.width * 72 / 96)}x${Math.round(wordSize.height * 72 / 96)} pt`);
        
        await this._addImageToDocument(imageBuffer, 'png', wordSize, attributes.alt, originalSize);
        
        // 图片说明（仅用户真实图注，内部生成的图表图不加）
        if (alt && this._shouldAddCaption($el)) {
          this._addCaption(alt);
        }
        return;
      }
    } catch (error) {
      console.warn(`下载网络图片失败: ${src} - ${error.message}`);
    }
    
    // 下载失败，显示占位文本
    const paragraph = new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `[网络图片: ${alt || src}]` })
      ]
    });
    this.converter.addDocElement(paragraph);
  }
  
  /**
   * @method _processBase64Image
   * @description 处理base64编码的图片
   * @private
   */
  async _processBase64Image(src, alt, $el, sizeOptions) {
    try {
      const base64Data = src.split(',')[1];
      if (!base64Data) {
        this._addPlaceholder(alt, src);
        return;
      }
      
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const attributes = parseImageAttributes($el);
      const originalSize = getImageDimensions(imageBuffer);
      const wordSize = calculateWordImageSize(originalSize, attributes, sizeOptions);
      
      console.log(`📐 Base64图片尺寸: 原始 ${originalSize.width}x${originalSize.height}, Word ${Math.round(wordSize.width * 72 / 96)}x${Math.round(wordSize.height * 72 / 96)} pt`);
      
      await this._addImageToDocument(imageBuffer, 'png', wordSize, attributes.alt, originalSize);
      
      if (alt && this._shouldAddCaption($el)) {
        this._addCaption(alt);
      }
    } catch (error) {
      console.error('处理base64图片失败:', error);
      this._addPlaceholder(alt, src);
    }
  }
  
  /**
   * @method _processLocalImage
   * @description 处理本地图片文件
   * @private
   */
  async _processLocalImage(src, alt, $el, sizeOptions) {
    try {
      // 构建图片的完整路径
      let imagePath = src;
      if (!path.isAbsolute(src)) {
        imagePath = path.join(this.converter.basePath, src);
      }
      
      if (fs.existsSync(imagePath)) {
        const imageData = fs.readFileSync(imagePath);
        const attributes = parseImageAttributes($el);
        const originalSize = getImageDimensions(imageData);
        const wordSize = calculateWordImageSize(originalSize, attributes, sizeOptions);
        
        console.log(`📐 图片尺寸: 原始 ${originalSize.width}x${originalSize.height}, Word ${Math.round(wordSize.width * 72 / 96)}x${Math.round(wordSize.height * 72 / 96)} pt`);
        
        // 根据文件扩展名或图片数据确定类型
        let imageType = 'png';
        if (imagePath.toLowerCase().endsWith('.jpg') || imagePath.toLowerCase().endsWith('.jpeg')) {
          imageType = 'jpg';
        } else if (imagePath.toLowerCase().endsWith('.gif')) {
          imageType = 'gif';
        } else if (imagePath.toLowerCase().endsWith('.bmp')) {
          imageType = 'bmp';
        } else {
          // 通过图片数据头部分辨类型
          const header = imageData.slice(0, 4);
          if (header[0] === 0xFF && header[1] === 0xD8) {
            imageType = 'jpg';
          } else if (header[0] === 0x47 && header[1] === 0x49) {
            imageType = 'gif';
          } else if (header[0] === 0x42 && header[1] === 0x4D) {
            imageType = 'bmp';
          }
        }
        
        await this._addImageToDocument(imageData, imageType, wordSize, attributes.alt, originalSize);
        
        // 图片说明（仅用户真实图注，内部生成的图表图不加）
        if (alt && this._shouldAddCaption($el)) {
          this._addCaption(alt);
        }
      } else {
        console.error(`图片文件不存在: ${imagePath}`);
        this._addPlaceholder(alt, src);
      }
    } catch (error) {
      console.error('处理本地图片失败:', error);
      this._addPlaceholder(alt, src);
    }
  }
  
  /**
   * @method _addImageToDocument
   * @description 将图片完整添加到文档（不分割、不裁剪）
   * 行为（用户要求：图片不要分割，分割是糟糕的行为）：
   * - 图片完整保留原图内容，绝不裁切成多段
   * - 图片宽度保持与页面内容区域一致
   * - 若图片按比例计算的高度超过一页内容区域，则等比缩放至单页高度内
   *   （保证整张图清晰完整可见，不会跨页割裂）
   * @private
   */
  async _addImageToDocument(imageBuffer, imageType, wordSize, alt, originalSize) {
    const sizeOptions = this.getImageSizeOptions();
    const { calculateMaxImageSize } = require('../../utils/imageUtils');
    const maxSize = calculateMaxImageSize(sizeOptions.pageConfig);
    const ptToPx = 96 / 72;
    const maxPageHeightPx = Math.round(maxSize.maxHeight * ptToPx);

    // 用原始尺寸计算图片在Word中的物理尺寸（磅）
    const { width: origWidth, height: origHeight, dpi = 96 } = originalSize;
    const physicalWidthPt = (origWidth / dpi) * 72;
    const physicalHeightPt = (origHeight / dpi) * 72;
    const aspectRatio = physicalWidthPt / physicalHeightPt;
    
    // 图片尺寸策略（政府文档规范）：
    // 1. 原图物理尺寸 ≤ 页面内容区 → 保持原始尺寸（小图标/示意图不被拉伸到整页宽、不变形）
    // 2. 原图物理尺寸 > 内容区 → 等比缩放至内容区内（大图占满宽度，内容清晰）
    // 3. 高度超单页 → 等比缩放至单页高度内（整图完整可见，不分割、不跨页截断）
    const maxWidthPt = maxSize.maxWidth;
    const maxHeightPt = maxSize.maxHeight;
    let targetWidthPt;
    let targetHeightPt;
    if (physicalWidthPt <= maxWidthPt && physicalHeightPt <= maxHeightPt) {
      // 原尺寸未超内容区：按物理尺寸显示（含 DPI 换算，避免小图被放大模糊）
      targetWidthPt = physicalWidthPt;
      targetHeightPt = physicalHeightPt;
    } else {
      // 超内容区：等比缩放到内容区内
      const scale = Math.min(maxWidthPt / physicalWidthPt, maxHeightPt / physicalHeightPt);
      targetWidthPt = physicalWidthPt * scale;
      targetHeightPt = physicalHeightPt * scale;
    }
    const pageContentWidthPx = Math.round(targetWidthPt * ptToPx);
    let fullHeightPx = Math.round(targetHeightPt * ptToPx);
    let scaled = false;

    console.log(`📐 图片尺寸: 原始${origWidth}x${origHeight}px(dpi=${dpi}), 物理${Math.round(physicalWidthPt)}x${Math.round(physicalHeightPt)}pt, Word ${pageContentWidthPx}x${fullHeightPx}px, 页面${maxPageHeightPx}px${scaled ? ' (超高已等比缩放至单页)' : ''}`);

    // 单页内剩余空间不足时：完整图片 + 当前页放不下则自然换页（Word 会自动分页），不做跨页裁切
    const remaining = this.converter.getRemainingPageSpace();
    const spacingBeforePx = Math.round(200 * 96 / 1440); // 200 twips ≈ 13px
    const spacingAfterPx = Math.round(200 * 96 / 1440);  // 200 twips ≈ 13px
    const totalNeeded = fullHeightPx + spacingBeforePx + spacingAfterPx;

    if (totalNeeded <= remaining) {
      console.log(`📐 图片直接添加: ${pageContentWidthPx}x${fullHeightPx}px (当前页剩余${remaining}px足够)`);
      const paragraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: imageBuffer,
            type: imageType,
            transformation: {
              width: pageContentWidthPx,
              height: fullHeightPx
            },
            altText: alt || ''
          })
        ],
        spacing: { before: 200, after: 200 }
      });
      this.converter.addDocElement(paragraph, totalNeeded);
      console.log(`✅ 图片已完整添加到文档`);
      return;
    }

    // 当前页剩余空间不足：完整图片整体插入（Word 自动将其移到下一页顶部展示），
    // 不做跨页裁切——图片始终完整清晰
    console.log(`📐 当前页剩余${remaining}px不足，完整图片将置于下一页展示: ${pageContentWidthPx}x${fullHeightPx}px`);
    const paragraph = new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data: imageBuffer,
          type: imageType,
          transformation: {
            width: pageContentWidthPx,
            height: fullHeightPx
          },
          altText: alt || ''
        })
      ],
      spacing: { before: 200, after: 200 },
      pageBreakBefore: false
    });
    this.converter.addDocElement(paragraph);
    console.log(`✅ 图片已完整添加到文档（当前页空间不足，Word 自动换页展示）`);
  }
  
  /**
   * @method _addCaption
   * @description 添加图片说明文字
   * @private
   */
  _addCaption(alt) {
    const captionParagraph = new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: alt,
          italics: true,
          size: (this.config.sizes.default - 2) * 2
        })
      ],
      spacing: {
        before: 80,
        after: 240
      }
    });
    // 估算说明文字高度（使用较小的字号和自定义间距）
    const capFontSizePt = this.config.sizes.default - 2;
    const capLineHeightPx = Math.round(capFontSizePt * 1.5 * 96 / 72);
    const capSpaceBeforePx = Math.round(80 * 96 / 1440);
    const capSpaceAfterPx = Math.round(240 * 96 / 1440);
    const avgCharWidthPx = Math.round(capFontSizePt * 0.85 * 96 / 72);
    const pageContentWidthPx = Math.round(this.converter.getPageContentHeightPx ? 
      this.converter.getPageContentHeightPx() * 0.69 : 643);
    const charsPerLine = Math.max(1, Math.floor(pageContentWidthPx / avgCharWidthPx));
    const numLines = Math.max(1, Math.ceil((alt || '').length / charsPerLine));
    const capHeight = capSpaceBeforePx + numLines * capLineHeightPx + capSpaceAfterPx;
    this.converter.addDocElement(captionParagraph, Math.max(20, capHeight));
  }

  /**
   * @method _shouldAddCaption
   * @description 判断该图片是否需要添加图注
   * 规则：内部生成的图表图（.chart-container 内，如 mermaid/plantuml 由 chartProcessor 生成）
   * 的 alt 是内部占位（如 "mermaid chart"），不应显示为图注；
   * 用户手写 Markdown `![描述](图片)` 的 alt 才是真实图注。
   * @param {Cheerio} $el - 图片元素
   * @returns {boolean}
   * @private
   */
  _shouldAddCaption($el) {
    if (!$el || !$el.closest) return true;
    // 图表容器内（chartProcessor 生成）→ 不加图注
    const chartContainer = $el.closest('.chart-container');
    if (chartContainer && chartContainer.length > 0) return false;
    return true;
  }
  
  /**
   * @method _addPlaceholder
   * @description 添加图片占位文本
   * @private
   */
  _addPlaceholder(alt, src) {
    const paragraph = new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `[图片: ${alt || src}]` })
      ]
    });
    this.converter.addDocElement(paragraph);
  }
}

module.exports = MediaProcessor;
