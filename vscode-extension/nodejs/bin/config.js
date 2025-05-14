#!/usr/bin/env node

/**
 * @description 配置命令行工具
 * 用于启动配置界面
 */
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const ConfigUI = require('../src/utils/configUI');

/**
 * @function main
 * @description 主函数
 */
async function main() {
  // 解析命令行参数
  const argv = yargs(hideBin(process.argv))
    .usage('使用方法: $0 [options]')
    .option('config', {
      alias: 'c',
      describe: '配置文件路径',
      type: 'string'
    })
    .option('create', {
      alias: 'n',
      describe: '创建新的配置文件',
      type: 'boolean',
      default: false
    })
    .option('output', {
      alias: 'o',
      describe: '新配置文件的输出路径',
      type: 'string',
      default: path.join(process.cwd(), 'config.yaml')
    })
    .help('help')
    .alias('help', 'h')
    .version('1.0.0')
    .argv;

  try {
    // 创建配置UI实例
    const configUI = new ConfigUI();
    
    // 如果指定了创建新配置
    if (argv.create) {
      const ConfigManager = require('../src/utils/configManager');
      const configManager = new ConfigManager();
      
      console.log(`正在创建新的配置文件: ${argv.output}`);
      const success = await configManager.createDefaultConfig(argv.output);
      
      if (success) {
        console.log(`配置文件已创建: ${argv.output}`);
        console.log('现在启动配置界面...');
        await configUI.start(argv.output);
      } else {
        console.error('创建配置文件失败');
        process.exit(1);
      }
    } else {
      // 启动配置界面
      await configUI.start(argv.config);
    }
  } catch (error) {
    console.error('配置工具运行出错:', error);
    process.exit(1);
  }
}

// 执行主函数
main().catch(error => {
  console.error('全局错误:', error);
  process.exit(1);
}); 