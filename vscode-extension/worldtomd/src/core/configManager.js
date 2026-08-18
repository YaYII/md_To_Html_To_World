/**
 * 统一配置管理系统
 * 集中管理所有转换器的配置，支持环境变量、用户配置和默认配置的层级覆盖
 * 
 * 作者：VSCode 研发高手智能体
 * 时间：2025年7月14日 14:44:25
 */

const fs = require('fs');
const path = require('path');

/**
 * 配置管理器
 */
class ConfigManager {
    constructor() {
        this.config = {};
        this.configPath = null;
        this.watchers = new Map();
        this.loadDefaultConfig();
    }

    /**
     * 加载默认配置
     */
    loadDefaultConfig() {
        this.config = {
            conversion: {
                imageDir: "images",
                preserveImageFormat: true,
                maxConcurrency: 3,
                timeout: 30000,
                supportedFormats: ["docx", "doc"],
                outputFormat: "html",
                enableImageOptimization: false,
                imageQuality: 85
            },
            debug: {
                logLevel: "info",
                enablePerformanceMonitoring: true,
                logFile: null,
                enableDetailedLogs: false,
                maxLogFileSize: "10MB",
                logRotation: true
            },
            cache: {
                enabled: true,
                maxSize: 100,
                ttl: 3600000,
                cleanupInterval: 300000
            },
            security: {
                allowedImageTypes: ["jpg", "jpeg", "png", "gif", "svg", "webp"],
                maxImageSize: "50MB",
                sanitizeHtml: true,
                allowExternalResources: false
            },
            performance: {
                enableMetrics: true,
                metricsRetention: 1000,
                enableProfiling: false,
                memoryThreshold: "500MB"
            }
        };
    }

    /**
     * 从文件加载配置
     * @param {string} configPath - 配置文件路径
     */
    async loadFromFile(configPath) {
        try {
            if (fs.existsSync(configPath)) {
                const fileContent = await fs.promises.readFile(configPath, 'utf8');
                const fileConfig = JSON.parse(fileContent);
                this.mergeConfig(fileConfig);
                this.configPath = configPath;
                this.watchConfigFile();
            }
        } catch (error) {
            console.warn(`Failed to load config from ${configPath}: ${error.message}`);
        }
    }

    /**
     * 从环境变量加载配置
     */
    loadFromEnv() {
        const envConfig = {};
        
        // 解析环境变量
        Object.keys(process.env).forEach(key => {
            if (key.startsWith('MDTOWORD_')) {
                const configKey = key.replace('MDTOWORD_', '').toLowerCase();
                const value = this.parseEnvValue(process.env[key]);
                this.setNestedConfig(envConfig, configKey, value);
            }
        });
        
        if (Object.keys(envConfig).length > 0) {
            this.mergeConfig(envConfig);
        }
    }

    /**
     * 解析环境变量值
     * @param {string} value - 环境变量值
     * @returns {any} 解析后的值
     */
    parseEnvValue(value) {
        // 尝试解析为 JSON
        try {
            return JSON.parse(value);
        } catch {
            // 解析为布尔值
            if (value.toLowerCase() === 'true') return true;
            if (value.toLowerCase() === 'false') return false;
            
            // 解析为数字
            const num = Number(value);
            if (!isNaN(num)) return num;
            
            // 返回字符串
            return value;
        }
    }

    /**
     * 设置嵌套配置
     * @param {Object} config - 配置对象
     * @param {string} key - 配置键（支持点分隔）
     * @param {any} value - 配置值
     */
    setNestedConfig(config, key, value) {
        const keys = key.split('_');
        let current = config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    /**
     * 合并配置
     * @param {Object} newConfig - 新配置
     * @returns {Object} 合并后的配置对象
     */
    mergeConfig(newConfig) {
        this.config = this.deepMerge(this.config, newConfig);
        return this.config;
    }

    /**
     * 深度合并对象
     * @param {Object} target - 目标对象
     * @param {Object} source - 源对象
     * @returns {Object} 合并后的对象
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    /**
     * 获取配置值
     * @param {string} key - 配置键（支持点分隔）
     * @param {any} defaultValue - 默认值
     * @returns {any} 配置值
     */
    get(key, defaultValue = undefined) {
        const keys = key.split('.');
        let current = this.config;
        
        for (const k of keys) {
            if (current && typeof current === 'object' && k in current) {
                current = current[k];
            } else {
                return defaultValue;
            }
        }
        
        return current;
    }

    /**
     * 设置配置值
     * @param {string} key - 配置键（支持点分隔）
     * @param {any} value - 配置值
     */
    set(key, value) {
        const keys = key.split('.');
        let current = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    /**
     * 监听配置文件变化
     */
    watchConfigFile() {
        if (!this.configPath || this.watchers.has(this.configPath)) {
            return;
        }

        try {
            const watcher = fs.watch(this.configPath, (eventType) => {
                if (eventType === 'change') {
                    console.log('Config file changed, reloading...');
                    this.loadFromFile(this.configPath);
                }
            });
            
            this.watchers.set(this.configPath, watcher);
        } catch (error) {
            console.warn(`Failed to watch config file: ${error.message}`);
        }
    }

    /**
     * 保存配置到文件
     * @param {string} configPath - 配置文件路径
     */
    async saveToFile(configPath) {
        try {
            const configDir = path.dirname(configPath);
            await fs.promises.mkdir(configDir, { recursive: true });
            
            const configContent = JSON.stringify(this.config, null, 2);
            await fs.promises.writeFile(configPath, configContent, 'utf8');
            
            console.log(`Configuration saved to ${configPath}`);
        } catch (error) {
            console.error(`Failed to save config: ${error.message}`);
            throw error;
        }
    }

    /**
     * 重置配置到默认值
     */
    reset() {
        this.loadDefaultConfig();
    }

    /**
     * 获取完整配置
     * @returns {Object} 完整配置对象
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * 验证配置
     * @returns {Array<string>} 验证错误列表
     */
    validate() {
        const errors = [];
        
        // 验证图片质量设置
        const imageQuality = this.get('word.imageQuality', {});
        if (imageQuality.jpeg && (imageQuality.jpeg < 1 || imageQuality.jpeg > 100)) {
            errors.push('JPEG quality must be between 1 and 100');
        }
        
        // 验证最大并发数
        const maxConcurrency = this.get('performance.maxConcurrency', 3);
        if (maxConcurrency < 1 || maxConcurrency > 10) {
            errors.push('Max concurrency must be between 1 and 10');
        }
        
        // 验证超时设置
        const timeout = this.get('performance.timeout', 30000);
        if (timeout < 1000) {
            errors.push('Timeout must be at least 1000ms');
        }
        
        return errors;
    }

    /**
     * 初始化配置管理器
     * @param {string} configPath - 可选的配置文件路径
     */
    async init(configPath = null) {
        // 加载环境变量配置
        this.loadFromEnv();
        
        // 如果提供了配置文件路径，则加载文件配置
        if (configPath) {
            await this.loadFromFile(configPath);
        }
        
        // 验证配置
        const errors = this.validate();
        if (errors.length > 0) {
            console.warn('Configuration validation warnings:', errors);
        }
    }

    /**
     * 清理资源
     */
    dispose() {
        // 关闭所有文件监听器
        for (const watcher of this.watchers.values()) {
            watcher.close();
        }
        this.watchers.clear();
    }
}

// 单例实例
let configManagerInstance = null;

/**
 * 获取配置管理器单例实例
 * @returns {ConfigManager} 配置管理器实例
 */
ConfigManager.getInstance = function() {
    if (!configManagerInstance) {
        configManagerInstance = new ConfigManager();
        // 同步初始化默认配置
        configManagerInstance.loadDefaultConfig();
        configManagerInstance.loadFromEnv();
    }
    return configManagerInstance;
};

// 创建默认实例
const configManager = ConfigManager.getInstance();

// 异步初始化配置管理器（可选的高级配置）
(async () => {
    try {
        await configManager.init();
    } catch (error) {
        console.warn('Failed to initialize config manager:', error.message);
        // 已经有默认配置，无需额外处理
    }
})();

module.exports = {
    ConfigManager,
    configManager
};