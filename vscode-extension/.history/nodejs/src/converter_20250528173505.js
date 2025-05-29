/**
 * @description 主转换器模块
 * 整合Markdown到HTML和HTML到Word的转换功能
 */
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const { Packer } = require('docx');

const MarkdownToHtml = require('./markdownToHtml/converter');
const HtmlToWordConverter = require('./htmlToWord/converter');
const ConfigManager = require('./config/configManager');
const FileHandler = require('./utils/fileHandler');
const ErrorHandler = require('./utils/errorHandler');

/**
 * @class Converter
 * @description 主转换器类，协调Markdown到HTML，HTML到Word的转换过程
 */
class Converter {
  /**
   * @constructor
   * @param {Object|string} config - 配置对象或配置文件路径
   */
  constructor(config = {}) {
    console.log('初始化转换器...');
    
    // 初始化配置（同步方式）
    this.configManager = new ConfigManager();
    
    if (typeof config === 'string') {
      // 如果是字符串，设置为配置文件路径，延迟加载
      this.configPath = config;
      this.config = this.configManager.getAll(); // 使用默认配置
    } else {
      // 如果是对象，直接使用
      this.config = config;
      this.configManager = new ConfigManager(config);
    }
    
    // 初始化文件处理器
    this.fileHandler = new FileHandler({
      maxRetries: 3,
      retryDelay: 1000,
      autoRename: true
    });
    
    // 创建转换器实例
    this.md_to_html = new MarkdownToHtml(this.config);
    this.html_to_word = new HtmlToWordConverter(this.config);
  }
  
  /**
   * @method initializeConfigAsync
   * @description 异步初始化配置（如果需要从文件加载）
   * @private
   */
  async initializeConfigAsync() {
    if (this.configPath) {
      try {
        const loaded = await this.configManager.loadFromYaml(this.configPath);
        if (!loaded) {
          console.warn(`无法加载配置文件: ${this.configPath}，将使用默认配置`);
        } else {
          this.config = this.configManager.getAll();
          // 更新转换器的配置
          this.md_to_html = new MarkdownToHtml(this.config);
          this.html_to_word = new HtmlToWordConverter(this.config);
        }
      } catch (error) {
        console.error(`加载配置文件失败: ${error.message}`);
      }
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
      // 首先初始化配置（如果有配置文件路径）
      await this.initializeConfigAsync();
      
      if (!await fs.pathExists(input_file)) {
        throw new Error(`输入文件不存在: ${input_file}`);
      }

      console.log(`开始转换文件: ${input_file} -> ${output_file}`);

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
      let html_content;
      try {
        console.log('开始Markdown到HTML转换...');
        html_content = await this.md_to_html.convertFile(input_file, html_file);
        console.log('Markdown到HTML转换完成');
      } catch (error) {
        throw ErrorHandler.createUserFriendlyError(error, 'markdown-to-html');
      }

      // 转换HTML到Word
      let doc;
      let writeResult;
      
      if (html_file) {
        try {
          doc = await this.html_to_word.convertFile(html_file, output_file);
        } catch (error) {
          if (error.code === 'EBUSY' || error.code === 'EACCES' || error.code === 'EPERM') {
            throw ErrorHandler.createUserFriendlyError(error, 'file-save', output_file);
          } else {
            throw ErrorHandler.createUserFriendlyError(error, 'html-to-word');
          }
        }
      } else {
        try {
          console.log('开始HTML到Word转换...');
          doc = this.html_to_word.convertHtml(html_content, path.dirname(input_file));
          
          // 创建输出目录（如果不存在）
          await fs.ensureDir(path.dirname(output_file));
          
          // 使用文件处理器保存Word文档
          console.log('生成Word文档缓冲区...');
          const buffer = await Packer.toBuffer(doc);
          
          console.log(`准备保存Word文档到: ${output_file}`);
          writeResult = await this.fileHandler.writeWordDocument(output_file, buffer);
          
          if (!writeResult.success) {
            const error = writeResult.error || new Error(writeResult.message);
            error.code = writeResult.error?.code;
            throw ErrorHandler.createUserFriendlyError(error, 'file-save', output_file);
          }
          
          // 更新实际的输出文件路径（可能因为重命名而改变）
          output_file = writeResult.filePath;
        } catch (error) {
          if (error.errorInfo) {
            // 已经是用户友好的错误，直接抛出
            throw error;
          } else if (error.code === 'EBUSY' || error.code === 'EACCES' || error.code === 'EPERM') {
            throw ErrorHandler.createUserFriendlyError(error, 'file-save', output_file);
          } else {
            throw ErrorHandler.createUserFriendlyError(error, 'html-to-word');
          }
        }
      }

      const successMessage = writeResult ? writeResult.message : '转换成功';
      console.log(`✅ ${successMessage}`);

      return {
        success: true,
        message: successMessage,
        outputFile: output_file,
        document: doc
      };
    } catch (error) {
      console.error('转换文件时出错:', error.originalError || error);
      
      return {
        success: false,
        message: error.message,
        error: error.originalError || error
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