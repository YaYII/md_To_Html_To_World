/**
 * 测试Markdown转HTML功能
 */

const MarkdownToHtml = require('./nodejs/src/markdownToHtml');

// 创建测试配置
const testConfig = {
    title: '测试文档'
};

// 测试内容
const testMarkdown = `# 测试文档

这是一个测试文档。

[TOC]

## 第一章
这是第一章的内容。

### 1.1 子章节
子章节内容。

## 第二章  
第二章内容。
`;

console.log('🧪 测试Markdown转HTML功能...');
console.log('原始Markdown内容:');
console.log('---');
console.log(testMarkdown);
console.log('---');

try {
    const converter = new MarkdownToHtml(testConfig);
    
    console.log('\n处理[TOC]标记后的内容:');
    const processedContent = converter.processTocMarker(testMarkdown);
    console.log('---');
    console.log(processedContent);
    console.log('---');
    
    console.log('\n最终HTML结果:');
    const htmlResult = converter.convertString(testMarkdown);
    console.log('---');
    console.log(htmlResult);
    console.log('---');
    
    console.log('✅ 转换成功');
    
} catch (error) {
    console.error('❌ 转换失败:', error.message);
    console.error('完整错误:', error);
} 