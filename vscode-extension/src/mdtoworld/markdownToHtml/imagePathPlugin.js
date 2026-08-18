/**
 * @description 图片路径处理插件
 * 解决Markdown转HTML时中文路径被URL编码的问题
 */

/**
 * @function imagePathPlugin
 * @description markdown-it插件，用于处理图片路径中的中文字符编码问题
 * @param {Object} md - markdown-it实例
 */
function imagePathPlugin(md) {
  // 保存原始的image规则
  const defaultImageRender = md.renderer.rules.image || function(tokens, idx, options, env, renderer) {
    return renderer.renderToken(tokens, idx, options);
  };

  // 重写image渲染规则
  md.renderer.rules.image = function(tokens, idx, options, env, renderer) {
    const token = tokens[idx];
    const srcIndex = token.attrIndex('src');
    
    if (srcIndex >= 0) {
      const src = token.attrs[srcIndex][1];
      
      // 检查是否是相对路径且包含中文字符
      if (isRelativePathWithChinese(src)) {
        // 对中文路径进行特殊处理
        const processedSrc = processChinesePath(src);
        token.attrs[srcIndex][1] = processedSrc;
        
        // 添加调试信息
        console.log(`🖼️  图片路径处理:`);
        console.log(`   原始路径: ${src}`);
        console.log(`   处理后路径: ${processedSrc}`);
      }
    }
    
    return defaultImageRender(tokens, idx, options, env, renderer);
  };
}

/**
 * @function isRelativePathWithChinese
 * @description 检查路径是否是相对路径且包含中文字符
 * @param {string} path - 路径字符串
 * @returns {boolean} - 是否是包含中文的相对路径
 */
function isRelativePathWithChinese(path) {
  // 检查是否是相对路径（不以http://、https://、data:开头）
  const isRelative = !/^(https?:\/\/|data:|\/)/.test(path);
  
  // 检查是否包含中文字符
  const hasChinese = /[\u4e00-\u9fff]/.test(path);
  
  return isRelative && hasChinese;
}

/**
 * @function processChinesePath
 * @description 处理包含中文的路径
 * @param {string} path - 原始路径
 * @returns {string} - 处理后的路径
 */
function processChinesePath(path) {
  // 方案1: 保持原始路径不变（推荐）
  // 这样可以确保路径在文件系统中是正确的
  return path;
  
  // 方案2: 如果需要URL编码，可以使用以下代码
  // return encodeURI(path);
  
  // 方案3: 如果需要部分编码（只编码中文部分）
  // return path.replace(/[\u4e00-\u9fff]/g, function(match) {
  //   return encodeURIComponent(match);
  // });
}

/**
 * @function createImagePathFixer
 * @description 创建图片路径修复器，用于后处理HTML中的图片路径
 * @returns {Function} - 路径修复函数
 */
function createImagePathFixer() {
  return function fixImagePaths(html) {
    // 使用正则表达式查找所有img标签的src属性
    return html.replace(/<img([^>]*?)src=["']([^"']*?)["']([^>]*?)>/gi, function(match, before, src, after) {
      // 如果src被URL编码了，尝试解码
      if (src.includes('%')) {
        try {
          const decodedSrc = decodeURIComponent(src);
          // 检查解码后是否包含中文字符
          if (/[\u4e00-\u9fff]/.test(decodedSrc)) {
            console.log(`🔧 修复图片路径:`);
            console.log(`   编码路径: ${src}`);
            console.log(`   解码路径: ${decodedSrc}`);
            return `<img${before}src="${decodedSrc}"${after}>`;
          }
        } catch (error) {
          console.warn(`⚠️  解码图片路径失败: ${src}`, error.message);
        }
      }
      return match;
    });
  };
}

module.exports = {
  imagePathPlugin,
  createImagePathFixer,
  isRelativePathWithChinese,
  processChinesePath
};