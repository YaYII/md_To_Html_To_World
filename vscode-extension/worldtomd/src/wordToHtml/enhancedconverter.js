const mammoth = require('mammoth');
const fs = require('fs-extra');
const path = require('path');
const LargeFileWordToHtmlConverter = require('./largefileconverter');

/**
 * 增强版Word转HTML转换器
 * 自动检测文件大小并选择最优处理策略
 */
class EnhancedWordToHtmlConverter {
  constructor(options = {}) {
    this.options = {
      // 文件大小阈值配置
      largeFileThreshold: options.largeFileThreshold || 100 * 1024 * 1024, // 100MB
      hugeFileThreshold: options.hugeFileThreshold || 500 * 1024 * 1024, // 500MB
      
      // 内存管理配置
      maxMemoryUsage: options.maxMemoryUsage || 512 * 1024 * 1024, // 512MB
      enableMemoryMonitoring: options.enableMemoryMonitoring || true,
      enableGarbageCollection: options.enableGarbageCollection || true,
      
      // 图片处理配置
      imageProcessing: {
        maxImageSize: options.maxImageSize || 10 * 1024 * 1024, // 10MB
        enableImageCache: options.enableImageCache || true,
        compressImages: options.compressImages || true,
        imageQuality: options.imageQuality || 80,
        showStats: options.showImageStats || true
      },
      
      // 性能优化配置
      enableProgressCallback: options.enableProgressCallback || false,
      progressCallback: options.progressCallback || null,
      enablePerformanceLogging: options.enablePerformanceLogging || true,
      
      // 错误处理配置
      enableFallbackStrategy: options.enableFallbackStrategy || true,
      maxRetryAttempts: options.maxRetryAttempts || 3
    };
    
    // 初始化大文件转换器
    this.largeFileConverter = new LargeFileWordToHtmlConverter({
      maxMemoryUsage: this.options.maxMemoryUsage,
      enableProgressCallback: this.options.enableProgressCallback,
      progressCallback: this.options.progressCallback,
      maxImageSize: this.options.imageProcessing.maxImageSize,
      enableImageCache: this.options.imageProcessing.enableImageCache,
      compressImages: this.options.imageProcessing.compressImages,
      imageQuality: this.options.imageProcessing.imageQuality,
      enableGarbageCollection: this.options.enableGarbageCollection,
      enableMemoryMonitoring: this.options.enableMemoryMonitoring
    });
    
    this.processingStats = {
      filesProcessed: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      largeFilesProcessed: 0,
      errorsEncountered: 0
    };
  }

  /**
   * 智能转换Word文档为HTML
   * 自动检测文件大小并选择最优策略
   * @param {string} inputPath - 输入文件路径
   * @param {boolean} preserveImages - 是否保留图片
   * @returns {Promise<string>} 转换后的HTML
   */
  async convertToHtml(inputPath, preserveImages = true) {
    const startTime = Date.now();
    let strategy = 'unknown';
    
    try {
      // 检查文件是否存在
      if (!await fs.pathExists(inputPath)) {
        throw new Error(`文件不存在: ${inputPath}`);
      }

      // 检查文件扩展名
      const ext = path.extname(inputPath).toLowerCase();
      if (ext !== '.docx') {
        throw new Error(`不支持的文件格式: ${ext}，仅支持 .docx 文件`);
      }

      // 分析文件大小
      const fileStats = await fs.stat(inputPath);
      const fileSize = fileStats.size;
      const fileSizeMB = fileSize / (1024 * 1024);
      
      console.log(`📄 文件信息: ${path.basename(inputPath)} (${fileSizeMB.toFixed(2)}MB)`);
      
      // 根据文件大小选择处理策略
      let result;
      
      if (fileSize >= this.options.hugeFileThreshold) {
        // 超大文件 (>500MB) - 使用专门的大文件处理器
        strategy = 'huge_file_specialized';
        console.log('🔥 检测到超大文件，使用专门的大文件处理策略');
        result = await this.processHugeFile(inputPath, preserveImages);
        this.processingStats.largeFilesProcessed++;
        
      } else if (fileSize >= this.options.largeFileThreshold) {
        // 大文件 (100-500MB) - 使用优化的大文件处理器
        strategy = 'large_file_optimized';
        console.log('📦 检测到大文件，使用优化的大文件处理策略');
        result = await this.processLargeFile(inputPath, preserveImages);
        this.processingStats.largeFilesProcessed++;
        
      } else {
        // 普通文件 (<100MB) - 使用标准处理器但启用优化
        strategy = 'standard_optimized';
        console.log('📝 使用标准处理策略（已优化）');
        result = await this.processStandardFile(inputPath, preserveImages);
      }
      
      // 更新统计信息
      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(processingTime);
      
      if (this.options.enablePerformanceLogging) {
        this.logPerformanceStats(strategy, fileSizeMB, processingTime);
      }
      
      return result;
      
    } catch (error) {
      this.processingStats.errorsEncountered++;
      
      // 启用回退策略
      if (this.options.enableFallbackStrategy) {
        console.warn(`主要处理策略失败，尝试回退策略: ${error.message}`);
        return await this.fallbackProcessing(inputPath, preserveImages);
      }
      
      console.error(`Word 转 HTML 失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 处理超大文件 (>500MB)
   */
  async processHugeFile(inputPath, preserveImages) {
    console.log('🌊 启用流式处理和内存管理...');
    
    // 启用垃圾回收
    if (global.gc && this.options.enableGarbageCollection) {
      global.gc();
      console.log('🧹 预先执行垃圾回收');
    }
    
    // 使用大文件转换器的流式处理
    return await this.largeFileConverter.convertLargeFileToHtml(inputPath, preserveImages);
  }

  /**
   * 处理大文件 (100-500MB)
   */
  async processLargeFile(inputPath, preserveImages) {
    console.log('⚡ 启用内存优化和分块处理...');
    
    // 监控内存使用
    if (this.options.enableMemoryMonitoring) {
      this.startMemoryMonitoring();
    }
    
    // 使用大文件转换器的优化处理
    return await this.largeFileConverter.convertLargeFileToHtml(inputPath, preserveImages);
  }

  /**
   * 处理标准文件 (<100MB)
   */
  async processStandardFile(inputPath, preserveImages) {
    try {
      // 读取文件
      const buffer = await fs.readFile(inputPath);
      
      let result;
      let conversionStrategy = '';
      
      // 策略1：优先使用默认处理 + 手动替换Base64图片
      if (preserveImages) {
        try {
          console.log('🔄 使用默认处理 + 手动替换Base64图片');
          const defaultOptions = {
            ignoreEmptyParagraphs: false
          };
          result = await mammoth.convertToHtml(buffer, defaultOptions);
          conversionStrategy = '默认处理 + 手动替换';
          
          // 手动替换Base64图片为相对路径文件
          result.value = await this.replaceBase64WithFiles(result.value, inputPath);
          
          console.log('✅ 使用默认处理 + 手动替换转换成功');
        } catch (defaultError) {
          console.warn(`默认处理转换失败: ${defaultError.message}`);
          throw defaultError;
        }
      } else {
        // 不保留图片时，直接使用基本配置
        const basicOptions = {
          ignoreEmptyParagraphs: false,
          convertImage: mammoth.images.ignoreAll
        };
        result = await mammoth.convertToHtml(buffer, basicOptions);
        conversionStrategy = '基本配置（不保留图片）';
        console.log('✅ 使用基本配置转换成功（不保留图片）');
      }
      
      // 检查警告
      if (result.messages && result.messages.length > 0) {
        console.warn('转换警告:');
        result.messages.forEach(message => {
          console.warn(`- ${message.message}`);
        });
      }

      // 增强HTML结构
      let enhancedHtml;
      try {
        enhancedHtml = this.enhanceHtmlStructure(result.value);
      } catch (enhanceError) {
        console.warn(`HTML 增强处理出现错误，使用原始HTML: ${enhanceError.message}`);
        enhancedHtml = result.value;
      }

      // 格式化HTML
      return this.formatHtml(enhancedHtml);
      
    } catch (error) {
      throw new Error(`标准文件处理失败: ${error.message}`);
    }
  }

  /**
   * 回退处理策略
   */
  async fallbackProcessing(inputPath, preserveImages) {
    console.log('🔄 执行回退处理策略...');
    
    for (let attempt = 1; attempt <= this.options.maxRetryAttempts; attempt++) {
      try {
        console.log(`尝试 ${attempt}/${this.options.maxRetryAttempts}: 最小化配置处理`);
        
        const buffer = await fs.readFile(inputPath);
        const minimalOptions = {
          ignoreEmptyParagraphs: true,
          convertImage: mammoth.images.ignoreAll // 忽略所有图片
        };
        
        const result = await mammoth.convertToHtml(buffer, minimalOptions);
        
        console.log('✅ 回退策略成功');
        return this.formatHtml(result.value);
        
      } catch (retryError) {
        console.warn(`尝试 ${attempt} 失败: ${retryError.message}`);
        
        if (attempt === this.options.maxRetryAttempts) {
          throw new Error(`所有回退尝试都失败了: ${retryError.message}`);
        }
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * 生成安全的文件名（仅包含字母和数字）
   */
  generateSafeFileName(originalName) {
    // 移除中文字符和特殊字符，只保留字母、数字和基本符号
    let safeName = originalName
      .replace(/[\u4e00-\u9fff]/g, '') // 移除中文字符
      .replace(/[^a-zA-Z0-9\-_]/g, '_') // 将非字母数字字符替换为下划线
      .replace(/_+/g, '_') // 合并多个下划线
      .replace(/^_|_$/g, ''); // 移除开头和结尾的下划线
    
    // 如果处理后为空，使用默认名称
    if (!safeName) {
      safeName = 'document';
    }
    
    // 添加时间戳确保唯一性
    const timestamp = Date.now().toString().slice(-6);
    return `${safeName}_${timestamp}`;
  }

  /**
   * 手动替换Base64图片为相对路径文件
   */
  async replaceBase64WithFiles(html, inputPath) {
    console.log('🔄 手动处理base64图片...');
    
    const originalDocName = path.basename(inputPath, path.extname(inputPath));
    const safeDocName = this.generateSafeFileName(originalDocName);
    const base64Regex = /src="data:image\/([^;]+);base64,([^"]+)"/g;
    const imageDir = path.join('images', safeDocName);
    await fs.ensureDir(imageDir);
    
    console.log(`📁 Enhanced - 原始文档名: ${originalDocName}`);
    console.log(`📁 Enhanced - 安全文档名: ${safeDocName}`);
    
    let imageCounter = 0;
    let processedCount = 0;
    
    const replacedHtml = html.replace(base64Regex, (match, format, base64Data) => {
      try {
        imageCounter++;
        
        // 检查图片大小
        const estimatedSize = (base64Data.length * 3) / 4;
        if (estimatedSize > this.options.imageProcessing.maxImageSize) {
          console.warn(`图片 ${imageCounter} 过大 (${(estimatedSize / 1024 / 1024).toFixed(2)}MB)，跳过处理`);
          return match;
        }
        
        const extension = this.getImageExtensionFromFormat(format);
        const filename = `image_${String(imageCounter).padStart(3, '0')}.${extension}`;
        const imagePath = path.join(imageDir, filename);
        const relativePath = path.join('images', safeDocName, filename);
        
        // 同步保存图片
        try {
          const imageBuffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(imagePath, imageBuffer);
          console.log(`图片已保存并替换: ${relativePath}`);
          processedCount++;
          return `src="${relativePath}"`;
        } catch (saveError) {
          console.warn(`图片保存失败: ${saveError.message}`);
          return match;
        }
        
      } catch (error) {
        console.warn(`Base64图片处理失败: ${error.message}`);
        return match;
      }
    });
    
    console.log(`✅ 成功处理 ${processedCount} 个base64图片`);
    return replacedHtml;
  }

  /**
   * 获取图片扩展名
   */
  getImageExtensionFromFormat(format) {
    const formatMap = {
      'png': 'png',
      'jpeg': 'jpg',
      'jpg': 'jpg',
      'gif': 'gif',
      'bmp': 'bmp',
      'webp': 'webp'
    };
    return formatMap[format.toLowerCase()] || 'png';
  }

  /**
   * 增强HTML结构
   */
  enhanceHtmlStructure(html) {
    // 基本的HTML结构增强
    return html;
  }

  /**
   * 格式化HTML
   */
  formatHtml(html) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>转换文档</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            line-height: 1.6;
        }
        img { 
            max-width: 100%; 
            height: auto; 
            display: block;
            margin: 10px 0;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #333;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        p {
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
${html}
</body>
</html>`;
  }

  /**
   * 启动内存监控
   */
  startMemoryMonitoring() {
    if (!this.options.enableMemoryMonitoring) return;
    
    const monitorInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      
      if (memUsage.heapUsed > this.options.maxMemoryUsage) {
        console.warn(`⚠️  内存使用过高: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
        
        if (global.gc && this.options.enableGarbageCollection) {
          global.gc();
          console.log('🧹 执行垃圾回收');
        }
      }
    }, 1000);
    
    // 5分钟后停止监控
    setTimeout(() => {
      clearInterval(monitorInterval);
    }, 5 * 60 * 1000);
  }

  /**
   * 更新处理统计信息
   */
  updateProcessingStats(processingTime) {
    this.processingStats.filesProcessed++;
    this.processingStats.totalProcessingTime += processingTime;
    this.processingStats.averageProcessingTime = 
      this.processingStats.totalProcessingTime / this.processingStats.filesProcessed;
  }

  /**
   * 记录性能统计信息
   */
  logPerformanceStats(strategy, fileSizeMB, processingTime) {
    const processingSpeed = (fileSizeMB / (processingTime / 1000)).toFixed(2);
    
    console.log('\n📊 性能统计:');
    console.log(`   处理策略: ${strategy}`);
    console.log(`   文件大小: ${fileSizeMB.toFixed(2)}MB`);
    console.log(`   处理时间: ${(processingTime / 1000).toFixed(2)}秒`);
    console.log(`   处理速度: ${processingSpeed}MB/s`);
    console.log(`   平均处理时间: ${(this.processingStats.averageProcessingTime / 1000).toFixed(2)}秒`);
  }

  /**
   * 获取处理统计信息
   */
  getProcessingStats() {
    return {
      ...this.processingStats,
      averageProcessingTimeSeconds: this.processingStats.averageProcessingTime / 1000
    };
  }
}

module.exports = EnhancedWordToHtmlConverter;