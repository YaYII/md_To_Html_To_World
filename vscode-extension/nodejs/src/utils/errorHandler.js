const path = require('path');

/**
 * @class ErrorHandler
 * @description 错误处理工具类，提供用户友好的错误消息和解决方案
 */
class ErrorHandler {
  /**
   * @method getFileErrorMessage
   * @description 获取文件操作相关的友好错误消息
   * @param {Error} error - 错误对象
   * @param {string} filePath - 文件路径
   * @returns {Object} - 包含消息和建议的对象
   */
  static getFileErrorMessage(error, filePath) {
    const fileName = path.basename(filePath);
    const fileDir = path.dirname(filePath);
    
    let message = '';
    let suggestions = [];
    let severity = 'error';
    
    switch (error.code) {
      case 'EBUSY':
        message = `文件 "${fileName}" 正在被其他程序使用，无法保存。`;
        suggestions = [
          `1. 关闭所有打开 "${fileName}" 的程序（如Microsoft Word、WPS等）`,
          `2. 检查是否有其他进程在使用该文件`,
          `3. 尝试选择其他文件名或保存位置`,
          `4. 稍等片刻后重试`
        ];
        break;
        
      case 'EACCES':
      case 'EPERM':
        message = `没有权限访问文件 "${fileName}"。`;
        suggestions = [
          `1. 检查文件是否为只读状态`,
          `2. 确保有足够的权限访问目录 "${fileDir}"`,
          `3. 尝试以管理员身份运行VS Code`,
          `4. 选择其他有写入权限的位置`
        ];
        break;
        
      case 'ENOSPC':
        message = `磁盘空间不足，无法保存文件 "${fileName}"。`;
        suggestions = [
          `1. 清理磁盘空间`,
          `2. 删除不需要的文件`,
          `3. 选择其他磁盘位置保存文件`
        ];
        break;
        
      case 'ENAMETOOLONG':
        message = `文件路径过长，无法创建文件。`;
        suggestions = [
          `1. 选择更短的文件名`,
          `2. 将文件保存到更浅的目录层级`,
          `3. 减少目录名的长度`
        ];
        break;
        
      case 'ENOENT':
        message = `找不到指定的路径或文件。`;
        suggestions = [
          `1. 检查目录 "${fileDir}" 是否存在`,
          `2. 确保路径拼写正确`,
          `3. 检查网络驱动器连接（如果是网络路径）`
        ];
        break;
        
      case 'EMFILE':
      case 'ENFILE':
        message = `系统打开文件数量达到限制。`;
        suggestions = [
          `1. 关闭不必要的应用程序`,
          `2. 重启VS Code`,
          `3. 稍后重试`
        ];
        severity = 'warning';
        break;
        
      case 'ENOTDIR':
        message = `路径中的某个部分不是目录。`;
        suggestions = [
          `1. 检查文件路径是否正确`,
          `2. 确保所有父目录都存在且为目录类型`
        ];
        break;
        
      default:
        message = `保存文件时发生未知错误：${error.message}`;
        suggestions = [
          `1. 检查文件路径和权限`,
          `2. 尝试重新启动VS Code`,
          `3. 选择其他保存位置`,
          `4. 如果问题持续存在，请联系技术支持`
        ];
        break;
    }
    
    return {
      message,
      suggestions,
      severity,
      code: error.code,
      originalError: error.message
    };
  }
  
  /**
   * @method getConversionErrorMessage
   * @description 获取转换过程相关的友好错误消息
   * @param {Error} error - 错误对象
   * @param {string} stage - 转换阶段（'markdown-to-html', 'html-to-word', 'file-save'）
   * @returns {Object} - 包含消息和建议的对象
   */
  static getConversionErrorMessage(error, stage) {
    let message = '';
    let suggestions = [];
    let severity = 'error';
    
    switch (stage) {
      case 'markdown-to-html':
        message = `Markdown转HTML时发生错误：${error.message}`;
        suggestions = [
          `1. 检查Markdown文件格式是否正确`,
          `2. 确认文件编码为UTF-8`,
          `3. 检查是否有特殊字符或语法错误`,
          `4. 尝试简化Markdown内容后重试`
        ];
        break;
        
      case 'html-to-word':
        message = `HTML转Word时发生错误：${error.message}`;
        suggestions = [
          `1. 检查HTML内容是否过于复杂`,
          `2. 确认图片路径是否正确`,
          `3. 尝试减少表格或复杂布局`,
          `4. 检查是否有不支持的HTML标签`
        ];
        break;
        
      case 'file-save':
        // 使用文件错误处理
        return this.getFileErrorMessage(error, error.filePath || '目标文件');
        
      default:
        message = `转换过程中发生未知错误：${error.message}`;
        suggestions = [
          `1. 检查输入文件格式和内容`,
          `2. 确认有足够的系统资源`,
          `3. 尝试重新启动VS Code`,
          `4. 如果问题持续存在，请联系技术支持`
        ];
        break;
    }
    
    return {
      message,
      suggestions,
      severity,
      stage,
      originalError: error.message
    };
  }
  
  /**
   * @method formatErrorForUser
   * @description 格式化错误消息用于显示给用户
   * @param {Object} errorInfo - 错误信息对象
   * @returns {string} - 格式化的错误消息
   */
  static formatErrorForUser(errorInfo) {
    let formatted = `❌ ${errorInfo.message}\n\n`;
    
    if (errorInfo.suggestions && errorInfo.suggestions.length > 0) {
      formatted += `💡 建议解决方案：\n`;
      errorInfo.suggestions.forEach(suggestion => {
        formatted += `   ${suggestion}\n`;
      });
    }
    
    if (errorInfo.code) {
      formatted += `\n🔍 错误代码: ${errorInfo.code}`;
    }
    
    return formatted;
  }
  
  /**
   * @method createUserFriendlyError
   * @description 创建用户友好的错误对象
   * @param {Error} originalError - 原始错误
   * @param {string} context - 错误上下文
   * @param {string} filePath - 相关文件路径（可选）
   * @returns {Error} - 用户友好的错误对象
   */
  static createUserFriendlyError(originalError, context, filePath = null) {
    let errorInfo;
    
    if (filePath && (originalError.code === 'EBUSY' || originalError.code === 'EACCES' || originalError.code === 'EPERM')) {
      errorInfo = this.getFileErrorMessage(originalError, filePath);
    } else {
      errorInfo = this.getConversionErrorMessage(originalError, context);
    }
    
    const friendlyMessage = this.formatErrorForUser(errorInfo);
    const error = new Error(friendlyMessage);
    error.originalError = originalError;
    error.errorInfo = errorInfo;
    error.context = context;
    
    return error;
  }
}

module.exports = ErrorHandler; 