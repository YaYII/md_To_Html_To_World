/**
 * @file imageUtils.js
 * @description 图片处理工具函数 - 修复版
 * 核心修复：
 * 1. 根据页面配置动态计算Word图片最大尺寸（而非硬编码）
 * 2. 读取PNG/JPEG的DPI元数据，精确计算物理尺寸
 * 3. 支持更多CSS单位解析（cm/in/pt/%）
 */

// A4页面常量（厘米）
const PAGE_SIZES = {
  A4: { width: 21.0, height: 29.7 },
  A3: { width: 29.7, height: 42.0 },
  Letter: { width: 21.59, height: 27.94 },
  Legal: { width: 21.59, height: 35.56 }
};

// 默认页边距（厘米）- 与converter.js保持一致
const DEFAULT_MARGINS = {
  top: 1,
  bottom: 1,
  left: 1.5,
  right: 1.5
};

/**
 * @function getImageDimensions
 * @description 获取图片的原始尺寸和DPI信息
 * @param {Buffer} imageBuffer - 图片数据缓冲区
 * @returns {Object} 包含width、height和dpi的对象
 */
function getImageDimensions(imageBuffer) {
  try {
    if (imageBuffer.length < 100) {
      return { width: 400, height: 300, dpi: 96 };
    }
    
    // PNG格式检测
    if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47) {
      try {
        const width = imageBuffer.readUInt32BE(16);
        const height = imageBuffer.readUInt32BE(20);
        if (width > 0 && height > 0 && width < 10000 && height < 10000) {
          // 读取PNG的pHYs块获取DPI
          const dpi = readPngDpi(imageBuffer);
          return { width, height, dpi };
        }
      } catch (e) {
        console.warn('PNG尺寸解析失败:', e.message);
      }
    }
    
    // JPEG格式检测
    if (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) {
      try {
        let offset = 2;
        let dpi = 96; // 默认DPI
        while (offset < imageBuffer.length - 4) {
          if (imageBuffer[offset] === 0xFF) {
            const marker = imageBuffer[offset + 1];
            // JFIF APP0段包含DPI信息
            if (marker === 0xE0 && offset + 18 < imageBuffer.length) {
              const units = imageBuffer[offset + 13];
              const xDensity = imageBuffer.readUInt16BE(offset + 14);
              const yDensity = imageBuffer.readUInt16BE(offset + 16);
              if (units === 1) {
                dpi = xDensity; // dots per inch
              } else if (units === 2) {
                dpi = Math.round(xDensity * 2.54); // dots per cm -> dpi
              }
            }
            if (marker === 0xC0 || marker === 0xC2) {
              const height = imageBuffer.readUInt16BE(offset + 5);
              const width = imageBuffer.readUInt16BE(offset + 7);
              if (width > 0 && height > 0 && width < 10000 && height < 10000) {
                return { width, height, dpi };
              }
            }
            const segmentLength = imageBuffer.readUInt16BE(offset + 2);
            offset += 2 + segmentLength;
          } else {
            offset++;
          }
        }
      } catch (e) {
        console.warn('JPEG尺寸解析失败:', e.message);
      }
    }
    
    return { width: 400, height: 300, dpi: 96 };
  } catch (error) {
    console.error('获取图片尺寸失败:', error);
    return { width: 400, height: 300, dpi: 96 };
  }
}

/**
 * @function readPngDpi
 * @description 从PNG的pHYs块读取DPI
 * @param {Buffer} buffer - PNG数据
 * @returns {number} DPI值
 */
function readPngDpi(buffer) {
  try {
    // PNG结构：8字节签名 + IHDR块(25字节) + 后续块
    // 每个块：4字节长度 + 4字节类型 + 数据 + 4字节CRC
    let offset = 8; // 跳过PNG签名
    
    while (offset < buffer.length - 12) {
      const chunkLength = buffer.readUInt32BE(offset);
      const chunkType = buffer.toString('ascii', offset + 4, offset + 8);
      
      if (chunkType === 'pHYs') {
        // pHYs块：pixels per unit, X(4) + Y(4) + unit(1)
        const pixelsPerUnitX = buffer.readUInt32BE(offset + 8);
        const pixelsPerUnitY = buffer.readUInt32BE(offset + 12);
        const unit = buffer[offset + 16];
        
        if (unit === 1) {
          // 单位是米，转换为DPI (1 inch = 0.0254 meters)
          return Math.round(pixelsPerUnitX * 0.0254);
        }
        // unit === 0 表示未知单位，使用默认DPI
        return 96;
      }
      
      if (chunkType === 'IDAT') {
        // 到达图像数据块，pHYs应该在IDAT之前
        break;
      }
      
      // 跳到下一个块（4长度 + 4类型 + 数据 + 4CRC）
      offset += 12 + chunkLength;
    }
  } catch (e) {
    // 解析失败，使用默认值
  }
  return 96;
}

/**
 * @function calculateMaxImageSize
 * @description 根据页面配置动态计算Word文档中图片的最大尺寸（磅）
 * 最大宽度 = 页面内容区域宽度（图片尽量占满宽度）
 * 最大高度 = 页面内容区域高度（图片不能跨页，高度超出则缩小宽度）
 * @param {Object} pageConfig - 页面配置
 * @returns {Object} {maxWidth, maxHeight} 单位为磅(pt)
 */
function calculateMaxImageSize(pageConfig = {}) {
  const pageSize = pageConfig.page_size || 'A4';
  const orientation = pageConfig.orientation || 'portrait';
  const marginTop = pageConfig.margin_top || DEFAULT_MARGINS.top;
  const marginBottom = pageConfig.margin_bottom || DEFAULT_MARGINS.bottom;
  const marginLeft = pageConfig.margin_left || DEFAULT_MARGINS.left;
  const marginRight = pageConfig.margin_right || DEFAULT_MARGINS.right;
  
  // 获取页面尺寸（厘米）
  let pageDims = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
  
  // 横向时交换宽高
  let pageWidth = pageDims.width;
  let pageHeight = pageDims.height;
  if (orientation === 'landscape') {
    pageWidth = pageDims.height;
    pageHeight = pageDims.width;
  }
  
  // 计算内容区域（厘米）
  const contentWidthCm = pageWidth - marginLeft - marginRight;
  const contentHeightCm = pageHeight - marginTop - marginBottom;
  
  // 转换为磅 (1cm = 28.3465pt)
  const cmToPt = 28.3465;
  const maxWidthPt = contentWidthCm * cmToPt;
  // 最大高度 = 页面内容区域高度，图片不能超出单页
  const maxHeightPt = contentHeightCm * cmToPt;
  
  return {
    maxWidth: Math.round(maxWidthPt),
    maxHeight: Math.round(maxHeightPt)
  };
}

/**
 * @function calculateWordImageSize
 * @description 计算适合Word文档的图片尺寸
 * 缩放策略：
 * 1. 宽度占满页面内容区域，高度按比例计算
 * 2. 如果高度超过页面内容区域，限制高度为单页（安全兜底）
 * 3. 跨页分割由 calculateImageSplits + _addImageToDocument 在上层处理
 * 4. 始终保持宽高比，图片不会变形
 * @param {Object} originalSize - 原始图片尺寸 {width, height, dpi}
 * @param {Object} htmlAttributes - HTML元素的属性（当前未使用，保留兼容性）
 * @param {Object} options - 配置选项
 * @param {boolean} options.allowOverflow - 是否允许高度超出页面（用于跨页分割场景）
 * @returns {Object} Word文档中的图片尺寸 {width, height} 单位为像素(96dpi)
 */
function calculateWordImageSize(originalSize, htmlAttributes = {}, options = {}) {
  const {
    pageConfig = {},
    maxWidth: fixedMaxWidth,
    maxHeight: fixedMaxHeight,
    allowOverflow = false
  } = options;
  
  const { width: origWidth, height: origHeight, dpi = 96 } = originalSize;
  
  if (!origWidth || !origHeight || origWidth <= 0 || origHeight <= 0) {
    return { width: 300, height: 225 };
  }
  
  let maxSize;
  if (fixedMaxWidth && fixedMaxHeight) {
    maxSize = { maxWidth: fixedMaxWidth, maxHeight: fixedMaxHeight };
  } else {
    maxSize = calculateMaxImageSize(pageConfig);
  }
  
  const physicalWidth = (origWidth / dpi) * 72;
  const physicalHeight = (origHeight / dpi) * 72;
  const aspectRatio = physicalWidth / physicalHeight;
  
  let targetWidth = maxSize.maxWidth;
  let targetHeight = targetWidth / aspectRatio;
  
  if (!allowOverflow && targetHeight > maxSize.maxHeight) {
    targetHeight = maxSize.maxHeight;
    targetWidth = targetHeight * aspectRatio;
  }
  
  targetWidth = Math.max(14, Math.min(maxSize.maxWidth, targetWidth));
  targetHeight = Math.max(14, allowOverflow ? targetHeight : Math.min(maxSize.maxHeight, targetHeight));
  
  const ptToPx = 96 / 72;
  
  return {
    width: Math.round(targetWidth * ptToPx),
    height: Math.round(targetHeight * ptToPx)
  };
}

/**
 * @function parseHtmlDimension
 * @description 解析HTML属性中的尺寸值，转换为磅
 * @param {string} value - 尺寸值字符串
 * @param {number} fallbackPt - 回退值（磅）
 * @returns {number} 磅值
 */
function parseHtmlDimension(value, fallbackPt) {
  if (!value) return 0;
  const str = String(value).trim();
  
  // 纯数字（视为像素）
  if (/^\d+(\.\d+)?$/.test(str)) {
    return (parseFloat(str) / 96) * 72; // px -> pt (96dpi)
  }
  
  // 带单位
  const match = str.match(/^([\d.]+)\s*(px|cm|in|pt|%)?$/i);
  if (match) {
    const num = parseFloat(match[1]);
    const unit = (match[2] || 'px').toLowerCase();
    
    switch (unit) {
      case 'pt': return num;
      case 'px': return (num / 96) * 72;
      case 'cm': return num * 28.3465;
      case 'in': return num * 72;
      case '%': return fallbackPt * (num / 100);
      default: return (num / 96) * 72;
    }
  }
  
  return 0;
}

/**
 * @function parseStyleDimension
 * @description 解析CSS样式中的尺寸值，转换为磅
 * @param {string} styleStr - 样式字符串（如 "width: 300px"）
 * @param {number} fallbackPt - 回退值（磅）
 * @returns {number} 磅值
 */
function parseStyleDimension(styleStr, fallbackPt) {
  const match = styleStr.match(/([\d.]+)\s*(px|cm|in|pt|%)?/i);
  if (match) {
    return parseHtmlDimension(match[1] + (match[2] || ''), fallbackPt);
  }
  return 0;
}

/**
 * @function parseImageAttributes
 * @description 解析图片元素的属性
 * @param {Cheerio} $el - Cheerio元素
 * @returns {Object} 解析后的属性对象
 */
function parseImageAttributes($el) {
  const attributes = {};
  
  attributes.src = $el.attr('src') || '';
  attributes.alt = $el.attr('alt') || '';
  attributes.title = $el.attr('title') || '';
  attributes.width = $el.attr('width');
  attributes.height = $el.attr('height');
  attributes.style = $el.attr('style') || '';
  attributes.class = $el.attr('class') || '';
  
  return attributes;
}

/**
 * @function calculateImageSplits
 * @description 计算图片是否需要跨页分割
 * 如果图片高度超过一页内容区域高度，则将图片分割为多段，
 * 每段占满一页内容区域高度（最后一段可能不满一页），像PDF一样连续显示
 * @param {Object} wordSize - 图片在Word中的尺寸 {width, height}，单位为96dpi像素
 * @param {Object} pageConfig - 页面配置
 * @returns {Array} 分割段数组，每段 {width, height, cropTop, cropBottom}
 *   cropTop/cropBottom 为0-1的比例值，表示从原图的哪个位置裁切
 *   如果不需要分割，返回只包含一段的数组
 */
function calculateImageSplits(wordSize, pageConfig = {}) {
  const maxSize = calculateMaxImageSize(pageConfig);
  const ptToPx = 96 / 72;
  const maxPageHeightPx = Math.round(maxSize.maxHeight * ptToPx);

  const { width, height } = wordSize;

  if (height <= maxPageHeightPx) {
    return [{ width, height, cropTop: 0, cropBottom: 1 }];
  }

  const pageContentHeightPx = maxPageHeightPx;

  const splits = [];
  let currentTop = 0;

  while (currentTop < 1) {
    const remaining = 1 - currentTop;
    const segmentHeightRatio = pageContentHeightPx / height;

    if (remaining <= segmentHeightRatio + 0.01) {
      splits.push({
        width,
        height: Math.round(remaining * height),
        cropTop: currentTop,
        cropBottom: 1
      });
      break;
    }

    const cropBottom = currentTop + segmentHeightRatio;

    splits.push({
      width,
      height: pageContentHeightPx,
      cropTop: currentTop,
      cropBottom
    });

    currentTop = cropBottom;
  }

  return splits;
}

module.exports = {
  getImageDimensions,
  calculateWordImageSize,
  calculateMaxImageSize,
  calculateImageSplits,
  parseImageAttributes,
  parseHtmlDimension,
  parseStyleDimension
};
