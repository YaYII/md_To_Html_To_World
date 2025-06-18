/**
 * @description 配置管理器模块
 * 用于处理YAML格式的配置文件，提供读取、修改和保存功能
 */
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const Config = require('./config');

/**
 * @class ConfigManager
 * @description 配置管理器类，扩展基本配置类，专门处理YAML配置
 */
class ConfigManager extends Config {
  /**
   * @constructor
   * @param {Object} initialConfig - 初始配置对象
   */
  constructor(initialConfig = {}) {
    super(initialConfig);
    
    // 配置文件路径
    this.configFilePath = null;
    
    // 配置架构（从示例配置中提取）
    this.configSchema = {
      fonts: {
        default: '微软雅黑',
        code: 'Consolas',
        headings: '微软雅黑'
      },
      sizes: {
        default: 12,
        code: 10,
        heading1: 18,
        heading2: 16,
        heading3: 14,
        heading4: 12,
        heading5: 12,
        heading6: 12
      },
      colors: {
        default: '#000000',
        headings: '#000000',
        code: '#333333',
        link: '#0563C1'
      },
      paragraph: {
        line_spacing: 1.5,
        space_before: 0,
        space_after: 6,
        first_line_indent: 0
      },
      chinese: {
        convert_to_traditional: false,
        punctuation_spacing: true,
        auto_spacing: true
      },
      table_styles: {
        even_row_color: '#f2f2f2',
        odd_row_color: '#ffffff',
        header_bg_color: '#e0e0e0',
        border_color: '#dddddd',
        cell_height: '0.95em',
        table_width: '100%'
      },
      enhanced_table_styles: {
        style: 'Table Grid',
        width: 16.0,
        border: true,
        border_size: 1,
        border_color: '#dddddd',
        header_bg_color: '#E7E6E6',
        even_row_color: '#F2F2F2',
        text_align: 'left',
        vertical_align: 'center',
        cell_padding: 0,
        cell_height: 0.95,
        autofit: false,
        first_row_as_header: true,
        keep_header_visible: true,
        row_height: {
          default: 0.95,
          header: 0.95,
          min: 0.5,
          max: 5.0,
          auto_adjust: true
        }
      },
      markdown: {
        extensions: [
          'tables',
          'fenced_code',
          'codehilite',
          'footnotes',
          'nl2br'
        ],
        extension_configs: {
          codehilite: {
            linenums: false,
            use_pygments: true
          }
        }
      },
      document: {
        page_size: 'A4',
        margin_top: 2.54,
        margin_bottom: 2.54,
        margin_left: 3.18,
        margin_right: 3.18,
        header: '',
        footer: '',
        language: 'zh-CN',
        generate_toc: false
      },
      charts: {
        enabled: true,
        service: 'kroki',
        kroki_url: 'https://kroki.io',
        output_format: 'png', // 推荐使用png避免Word转换时文字丢失
        cache_enabled: true,
        cache_dir: './chart_cache',
        timeout: 10000,
        supported_types: [
          'mermaid', 'plantuml', 'graphviz', 'blockdiag', 'seqdiag',
          'actdiag', 'nwdiag', 'c4plantuml', 'ditaa', 'erd',
          'nomnoml', 'svgbob', 'wavedrom'
        ]
      },
      debug: {
        enabled: false,
        log_level: 'INFO',
        log_to_file: false,
        log_file: 'conversion.log',
        print_html_structure: false,
        verbose_element_info: false,
        timing: true
      }
    };
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
      
      // 合并配置
      this.config = {
        ...this.defaultConfig,
        ...configData
      };
      
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