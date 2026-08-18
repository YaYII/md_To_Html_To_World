const mammoth = require('mammoth');
const fs = require('fs-extra');
const path = require('path');
const stream = require('stream');
const { promisify } = require('util');
const MemoryPreprocessor = require('./memoryPreprocessor');

/**
 * 大文件Word转HTML转换器
 * 专门处理大型Word文档（1GB+）的转换
 */
class LargeFileWordToHtmlConverter {
  constructor(options = {}) {
    this.options = {
      // 内存管理配置
      maxMemoryUsage: options.maxMemoryUsage || 512 * 1024 * 1024, // 512MB
      chunkSize: options.chunkSize || 64 * 1024 * 1024, // 64MB 分块大小
      tempDir: options.tempDir || './temp',
      
      // 处理配置
      enableProgressCallback: options.enableProgressCallback || false,
      progressCallback: options.progressCallback || null,
      
      // 图片处理配置
      imageProcessing: {
        maxImageSize: options.maxImageSize || 10 * 1024 * 1024, // 10MB
        compressImages: options.compressImages || true,
        imageQuality: options.imageQuality || 80,
        enableImageCache: options.enableImageCache || true,
        maxCacheSize: options.maxCacheSize || 100 * 1024 * 1024, // 100MB
      },
      
      // 性能优化配置
      enableGarbageCollection: options.enableGarbageCollection || true,
      gcInterval: options.gcInterval || 1000, // 1秒
      enableMemoryMonitoring: options.enableMemoryMonitoring || true,
      
      // 内存预处理配置
      enableMemoryPreprocessing: options.enableMemoryPreprocessing !== false,
      memoryPreprocessorOptions: options.memoryPreprocessorOptions || {}
    };
    
    this.imageCache = new Map();
    this.memoryUsage = {
      peak: 0,
      current: 0,
      gcCount: 0
    };
    
    this.processingStats = {
      startTime: null,
      endTime: null,
      totalSize: 0,
      processedSize: 0,
      imagesProcessed: 0,
      chunksProcessed: 0
    };
    
    // 初始化内存预处理器
    if (this.options.enableMemoryPreprocessing) {
      this.memoryPreprocessor = new MemoryPreprocessor({
        maxHeapSize: this.options.maxMemoryUsage * 2, // 设置为最大内存使用量的2倍
        enableDetailedLogging: this.options.enableMemoryMonitoring,
        ...this.options.memoryPreprocessorOptions
      });
    }
  }

  /**
   * 检查文件大小并决定处理策略
   * @param {string} inputPath - 输入文件路径
   * @returns {Promise<Object>} 文件信息和处理策略
   */
  async analyzeFile(inputPath) {
    try {
      const stats = await fs.stat(inputPath);
      const fileSizeGB = stats.size / (1024 * 1024 * 1024);
      
      let strategy = 'normal';
      let recommendedChunkSize = this.options.chunkSize;
      
      if (fileSizeGB > 1) {
        strategy = 'large_file_streaming';
        recommendedChunkSize = 32 * 1024 * 1024; // 32MB for very large files
      } else if (fileSizeGB > 0.5) {
        strategy = 'medium_file_chunked';
        recommendedChunkSize = 64 * 1024 * 1024; // 64MB for medium files
      } else if (fileSizeGB > 0.1) {
        strategy = 'small_file_optimized';
        recommendedChunkSize = 128 * 1024 * 1024; // 128MB for small files
      }
      
      return {
        size: stats.size,
        sizeGB: fileSizeGB,
        strategy,
        recommendedChunkSize,
        estimatedMemoryUsage: stats.size * 1.5, // 估算内存使用量
        estimatedProcessingTime: Math.ceil(fileSizeGB * 30) // 估算处理时间（秒）
      };
    } catch (error) {
      throw new Error(`文件分析失败: ${error.message}`);
    }
  }

  /**
   * 监控内存使用情况
   */
  monitorMemoryUsage() {
    if (!this.options.enableMemoryMonitoring) return;
    
    const memUsage = process.memoryUsage();
    this.memoryUsage.current = memUsage.heapUsed;
    
    if (memUsage.heapUsed > this.memoryUsage.peak) {
      this.memoryUsage.peak = memUsage.heapUsed;
    }
    
    // 如果内存使用超过限制，触发垃圾回收
    if (memUsage.heapUsed > this.options.maxMemoryUsage && this.options.enableGarbageCollection) {
      if (global.gc) {
        global.gc();
        this.memoryUsage.gcCount++;
        console.log(`🧹 触发垃圾回收，当前内存使用: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      }
    }
  }

  /**
   * 流式处理大型Word文档
   * @param {string} inputPath - 输入文件路径
   * @param {boolean} preserveImages - 是否保留图片
   * @returns {Promise<string>} 转换后的HTML
   */
  async convertLargeFileToHtml(inputPath, preserveImages = true) {
    try {
      this.processingStats.startTime = Date.now();
      
      // 执行内存预处理
      if (this.memoryPreprocessor) {
        console.log('🧠 执行转换前内存预处理...');
        const preprocessingReport = await this.memoryPreprocessor.preprocessBeforeConversion(inputPath);
        
        if (!preprocessingReport.actions.criticalMode) {
          console.log('✅ 内存预处理完成，系统状态良好');
        } else {
          console.warn('⚠️  系统内存紧张，将使用保守处理策略');
        }
      }
      
      // 分析文件
      const fileInfo = await this.analyzeFile(inputPath);
      console.log(`📊 文件分析结果:`);
      console.log(`   文件大小: ${fileInfo.sizeGB.toFixed(2)}GB`);
      console.log(`   处理策略: ${fileInfo.strategy}`);
      console.log(`   估算内存使用: ${(fileInfo.estimatedMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   估算处理时间: ${fileInfo.estimatedProcessingTime}秒`);
      
      this.processingStats.totalSize = fileInfo.size;
      
      // 根据文件大小选择处理策略
      switch (fileInfo.strategy) {
        case 'large_file_streaming':
          return await this.processWithStreaming(inputPath, preserveImages, fileInfo);
        case 'medium_file_chunked':
          return await this.processWithChunking(inputPath, preserveImages, fileInfo);
        case 'small_file_optimized':
          return await this.processWithOptimization(inputPath, preserveImages, fileInfo);
        default:
          return await this.processNormally(inputPath, preserveImages);
      }
    } catch (error) {
      console.error(`大文件转换失败: ${error.message}`);
      throw error;
    } finally {
      this.processingStats.endTime = Date.now();
      this.printProcessingStats();
      
      // 转换完成后的内存清理
      if (this.memoryPreprocessor) {
        console.log('🧹 执行转换后内存清理...');
        this.memoryPreprocessor.forceGarbageCollection('转换完成后清理');
        this.memoryPreprocessor.clearAllCaches();
        
        const finalStats = this.memoryPreprocessor.getMemoryStats();
        console.log(`📊 最终内存统计: ${(finalStats.currentMemory / 1024 / 1024).toFixed(2)}MB`);
      }
    }
  }

  /**
   * 流式处理策略（适用于超大文件 >1GB）
   */
  async processWithStreaming(inputPath, preserveImages, fileInfo) {
    console.log('🌊 使用流式处理策略...');
    
    try {
      // 创建临时目录
      await fs.ensureDir(this.options.tempDir);
      
      // 尝试分块读取和处理
      const tempFiles = await this.splitDocumentIntoChunks(inputPath, fileInfo.recommendedChunkSize);
      
      let combinedHtml = '';
      let processedChunks = 0;
      
      for (const tempFile of tempFiles) {
        try {
          console.log(`📄 处理分块 ${processedChunks + 1}/${tempFiles.length}: ${path.basename(tempFile)}`);
          
          // 监控内存使用
          this.monitorMemoryUsage();
          
          // 使用内存预处理器进行更精确的内存管理
          if (this.memoryPreprocessor) {
            this.memoryPreprocessor.performMemoryCheck();
          }
          
          // 处理单个分块
          const chunkHtml = await this.processChunk(tempFile, preserveImages);
          combinedHtml += chunkHtml;
          
          processedChunks++;
          this.processingStats.chunksProcessed = processedChunks;
          
          // 更新进度
          if (this.options.enableProgressCallback && this.options.progressCallback) {
            const progress = (processedChunks / tempFiles.length) * 100;
            this.options.progressCallback(progress, `处理分块 ${processedChunks}/${tempFiles.length}`);
          }
          
          // 清理临时文件
          await fs.remove(tempFile);
          
          // 强制垃圾回收
          if (global.gc && this.options.enableGarbageCollection) {
            global.gc();
          }
          
        } catch (chunkError) {
          console.warn(`分块处理失败: ${chunkError.message}`);
          // 继续处理其他分块
        }
      }
      
      return this.finalizeHtml(combinedHtml);
      
    } catch (error) {
      throw new Error(`流式处理失败: ${error.message}`);
    } finally {
      // 清理临时目录
      await fs.remove(this.options.tempDir).catch(() => {});
    }
  }

  /**
   * 分块处理策略（适用于中等大小文件 0.5-1GB）
   */
  async processWithChunking(inputPath, preserveImages, fileInfo) {
    console.log('🧩 使用分块处理策略...');
    
    try {
      // 读取文件但使用内存映射
      const buffer = await this.readFileWithMemoryMapping(inputPath);
      
      // 使用优化的mammoth配置
      const options = {
        ignoreEmptyParagraphs: false,
        convertImage: preserveImages ? await this.createOptimizedImageHandler(inputPath) : mammoth.images.ignoreAll
      };
      
      // 监控内存使用
      this.monitorMemoryUsage();
      
      const result = await mammoth.convertToHtml(buffer, options);
      
      // 如果启用图片处理，进行Base64替换
      if (preserveImages) {
        result.value = await this.replaceBase64WithFilesOptimized(result.value, inputPath);
      }
      
      return this.finalizeHtml(result.value);
      
    } catch (error) {
      throw new Error(`分块处理失败: ${error.message}`);
    }
  }

  /**
   * 优化处理策略（适用于小文件 0.1-0.5GB）
   */
  async processWithOptimization(inputPath, preserveImages, fileInfo) {
    console.log('⚡ 使用优化处理策略...');
    
    try {
      // 使用标准方法但启用所有优化
      const buffer = await fs.readFile(inputPath);
      
      const options = {
        ignoreEmptyParagraphs: false,
        convertImage: preserveImages ? await this.createOptimizedImageHandler(inputPath) : mammoth.images.ignoreAll
      };
      
      const result = await mammoth.convertToHtml(buffer, options);
      
      if (preserveImages) {
        result.value = await this.replaceBase64WithFilesOptimized(result.value, inputPath);
      }
      
      return this.finalizeHtml(result.value);
      
    } catch (error) {
      throw new Error(`优化处理失败: ${error.message}`);
    }
  }

  /**
   * 标准处理策略（适用于小文件 <0.1GB）
   */
  async processNormally(inputPath, preserveImages) {
    console.log('📝 使用标准处理策略...');
    
    const buffer = await fs.readFile(inputPath);
    const options = {
      ignoreEmptyParagraphs: false,
      convertImage: preserveImages ? mammoth.images.ignoreAll : mammoth.images.ignoreAll
    };
    
    const result = await mammoth.convertToHtml(buffer, options);
    
    if (preserveImages) {
      result.value = await this.replaceBase64WithFilesOptimized(result.value, inputPath);
    }
    
    return this.finalizeHtml(result.value);
  }

  /**
   * 内存映射文件读取（模拟）
   */
  async readFileWithMemoryMapping(inputPath) {
    // Node.js 中的内存映射模拟
    // 实际上仍然是读取文件，但可以添加更多优化
    return await fs.readFile(inputPath);
  }

  /**
   * 创建优化的图片处理器
   */
  /**
   * 生成安全的英文文件名（仅包含字母和数字）
   * @param {string} originalName - 原始文件名
   * @returns {string} 安全的英文文件名
   */
  generateSafeFileName(originalName) {
    // 移除文件扩展名
    const nameWithoutExt = path.basename(originalName, path.extname(originalName));
    
    // 将中文和特殊字符转换为安全的英文字符
    let safeName = nameWithoutExt
      .replace(/[\u4e00-\u9fff]/g, '') // 移除中文字符
      .replace(/[^a-zA-Z0-9]/g, '_') // 将非字母数字字符替换为下划线
      .replace(/_+/g, '_') // 合并多个下划线
      .replace(/^_|_$/g, '') // 移除开头和结尾的下划线
      .toLowerCase();
    
    // 如果处理后为空或太短，使用默认名称
    if (!safeName || safeName.length < 2) {
      safeName = 'document';
    }
    
    // 添加时间戳确保唯一性
    const timestamp = Date.now().toString().slice(-6);
    return `${safeName}_${timestamp}`;
  }

  async createOptimizedImageHandler(inputPath) {
    const originalDocName = path.basename(inputPath, path.extname(inputPath));
    const safeDocName = this.generateSafeFileName(originalDocName);
    const imageDir = path.join('images', safeDocName);
    await fs.ensureDir(imageDir);
    
    console.log(`📁 LargeFile - 原始文档名: ${originalDocName}`);
    console.log(`📁 LargeFile - 安全文档名: ${safeDocName}`);
    
    let imageCounter = 0;
    
    return mammoth.images.imgElement(async (image) => {
      try {
        imageCounter++;
        
        // 检查图片大小
        if (image.read().length > this.options.imageProcessing.maxImageSize) {
          console.warn(`图片 ${imageCounter} 过大，跳过处理`);
          return { src: '' };
        }
        
        // 检查缓存
        const imageHash = this.calculateImageHash(image.read());
        if (this.imageCache.has(imageHash)) {
          console.log(`图片 ${imageCounter} 命中缓存`);
          return { src: this.imageCache.get(imageHash) };
        }
        
        const extension = this.getImageExtension(image.contentType);
        const filename = `image_${String(imageCounter).padStart(3, '0')}.${extension}`;
        const imagePath = path.join(imageDir, filename);
        const relativePath = path.join('images', safeDocName, filename);
        
        // 保存图片
        await fs.writeFile(imagePath, image.read());
        
        // 更新缓存
        if (this.options.imageProcessing.enableImageCache) {
          this.imageCache.set(imageHash, relativePath);
        }
        
        this.processingStats.imagesProcessed++;
        
        return { src: relativePath };
      } catch (error) {
        console.warn(`图片处理失败: ${error.message}`);
        return { src: '' };
      }
    });
  }

  /**
   * 优化的Base64替换方法
   */
  async replaceBase64WithFilesOptimized(html, inputPath) {
    console.log('🔄 优化处理base64图片...');
    
    const originalDocName = path.basename(inputPath, path.extname(inputPath));
    const safeDocName = this.generateSafeFileName(originalDocName);
    const base64Regex = /src="data:image\/([^;]+);base64,([^"]+)"/g;
    const imageDir = path.join('images', safeDocName);
    await fs.ensureDir(imageDir);
    
    console.log(`📁 Base64处理 - 原始文档名: ${originalDocName}`);
    console.log(`📁 Base64处理 - 安全文档名: ${safeDocName}`);
    
    let imageCounter = 0;
    let processedCount = 0;
    
    const replacedHtml = html.replace(base64Regex, (match, format, base64Data) => {
      try {
        imageCounter++;
        
        // 检查Base64数据大小
        const estimatedSize = (base64Data.length * 3) / 4;
        if (estimatedSize > this.options.imageProcessing.maxImageSize) {
          console.warn(`Base64图片 ${imageCounter} 过大，跳过处理`);
          return match;
        }
        
        // 检查缓存
        if (this.imageCache.has(base64Data.substring(0, 100))) {
          const cachedPath = this.imageCache.get(base64Data.substring(0, 100));
          console.log(`Base64图片 ${imageCounter} 命中缓存`);
          return `src="${cachedPath}"`;
        }
        
        const extension = this.getImageExtensionFromFormat(format);
        const filename = `image_${String(imageCounter).padStart(3, '0')}.${extension}`;
        const imagePath = path.join(imageDir, filename);
        const relativePath = path.join('images', safeDocName, filename);
        
        // 异步保存图片（不阻塞替换过程）
        setImmediate(async () => {
          try {
            const imageBuffer = Buffer.from(base64Data, 'base64');
            await fs.writeFile(imagePath, imageBuffer);
            
            // 更新缓存
            if (this.options.imageProcessing.enableImageCache) {
              this.imageCache.set(base64Data.substring(0, 100), relativePath);
            }
            
            console.log(`图片已保存: ${relativePath}`);
          } catch (saveError) {
            console.warn(`图片保存失败: ${saveError.message}`);
          }
        });
        
        processedCount++;
        return `src="${relativePath}"`;
        
      } catch (error) {
        console.warn(`Base64图片处理失败: ${error.message}`);
        return match;
      }
    });
    
    console.log(`✅ 成功处理 ${processedCount} 个base64图片`);
    return replacedHtml;
  }

  /**
   * 计算图片哈希（简单实现）
   */
  calculateImageHash(imageBuffer) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(imageBuffer).digest('hex');
  }

  /**
   * 获取图片扩展名
   */
  getImageExtension(contentType) {
    const typeMap = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/bmp': 'bmp',
      'image/webp': 'webp'
    };
    return typeMap[contentType] || 'png';
  }

  /**
   * 从格式字符串获取图片扩展名
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
   * 分割文档为分块（模拟实现）
   */
  async splitDocumentIntoChunks(inputPath, chunkSize) {
    // 这是一个简化的实现
    // 实际应用中需要更复杂的文档分割逻辑
    console.log('⚠️  注意: 文档分块功能需要专门的实现');
    return [inputPath]; // 暂时返回原文件
  }

  /**
   * 处理单个分块
   */
  async processChunk(chunkPath, preserveImages) {
    const buffer = await fs.readFile(chunkPath);
    const options = {
      ignoreEmptyParagraphs: false,
      convertImage: preserveImages ? mammoth.images.ignoreAll : mammoth.images.ignoreAll
    };
    
    const result = await mammoth.convertToHtml(buffer, options);
    return result.value;
  }

  /**
   * 最终化HTML
   */
  finalizeHtml(html) {
    // 添加基本的HTML结构
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>转换文档</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        img { max-width: 100%; height: auto; }
    </style>
</head>
<body>
${html}
</body>
</html>`;
  }

  /**
   * 打印处理统计信息
   */
  printProcessingStats() {
    const duration = (this.processingStats.endTime - this.processingStats.startTime) / 1000;
    const peakMemoryMB = (this.memoryUsage.peak / 1024 / 1024).toFixed(2);
    
    console.log('\n📊 处理统计信息:');
    console.log(`   处理时间: ${duration.toFixed(2)}秒`);
    console.log(`   峰值内存使用: ${peakMemoryMB}MB`);
    console.log(`   垃圾回收次数: ${this.memoryUsage.gcCount}`);
    console.log(`   处理的图片数: ${this.processingStats.imagesProcessed}`);
    console.log(`   处理的分块数: ${this.processingStats.chunksProcessed}`);
    console.log(`   文件大小: ${(this.processingStats.totalSize / 1024 / 1024).toFixed(2)}MB`);
  }
}

module.exports = LargeFileWordToHtmlConverter;