/**
 * 测试不生成封面页的情况
 */

const NodeJsConverter = require('./nodejs/src/converter');

// 创建测试配置（不生成封面）
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
        toc_depth: 3,
        // 关闭封面页生成
        generate_cover: false
    }
};

// 测试Markdown内容
const testMarkdown = `# 简单文档

这是一个不需要封面页的简单文档。

[TOC]

## 第一章

第一章内容。

### 1.1 子章节

子章节内容。

## 第二章

第二章内容。
`;

console.log('🧪 测试不生成封面页的情况...');

async function testNoCover() {
    try {
        const fs = require('fs-extra');
        const inputFile = 'test_no_cover.md';
        const outputFile = 'test_no_cover_output.docx';
        
        await fs.writeFile(inputFile, testMarkdown, 'utf-8');
        console.log('✅ 临时Markdown文件已创建');
        
        const converter = new NodeJsConverter(testConfig);
        const result = await converter.convert_file(inputFile, outputFile, false);
        
        if (result.success) {
            console.log('✅ 无封面页文档生成成功!');
            console.log('输出文件:', result.outputFile);
            console.log('📖 文档结构: 第1页目录 → 第2页开始正文');
        } else {
            console.log('❌ 转换失败:', result.message);
        }
        
        await fs.remove(inputFile);
        console.log('🗑️ 临时文件已清理');
        
    } catch (error) {
        console.error('❌ 测试过程中出错:', error.message);
    }
}

testNoCover(); 