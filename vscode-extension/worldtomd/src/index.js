const { WordToHtmlConverter } = require('./wordToHtml');
const { DomBasedHtmlToMarkdownConverter } = require('./htmlToMarkdown');
const { FileUtils, Logger, ProgressBar } = require('./utils');
const path = require('path');
const fs = require('fs-extra');

/**
 * Word 转 Markdown 主转换器
 * 整合 Word -> HTML -> Markdown 的完整转换流程
 */
class WordToMarkdownConverter {
  constructor(options = {}) {
    this.options = {
      // 输出选项
      preserveImages: true,
      preserveTables: true,
      preserveFormatting: true,
      
      // Markdown 选项
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      
      // 处理选项
      cleanupTempFiles: true,
      verbose: false,
      
      // 图片处理选项（新增）
      imageProcessing: {
        useImprovedHandler: false,     // 默认使用简单的传统处理器
        useHashNaming: false,          // 不使用哈希命名
        enableCache: false,            // 不启用缓存
        fallbackToBase64: false,       // 禁用回退机制
        maxImageSize: 50 * 1024 * 1024, // 50MB限制（足够大）
        showStats: false               // 不显示统计信息
      },
      
      ...options
    };

    this.logger = new Logger(this.options.verbose ? 'debug' : 'info');
    this.wordToHtml = new WordToHtmlConverter(this.getWordToHtmlOptions());
    this.htmlToMarkdown = new DomBasedHtmlToMarkdownConverter(this.getHtmlToMarkdownOptions());
  }

  /**
   * 获取 Word 转 HTML 的选项
   */
  getWordToHtmlOptions() {
    return {
      // 根据用户选项配置 mammoth 选项
      convertImage: this.options.preserveImages ? undefined : () => ({ src: '' }),
      
      // 传递图片处理选项
      imageProcessing: this.options.imageProcessing
    };
  }

  /**
   * 获取 HTML 转 Markdown 的选项
   */
  getHtmlToMarkdownOptions() {
    return {
      headingStyle: this.options.headingStyle,
      codeBlockStyle: this.options.codeBlockStyle,
      bulletListMarker: this.options.bulletListMarker
    };
  }

  /**
   * 转换单个 Word 文档为 Markdown
   * @param {string} inputPath - Word 文档路径
   * @param {string} outputPath - 输出 Markdown 文件路径
   * @returns {Promise<Object>} 转换结果
   */
  async convertFile(inputPath, outputPath) {
    const startTime = Date.now();
    let tempHtmlPath = null;

    try {
      this.logger.info(`开始转换: ${inputPath}`);

      // 验证输入文件
      if (!await FileUtils.exists(inputPath)) {
        throw new Error(`输入文件不存在: ${inputPath}`);
      }

      if (!FileUtils.isWordFile(inputPath)) {
        throw new Error(`不支持的文件格式: ${FileUtils.getExtension(inputPath)}`);
      }

      // 创建临时 HTML 文件路径
      tempHtmlPath = FileUtils.createTempPath('.html');

      // 第一步: Word -> HTML
      this.logger.debug('步骤 1: 转换 Word 到 HTML');
      await this.wordToHtml.convertToHtmlFile(inputPath, tempHtmlPath, this.options.preserveImages);

      // 第二步: HTML -> Markdown
      this.logger.debug('步骤 2: 转换 HTML 到 Markdown');
      
      // 保留HTML文件用于调试
      const debugHtmlPath = outputPath.replace('.md', '_debug.html');
      await fs.copyFile(tempHtmlPath, debugHtmlPath);
      console.log(`调试HTML文件已保存: ${debugHtmlPath}`);
      
      await this.htmlToMarkdown.convertFile(tempHtmlPath, outputPath);

      // 获取转换统计信息
      const stats = await this.getConversionStats(inputPath, outputPath, tempHtmlPath);
      
      // 获取图片处理统计信息
      const imageStats = this.wordToHtml.getImageProcessingStats();
      if (imageStats && this.options.imageProcessing.showStats) {
        stats.imageProcessing = imageStats;
      }
      
      const duration = Date.now() - startTime;

      this.logger.info(`转换完成: ${outputPath} (耗时: ${duration}ms)`);

      return {
        success: true,
        inputPath,
        outputPath,
        stats,
        duration
      };

    } catch (error) {
      this.logger.error(`转换失败: ${inputPath}`, error);
      throw error;
    } finally {
      // 清理临时文件
      if (tempHtmlPath && this.options.cleanupTempFiles) {
        await FileUtils.deleteFile(tempHtmlPath);
      }
    }
  }

  /**
   * 批量转换目录中的 Word 文档
   * @param {string} inputDir - 输入目录
   * @param {string} outputDir - 输出目录
   * @param {boolean} recursive - 是否递归处理子目录
   * @returns {Promise<Object>} 批量转换结果
   */
  async convertDirectory(inputDir, outputDir, recursive = false) {
    const startTime = Date.now();

    try {
      this.logger.info(`开始批量转换: ${inputDir} -> ${outputDir}`);

      // 获取所有 Word 文档
      const wordFiles = await FileUtils.getWordFiles(inputDir, recursive);
      
      if (wordFiles.length === 0) {
        this.logger.warn(`目录中没有找到 Word 文档: ${inputDir}`);
        return {
          success: true,
          totalFiles: 0,
          successCount: 0,
          failureCount: 0,
          results: []
        };
      }

      this.logger.info(`找到 ${wordFiles.length} 个 Word 文档`);

      // 确保输出目录存在
      await FileUtils.ensureDir(outputDir);

      // 创建进度条
      const progressBar = new ProgressBar(wordFiles.length);
      const results = [];
      let successCount = 0;
      let failureCount = 0;

      // 逐个转换文件
      for (const inputPath of wordFiles) {
        try {
          // 生成输出路径
          const relativePath = path.relative(inputDir, inputPath);
          const outputPath = path.join(
            outputDir,
            path.dirname(relativePath),
            FileUtils.getBaseName(inputPath) + '.md'
          );

          // 转换文件
          const result = await this.convertFile(inputPath, outputPath);
          results.push(result);
          successCount++;

        } catch (error) {
          results.push({
            success: false,
            inputPath,
            error: error.message
          });
          failureCount++;
        }

        progressBar.update();
      }

      const duration = Date.now() - startTime;
      
      this.logger.info(`批量转换完成: 成功 ${successCount}, 失败 ${failureCount}, 总耗时: ${duration}ms`);

      return {
        success: true,
        totalFiles: wordFiles.length,
        successCount,
        failureCount,
        results,
        duration
      };

    } catch (error) {
      this.logger.error(`批量转换失败: ${inputDir}`, error);
      throw error;
    }
  }

  /**
   * 获取转换统计信息
   * @param {string} inputPath - 输入文件路径
   * @param {string} outputPath - 输出文件路径
   * @param {string} tempHtmlPath - 临时 HTML 文件路径
   * @returns {Promise<Object>} 统计信息
   */
  async getConversionStats(inputPath, outputPath, tempHtmlPath) {
    try {
      const [inputSize, outputSize, htmlSize] = await Promise.all([
        FileUtils.getFileSize(inputPath),
        FileUtils.getFileSize(outputPath),
        tempHtmlPath ? FileUtils.getFileSize(tempHtmlPath) : null
      ]);

      const markdownContent = await fs.readFile(outputPath, 'utf8');
      const htmlContent = tempHtmlPath ? await fs.readFile(tempHtmlPath, 'utf8') : '';

      const conversionStats = htmlContent ? 
        this.htmlToMarkdown.getConversionStats(htmlContent, markdownContent) : {};

      return {
        inputSize,
        outputSize,
        htmlSize,
        ...conversionStats
      };
    } catch (error) {
      this.logger.warn(`获取统计信息失败: ${error.message}`);
      return {};
    }
  }

  /**
   * 预览转换结果（不保存文件）
   * @param {string} inputPath - Word 文档路径
   * @returns {Promise<string>} Markdown 内容
   */
  async previewConversion(inputPath) {
    let tempHtmlPath = null;

    try {
      this.logger.debug(`预览转换: ${inputPath}`);

      // 验证输入文件
      if (!await FileUtils.exists(inputPath)) {
        throw new Error(`输入文件不存在: ${inputPath}`);
      }

      // 转换为 HTML
      const html = await this.wordToHtml.convertToHtml(inputPath);
      
      // 转换为 Markdown
      const markdown = this.htmlToMarkdown.convertToMarkdown(html);

      return markdown;

    } catch (error) {
      this.logger.error(`预览转换失败: ${inputPath}`, error);
      throw error;
    }
  }

  /**
   * 获取文档信息
   * @param {string} inputPath - Word 文档路径
   * @returns {Promise<Object>} 文档信息
   */
  async getDocumentInfo(inputPath) {
    try {
      return await this.wordToHtml.getDocumentInfo(inputPath);
    } catch (error) {
      this.logger.error(`获取文档信息失败: ${inputPath}`, error);
      throw error;
    }
  }

  /**
   * 设置日志级别
   * @param {string} level - 日志级别 (error, warn, info, debug)
   */
  setLogLevel(level) {
    this.logger = new Logger(level);
  }
}

module.exports = {
  WordToMarkdownConverter,
  WordToHtmlConverter,
  DomBasedHtmlToMarkdownConverter,
  FileUtils,
  Logger
};