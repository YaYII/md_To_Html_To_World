#!/usr/bin/env node

/**
 * @description Markdown转Word命令行工具
 */
const { main } = require('../src/index');

// 执行主函数
main().catch(error => {
  console.error('执行出错:', error);
  process.exit(1);
}); 