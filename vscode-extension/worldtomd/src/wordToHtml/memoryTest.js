/**
 * 内存预处理器测试脚本
 * 演示如何使用内存预处理功能
 */

const MemoryPreprocessor = require('./memoryPreprocessor');
const LargeFileWordToHtmlConverter = require('./largefileconverter');
const path = require('path');

/**
 * 测试内存预处理器基本功能
 */
async function testMemoryPreprocessor() {
  console.log('🧪 开始测试内存预处理器...');
  
  // 创建内存预处理器实例
  const memoryPreprocessor = new MemoryPreprocessor({
    enableDetailedLogging: true,
    enableAutoGC: true,
    gcInterval: 2000, // 2秒间隔
    memoryWarningThreshold: 0.6, // 60%警告
    memoryCriticalThreshold: 0.8 // 80%危险
  });
  
  try {
    // 1. 获取初始内存状态
    console.log('\n📊 初始内存状态:');
    const initialStats = memoryPreprocessor.getMemoryStats();
    console.log(`   当前内存: ${(initialStats.currentMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   内存使用率: ${(initialStats.memoryRatio * 100).toFixed(1)}%`);
    
    // 2. 模拟内存使用
    console.log('\n🔄 模拟内存使用...');
    const largeArray = [];
    for (let i = 0; i < 100000; i++) {
      largeArray.push(new Array(1000).fill('test data'));
    }
    
    // 3. 注册缓存
    memoryPreprocessor.registerCache('test-cache-1', largeArray.slice(0, 10000));
    memoryPreprocessor.registerCache('test-cache-2', 'Large string data '.repeat(50000));
    
    // 4. 检查内存状态
    console.log('\n📊 使用内存后状态:');
    const afterStats = memoryPreprocessor.getMemoryStats();
    console.log(`   当前内存: ${(afterStats.currentMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   内存使用率: ${(afterStats.memoryRatio * 100).toFixed(1)}%`);
    
    // 5. 手动触发垃圾回收
    console.log('\n🧹 手动触发垃圾回收...');
    memoryPreprocessor.forceGarbageCollection('测试触发');
    
    // 6. 等待自动内存检查
    console.log('\n⏳ 等待自动内存检查...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 7. 清理缓存
    console.log('\n🗑️  清理所有缓存...');
    memoryPreprocessor.clearAllCaches();
    
    // 8. 最终内存状态
    console.log('\n📊 最终内存状态:');
    const finalStats = memoryPreprocessor.getMemoryStats();
    console.log(`   当前内存: ${(finalStats.currentMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   峰值内存: ${(finalStats.peakMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   垃圾回收次数: ${finalStats.gcCount}`);
    console.log(`   缓存清理次数: ${finalStats.cacheClears}`);
    
  } finally {
    // 销毁预处理器
    memoryPreprocessor.destroy();
    console.log('\n✅ 内存预处理器测试完成');
  }
}

/**
 * 测试文档转换前预处理
 */
async function testDocumentPreprocessing() {
  console.log('\n🧪 开始测试文档转换前预处理...');
  
  const memoryPreprocessor = new MemoryPreprocessor({
    enableDetailedLogging: true,
    memoryWarningThreshold: 0.5,
    memoryCriticalThreshold: 0.7
  });
  
  try {
    // 模拟文档文件路径（可以是不存在的文件用于测试）
    const testFilePath = './test-document.docx';
    
    // 执行预处理
    const report = await memoryPreprocessor.preprocessBeforeConversion(testFilePath);
    
    console.log('\n📋 预处理报告:');
    console.log(JSON.stringify(report, null, 2));
    
  } catch (error) {
    console.log(`预处理测试完成（预期的文件不存在错误）: ${error.message}`);
  } finally {
    memoryPreprocessor.destroy();
  }
}

/**
 * 测试集成的大文件转换器
 */
async function testIntegratedConverter() {
  console.log('\n🧪 开始测试集成的大文件转换器...');
  
  const converter = new LargeFileWordToHtmlConverter({
    enableMemoryPreprocessing: true,
    enableMemoryMonitoring: true,
    memoryPreprocessorOptions: {
      enableDetailedLogging: true,
      memoryWarningThreshold: 0.6,
      memoryCriticalThreshold: 0.8
    }
  });
  
  console.log('✅ 大文件转换器已创建，内存预处理功能已启用');
  console.log('💡 要测试实际转换，请调用 converter.convertLargeFileToHtml(filePath)');
  
  // 显示内存预处理器状态
  if (converter.memoryPreprocessor) {
    const stats = converter.memoryPreprocessor.getMemoryStats();
    console.log(`📊 当前内存状态: ${(stats.currentMemory / 1024 / 1024).toFixed(2)}MB`);
  }
}

/**
 * 主测试函数
 */
async function runAllTests() {
  console.log('🚀 开始内存预处理系统测试');
  console.log('=' * 50);
  
  try {
    // 检查是否启用了垃圾回收
    if (!global.gc) {
      console.warn('⚠️  垃圾回收未启用，请使用 --expose-gc 参数启动 Node.js');
      console.warn('   示例: node --expose-gc memoryTest.js');
    }
    
    await testMemoryPreprocessor();
    await testDocumentPreprocessing();
    await testIntegratedConverter();
    
    console.log('\n🎉 所有测试完成！');
    
  } catch (error) {
    console.error(`❌ 测试失败: ${error.message}`);
    console.error(error.stack);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testMemoryPreprocessor,
  testDocumentPreprocessing,
  testIntegratedConverter,
  runAllTests
};