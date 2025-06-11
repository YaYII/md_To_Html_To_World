const Converter = require('./src/converter');
const path = require('path');

async function testHeadingMerge() {
    try {
        console.log('=== 标题合并测试开始 ===');
        
        const converter = new Converter();
        await converter.initialize();
        
        const inputPath = 'test_heading_merge.md';
        const outputPath = 'output/test_heading_merge.xlsx';
        
        console.log(`输入文件: ${inputPath}`);
        console.log(`输出文件: ${outputPath}`);
        
        const result = await converter.convertFile(inputPath, outputPath);
        
        console.log('=== 转换结果 ===');
        console.log('标题合并测试完成:', result);
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testHeadingMerge();