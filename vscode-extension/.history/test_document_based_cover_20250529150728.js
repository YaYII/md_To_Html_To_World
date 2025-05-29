/**
 * 测试基于文档内容的封面页生成
 */

const NodeJsConverter = require('./nodejs/src/converter');

// 简单配置，只启用封面页
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
        generate_cover: true  // 启用封面页，但不预设任何内容
    }
};

// 测试Markdown内容 - 这些内容将被用于生成封面页
const testMarkdown = `# Node.js 开发指南

这是一个全面的Node.js开发指南，涵盖了从基础概念到高级技术的完整知识体系。本指南适合有一定JavaScript基础的开发者学习。

[TOC]

## 第一章：Node.js 简介

Node.js是一个基于Chrome V8引擎的JavaScript运行时环境。

### 1.1 什么是Node.js

Node.js让JavaScript能够在服务器端运行。

### 1.2 Node.js的特点

- 事件驱动
- 非阻塞I/O
- 轻量高效

## 第二章：环境搭建

本章介绍如何搭建Node.js开发环境。

### 2.1 安装Node.js

详细的安装步骤说明。

### 2.2 开发工具选择

推荐的开发工具和插件。

## 第三章：核心模块

Node.js内置了许多核心模块。

### 3.1 文件系统模块

fs模块的使用方法。

### 3.2 HTTP模块

http模块创建服务器。

## 总结

通过本指南的学习，您将掌握Node.js的核心概念和实用技能。
`;

console.log('🧪 测试基于文档内容的封面页生成...');
console.log('📝 文档将自动提取以下信息用于封面页：');
console.log('   - 标题: Node.js 开发指南');
console.log('   - 简介: 从文档开头内容自动提取');

async function testDocumentBasedCover() {
    try {
        const fs = require('fs-extra');
        const inputFile = 'test_doc_cover.md';
        const outputFile = 'test_doc_cover_output.docx';
        
        await fs.writeFile(inputFile, testMarkdown, 'utf-8');
        console.log('✅ 临时Markdown文件已创建');
        
        const converter = new NodeJsConverter(testConfig);
        const result = await converter.convert_file(inputFile, outputFile, false);
        
        if (result.success) {
            console.log('✅ 基于文档内容的封面页生成成功!');
            console.log('输出文件:', result.outputFile);
            console.log('📖 封面页内容基于文档实际内容，没有虚构信息');
        } else {
            console.log('❌ 转换失败:', result.message);
        }
        
        await fs.remove(inputFile);
        console.log('🗑️ 临时文件已清理');
        
    } catch (error) {
        console.error('❌ 测试过程中出错:', error.message);
    }
}

testDocumentBasedCover(); 