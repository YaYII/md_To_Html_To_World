/**
 * 测试Markdown转HTML的边界情况
 */

const MarkdownToHtml = require('./nodejs/src/markdownToHtml');

// 创建测试配置
const testConfig = {
    title: '测试文档'
};

const testCases = [
    {
        name: '正常[TOC]标记',
        content: `# 标题\n\n[TOC]\n\n## 章节`
    },
    {
        name: '带前导空格的[TOC]',
        content: `# 标题\n\n  [TOC]\n\n## 章节`
    },
    {
        name: '行内[TOC]',
        content: `# 标题\n\n这里有[TOC]在行内\n\n## 章节`
    },
    {
        name: '多个[TOC]',
        content: `# 标题\n\n[TOC]\n\n## 章节\n\n[TOC]\n\n### 子章节`
    },
    {
        name: '无[TOC]标记',
        content: `# 标题\n\n## 章节\n\n### 子章节`
    }
];

console.log('🧪 测试Markdown转HTML边界情况...');

try {
    const converter = new MarkdownToHtml(testConfig);
    
    testCases.forEach((testCase, index) => {
        console.log(`\n📋 测试 ${index + 1}: ${testCase.name}`);
        console.log('原始内容:', JSON.stringify(testCase.content));
        
        const processed = converter.processTocMarker(testCase.content);
        console.log('处理后:', JSON.stringify(processed));
        
        const hasPlaceholder = processed.includes('toc-placeholder');
        console.log('包含占位符:', hasPlaceholder);
    });
    
    console.log('\n✅ 所有测试完成');
    
} catch (error) {
    console.error('❌ 测试失败:', error.message);
} 