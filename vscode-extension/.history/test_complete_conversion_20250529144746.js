/**
 * 测试完整的Markdown到Word转换流程
 */

const NodeJsConverter = require('./nodejs/src/converter');

// 创建测试配置
const testConfig = {
    fonts: {
        default: '微软雅黑',
        headings: '微软雅黑'
    },
    sizes: {
        default: 12,
        heading1: 18,
        heading2: 16
    },
    document: {
        generate_toc: true,
        toc_depth: 3
    }
};

// 测试Markdown内容（包含各种TOC变体）
const testMarkdown = `# 测试文档

这是一个测试文档，用来验证改进后的[TOC]功能。

  [toc]

## 第一章：基础功能

这是第一章的内容。

### 1.1 子章节

子章节内容。

## 第二章：高级功能

这是第二章的内容。

### 2.1 复杂功能

复杂功能描述。

### 2.2 其他功能

其他功能说明。

## 结论

这是文档的结论部分。
`;

console.log('🧪 测试完整的转换流程...');

async function testCompleteConversion() {
    try {
        // 创建临时Markdown文件
        const fs = require('fs-extra');
        const inputFile = 'test_complete.md';
        const outputFile = 'test_complete_output.docx';
        
        await fs.writeFile(inputFile, testMarkdown, 'utf-8');
        console.log('✅ 临时Markdown文件已创建');
        
        // 执行转换
        const converter = new NodeJsConverter(testConfig);
        const result = await converter.convert_file(inputFile, outputFile, false);
        
        if (result.success) {
            console.log('✅ 完整转换成功!');
            console.log('输出文件:', result.outputFile);
        } else {
            console.log('❌ 转换失败:', result.message);
        }
        
        // 清理临时文件
        await fs.remove(inputFile);
        console.log('🗑️ 临时文件已清理');
        
    } catch (error) {
        console.error('❌ 测试过程中出错:', error.message);
    }
}

testCompleteConversion(); 