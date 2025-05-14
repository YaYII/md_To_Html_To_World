/**
 * @description Node.js版Markdown转Word转换工具主入口
 */
const fs = require('fs-extra');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const ConfigManager = require('./utils/configManager');
const Converter = require('./converter');

/**
 * @function main
 * @description 主函数
 */
async function main() {
  // 命令行参数解析
  const argv = yargs(hideBin(process.argv))
    .usage('使用方法: $0 [options]')
    .option('input', {
      alias: 'i',
      describe: '输入文件或目录路径',
      type: 'string',
      demandOption: true
    })
    .option('output', {
      alias: 'o',
      describe: '输出文件或目录路径',
      type: 'string'
    })
    .option('batch', {
      alias: 'b',
      describe: '批量处理模式',
      type: 'boolean',
      default: false
    })
    .option('config', {
      alias: 'c',
      describe: '配置文件路径',
      type: 'string'
    })
    .option('no-html', {
      alias: 'n',
      describe: '不保留中间HTML文件',
      type: 'boolean',
      default: false
    })
    .option('print-html', {
      alias: 'p',
      describe: '将HTML内容输出到标准输出',
      type: 'boolean',
      default: false
    })
    .option('edit-config', {
      alias: 'e',
      describe: '编辑配置文件',
      type: 'boolean',
      default: false
    })
    .help('help')
    .alias('help', 'h')
    .version('1.0.0')
    .argv;

  try {
    // 检查输入路径是否存在
    const inputPath = argv.input;
    if (!await fs.pathExists(inputPath)) {
      console.error(`输入路径不存在: ${inputPath}`);
      process.exit(1);
    }

    // 如果要编辑配置文件
    if (argv['edit-config']) {
      const ConfigUI = require('./utils/configUI');
      const configUI = new ConfigUI();
      await configUI.start(argv.config);
      return;
    }

    // 加载配置
    let config = {};
    if (argv.config) {
      const configManager = new ConfigManager();
      if (await fs.pathExists(argv.config)) {
        console.log(`从配置文件加载: ${argv.config}`);
        await configManager.loadFromYaml(argv.config);
        config = configManager.getAll();
      } else {
        console.warn(`配置文件不存在: ${argv.config}`);
      }
    }

    // 是否保留HTML文件
    const keepHtml = !argv['no-html'];

    // 确定输出路径
    const outputPath = argv.output || inputPath;

    // 创建转换器实例
    const converter = new Converter(config);

    // 执行转换
    if (argv.batch || (await fs.stat(inputPath)).isDirectory()) {
      // 批量处理
      const results = await converter.batch_convert(inputPath, outputPath, keepHtml);
      
      // 计算统计信息
      const successCount = Object.values(results).filter(v => v).length;
      const totalFiles = Object.keys(results).length;
      
      console.log(`批量处理完成。成功: ${successCount}, 失败: ${totalFiles - successCount}`);
    } else {
      // 单文件处理
      // 如果输出路径是目录，则生成默认输出文件名
      let outputFile = outputPath;
      if ((await fs.pathExists(outputPath)) && (await fs.stat(outputPath)).isDirectory()) {
        const baseName = path.basename(inputPath, path.extname(inputPath));
        outputFile = path.join(outputPath, `${baseName}.docx`);
      }
      
      // 如果只需要输出HTML
      if (argv['print-html']) {
        const htmlContent = await converter.md_to_html.convertFile(inputPath);
        console.log(htmlContent);
        return;
      }
      
      // 执行转换
      const result = await converter.convert_file(inputPath, outputFile, keepHtml);
      
      if (result.success) {
        console.log(`转换成功: ${result.outputFile}`);
      } else {
        console.error(`转换失败: ${result.message}`);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('执行过程中出错:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('全局错误:', error);
    process.exit(1);
  });
}

// 导出模块
module.exports = {
  ConfigManager,
  Converter,
  main
}; 