/**
 * 测试大小写不敏感的TOC标记
 */

const MarkdownToHtml = require('./nodejs/src/markdownToHtml');

const testConfig = { title: '测试文档' };

const testCases = [
    '[TOC]',
    '[toc]', 
    '[Toc]',
    '[toC]',
    '  [TOC]  ',
    '\t[toc]\t'
];

console.log('🧪 测试大小写不敏感的[TOC]标记...');

const converter = new MarkdownToHtml(testConfig);

testCases.forEach((tocCase, index) => {
    const content = `# 标题\n\n${tocCase}\n\n## 章节`;
    console.log(`\n📋 测试 ${index + 1}: "${tocCase}"`);
    
    const processed = converter.processTocMarker(content);
    const hasPlaceholder = processed.includes('toc-placeholder');
    console.log('包含占位符:', hasPlaceholder);
});

console.log('\n✅ 测试完成'); 