const Converter = require('./src/converter');
const path = require('path');

async function testDifferentTableColumns() {
    try {
        console.log('=== 测试不同列数表格的合并逻辑 ===');
        
        const converter = new Converter();
        const inputPath = path.join(__dirname, 'test_different_table_columns.md');
        const outputPath = path.join(__dirname, 'output', 'test_different_table_columns.xlsx');
        
        console.log('输入文件:', inputPath);
        console.log('输出文件:', outputPath);
        
        const result = await converter.convertFile(inputPath, outputPath);
        
        console.log('\n=== 转换结果 ===');
        console.log('不同列数表格测试完成:', {
            success: true,
            inputPath: 'test_different_table_columns.md',
            outputPath: result,
            message: 'Conversion completed successfully'
        });
        
    } catch (error) {
        console.error('测试失败:', error.message);
        console.error('错误详情:', error);
    }
}

testDifferentTableColumns();