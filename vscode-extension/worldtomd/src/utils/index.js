const fs = require('fs-extra');
const path = require('path');

/**
 * 文件工具类
 */
class FileUtils {
  /**
   * 检查文件是否存在
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>} 文件是否存在
   */
  static async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件扩展名
   * @param {string} filePath - 文件路径
   * @returns {string} 扩展名（小写）
   */
  static getExtension(filePath) {
    return path.extname(filePath).toLowerCase();
  }

  /**
   * 获取文件名（不含扩展名）
   * @param {string} filePath - 文件路径
   * @returns {string} 文件名
   */
  static getBaseName(filePath) {
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * 确保目录存在
   * @param {string} dirPath - 目录路径
   */
  static async ensureDir(dirPath) {
    await fs.ensureDir(dirPath);
  }

  /**
   * 获取目录中的所有 Word 文档
   * @param {string} dirPath - 目录路径
   * @param {boolean} recursive - 是否递归搜索
   * @returns {Promise<string[]>} Word 文档路径数组
   */
  static async getWordFiles(dirPath, recursive = false) {
    const files = [];
    
    if (!await this.exists(dirPath)) {
      throw new Error(`目录不存在: ${dirPath}`);
    }

    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = await fs.stat(itemPath);
      
      if (stat.isDirectory() && recursive) {
        const subFiles = await this.getWordFiles(itemPath, recursive);
        files.push(...subFiles);
      } else if (stat.isFile() && this.isWordFile(itemPath)) {
        files.push(itemPath);
      }
    }
    
    return files;
  }

  /**
   * 检查是否为 Word 文档
   * @param {string} filePath - 文件路径
   * @returns {boolean} 是否为 Word 文档
   */
  static isWordFile(filePath) {
    const ext = this.getExtension(filePath);
    return ext === '.docx' || ext === '.doc';
  }

  /**
   * 生成输出文件路径
   * @param {string} inputPath - 输入文件路径
   * @param {string} outputDir - 输出目录
   * @param {string} extension - 新扩展名
   * @returns {string} 输出文件路径
   */
  static generateOutputPath(inputPath, outputDir, extension) {
    const baseName = this.getBaseName(inputPath);
    return path.join(outputDir, `${baseName}${extension}`);
  }

  /**
   * 复制文件
   * @param {string} src - 源文件路径
   * @param {string} dest - 目标文件路径
   */
  static async copyFile(src, dest) {
    await this.ensureDir(path.dirname(dest));
    await fs.copy(src, dest);
  }

  /**
   * 删除文件
   * @param {string} filePath - 文件路径
   */
  static async deleteFile(filePath) {
    if (await this.exists(filePath)) {
      await fs.remove(filePath);
    }
  }

  /**
   * 获取文件大小（人类可读格式）
   * @param {string} filePath - 文件路径
   * @returns {Promise<string>} 文件大小
   */
  static async getFileSize(filePath) {
    const stats = await fs.stat(filePath);
    const bytes = stats.size;
    
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 创建临时文件路径
   * @param {string} extension - 文件扩展名
   * @returns {string} 临时文件路径
   */
  static createTempPath(extension) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return path.join(require('os').tmpdir(), `worldtomd_${timestamp}_${random}${extension}`);
  }
}

/**
 * 日志工具类
 */
class Logger {
  constructor(level = 'info') {
    this.level = level;
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  /**
   * 记录错误日志
   * @param {string} message - 日志消息
   * @param {Error} error - 错误对象
   */
  error(message, error = null) {
    if (this.levels[this.level] >= this.levels.error) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
      if (error) {
        console.error(error.stack || error.message);
      }
    }
  }

  /**
   * 记录警告日志
   * @param {string} message - 日志消息
   */
  warn(message) {
    if (this.levels[this.level] >= this.levels.warn) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
    }
  }

  /**
   * 记录信息日志
   * @param {string} message - 日志消息
   */
  info(message) {
    if (this.levels[this.level] >= this.levels.info) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
    }
  }

  /**
   * 记录调试日志
   * @param {string} message - 日志消息
   */
  debug(message) {
    if (this.levels[this.level] >= this.levels.debug) {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
    }
  }
}

/**
 * 进度条工具类
 */
class ProgressBar {
  constructor(total, width = 40) {
    this.total = total;
    this.current = 0;
    this.width = width;
    this.startTime = Date.now();
  }

  /**
   * 更新进度
   * @param {number} increment - 增量
   */
  update(increment = 1) {
    this.current += increment;
    this.render();
  }

  /**
   * 渲染进度条
   */
  render() {
    const percent = Math.round((this.current / this.total) * 100);
    const filled = Math.round((this.current / this.total) * this.width);
    const empty = this.width - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const elapsed = Date.now() - this.startTime;
    const rate = this.current / (elapsed / 1000);
    const eta = this.current > 0 ? (this.total - this.current) / rate : 0;
    
    process.stdout.write(`\r[${bar}] ${percent}% (${this.current}/${this.total}) ETA: ${Math.round(eta)}s`);
    
    if (this.current >= this.total) {
      process.stdout.write('\n');
    }
  }

  /**
   * 完成进度条
   */
  complete() {
    this.current = this.total;
    this.render();
  }
}

module.exports = {
  FileUtils,
  Logger,
  ProgressBar
};