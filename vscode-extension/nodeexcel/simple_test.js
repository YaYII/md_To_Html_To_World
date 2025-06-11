const fs = require('fs');
const path = require('path');

// 简单测试：直接运行转换器的主要方法
async function simpleTest() {
    try {
        console.log('开始简单测试...');
        
        // 读取HTML文件
        const htmlPath = '/Users/yingyang/Documents/project/python/md_To_Html_To_World/vscode-extension/nodeexcel/test.html';
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        console.log('✓ HTML文件读取成功');
        
        // 动态导入转换器
        const HtmlToExcelConverter = require('./src/htmlToExcel/htmlToExcelConverter.js');
        const config = require('./src/config/excelConfig.js');
        
        console.log('✓ 模块加载成功');
        
        // 创建转换器实例
        const converter = new HtmlToExcelConverter(config);
        console.log('✓ 转换器实例创建成功');
        
        // 执行转换
        const outputPath = '/Users/yingyang/Documents/project/python/md_To_Html_To_World/vscode-extension/nodeexcel/simple_test_output.xlsx';
        await converter.convertHtmlToExcel(htmlContent, outputPath);
        console.log(`✓ 转换完成，输出文件: ${outputPath}`);
        
        // 检查文件是否生成
        if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            console.log(`✓ 文件生成成功，大小: ${stats.size} 字节`);
        } else {
            console.log('✗ 文件未生成');
        }
        
    } catch (error) {
        console.error('测试失败:', error.message);
        console.error('错误堆栈:', error.stack);
    }
}

simpleTest();