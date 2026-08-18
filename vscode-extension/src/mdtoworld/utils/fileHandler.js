const fs = require('fs-extra');
const path = require('path');

/**
 * @class FileHandler
 * @description 文件处理工具类，提供文件写入重试机制和占用检测
 */
class FileHandler {
  /**
   * @constructor
   * @param {Object} options - 配置选项
   * @param {number} options.maxRetries - 最大重试次数
   * @param {number} options.retryDelay - 重试延迟时间（毫秒）
   * @param {boolean} options.autoRename - 是否自动重命名冲突文件
   */
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.autoRename = options.autoRename !== false; // 默认为true
  }

  /**
   * @method sleep
   * @description 等待指定时间
   * @param {number} ms - 等待时间（毫秒）
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * @method checkFileAccess
   * @description 检查文件是否可访问（被占用检测）
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>} - 文件是否可访问
   */
  async checkFileAccess(filePath) {
    try {
      // 尝试以写入模式打开文件
      const handle = await fs.open(filePath, 'w');
      await handle.close();
      return true;
    } catch (error) {
      if (error.code === 'EBUSY' || error.code === 'EACCES' || error.code === 'EPERM') {
        return false;
      }
      // 文件不存在或其他错误，认为可以访问
      return true;
    }
  }

  /**
   * @method generateAlternativeName
   * @description 生成备用文件名
   * @param {string} filePath - 原始文件路径
   * @param {number} counter - 计数器
   * @returns {string} - 新的文件路径
   */
  generateAlternativeName(filePath, counter) {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);
    return path.join(dir, `${name}_${counter}${ext}`);
  }

  /**
   * @method findAvailableFileName
   * @description 查找可用的文件名
   * @param {string} filePath - 原始文件路径
   * @returns {Promise<string>} - 可用的文件路径
   */
  async findAvailableFileName(filePath) {
    // 首先检查原始文件名
    if (await this.checkFileAccess(filePath)) {
      return filePath;
    }

    // 如果不允许自动重命名，直接返回原路径
    if (!this.autoRename) {
      return filePath;
    }

    // 生成备用文件名
    let counter = 1;
    let alternativePath = this.generateAlternativeName(filePath, counter);
    
    while (counter <= 10) { // 最多尝试10个备用名称
      if (await this.checkFileAccess(alternativePath)) {
        return alternativePath;
      }
      counter++;
      alternativePath = this.generateAlternativeName(filePath, counter);
    }

    // 如果都不可用，返回原路径（让调用者处理错误）
    return filePath;
  }

  /**
   * @method writeFileWithRetry
   * @description 带重试机制的文件写入
   * @param {string} filePath - 文件路径
   * @param {Buffer|string} data - 要写入的数据
   * @param {Object} options - 写入选项
   * @returns {Promise<{success: boolean, filePath: string, message: string}>} - 写入结果
   */
  async writeFileWithRetry(filePath, data, options = {}) {
    let lastError;
    let actualFilePath = filePath;

    // 首先尝试找到可用的文件名
    try {
      actualFilePath = await this.findAvailableFileName(filePath);
      if (actualFilePath !== filePath) {
        console.log(`原文件被占用，将保存到: ${actualFilePath}`);
      }
    } catch (error) {
      console.warn('检查文件可用性时出错:', error.message);
    }

    // 尝试写入文件
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // 确保目录存在
        await fs.ensureDir(path.dirname(actualFilePath));
        
        // 写入文件
        await fs.writeFile(actualFilePath, data, options);
        
        return {
          success: true,
          filePath: actualFilePath,
          message: actualFilePath !== filePath 
            ? `文件已保存到备用路径: ${actualFilePath}` 
            : `文件已成功保存: ${actualFilePath}`
        };
      } catch (error) {
        lastError = error;
        console.warn(`第 ${attempt} 次写入尝试失败:`, error.message);

        // 如果是文件被占用的错误，且还有重试次数
        if (this.isFileBusyError(error) && attempt < this.maxRetries) {
          console.log(`文件被占用，${this.retryDelay}ms 后重试...`);
          await this.sleep(this.retryDelay);
          continue;
        }

        // 如果不是文件占用错误，或者已经是最后一次尝试，跳出循环
        break;
      }
    }

    // 所有重试都失败了
    return {
      success: false,
      filePath: actualFilePath,
      message: this.getErrorMessage(lastError, filePath),
      error: lastError
    };
  }

  /**
   * @method isFileBusyError
   * @description 判断是否为文件被占用错误
   * @param {Error} error - 错误对象
   * @returns {boolean} - 是否为文件占用错误
   */
  isFileBusyError(error) {
    const busyCodes = ['EBUSY', 'EACCES', 'EPERM', 'EMFILE', 'ENFILE'];
    return busyCodes.includes(error.code);
  }

  /**
   * @method getErrorMessage
   * @description 获取友好的错误消息
   * @param {Error} error - 错误对象
   * @param {string} filePath - 文件路径
   * @returns {string} - 友好的错误消息
   */
  getErrorMessage(error, filePath) {
    const fileName = path.basename(filePath);
    
    switch (error.code) {
      case 'EBUSY':
        return `文件 "${fileName}" 正在被其他程序使用。请关闭该文件后重试，或者选择其他输出位置。`;
      
      case 'EACCES':
      case 'EPERM':
        return `没有权限访问文件 "${fileName}"。请检查文件权限或选择其他输出位置。`;
      
      case 'ENOSPC':
        return `磁盘空间不足，无法保存文件 "${fileName}"。请清理磁盘空间后重试。`;
      
      case 'ENAMETOOLONG':
        return `文件路径过长。请选择更短的文件名或路径。`;
      
      case 'EMFILE':
      case 'ENFILE':
        return `系统打开文件数量达到限制。请稍后重试。`;
      
      default:
        return `保存文件 "${fileName}" 时发生错误: ${error.message}。请检查文件路径和权限。`;
    }
  }

  /**
   * @method writeWordDocument
   * @description 专门用于写入Word文档的方法
   * @param {string} filePath - 文件路径
   * @param {Buffer} buffer - Word文档缓冲区
   * @returns {Promise<{success: boolean, filePath: string, message: string}>} - 写入结果
   */
  async writeWordDocument(filePath, buffer) {
    console.log(`准备保存Word文档到: ${filePath}`);
    
    const result = await this.writeFileWithRetry(filePath, buffer);
    
    if (result.success) {
      console.log(result.message);
    } else {
      console.error('保存Word文档失败:', result.message);
    }
    
    return result;
  }
}

module.exports = FileHandler; 