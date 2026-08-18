/**
 * 统一转换器接口定义
 * 为所有转换器提供标准化的接口和生命周期管理
 * 
 * 作者：VSCode 研发高手智能体
 * 时间：2025年7月14日 14:44:25
 */

/**
 * 转换器基础接口
 */
class IConverter {
    constructor(options = {}) {
        this.options = options;
        this.stats = {
            startTime: null,
            endTime: null,
            processedFiles: 0,
            errors: []
        };
    }

    /**
     * 转换方法 - 子类必须实现
     * @param {string} input - 输入内容或路径
     * @param {Object} options - 转换选项
     * @returns {Promise<string>} 转换结果
     */
    async convert(input, options = {}) {
        throw new Error('convert() method must be implemented by subclass');
    }

    /**
     * 验证输入 - 子类可以重写
     * @param {string} input - 输入内容
     * @returns {boolean} 是否有效
     */
    validateInput(input) {
        return input && typeof input === 'string';
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            duration: this.stats.endTime - this.stats.startTime,
            hasErrors: this.stats.errors.length > 0
        };
    }

    /**
     * 重置统计信息
     */
    resetStats() {
        this.stats = {
            startTime: null,
            endTime: null,
            processedFiles: 0,
            errors: []
        };
    }

    /**
     * 记录错误
     * @param {Error} error - 错误对象
     * @param {string} context - 错误上下文
     */
    logError(error, context = '') {
        this.stats.errors.push({
            message: error.message,
            context,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Word 转换器基类
 */
class BaseWordConverter extends IConverter {
    constructor(options = {}) {
        super(options);
        this.imageProcessor = null;
    }

    /**
     * 预处理 Word 文档
     * @param {string} wordPath - Word 文档路径
     * @returns {Promise<Object>} 预处理结果
     */
    async preprocess(wordPath) {
        this.stats.startTime = Date.now();
        
        // 验证文件
        if (!this.validateWordFile(wordPath)) {
            throw new Error(`Invalid Word file: ${wordPath}`);
        }

        return { wordPath, valid: true };
    }

    /**
     * 后处理转换结果
     * @param {string} html - HTML 内容
     * @returns {Promise<string>} 处理后的 HTML
     */
    async postprocess(html) {
        this.stats.endTime = Date.now();
        this.stats.processedFiles++;
        
        // 基础的 HTML 清理
        return this.cleanHtml(html);
    }

    /**
     * 验证 Word 文件
     * @param {string} wordPath - Word 文档路径
     * @returns {boolean} 是否有效
     */
    validateWordFile(wordPath) {
        const fs = require('fs');
        const path = require('path');
        
        if (!fs.existsSync(wordPath)) {
            return false;
        }
        
        const ext = path.extname(wordPath).toLowerCase();
        return ext === '.docx';
    }

    /**
     * 清理 HTML 内容
     * @param {string} html - 原始 HTML
     * @returns {string} 清理后的 HTML
     */
    cleanHtml(html) {
        // 移除多余的空白字符
        return html
            .replace(/\s+/g, ' ')
            .replace(/>\s+</g, '><')
            .trim();
    }
}

/**
 * 转换器工厂
 */
class ConverterFactory {
    static converters = new Map();

    /**
     * 注册转换器
     * @param {string} name - 转换器名称
     * @param {Class} ConverterClass - 转换器类
     */
    static register(name, ConverterClass) {
        this.converters.set(name, ConverterClass);
    }

    /**
     * 创建转换器实例
     * @param {string} name - 转换器名称
     * @param {Object} options - 选项
     * @returns {IConverter} 转换器实例
     */
    static create(name, options = {}) {
        const ConverterClass = this.converters.get(name);
        if (!ConverterClass) {
            throw new Error(`Unknown converter: ${name}`);
        }
        return new ConverterClass(options);
    }

    /**
     * 获取所有可用的转换器
     * @returns {Array<string>} 转换器名称列表
     */
    static getAvailableConverters() {
        return Array.from(this.converters.keys());
    }

    /**
     * 获取已注册的转换器类型（别名方法）
     * @returns {Array<string>} 转换器名称列表
     */
    static getRegisteredTypes() {
        return this.getAvailableConverters();
    }

    /**
     * 检查转换器是否已注册
     * @param {string} name - 转换器名称
     * @returns {boolean} 是否已注册
     */
    static isRegistered(name) {
        return this.converters.has(name);
    }
}

module.exports = {
    IConverter,
    BaseWordConverter,
    ConverterFactory
};