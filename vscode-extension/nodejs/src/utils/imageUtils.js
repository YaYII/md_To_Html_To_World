/**
 * @file imageUtils.js
 * @description 图片处理工具函数
 */

/**
 * @function getImageDimensions
 * @description 获取图片的原始尺寸
 * @param {Buffer} imageBuffer - 图片数据缓冲区
 * @returns {Object} 包含width和height的对象
 */
function getImageDimensions(imageBuffer) {
  try {
    // 由于sharp的metadata是异步的，直接使用手动解析方法
    console.log('🔍 正在解析图片尺寸...');
    
    // 简单的图片格式检测和尺寸估算
    if (imageBuffer.length < 100) {
      return { width: 400, height: 300 };
    }
    
    // PNG格式检测
    if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47) {
      try {
        const width = imageBuffer.readUInt32BE(16);
        const height = imageBuffer.readUInt32BE(20);
        if (width > 0 && height > 0 && width < 10000 && height < 10000) {
          return { width, height };
        }
      } catch (e) {
        console.warn('PNG尺寸解析失败:', e.message);
      }
    }
    
    // JPEG格式检测
    if (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) {
      try {
        let offset = 2;
        while (offset < imageBuffer.length - 4) {
          if (imageBuffer[offset] === 0xFF) {
            const marker = imageBuffer[offset + 1];
            if (marker === 0xC0 || marker === 0xC2) {
              const height = imageBuffer.readUInt16BE(offset + 5);
              const width = imageBuffer.readUInt16BE(offset + 7);
              if (width > 0 && height > 0 && width < 10000 && height < 10000) {
                return { width, height };
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
    
    return { width: 400, height: 300 };
  } catch (error) {
    console.error('获取图片尺寸失败:', error);
    return { width: 400, height: 300 };
  }
}

/**
 * @function calculateWordImageSize
 * @description 计算适合Word文档的图片尺寸
 * @param {Object} originalSize - 原始图片尺寸 {width, height}
 * @param {Object} htmlAttributes - HTML元素的属性
 * @param {Object} options - 配置选项
 * @returns {Object} Word文档中的图片尺寸 {width, height}
 */
function calculateWordImageSize(originalSize, htmlAttributes = {}, options = {}) {
  const {
    maxWidth = 600,      // Word文档最大宽度（磅）
    maxHeight = 450,     // Word文档最大高度（磅）
    defaultWidth = 400,  // 默认宽度
    defaultHeight = 300, // 默认高度
    maintainAspectRatio = true // 是否保持宽高比
  } = options;
  
  let { width: origWidth, height: origHeight } = originalSize;
  
  // 如果原始尺寸无效，使用默认值
  if (!origWidth || !origHeight || origWidth <= 0 || origHeight <= 0) {
    return { width: defaultWidth, height: defaultHeight };
  }
  
  // 检查HTML属性中是否指定了尺寸
  let targetWidth = origWidth;
  let targetHeight = origHeight;
  
  // 解析HTML中的width和height属性
  if (htmlAttributes.width) {
    const widthValue = parseFloat(htmlAttributes.width);
    if (!isNaN(widthValue) && widthValue > 0) {
      targetWidth = widthValue;
    }
  }
  
  if (htmlAttributes.height) {
    const heightValue = parseFloat(htmlAttributes.height);
    if (!isNaN(heightValue) && heightValue > 0) {
      targetHeight = heightValue;
    }
  }
  
  // 解析CSS样式中的尺寸
  if (htmlAttributes.style) {
    const style = htmlAttributes.style;
    const widthMatch = style.match(/width\s*:\s*([\d.]+)(?:px)?/i);
    const heightMatch = style.match(/height\s*:\s*([\d.]+)(?:px)?/i);
    
    if (widthMatch) {
      const widthValue = parseFloat(widthMatch[1]);
      if (!isNaN(widthValue) && widthValue > 0) {
        targetWidth = widthValue;
      }
    }
    
    if (heightMatch) {
      const heightValue = parseFloat(heightMatch[1]);
      if (!isNaN(heightValue) && heightValue > 0) {
        targetHeight = heightValue;
      }
    }
  }
  
  // 如果需要保持宽高比
  if (maintainAspectRatio) {
    const aspectRatio = origWidth / origHeight;
    
    // 如果只指定了宽度，根据宽高比计算高度
    if (htmlAttributes.width && !htmlAttributes.height) {
      targetHeight = targetWidth / aspectRatio;
    }
    // 如果只指定了高度，根据宽高比计算宽度
    else if (htmlAttributes.height && !htmlAttributes.width) {
      targetWidth = targetHeight * aspectRatio;
    }
    // 如果都没指定，但原始尺寸过大，按比例缩放
    else if (!htmlAttributes.width && !htmlAttributes.height) {
      if (targetWidth > maxWidth || targetHeight > maxHeight) {
        const widthRatio = maxWidth / targetWidth;
        const heightRatio = maxHeight / targetHeight;
        const ratio = Math.min(widthRatio, heightRatio);
        
        targetWidth = Math.round(targetWidth * ratio);
        targetHeight = Math.round(targetHeight * ratio);
      }
    }
  }
  
  // 确保尺寸在合理范围内
  targetWidth = Math.max(50, Math.min(maxWidth, targetWidth));
  targetHeight = Math.max(50, Math.min(maxHeight, targetHeight));
  
  return {
    width: Math.round(targetWidth),
    height: Math.round(targetHeight)
  };
}

/**
 * @function parseImageAttributes
 * @description 解析图片元素的属性
 * @param {Cheerio} $el - Cheerio元素
 * @returns {Object} 解析后的属性对象
 */
function parseImageAttributes($el) {
  const attributes = {};
  
  // 获取基本属性
  attributes.src = $el.attr('src') || '';
  attributes.alt = $el.attr('alt') || '';
  attributes.title = $el.attr('title') || '';
  
  // 获取尺寸属性
  attributes.width = $el.attr('width');
  attributes.height = $el.attr('height');
  
  // 获取样式属性
  attributes.style = $el.attr('style') || '';
  
  // 获取CSS类
  attributes.class = $el.attr('class') || '';
  
  return attributes;
}

module.exports = {
  getImageDimensions,
  calculateWordImageSize,
  parseImageAttributes
};