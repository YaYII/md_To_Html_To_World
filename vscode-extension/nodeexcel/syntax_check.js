// 语法检查脚本
try {
    const HtmlToExcelConverter = require('./src/htmlToExcel/htmlToExcelConverter.js');
    console.log('✓ htmlToExcelConverter.js 语法检查通过');
    
    const config = require('./src/config/excelConfig.js');
    console.log('✓ excelConfig.js 语法检查通过');
    
    // 尝试创建实例
    const converter = new HtmlToExcelConverter(config);
    console.log('✓ 转换器实例创建成功');
    
    console.log('\n所有语法检查通过，可以进行测试');
} catch (error) {
    console.error('语法错误:', error.message);
    console.error('错误位置:', error.stack);
    process.exit(1);
}