const Converter = require('./src/converter.js');
const fs = require('fs');

async function testTableWidth() {
    try {
        // 创建包含表格的测试内容
        const testContent = `# 表格列宽测试

这是一个测试表格的列宽计算：

| 短列 | 中等长度的列标题 | 这是一个非常长的列标题用来测试列宽计算 |
|------|------------------|----------------------------------------|
| A    | 中等内容         | 这里是很长的内容，用来测试列宽是否会根据内容自动调整 |
| B    | 短内容           | 长内容测试 |

表格结束。
`;

        // 写入测试文件
        fs.writeFileSync('test_table_width.md', testContent);
        
        console.log('开始表格列宽测试...');
        
        const converter = new Converter();
        await converter.initialize();
        
        const result = await converter.convertFile('test_table_width.md', 'output/test_table_width.xlsx');
        console.log('表格列宽测试完成:', result);
        
    } catch (error) {
        console.error('测试错误:', error);
    }
}

testTableWidth();