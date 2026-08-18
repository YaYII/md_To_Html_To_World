/**
 * @description 主转换器模块
 * 整合Markdown到HTML和HTML到Word的转换功能
 */
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const { Packer } = require('docx');

const MarkdownToHtml = require('./markdownToHtml');
const { HtmlToWordConverter } = require('./htmlToWord');
const ConfigManager = require('./utils/configManager');
const FileHandler = require('./utils/fileHandler');
const ErrorHandler = require('./utils/errorHandler');
const { COMPLETE_DEFAULTS, deepMerge } = require('./utils/defaultConfig');

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
    // console.log('初始化转换器...');
    
    // 初始化配置（同步方式）
    this.configManager = new ConfigManager();
    
    if (typeof config === 'string') {
      // 如果是字符串，设置为配置文件路径，延迟加载
      this.configPath = config;
      this.config = { ...COMPLETE_DEFAULTS }; // 临时默认配置
    } else {
      // 深度合并用户配置与完整默认值，确保所有键存在
      this.config = deepMerge(COMPLETE_DEFAULTS, config || {});
      this.configManager = new ConfigManager(this.config);
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
          // console.warn(`无法加载配置文件: ${this.configPath}，将使用默认配置`);
        } else {
          this.config = deepMerge(COMPLETE_DEFAULTS, this.configManager.getAll());
          // 更新转换器的配置
          this.md_to_html = new MarkdownToHtml(this.config);
          this.html_to_word = new HtmlToWordConverter(this.config);
        }
      } catch (error) {
        // console.error(`加载配置文件失败: ${error.message}`);
      }
    }
  }

  /**
   * @method convert_file
   * @description 转换单个Markdown文件为Word文档
   * @param {string} input_file - 输入Markdown文件路径
   * @param {string} output_file - 输出Word文件路径
   * @param {boolean} keep_html - 是否同时产出 gov 样式 HTML 文档（默认 true）
   * 说明：HTML 与 Word 一同产出到输出目录（同名 .html），用户可按需选择 HTML 或 Word
   * @returns {Object} - 转换结果
   */
  async convert_file(input_file, output_file, keep_html = true) {
    try {
      // 首先初始化配置（如果有配置文件路径）
      await this.initializeConfigAsync();
      
      if (!await fs.pathExists(input_file)) {
        throw new Error(`输入文件不存在: ${input_file}`);
      }

      // console.log(`开始转换文件: ${input_file} -> ${output_file}`);

      // 确定 HTML 输出路径：与 Word 输出同目录、同名（.md → .html），而非源文件目录
      let html_file = null;
      if (keep_html) {
        // 以 Word 输出文件名为基准（同名配套），保证用户拿到的 .html 与 .docx 一一对应
        const out_base = path.basename(output_file, path.extname(output_file));
        html_file = path.join(path.dirname(output_file), `${out_base}.html`);
      }

      // 确保输出目录存在（HTML 与 Word 同目录）
      await fs.ensureDir(path.dirname(output_file));

      // 打印配置信息以便调试
      // console.log('使用配置转换Markdown:', JSON.stringify({
      //   chinese: this.config.chinese,
      //   document: this.config.document,
      //   paragraph: this.config.paragraph,
      //   table_styles: this.config.table_styles,
      //   enhanced_table_styles: this.config.enhanced_table_styles
      // }, null, 2));

      // 确保配置中的中文相关设置传递给markdown到html模块
      // 每次创建新实例避免配置共享问题
      this.md_to_html = new MarkdownToHtml(this.config);

      // ===== 转换 Markdown → HTML（Node 服务端渲染完成） =====
      // 用户可见 .html 与 Word 内部均用 convertString：服务端 marked 已渲染静态 DOM
      // （gov 公文样式 + mermaid SVG + 图片放大增强），打开即正确文档，不依赖浏览器 JS
      // 注意：不要用 convertGovFile（浏览器 JS 渲染 md-source + marked.parse）——
      // 否则 HTML 打开时禁用/未执行 JS 会显示 markdown 原文或空白
      let html_content;
      try {
        // 只转换一次：服务端渲染完成（含 mermaid 离线渲染），结果同时用于
        // ① 用户可见 .html 文件 ② Word 内部 htmlToWord 解析
        // （避免对同一 md 做两次转换导致 mermaid 渲染两遍、耗时翻倍）
        html_content = await this.md_to_html.convertFile(input_file);
        if (html_file) {
          await fs.outputFile(html_file, html_content, 'utf-8');
        }
      } catch (error) {
        throw ErrorHandler.createUserFriendlyError(error, 'markdown-to-html');
      }

      // 转换HTML到Word
      let doc;
      let writeResult;
      
      // Word 转换统一用内存中的静态 HTML（convertHtml 解析 DOM），
      // 不再读 html_file（那是给用户看的 gov 浏览器渲染版，含 <script> 无静态 DOM）
      try {
        // console.log('开始HTML到Word转换...');
        doc = await this.html_to_word.convertHtml(html_content, path.dirname(input_file));
        
        // 创建输出目录（如果不存在）
        await fs.ensureDir(path.dirname(output_file));
        
        // 使用文件处理器保存Word文档
        // console.log('生成Word文档缓冲区...');
        const buffer = await Packer.toBuffer(doc);
        
        // console.log(`准备保存Word文档到: ${output_file}`);
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

      const successMessage = writeResult ? writeResult.message : '转换成功';
      // console.log(`✅ ${successMessage}`);

      return {
        success: true,
        message: successMessage,
        outputFile: output_file,
        htmlFile: html_file,
        document: doc
      };
    } catch (error) {
      // console.error('转换文件时出错:', error.originalError || error);
      
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
        // console.log(`处理文件 ${idx + 1}/${total_files}: ${rel_path}`);
        
        try {
          // 执行转换
          const result = await this.convert_file(file_path, output_file, keep_html);
          results[rel_path] = result.success;
          // console.log(`  ${result.success ? '完成' : '失败'}: ${output_file}`);
        } catch (error) {
          results[rel_path] = false;
          // console.error(`  失败: ${error.message}`);
        }
      }

      // 输出统计信息
      const success_count = Object.values(results).filter(v => v).length;
      // console.log(`\n转换完成: 共 ${total_files} 个文件, 成功 ${success_count} 个, 失败 ${total_files - success_count} 个`);
      
      return results;
    } catch (error) {
      // console.error('批量转换时出错:', error);
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
        this.config = deepMerge(COMPLETE_DEFAULTS, this.configManager.getAll());
        
        // 更新转换器的配置
        this.md_to_html = new MarkdownToHtml(this.config);
        this.html_to_word = new HtmlToWordConverter(this.config);
        
        return true;
      }
      return false;
    } catch (error) {
      // console.error(`加载配置文件失败: ${error.message}`);
      return false;
    }
  }

  /**
   * @method cleanup
   * @description 清理临时资源
   */
  cleanup() {
    // 清理可能的临时文件或资源
    // console.log('清理资源...');
  }
}

module.exports = Converter;
