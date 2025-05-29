/**
 * @description 主转换器模块
 * 整合Markdown到HTML和HTML到Word的转换功能
 */
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const MarkdownToHtml = require('./markdownToHtml');
const HtmlToWordConverter = require('./htmlToWord');
const ConfigManager = require('./utils/configManager');
const { Packer } = require('docx');

/**
 * @class Converter
 * @description 转换器主类
 */
class Converter {
  /**
   * @constructor
   * @param {Object|string} config - 配置对象或配置文件路径
   */
  constructor(config = {}) {
    this.configManager = null;
    this.config = {};
    
    // 初始化配置
    this._initConfig(config);
    
    // 创建转换器实例
    this.md_to_html = new MarkdownToHtml(this.config);
    this.html_to_word = new HtmlToWordConverter(this.config);
  }
  
  /**
   * @method _initConfig
   * @description 初始化配置
   * @param {Object|string} config - 配置对象或配置文件路径
   * @private
   */
  async _initConfig(config) {
    this.configManager = new ConfigManager();
    
    if (typeof config === 'string') {
      // 如果是字符串，尝试作为配置文件路径加载
      try {
        const loaded = await this.configManager.loadFromYaml(config);
        if (!loaded) {
          console.warn(`无法加载配置文件: ${config}，将使用默认配置`);
        }
      } catch (error) {
        console.error(`加载配置文件失败: ${error.message}`);
      }
      this.config = this.configManager.getAll();
    } else {
      // 如果是对象，直接使用
      this.config = config;
      this.configManager = new ConfigManager(config);
    }
  }

  /**
   * @method convert_file
   * @description 转换单个Markdown文件为Word文档
   * @param {string} input_file - 输入Markdown文件路径
   * @param {string} output_file - 输出Word文件路径
   * @param {boolean} keep_html - 是否保留中间HTML文件
   * @returns {Object} - 转换结果
   */
  async convert_file(input_file, output_file, keep_html = false) {
    try {
      if (!await fs.pathExists(input_file)) {
        throw new Error(`输入文件不存在: ${input_file}`);
      }

      // 确定HTML中间文件路径
      let html_file = null;
      if (keep_html) {
        const base_name = path.basename(input_file, path.extname(input_file));
        const html_dir = path.dirname(input_file);
        html_file = path.join(html_dir, `${base_name}.html`);
      }

      // 打印配置信息以便调试
      console.log('使用配置转换Markdown:', JSON.stringify({
        chinese: this.config.chinese,
        document: this.config.document,
        paragraph: this.config.paragraph,
        table_styles: this.config.table_styles,
        enhanced_table_styles: this.config.enhanced_table_styles
      }, null, 2));

      // 确保配置中的中文相关设置传递给markdown到html模块
      // 每次创建新实例避免配置共享问题
      this.md_to_html = new MarkdownToHtml(this.config);

      // 转换Markdown到HTML
      const html_content = await this.md_to_html.convertFile(input_file, html_file);

      // 转换HTML到Word
      let doc;
      if (html_file) {
        doc = await this.html_to_word.convertFile(html_file, output_file);
      } else {
        doc = this.html_to_word.convertHtml(html_content, path.dirname(input_file));
        
        // 创建输出目录（如果不存在）
        await fs.ensureDir(path.dirname(output_file));
        
        // 保存Word文档
        const buffer = await Packer.toBuffer(doc);
        await fs.writeFile(output_file, buffer);
        console.log(`Word文档已保存到: ${output_file}`);
      }

      return {
        success: true,
        message: '转换成功',
        outputFile: output_file,
        document: doc
      };
    } catch (error) {
      console.error('转换文件时出错:', error);
      return {
        success: false,
        message: `转换失败: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * @method batch_convert
   * @description 批量转换目录中的Markdown文件为Word文档
   * @param {string} input_dir - 输入目录路径
   * @param {string} output_dir - 输出目录路径
   * @param {boolean} keep_html - 是否保留中间HTML文件
   * @returns {Object} - 转换结果，键为文件路径，值为是否成功
   */
  async batch_convert(input_dir, output_dir, keep_html = false) {
    try {
      if (!await fs.pathExists(input_dir)) {
        throw new Error(`输入目录不存在: ${input_dir}`);
      }

      // 确保输出目录存在
      await fs.ensureDir(output_dir);

      // 查找所有Markdown文件
      const files = glob.sync(path.join(input_dir, '**', '*.md'));
      const results = {};

      // 转换每个文件
      const total_files = files.length;
      for (let idx = 0; idx < total_files; idx++) {
        const file_path = files[idx];
        
        // 计算相对路径，用于构建输出路径
        const rel_path = path.relative(input_dir, file_path);
        const base_name = path.basename(rel_path, '.md');
        const dir_name = path.dirname(rel_path);
        
        // 构建输出文件路径
        const output_file = path.join(output_dir, dir_name, `${base_name}.docx`);
        
        // 确保输出目录存在
        await fs.ensureDir(path.dirname(output_file));
        
        // 输出进度信息
        console.log(`处理文件 ${idx + 1}/${total_files}: ${rel_path}`);
        
        try {
          // 执行转换
          const result = await this.convert_file(file_path, output_file, keep_html);
          results[rel_path] = result.success;
          console.log(`  ${result.success ? '完成' : '失败'}: ${output_file}`);
        } catch (error) {
          results[rel_path] = false;
          console.error(`  失败: ${error.message}`);
        }
      }

      // 输出统计信息
      const success_count = Object.values(results).filter(v => v).length;
      console.log(`\n转换完成: 共 ${total_files} 个文件, 成功 ${success_count} 个, 失败 ${total_files - success_count} 个`);
      
      return results;
    } catch (error) {
      console.error('批量转换时出错:', error);
      throw error;
    }
  }

  /**
   * @method loadConfig
   * @description 加载配置文件
   * @param {string} configPath - 配置文件路径
   * @returns {boolean} - 是否成功加载
   */
  async loadConfig(configPath) {
    try {
      const loaded = await this.configManager.loadFromYaml(configPath);
      if (loaded) {
        this.config = this.configManager.getAll();
        
        // 更新转换器的配置
        this.md_to_html = new MarkdownToHtml(this.config);
        this.html_to_word = new HtmlToWordConverter(this.config);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error(`加载配置文件失败: ${error.message}`);
      return false;
    }
  }

  /**
   * @method cleanup
   * @description 清理临时资源
   */
  cleanup() {
    // 清理可能的临时文件或资源
    console.log('清理资源...');
  }
}

module.exports = Converter; 