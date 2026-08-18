/**
 * @file chartProcessor.js
 * @description 图表处理器模块 - 优化版
 * 用于识别Markdown中的文字型图表（如mermaid、kroki等）并转换为图像
 * 
 * 核心修复：
 * 1. 支持本地mmdc渲染（@mermaid-js/mermaid-cli）作为首选方案
 * 2. Kroki API作为在线备选方案
 * 3. 离线时保留原始代码块作为降级显示
 * 4. 修复Mermaid尺寸参数，生成与Word页面匹配的图片
 * 5. 优化DPI设置，确保图片清晰且尺寸正确
 */
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * @class ChartProcessor
 * @description 图表处理器类，负责识别和转换文字型图表
 */
class ChartProcessor {
  /**
   * @constructor
   * @param {Object} config - 配置对象
   */
  constructor(config = {}) {
    this.config = config;
    this.chartConfig = config.charts || {
      enabled: true,
      service: 'auto',       // 'auto' | 'local' | 'kroki' - auto优先本地，回退Kroki
      kroki_url: 'https://kroki.io',
      output_format: 'png',  // 'svg' | 'png' - 推荐png避免Word文字丢失
      cache_enabled: true,
      cache_dir: './chart_cache',
      timeout: 30000,         // 增加到30秒，复杂图表需要更长时间
      dpi: 150,               // 生成图片DPI（96/150/300），150是清晰度和文件大小的平衡
      supported_types: [
        'mermaid', 'plantuml', 'graphviz', 'blockdiag', 'seqdiag',
        'actdiag', 'nwdiag', 'packetdiag', 'rackdiag', 'c4plantuml',
        'ditaa', 'erd', 'excalidraw', 'nomnoml', 'pikchr', 'structurizr',
        'svgbob', 'umlet', 'vega', 'vegalite', 'wavedrom', 'svg'
      ]
    };
    
    // 网络连接状态
    this.networkStatus = {
      isOnline: null,
      lastChecked: null,
      checkInterval: 300000
    };
    
    // 本地mmdc可用性状态
    this.mmdcAvailable = null;
    this.mmdcPath = null;
    
    // 确保缓存目录存在
    if (this.chartConfig.cache_enabled) {
      try {
        if (!path.isAbsolute(this.chartConfig.cache_dir)) {
          const os = require('os');
          this.chartConfig.cache_dir = path.join(os.tmpdir(), 'markdown-to-word', 'chart_cache');
        }
        fs.ensureDirSync(this.chartConfig.cache_dir);
      } catch (error) {
        console.warn(`⚠️ 无法创建图表缓存目录: ${error.message}`);
        this.chartConfig.cache_enabled = false;
      }
    }
  }
  
  /**
   * @method checkMmdcAvailable
   * @description 检查本地mmdc（@mermaid-js/mermaid-cli）是否可用
   * @returns {Promise<boolean>}
   */
  async checkMmdcAvailable() {
    if (this.mmdcAvailable !== null) {
      return this.mmdcAvailable;
    }
    
    try {
      // 尝试查找mmdc可执行文件
      const possiblePaths = [
        // 全局安装
        'mmdc',
        // VSCode扩展本地安装
        path.join(__dirname, '..', '..', 'node_modules', '.bin', 'mmdc'),
        // 项目根目录node_modules
        path.join(process.cwd(), 'node_modules', '.bin', 'mmdc')
      ];
      
      for (const mmdcPath of possiblePaths) {
        try {
          const { stdout } = await execFileAsync(mmdcPath, ['--version'], {
            timeout: 5000
          });
          
          if (stdout && stdout.trim()) {
            this.mmdcAvailable = true;
            this.mmdcPath = mmdcPath;
            console.log(`✅ 找到mmdc: ${mmdcPath} (v${stdout.trim()})`);
            return true;
          }
        } catch (e) {
          // 这个路径不可用，继续尝试下一个
        }
      }
      
      this.mmdcAvailable = false;
      return false;
    } catch (error) {
      this.mmdcAvailable = false;
      return false;
    }
  }

  /**
   * @method checkNetworkConnectivity
   * @description 检查网络连接状态
   * @returns {Promise<boolean>} - 是否能连接到Kroki服务
   */
  async checkNetworkConnectivity() {
    const now = Date.now();
    
    // 如果最近检查过且在有效期内，返回缓存结果
    if (this.networkStatus.lastChecked && 
        (now - this.networkStatus.lastChecked) < this.networkStatus.checkInterval &&
        this.networkStatus.isOnline !== null) {
      return this.networkStatus.isOnline;
    }

    try {
      console.log('🌐 检查网络连接状态...');
      const response = await axios.get(this.chartConfig.kroki_url, {
        timeout: 5000, // 5秒超时，比图表转换超时短
        validateStatus: function (status) {
          return status < 500; // 接受4xx状态码，只要不是服务器错误
        }
      });
      
      this.networkStatus.isOnline = true;
      this.networkStatus.lastChecked = now;
      console.log('✅ 网络连接正常，可以使用图表转换功能');
      return true;
    } catch (error) {
      this.networkStatus.isOnline = false;
      this.networkStatus.lastChecked = now;
      
      if (error.code === 'ECONNABORTED') {
        console.warn('❌ 网络连接超时，无法连接到Kroki服务');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.warn('❌ 网络连接失败，无法连接到Kroki服务');
      } else {
        console.warn(`❌ 网络检查失败: ${error.message}`);
      }
      
      console.warn('⚠️  图表转换功能将被禁用，如需使用请检查网络连接');
      return false;
    }
  }

  /**
   * @method processCharts
   * @description 处理Markdown内容中的图表代码块
   * @param {string} content - Markdown内容
   * @param {string} outputDir - 输出目录（可选）
   * @returns {Promise<string>} - 处理后的内容
   */
  async processCharts(content, outputDir = null, options = {}) {
    if (!this.chartConfig.enabled) {
      return content;
    }

    try {
      const chartRegex = /```(\w+)\s*\n([\s\S]*?)\n```/g;
      let processedContent = content;
      const matches = [];
      let match;

      while ((match = chartRegex.exec(content)) !== null) {
        const [fullMatch, language, code] = match;
        const lang = language.toLowerCase();
        // skipMermaid：HTML 链路跳过 mermaid（保留代码块，浏览器端渲染 SVG 实现单文件自包含）
        if (options.skipMermaid && lang === 'mermaid') {
          continue;
        }
        if (this.chartConfig.supported_types.includes(lang)) {
          matches.push({
            fullMatch,
            language: lang,
            code: code.trim(),
            index: match.index
          });
        }
      }

      for (const chartMatch of matches) {
        try {
          const imageData = await this.convertChartToImage(
            chartMatch.language,
            chartMatch.code,
            outputDir
          );
          
          if (imageData) {
            const imageTag = this.createImageTag(imageData, chartMatch.language);
            processedContent = processedContent.replace(chartMatch.fullMatch, imageTag);
          }
        } catch (error) {
          // 转换失败，保留原始代码块作为降级显示
          // 这样Word文档中至少能看到图表代码
        }
      }

      return processedContent;
    } catch (error) {
      return content;
    }
  }

  /**
   * @method convertChartToImage
   * @description 将图表代码转换为图像文件
   * 核心修复：支持本地mmdc渲染 + Kroki API备选
   * @param {string} chartType - 图表类型
   * @param {string} chartCode - 图表代码
   * @param {string} outputDir - 输出目录
   * @returns {Promise<Object>} - 图像文件信息对象
   */
  async convertChartToImage(chartType, chartCode, outputDir = null) {
    // 确保输出目录存在
    const imagesDir = outputDir ? path.join(outputDir, 'images') : path.join(process.cwd(), 'images');
    await fs.ensureDir(imagesDir);

    // 生成文件名
    const hash = crypto.createHash('md5')
      .update(`${chartType}:${chartCode}`)
      .digest('hex');
    const fileName = `${chartType}_${hash.substring(0, 8)}.${chartType === 'svg' ? 'svg' : this.chartConfig.output_format}`;
    const filePath = path.join(imagesDir, fileName);
    const relativePath = path.join('images', fileName);

    // 检查文件是否已存在（缓存命中）
    if (await fs.pathExists(filePath)) {
      return {
        type: 'file',
        filePath: filePath,
        relativePath: relativePath,
        fileName: fileName,
        format: chartType === 'svg' ? 'svg' : this.chartConfig.output_format
      };
    }

    // 特殊处理SVG类型 - 直接保存为SVG文件
    if (chartType === 'svg') {
      await fs.writeFile(filePath, chartCode.trim(), 'utf8');
      return {
        type: 'file',
        filePath: filePath,
        relativePath: relativePath,
        fileName: fileName,
        format: 'svg'
      };
    }

    // 生成缓存键
    const cacheKey = this.generateCacheKey(chartType, chartCode);
    
    // 检查API调用缓存
    if (this.chartConfig.cache_enabled) {
      const cachedImage = await this.getCachedImage(cacheKey);
      if (cachedImage) {
        await fs.writeFile(filePath, cachedImage.data, 
          this.chartConfig.output_format === 'svg' ? 'utf8' : null);
        return {
          type: 'file',
          filePath: filePath,
          relativePath: relativePath,
          fileName: fileName,
          format: this.chartConfig.output_format
        };
      }
    }

    // ========== 渲染策略：本地mmdc > Kroki API ==========
    
    const service = this.chartConfig.service || 'auto';
    let imageData = null;
    
    // 策略1：使用本地mmdc渲染Mermaid图表（仅支持mermaid类型）
    if ((service === 'auto' || service === 'local') && chartType === 'mermaid') {
      const mmdcOk = await this.checkMmdcAvailable();
      if (mmdcOk) {
        try {
          imageData = await this.renderWithMmdc(chartCode, filePath);
          if (imageData) {
            // 缓存结果
            if (this.chartConfig.cache_enabled) {
              await this.cacheImage(cacheKey, imageData);
            }
            return {
              type: 'file',
              filePath: filePath,
              relativePath: relativePath,
              fileName: fileName,
              format: this.chartConfig.output_format
            };
          }
        } catch (error) {
          console.warn(`⚠️ mmdc渲染失败，回退到Kroki: ${error.message}`);
        }
      }
    }
    
    // 策略2：使用Kroki API转换图表
    if (service === 'auto' || service === 'kroki') {
      const isOnline = await this.checkNetworkConnectivity();
      if (isOnline) {
        try {
          imageData = await this.callKrokiAPI(chartType, chartCode);
          if (imageData) {
            await fs.writeFile(filePath, imageData.data, 
              this.chartConfig.output_format === 'svg' ? 'utf8' : null);
            
            if (this.chartConfig.cache_enabled) {
              await this.cacheImage(cacheKey, imageData);
            }
            
            return {
              type: 'file',
              filePath: filePath,
              relativePath: relativePath,
              fileName: fileName,
              format: this.chartConfig.output_format
            };
          }
        } catch (error) {
          console.warn(`⚠️ Kroki API转换失败: ${error.message}`);
        }
      }
    }

    throw new Error(`Failed to convert ${chartType} chart (tried mmdc and Kroki)`);
  }
  
  /**
   * @method renderWithMmdc
   * @description 使用本地mmdc渲染Mermaid图表
   * 核心优势：不依赖网络，图片质量可控
   * @param {string} chartCode - Mermaid代码
   * @param {string} outputPath - 输出文件路径
   * @returns {Promise<Object>} - 图像数据
   */
  async renderWithMmdc(chartCode, outputPath) {
    if (!this.mmdcPath) {
      throw new Error('mmdc路径未找到');
    }
    
    // 创建临时mmd文件
    const os = require('os');
    const tempDir = path.join(os.tmpdir(), 'markdown-to-word', 'mmd_temp');
    await fs.ensureDir(tempDir);
    
    const tempInput = path.join(tempDir, `chart_${Date.now()}.mmd`);
    await fs.writeFile(tempInput, chartCode, 'utf8');
    
    try {
      // 计算输出尺寸 - 基于页面配置
      const dpi = this.chartConfig.dpi || 150;
      // A4内容区宽度约14.64cm = 5.76英寸
      // 使用合理宽度，让mmdc自动计算高度
      const widthInches = 7; // 7英寸宽度，略大于A4内容区，后续会缩放
      
      // 构建mmdc配置
      const mmdcConfig = {
        theme: 'default',
        // mmdc的width/height是CSS像素，不是英寸
        // 但我们可以通过scaleFactor控制DPI
      };
      
      const configPath = path.join(tempDir, `config_${Date.now()}.json`);
      await fs.writeFile(configPath, JSON.stringify(mmdcConfig, null, 2), 'utf8');
      
      // 构建mmdc命令参数
      const args = [
        '-i', tempInput,
        '-o', outputPath,
        '-c', configPath,
        '-s', String(dpi / 96), // scaleFactor: 150/96 ≈ 1.56
        '-b', 'white',
        '-w', '800' // 设置最小宽度800像素，确保图表不会太窄
      ];
      
      // 如果输出PNG格式
      if (this.chartConfig.output_format === 'png') {
        args.push('-e', 'png');
      }
      
      // 执行mmdc命令
      const { stdout, stderr } = await execFileAsync(this.mmdcPath, args, {
        timeout: this.chartConfig.timeout,
        maxBuffer: 10 * 1024 * 1024 // 10MB缓冲区
      });
      
      // 清理临时文件
      try {
        await fs.remove(tempInput);
        await fs.remove(configPath);
      } catch (e) {
        // 清理失败不影响结果
      }
      
      // 验证输出文件
      if (await fs.pathExists(outputPath)) {
        const stats = await fs.stat(outputPath);
        if (stats.size > 0) {
          const data = await fs.readFile(outputPath);
          return {
            format: this.chartConfig.output_format,
            data: data,
            mimeType: this.getMimeType(this.chartConfig.output_format)
          };
        }
      }
      
      throw new Error('mmdc输出文件为空或不存在');
    } catch (error) {
      // 清理临时文件
      try { await fs.remove(tempInput); } catch (e) {}
      throw error;
    }
  }

  /**
   * @method callKrokiAPI
   * @description 调用Kroki API转换图表
   * 核心修复：
   * 1. 移除不合理的固定width/height参数，让Kroki自动计算尺寸
   * 2. DPI参数正确设置
   * @param {string} chartType - 图表类型
   * @param {string} chartCode - 图表代码
   * @returns {Promise<Object>} - 图像数据
   */
  async callKrokiAPI(chartType, chartCode) {
    try {
      const url = `${this.chartConfig.kroki_url}/${chartType}/${this.chartConfig.output_format}`;
      
      const requestBody = {
        diagram_source: chartCode,
        diagram_options: this.getDiagramOptions(chartType)
      };
      
      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: this.chartConfig.timeout,
        responseType: this.chartConfig.output_format === 'svg' ? 'text' : 'arraybuffer'
      });

      if (response.status === 200) {
        return {
          format: this.chartConfig.output_format,
          data: response.data,
          mimeType: this.getMimeType(this.chartConfig.output_format)
        };
      } else {
        throw new Error(`Kroki API返回错误状态: ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Kroki API请求超时');
      } else if (error.response) {
        throw new Error(`Kroki API错误: ${error.response.status} - ${error.response.statusText}`);
      } else {
        throw new Error(`网络错误: ${error.message}`);
      }
    }
  }

  /**
   * @method createImageTag
   * @description 创建图像标签
   * @param {Object} imageData - 图像文件信息
   * @param {string} chartType - 图表类型
   * @returns {string} - HTML图像标签
   */
  createImageTag(imageData, chartType) {
    if (imageData.type === 'file') {
      // 使用相对路径引用本地图片文件
      const relativePath = imageData.relativePath.replace(/\\/g, '/');
      return `\n<div class="chart-container chart-${chartType}">\n<img src="${relativePath}" alt="${chartType} chart" class="chart-image" />\n</div>\n`;
    } else {
      // 兼容旧格式（如果还有的话）
      console.warn('使用了旧的图像数据格式，建议更新代码');
      if (imageData.format === 'svg') {
        const svgContent = imageData.type === 'svg' ? imageData.content : imageData.data;
        return `\n<div class="chart-container chart-${chartType}">\n${svgContent}\n</div>\n`;
      } else {
        const base64Data = Buffer.from(imageData.data).toString('base64');
        const dataUrl = `data:${imageData.mimeType};base64,${base64Data}`;
        return `\n<div class="chart-container chart-${chartType}">\n<img src="${dataUrl}" alt="${chartType} chart" class="chart-image" />\n</div>\n`;
      }
    }
  }

  /**
   * @method generateCacheKey
   * @description 生成缓存键
   * @param {string} chartType - 图表类型
   * @param {string} chartCode - 图表代码
   * @returns {string} - 缓存键
   */
  generateCacheKey(chartType, chartCode) {
    const hash = crypto.createHash('md5')
      .update(`${chartType}:${chartCode}:${this.chartConfig.output_format}`)
      .digest('hex');
    return `${chartType}_${hash}.${this.chartConfig.output_format}`;
  }

  /**
   * @method getCachedImage
   * @description 获取缓存的图像
   * @param {string} cacheKey - 缓存键
   * @returns {Promise<Object|null>} - 缓存的图像数据或null
   */
  async getCachedImage(cacheKey) {
    try {
      const cachePath = path.join(this.chartConfig.cache_dir, cacheKey);
      const exists = await fs.pathExists(cachePath);
      
      if (exists) {
        const data = await fs.readFile(cachePath, 
          this.chartConfig.output_format === 'svg' ? 'utf8' : null
        );
        return {
          format: this.chartConfig.output_format,
          data: data,
          mimeType: this.getMimeType(this.chartConfig.output_format)
        };
      }
    } catch (error) {
      console.warn('读取缓存失败:', error.message);
    }
    return null;
  }

  /**
   * @method cacheImage
   * @description 缓存图像数据
   * @param {string} cacheKey - 缓存键
   * @param {Object} imageData - 图像数据
   * @returns {Promise<void>}
   */
  async cacheImage(cacheKey, imageData) {
    try {
      const cachePath = path.join(this.chartConfig.cache_dir, cacheKey);
      await fs.writeFile(cachePath, imageData.data, 
        this.chartConfig.output_format === 'svg' ? 'utf8' : null
      );
      console.log(`💾 图表已缓存: ${cacheKey}`);
    } catch (error) {
      console.warn('缓存图表失败:', error.message);
    }
  }

  /**
   * @method getDiagramOptions
   * @description 获取图表选项
   * 核心修复：
   * 1. 不使用scale参数，它会导致Kroki生成畸形图片
   * 2. 只设置DPI和背景色，让Kroki自动计算合适的尺寸
   * 3. 尺寸控制交给imageUtils.js的calculateWordImageSize
   * @param {string} chartType - 图表类型
   * @returns {Object} - 图表选项
   */
  getDiagramOptions(chartType) {
    const options = {};
    const dpi = this.chartConfig.dpi || 150;
    
    if (this.chartConfig.output_format === 'png') {
      // 注意：Kroki的dpi参数可能不被支持或不按预期工作
      // 因此我们只设置theme和background，让Kroki使用默认高质量渲染
      options.background = 'white';
      
      switch (chartType.toLowerCase()) {
        case 'mermaid':
          // Mermaid: 只设置theme，让Kroki自动计算最佳尺寸
          options.theme = 'default';
          break;
        case 'plantuml':
        case 'c4plantuml':
          // PlantUML: 不设置额外参数
          break;
        case 'graphviz':
          // GraphViz: 设置合理的DPI
          options.dpi = 150;
          break;
        default:
          break;
      }
    } else if (this.chartConfig.output_format === 'svg') {
      options.background = 'white';
      
      if (chartType.toLowerCase() === 'mermaid') {
        options.theme = 'default';
      }
    }
    
    return options;
  }

  /**
   * @method getMimeType
   * @description 获取MIME类型
   * @param {string} format - 图像格式
   * @returns {string} - MIME类型
   */
  getMimeType(format) {
    const mimeTypes = {
      'svg': 'image/svg+xml',
      'png': 'image/png',
      'pdf': 'application/pdf',
      'jpeg': 'image/jpeg',
      'jpg': 'image/jpeg'
    };
    return mimeTypes[format.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * @method getStats
   * @description 获取处理统计信息
   * @returns {Object} - 统计信息
   */
  getStats() {
    return {
      enabled: this.chartConfig.enabled,
      service: this.chartConfig.service,
      supported_types: this.chartConfig.supported_types,
      cache_enabled: this.chartConfig.cache_enabled,
      output_format: this.chartConfig.output_format
    };
  }
}

module.exports = ChartProcessor;
