/**
 * @description 配置管理器模块
 * 统一基于 COMPLETE_DEFAULTS（defaultConfig.js），提供读取、修改和保存功能
 * （2026-08-14 重构：删除旧 Config 4 键默认值，消除三份配置重复）
 */
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { COMPLETE_DEFAULTS, deepMerge } = require('./defaultConfig');

/**
 * @class ConfigManager
 * @description 配置管理器类，基于统一默认配置，处理 YAML 配置读写
 */
class ConfigManager {
  /**
   * @constructor
   * @param {Object} initialConfig - 初始配置对象
   */
  constructor(initialConfig = {}) {
    // 配置架构（统一默认配置）
    this.configSchema = COMPLETE_DEFAULTS;
    // 深度合并默认配置与初始配置，确保所有键存在
    this.config = deepMerge(COMPLETE_DEFAULTS, initialConfig || {});
    // 配置文件路径
    this.configFilePath = null;
  }

  /**
   * @method get
   * @description 获取配置项（支持点号分隔嵌套键）
   * @param {string} key - 配置键名
   * @param {any} defaultValue - 未找到时返回的默认值
   * @returns {any} - 配置项的值
   */
  get(key, defaultValue = undefined) {
    const keys = key.split('.');
    let value = this.config;

    for (const k of keys) {
      if (value === undefined || value === null || typeof value !== 'object') {
        return defaultValue;
      }
      value = value[k];
    }

    return value !== undefined ? value : defaultValue;
  }

  /**
   * @method set
   * @description 设置配置项（支持点号分隔嵌套键）
   * @param {string} key - 配置键名
   * @param {any} value - 配置值
   */
  set(key, value) {
    const keys = key.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (current[k] === undefined || current[k] === null || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * @method getAll
   * @description 获取所有配置（浅拷贝）
   * @returns {Object} - 完整配置对象
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * @method reset
   * @description 重置为默认配置
   */
  reset() {
    this.config = deepMerge(COMPLETE_DEFAULTS, {});
  }

  /**
   * @method loadFromFile
   * @description 从 JSON/YAML 文件加载配置（深度合并默认值）
   * @param {string} filePath - 配置文件路径
   * @returns {boolean} - 是否成功加载
   */
  async loadFromFile(filePath) {
    try {
      const fileExists = await fs.pathExists(filePath);
      if (!fileExists) {
        console.warn(`配置文件不存在: ${filePath}`);
        return false;
      }

      const ext = path.extname(filePath).toLowerCase();
      let configData;

      if (ext === '.json') {
        const content = await fs.readFile(filePath, 'utf-8');
        configData = JSON.parse(content);
      } else if (ext === '.yaml' || ext === '.yml') {
        const content = await fs.readFile(filePath, 'utf-8');
        configData = yaml.load(content);
      } else {
        console.warn(`不支持的配置文件格式: ${ext}`);
        return false;
      }

      this.configFilePath = filePath;
      this.config = deepMerge(this.configSchema, configData || {});
      return true;
    } catch (error) {
      console.error('加载配置文件出错:', error);
      return false;
    }
  }

  /**
   * @method saveToFile
   * @description 保存配置到 JSON/YAML 文件
   * @param {string} filePath - 配置文件路径
   * @returns {boolean} - 是否成功保存
   */
  async saveToFile(filePath) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      let content;

      if (ext === '.json') {
        content = JSON.stringify(this.config, null, 2);
      } else if (ext === '.yaml' || ext === '.yml') {
        content = yaml.dump(this.config);
      } else {
        console.warn(`不支持的配置文件格式: ${ext}`);
        return false;
      }

      await fs.outputFile(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error('保存配置文件出错:', error);
      return false;
    }
  }
  
  /**
   * @method loadFromYaml
   * @description 从YAML文件加载配置
   * @param {string} filePath - 配置文件路径
   * @returns {boolean} - 是否成功加载
   */
  async loadFromYaml(filePath) {
    try {
      const fileExists = await fs.pathExists(filePath);
      if (!fileExists) {
        console.warn(`配置文件不存在: ${filePath}`);
        return false;
      }
      
      const content = await fs.readFile(filePath, 'utf-8');
      const configData = yaml.load(content);
      
      // 保存文件路径
      this.configFilePath = filePath;
      
      // 深度合并（修复：旧实现只用 4 键默认值，会丢失完整配置项）
      this.config = deepMerge(this.configSchema, configData || {});
      
      return true;
    } catch (error) {
      console.error('加载YAML配置文件出错:', error);
      return false;
    }
  }
  
  /**
   * @method saveToYaml
   * @description 保存配置到YAML文件
   * @param {string} [filePath] - 配置文件路径，如果不提供则使用之前加载的路径
   * @returns {boolean} - 是否成功保存
   */
  async saveToYaml(filePath = null) {
    try {
      const targetPath = filePath || this.configFilePath;
      if (!targetPath) {
        console.error('未指定配置文件路径');
        return false;
      }
      
      const content = yaml.dump(this.config);
      await fs.outputFile(targetPath, content, 'utf-8');
      console.log(`配置已保存到: ${targetPath}`);
      return true;
    } catch (error) {
      console.error('保存YAML配置文件出错:', error);
      return false;
    }
  }
  
  /**
   * @method loadExampleConfig
   * @description 加载示例配置文件
   * @returns {boolean} - 是否成功加载
   */
  async loadExampleConfig() {
    const examplePath = path.join(process.cwd(), 'config_example.yaml');
    return await this.loadFromYaml(examplePath);
  }
  
  /**
   * @method createDefaultConfig
   * @description 创建默认配置文件
   * @param {string} filePath - 配置文件保存路径
   * @returns {boolean} - 是否成功创建
   */
  async createDefaultConfig(filePath) {
    try {
      // 先加载示例配置
      await this.loadExampleConfig();
      
      // 然后保存到指定路径
      return await this.saveToYaml(filePath);
    } catch (error) {
      console.error('创建默认配置文件出错:', error);
      return false;
    }
  }
  
  /**
   * @method getConfigSchema
   * @description 获取配置架构
   * @returns {Object} - 配置架构对象
   */
  getConfigSchema() {
    return { ...this.configSchema };
  }

  /**
   * @method validateChartConfig
   * @description 验证图表配置并检查网络连接
   * @returns {Promise<Object>} - 验证结果
   */
  async validateChartConfig() {
    const chartConfig = this.get('charts', {});
    const result = {
      enabled: chartConfig.enabled || false,
      service: chartConfig.service || 'kroki',
      networkAvailable: false,
      recommendations: []
    };

    if (!chartConfig.enabled) {
      result.recommendations.push('图表功能已禁用');
      return result;
    }

    if (chartConfig.service === 'kroki') {
      try {
        const axios = require('axios');
        const response = await axios.get(chartConfig.kroki_url || 'https://kroki.io', {
          timeout: 5000,
          validateStatus: function (status) {
            return status < 500;
          }
        });
        result.networkAvailable = true;
        result.recommendations.push('网络连接正常，图表功能可用');
      } catch (error) {
        result.networkAvailable = false;
        if (error.code === 'ECONNABORTED') {
          result.recommendations.push('网络连接超时，建议检查网络设置或禁用图表功能');
        } else if (error.code === 'ENOTFOUND') {
          result.recommendations.push('无法解析域名，可能被防火墙阻挡，建议禁用图表功能');
        } else {
          result.recommendations.push(`网络连接失败 (${error.message})，建议禁用图表功能`);
        }
      }
    }

    return result;
  }

  /**
   * @method createNetworkFriendlyConfig
   * @description 创建适合网络受限环境的配置
   * @returns {Object} - 优化后的配置对象
   */
  createNetworkFriendlyConfig() {
    const config = this.getAll();
    
    // 禁用图表功能
    if (config.charts) {
      config.charts.enabled = false;
    } else {
      config.charts = { enabled: false };
    }
    
    // 禁用可能需要网络的其他功能
    if (config.debug) {
      config.debug.enabled = false;
    }
    
    return config;
  }
}

module.exports = ConfigManager;
