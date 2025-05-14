/**
 * @description 配置工具
 * 处理插件的配置信息
 */
const fs = require('fs-extra');
const path = require('path');

/**
 * @class Config
 * @description 处理插件配置的类
 */
class Config {
  /**
   * @constructor
   * @param {Object} initialConfig - 初始配置对象
   */
  constructor(initialConfig = {}) {
    // 默认配置
    this.defaultConfig = {
      fontName: 'Microsoft YaHei',
      fontSize: 12,
      chinese: {
        convertToTraditional: false
      },
      output: {
        keepHtml: false
      }
    };
    
    // 合并默认配置和初始配置
    this.config = {
      ...this.defaultConfig,
      ...initialConfig
    };
  }
  
  /**
   * @method get
   * @description 获取配置项
   * @param {string} key - 配置键名（可以使用点号分隔嵌套键）
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
   * @description 设置配置项
   * @param {string} key - 配置键名（可以使用点号分隔嵌套键）
   * @param {any} value - 要设置的值
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
   * @method loadFromFile
   * @description 从文件加载配置
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
      
      // 根据文件扩展名决定如何解析
      const ext = path.extname(filePath).toLowerCase();
      let configData;
      
      if (ext === '.json') {
        const content = await fs.readFile(filePath, 'utf-8');
        configData = JSON.parse(content);
      } else if (ext === '.yaml' || ext === '.yml') {
        const yaml = require('js-yaml');
        const content = await fs.readFile(filePath, 'utf-8');
        configData = yaml.load(content);
      } else {
        console.warn(`不支持的配置文件格式: ${ext}`);
        return false;
      }
      
      // 合并配置
      this.config = {
        ...this.defaultConfig,
        ...configData
      };
      
      return true;
    } catch (error) {
      console.error('加载配置文件出错:', error);
      return false;
    }
  }
  
  /**
   * @method saveToFile
   * @description 保存配置到文件
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
        const yaml = require('js-yaml');
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
   * @method getAll
   * @description 获取所有配置
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
    this.config = { ...this.defaultConfig };
  }
}

module.exports = Config; 