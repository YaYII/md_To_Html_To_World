/**
 * @description 配置UI模块
 * 提供命令行交互式配置界面
 */
const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs-extra');
const ConfigManager = require('./configManager');

/**
 * @class ConfigUI
 * @description 配置界面类
 */
class ConfigUI {
  /**
   * @constructor
   */
  constructor() {
    this.configManager = new ConfigManager();
    this.configPath = null;
  }

  /**
   * @method start
   * @description 启动配置界面
   * @param {string} [configPath] - 配置文件路径
   */
  async start(configPath = null) {
    try {
      console.log('欢迎使用Markdown转Word配置工具');
      
      // 如果提供了配置路径，尝试加载
      if (configPath) {
        this.configPath = configPath;
        const loaded = await this.configManager.loadFromYaml(configPath);
        if (loaded) {
          console.log(`已加载配置文件: ${configPath}`);
        } else {
          console.log(`无法加载配置文件，将使用默认配置`);
          await this.configManager.loadExampleConfig();
        }
      } else {
        // 否则加载示例配置
        await this.configManager.loadExampleConfig();
      }
      
      // 显示主菜单
      await this.showMainMenu();
    } catch (error) {
      console.error('配置过程中出错:', error);
    }
  }

  /**
   * @method showMainMenu
   * @description 显示主菜单
   */
  async showMainMenu() {
    const choices = [
      { name: '1. 修改字体设置', value: 'fonts' },
      { name: '2. 修改大小设置', value: 'sizes' },
      { name: '3. 修改颜色设置', value: 'colors' },
      { name: '4. 修改段落设置', value: 'paragraph' },
      { name: '5. 修改中文处理设置', value: 'chinese' },
      { name: '6. 修改表格样式', value: 'table_styles' },
      { name: '7. 修改文档设置', value: 'document' },
      { name: '8. 修改Markdown解析设置', value: 'markdown' },
      { name: '9. 修改调试设置', value: 'debug' },
      { name: '10. 保存配置', value: 'save' },
      { name: '11. 退出', value: 'exit' }
    ];
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '请选择要执行的操作:',
        choices: choices
      }
    ]);
    
    switch (action) {
      case 'fonts':
        await this.editFonts();
        break;
      case 'sizes':
        await this.editSizes();
        break;
      case 'colors':
        await this.editColors();
        break;
      case 'paragraph':
        await this.editParagraph();
        break;
      case 'chinese':
        await this.editChinese();
        break;
      case 'table_styles':
        await this.editTableStyles();
        break;
      case 'document':
        await this.editDocument();
        break;
      case 'markdown':
        await this.editMarkdown();
        break;
      case 'debug':
        await this.editDebug();
        break;
      case 'save':
        await this.saveConfig();
        break;
      case 'exit':
        console.log('感谢使用配置工具，再见！');
        return;
    }
    
    // 返回主菜单
    await this.showMainMenu();
  }

  /**
   * @method editFonts
   * @description 编辑字体设置
   */
  async editFonts() {
    const fonts = this.configManager.get('fonts') || {};
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'default',
        message: '正文默认字体:',
        default: fonts.default || '微软雅黑'
      },
      {
        type: 'input',
        name: 'code',
        message: '代码字体:',
        default: fonts.code || 'Consolas'
      },
      {
        type: 'input',
        name: 'headings',
        message: '标题字体:',
        default: fonts.headings || '微软雅黑'
      }
    ]);
    
    this.configManager.set('fonts', answers);
    console.log('字体设置已更新');
  }

  /**
   * @method editSizes
   * @description 编辑大小设置
   */
  async editSizes() {
    const sizes = this.configManager.get('sizes') || {};
    
    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'default',
        message: '正文默认字号(磅):',
        default: sizes.default || 12
      },
      {
        type: 'number',
        name: 'code',
        message: '代码字号(磅):',
        default: sizes.code || 10
      },
      {
        type: 'number',
        name: 'heading1',
        message: '一级标题字号(磅):',
        default: sizes.heading1 || 18
      },
      {
        type: 'number',
        name: 'heading2',
        message: '二级标题字号(磅):',
        default: sizes.heading2 || 16
      },
      {
        type: 'number',
        name: 'heading3',
        message: '三级标题字号(磅):',
        default: sizes.heading3 || 14
      }
    ]);
    
    this.configManager.set('sizes', {
      ...sizes,
      ...answers
    });
    console.log('字号设置已更新');
  }

  /**
   * @method editColors
   * @description 编辑颜色设置
   */
  async editColors() {
    const colors = this.configManager.get('colors') || {};
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'default',
        message: '正文默认颜色(十六进制):',
        default: colors.default || '#000000'
      },
      {
        type: 'input',
        name: 'headings',
        message: '标题颜色(十六进制):',
        default: colors.headings || '#000000'
      },
      {
        type: 'input',
        name: 'code',
        message: '代码颜色(十六进制):',
        default: colors.code || '#333333'
      },
      {
        type: 'input',
        name: 'link',
        message: '链接颜色(十六进制):',
        default: colors.link || '#0563C1'
      }
    ]);
    
    this.configManager.set('colors', answers);
    console.log('颜色设置已更新');
  }

  /**
   * @method editParagraph
   * @description 编辑段落设置
   */
  async editParagraph() {
    const paragraph = this.configManager.get('paragraph') || {};
    
    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'line_spacing',
        message: '行间距倍数:',
        default: paragraph.line_spacing || 1.5
      },
      {
        type: 'number',
        name: 'space_before',
        message: '段前间距(磅):',
        default: paragraph.space_before || 0
      },
      {
        type: 'number',
        name: 'space_after',
        message: '段后间距(磅):',
        default: paragraph.space_after || 6
      },
      {
        type: 'number',
        name: 'first_line_indent',
        message: '首行缩进字符数:',
        default: paragraph.first_line_indent || 0
      }
    ]);
    
    this.configManager.set('paragraph', answers);
    console.log('段落设置已更新');
  }

  /**
   * @method editChinese
   * @description 编辑中文处理设置
   */
  async editChinese() {
    const chinese = this.configManager.get('chinese') || {};
    
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'convert_to_traditional',
        message: '是否将简体中文转换为繁体中文:',
        default: chinese.convert_to_traditional || false
      },
      {
        type: 'confirm',
        name: 'punctuation_spacing',
        message: '是否优化标点符号间距:',
        default: chinese.punctuation_spacing || true
      },
      {
        type: 'confirm',
        name: 'auto_spacing',
        message: '是否在中英文之间自动添加空格:',
        default: chinese.auto_spacing || true
      }
    ]);
    
    this.configManager.set('chinese', answers);
    console.log('中文处理设置已更新');
  }

  /**
   * @method editTableStyles
   * @description 编辑表格样式
   */
  async editTableStyles() {
    const tableStyles = this.configManager.get('table_styles') || {};
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'even_row_color',
        message: '偶数行背景色(十六进制):',
        default: tableStyles.even_row_color || '#f2f2f2'
      },
      {
        type: 'input',
        name: 'odd_row_color',
        message: '奇数行背景色(十六进制):',
        default: tableStyles.odd_row_color || '#ffffff'
      },
      {
        type: 'input',
        name: 'header_bg_color',
        message: '表头背景色(十六进制):',
        default: tableStyles.header_bg_color || '#e0e0e0'
      },
      {
        type: 'input',
        name: 'border_color',
        message: '边框颜色(十六进制):',
        default: tableStyles.border_color || '#dddddd'
      }
    ]);
    
    this.configManager.set('table_styles', {
      ...tableStyles,
      ...answers
    });
    console.log('表格样式已更新');
  }

  /**
   * @method editDocument
   * @description 编辑文档设置
   */
  async editDocument() {
    const document = this.configManager.get('document') || {};
    
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'page_size',
        message: '页面大小:',
        choices: ['A4', 'Letter', 'Legal'],
        default: document.page_size || 'A4'
      },
      {
        type: 'number',
        name: 'margin_top',
        message: '上边距(厘米):',
        default: document.margin_top || 2.54
      },
      {
        type: 'number',
        name: 'margin_bottom',
        message: '下边距(厘米):',
        default: document.margin_bottom || 2.54
      },
      {
        type: 'number',
        name: 'margin_left',
        message: '左边距(厘米):',
        default: document.margin_left || 3.18
      },
      {
        type: 'number',
        name: 'margin_right',
        message: '右边距(厘米):',
        default: document.margin_right || 3.18
      },
      {
        type: 'confirm',
        name: 'generate_toc',
        message: '是否生成目录:',
        default: document.generate_toc || false
      }
    ]);
    
    this.configManager.set('document', {
      ...document,
      ...answers
    });
    console.log('文档设置已更新');
  }

  /**
   * @method editMarkdown
   * @description 编辑Markdown解析设置
   */
  async editMarkdown() {
    const markdown = this.configManager.get('markdown') || {};
    
    // 扩展选项
    const extensionChoices = [
      { name: '表格支持', value: 'tables', checked: true },
      { name: '围栏式代码块', value: 'fenced_code', checked: true },
      { name: '代码高亮', value: 'codehilite', checked: true },
      { name: '目录生成', value: 'toc', checked: false },
      { name: '脚注支持', value: 'footnotes', checked: true },
      { name: '换行转为<br>', value: 'nl2br', checked: true }
    ];
    
    // 如果已有配置，设置默认选中状态
    if (markdown.extensions) {
      extensionChoices.forEach(choice => {
        choice.checked = markdown.extensions.includes(choice.value);
      });
    }
    
    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'extensions',
        message: '选择要启用的Markdown扩展:',
        choices: extensionChoices
      },
      {
        type: 'confirm',
        name: 'codehilite_linenums',
        message: '代码块是否显示行号:',
        default: markdown.extension_configs?.codehilite?.linenums || false
      }
    ]);
    
    // 更新Markdown配置
    const extensionConfigs = {
      codehilite: {
        linenums: answers.codehilite_linenums,
        use_pygments: true
      }
    };
    
    this.configManager.set('markdown', {
      extensions: answers.extensions,
      extension_configs: extensionConfigs
    });
    
    console.log('Markdown解析设置已更新');
  }

  /**
   * @method editDebug
   * @description 编辑调试设置
   */
  async editDebug() {
    const debug = this.configManager.get('debug') || {};
    
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enabled',
        message: '是否启用调试模式:',
        default: debug.enabled || false
      },
      {
        type: 'list',
        name: 'log_level',
        message: '日志级别:',
        choices: ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
        default: debug.log_level || 'INFO'
      },
      {
        type: 'confirm',
        name: 'log_to_file',
        message: '是否将日志写入文件:',
        default: debug.log_to_file || false
      },
      {
        type: 'input',
        name: 'log_file',
        message: '日志文件路径:',
        default: debug.log_file || 'conversion.log',
        when: (answers) => answers.log_to_file
      }
    ]);
    
    this.configManager.set('debug', {
      ...debug,
      ...answers
    });
    console.log('调试设置已更新');
  }

  /**
   * @method saveConfig
   * @description 保存配置
   */
  async saveConfig() {
    try {
      // 如果没有指定配置路径，询问用户
      if (!this.configPath) {
        const { saveLocation } = await inquirer.prompt([
          {
            type: 'input',
            name: 'saveLocation',
            message: '请输入配置文件保存路径:',
            default: path.join(process.cwd(), 'config.yaml')
          }
        ]);
        this.configPath = saveLocation;
      }
      
      // 保存配置
      const success = await this.configManager.saveToYaml(this.configPath);
      
      if (success) {
        console.log(`配置已成功保存到: ${this.configPath}`);
      } else {
        console.error(`保存配置失败`);
      }
    } catch (error) {
      console.error('保存配置时出错:', error);
    }
  }
}

module.exports = ConfigUI;