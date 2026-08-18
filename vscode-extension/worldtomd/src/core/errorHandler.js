/**
 * 统一错误处理和日志系统
 * 提供结构化的错误处理、日志记录和性能监控
 * 
 * 作者：VSCode 研发高手智能体
 * 时间：2025年7月14日 14:44:25
 */

const fs = require('fs');
const path = require('path');
const { configManager } = require('./configManager');

/**
 * 日志级别枚举
 */
const LogLevel = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
};

/**
 * 自定义错误类
 */
class ConversionError extends Error {
    constructor(message, code, context = {}) {
        super(message);
        this.name = 'ConversionError';
        this.code = code;
        this.context = context;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * 日志管理器
 */
class Logger {
    constructor(name = 'default') {
        this.name = name;
        this.logFile = null;
        this.initLogFile();
    }

    /**
     * 初始化日志文件
     */
    initLogFile() {
        if (configManager.get('debug.saveIntermediateFiles', false)) {
            const logDir = path.join(process.cwd(), 'logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            this.logFile = path.join(logDir, `${this.name}-${timestamp}.log`);
        }
    }

    /**
     * 记录日志
     * @param {number} level - 日志级别
     * @param {string} message - 日志消息
     * @param {Object} meta - 元数据
     */
    log(level, message, meta = {}) {
        const configLevel = this.getConfigLogLevel();
        if (level > configLevel) {
            return;
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            level: this.getLevelName(level),
            logger: this.name,
            message,
            meta
        };

        // 控制台输出
        this.outputToConsole(logEntry);

        // 文件输出
        if (this.logFile) {
            this.outputToFile(logEntry);
        }
    }

    /**
     * 获取配置的日志级别
     * @returns {number} 日志级别
     */
    getConfigLogLevel() {
        const levelName = configManager.get('debug.logLevel', 'info').toLowerCase();
        const levelMap = {
            error: LogLevel.ERROR,
            warn: LogLevel.WARN,
            info: LogLevel.INFO,
            debug: LogLevel.DEBUG,
            trace: LogLevel.TRACE
        };
        return levelMap[levelName] || LogLevel.INFO;
    }

    /**
     * 获取级别名称
     * @param {number} level - 日志级别
     * @returns {string} 级别名称
     */
    getLevelName(level) {
        const names = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];
        return names[level] || 'UNKNOWN';
    }

    /**
     * 输出到控制台
     * @param {Object} logEntry - 日志条目
     */
    outputToConsole(logEntry) {
        const { timestamp, level, logger, message, meta } = logEntry;
        const timeStr = new Date(timestamp).toLocaleTimeString('zh-CN');
        const prefix = `[${timeStr}] [${level}] [${logger}]`;
        
        const hasMetadata = Object.keys(meta).length > 0;
        const fullMessage = hasMetadata ? `${message} ${JSON.stringify(meta)}` : message;

        switch (level) {
            case 'ERROR':
                console.error(`🔴 ${prefix} ${fullMessage}`);
                break;
            case 'WARN':
                console.warn(`🟡 ${prefix} ${fullMessage}`);
                break;
            case 'INFO':
                console.log(`🔵 ${prefix} ${fullMessage}`);
                break;
            case 'DEBUG':
                console.log(`🟣 ${prefix} ${fullMessage}`);
                break;
            case 'TRACE':
                console.log(`⚪ ${prefix} ${fullMessage}`);
                break;
            default:
                console.log(`${prefix} ${fullMessage}`);
        }
    }

    /**
     * 输出到文件
     * @param {Object} logEntry - 日志条目
     */
    outputToFile(logEntry) {
        try {
            const logLine = JSON.stringify(logEntry) + '\n';
            fs.appendFileSync(this.logFile, logLine);
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }

    // 便捷方法
    error(message, meta = {}) { this.log(LogLevel.ERROR, message, meta); }
    warn(message, meta = {}) { this.log(LogLevel.WARN, message, meta); }
    info(message, meta = {}) { this.log(LogLevel.INFO, message, meta); }
    debug(message, meta = {}) { this.log(LogLevel.DEBUG, message, meta); }
    trace(message, meta = {}) { this.log(LogLevel.TRACE, message, meta); }
}

/**
 * 性能监控器
 */
class PerformanceMonitor {
    constructor() {
        this.timers = new Map();
        this.metrics = new Map();
    }

    /**
     * 开始计时
     * @param {string} name - 计时器名称
     */
    startTimer(name) {
        this.timers.set(name, {
            start: Date.now(),
            end: null
        });
    }

    /**
     * 结束计时
     * @param {string} name - 计时器名称
     * @returns {number} 耗时（毫秒）
     */
    endTimer(name) {
        const timer = this.timers.get(name);
        if (!timer) {
            throw new Error(`Timer '${name}' not found`);
        }

        timer.end = Date.now();
        const duration = timer.end - timer.start;
        
        // 记录到指标中
        this.recordMetric(name, duration);
        
        return duration;
    }

    /**
     * 记录指标
     * @param {string} name - 指标名称
     * @param {number} value - 指标值
     */
    recordMetric(name, value) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        
        this.metrics.get(name).push({
            value,
            timestamp: Date.now()
        });
    }

    /**
     * 获取指标统计
     * @param {string} name - 指标名称
     * @returns {Object} 统计信息
     */
    getMetricStats(name) {
        const values = this.metrics.get(name);
        if (!values || values.length === 0) {
            return null;
        }

        const nums = values.map(v => v.value);
        const sum = nums.reduce((a, b) => a + b, 0);
        const avg = sum / nums.length;
        const min = Math.min(...nums);
        const max = Math.max(...nums);

        return {
            count: nums.length,
            sum,
            avg: Math.round(avg * 100) / 100,
            min,
            max,
            latest: nums[nums.length - 1]
        };
    }

    /**
     * 获取所有指标统计
     * @returns {Object} 所有指标的统计信息
     */
    getAllStats() {
        const stats = {};
        for (const name of this.metrics.keys()) {
            stats[name] = this.getMetricStats(name);
        }
        return stats;
    }

    /**
     * 清理旧指标（保留最近的N个）
     * @param {number} keepCount - 保留数量
     */
    cleanup(keepCount = 100) {
        for (const [name, values] of this.metrics.entries()) {
            if (values.length > keepCount) {
                this.metrics.set(name, values.slice(-keepCount));
            }
        }
    }

    /**
     * 开始监控操作（兼容性方法）
     * @param {string} operationId - 操作ID
     */
    start(operationId) {
        this.startTimer(operationId);
    }

    /**
     * 结束监控操作（兼容性方法）
     * @param {string} operationId - 操作ID
     * @returns {number} 耗时（毫秒）
     */
    end(operationId) {
        return this.endTimer(operationId);
    }

    /**
     * 获取操作统计信息（兼容性方法）
     * @param {string} operationId - 操作ID
     * @returns {Object} 统计信息
     */
    getStats(operationId) {
        const timer = this.timers.get(operationId);
        if (!timer || !timer.end) {
            return null;
        }
        
        return {
            duration: timer.end - timer.start,
            startTime: timer.start,
            endTime: timer.end
        };
    }

    /**
     * 获取性能摘要（兼容性方法）
     * @returns {Object} 性能摘要
     */
    getSummary() {
        const summary = {
            totalOperations: this.timers.size,
            metrics: this.getAllStats()
        };
        
        return summary;
    }

    /**
     * 重置所有监控数据（兼容性方法）
     */
    reset() {
        this.timers.clear();
        this.metrics.clear();
    }
}

/**
 * 错误处理器
 */
class ErrorHandler {
    constructor(logger) {
        this.logger = logger;
        this.errorCounts = new Map();
        this.recentErrors = [];
    }

    /**
     * 处理错误
     * @param {Error} error - 错误对象
     * @param {string} context - 错误上下文
     * @param {Object} metadata - 元数据
     * @returns {ConversionError} 标准化的错误对象
     */
    handle(error, context = 'unknown', metadata = {}) {
        // 统计错误次数
        const errorKey = `${context}:${error.name}`;
        this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

        // 创建标准化错误
        let standardError;
        if (error instanceof ConversionError) {
            standardError = error;
        } else {
            standardError = new ConversionError(
                error.message,
                this.getErrorCode(error),
                { context, originalError: error.name, ...metadata }
            );
        }

        // 记录到最近错误列表
        this.recentErrors.push({
            timestamp: new Date().toISOString(),
            error: standardError,
            context,
            metadata
        });

        // 保持最近错误列表不超过100个
        if (this.recentErrors.length > 100) {
            this.recentErrors = this.recentErrors.slice(-100);
        }

        // 记录日志
        if (this.logger && typeof this.logger.error === 'function') {
            this.logger.error('Error occurred', {
                code: standardError.code,
                context: standardError.context,
                message: standardError.message,
                stack: error.stack
            });
        } else {
            console.error('Error occurred:', {
                code: standardError.code,
                context: standardError.context,
                message: standardError.message,
                stack: error.stack
            });
        }

        return standardError;
    }

    /**
     * 获取错误代码
     * @param {Error} error - 错误对象
     * @returns {string} 错误代码
     */
    getErrorCode(error) {
        if (error.code) return error.code;
        
        // 根据错误类型分配代码
        if (error.name === 'TypeError') return 'TYPE_ERROR';
        if (error.name === 'ReferenceError') return 'REFERENCE_ERROR';
        if (error.message.includes('ENOENT')) return 'FILE_NOT_FOUND';
        if (error.message.includes('EACCES')) return 'PERMISSION_DENIED';
        if (error.message.includes('timeout')) return 'TIMEOUT';
        
        return 'UNKNOWN_ERROR';
    }

    /**
     * 获取错误统计
     * @returns {Object} 错误统计信息
     */
    getErrorStats() {
        const stats = {};
        let totalErrors = 0;
        
        for (const [key, count] of this.errorCounts.entries()) {
            stats[key] = count;
            totalErrors += count;
        }
        
        return {
            ...stats,
            totalErrors,
            recentErrorsCount: this.recentErrors.length
        };
    }

    /**
     * 处理错误（兼容性方法）
     * @param {Error} error - 错误对象
     * @param {string} context - 错误上下文
     * @param {Object} metadata - 元数据
     * @returns {ConversionError} 标准化的错误对象
     */
    handleError(error, context = 'unknown', metadata = {}) {
        return this.handle(error, context, metadata);
    }

    /**
     * 获取统计信息（兼容性方法）
     * @returns {Object} 统计信息
     */
    getStats() {
        return this.getErrorStats();
    }

    /**
     * 重置错误统计（兼容性方法）
     */
    reset() {
        this.errorCounts.clear();
        this.recentErrors = [];
    }

    /**
     * 获取最近的错误
     * @param {number} count - 获取数量，默认为5
     * @returns {Array} 最近的错误列表
     */
    getRecentErrors(count = 5) {
        return this.recentErrors.slice(-count);
    }
}

// 创建全局实例
const logger = new Logger('main');
const performanceMonitor = new PerformanceMonitor();
const errorHandler = new ErrorHandler(logger);

module.exports = {
    Logger,
    PerformanceMonitor,
    ErrorHandler,
    ConversionError,
    LogLevel,
    logger,
    performanceMonitor,
    errorHandler
};