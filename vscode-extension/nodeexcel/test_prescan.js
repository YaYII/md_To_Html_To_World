const Converter = require('./src/converter');
const path = require('path');

async function testPrescan() {
    try {
        console.log('=== 测试预扫描功能 ===');
        
        const converter = new Converter();
        const inputPath = path.join(__dirname, 'test_prescan.md');
        const outputPath = path.join(__dirname, 'output', 'test_prescan.xlsx');
        
        console.log('输入文件:', inputPath);
        console.log('输出文件:', outputPath);
        
        const result = await converter.convertFile(inputPath, outputPath);
        
        console.log('\n=== 转换结果 ===');
        console.log('预扫描测试完成:', {
            success: true,
            inputPath: 'test_prescan.md',
            outputPath: result,
            message: 'Conversion completed successfully'
        });
        
    } catch (error) {
        console.error('测试失败:', error.message);
        console.error('错误详情:', error);
    }
}

testPrescan();