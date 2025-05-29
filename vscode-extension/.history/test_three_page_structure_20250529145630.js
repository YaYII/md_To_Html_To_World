/**
 * 测试三页文档结构：封面页 + 目录 + 正文
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
        toc_depth: 3,
        // 封面页配置
        generate_cover: true,
        cover_title: '项目技术文档',
        cover_version: 'v2.1.0',
        cover_author: '技术团队',
        cover_date: '2024年5月',
        cover_description: '这是一个演示三页结构的技术文档示例'
    },
    title: '项目技术文档',
    creator: '技术团队'
};

// 测试Markdown内容
const testMarkdown = `# 项目技术文档

欢迎阅读本技术文档。本文档详细介绍了项目的各个方面。

[TOC]

## 1. 项目概述

本项目是一个综合性的技术解决方案。

### 1.1 项目目标

我们的主要目标是提供高质量的技术服务。

### 1.2 技术栈

- Node.js
- TypeScript  
- VS Code Extension API

## 2. 架构设计

系统采用模块化架构设计。

### 2.1 核心模块

核心模块负责主要业务逻辑。

### 2.2 扩展模块

扩展模块提供额外功能支持。

## 3. 实现细节

### 3.1 关键技术

使用了多种关键技术来实现功能。

### 3.2 性能优化

通过多种手段进行了性能优化。

## 4. 部署指南

### 4.1 环境要求

系统运行的基本环境要求。

### 4.2 安装步骤

详细的安装配置步骤。

## 5. 总结

本文档介绍了项目的完整实现方案。
`;

console.log('🧪 测试三页文档结构...');
console.log('配置信息:', {
    generate_toc: testConfig.document.generate_toc,
    generate_cover: testConfig.document.generate_cover,
    cover_title: testConfig.document.cover_title,
    cover_version: testConfig.document.cover_version
});

async function testThreePageStructure() {
    try {
        // 创建临时Markdown文件
        const fs = require('fs-extra');
        const inputFile = 'test_three_page.md';
        const outputFile = 'test_three_page_output.docx';
        
        await fs.writeFile(inputFile, testMarkdown, 'utf-8');
        console.log('✅ 临时Markdown文件已创建');
        
        // 执行转换
        const converter = new NodeJsConverter(testConfig);
        const result = await converter.convert_file(inputFile, outputFile, false);
        
        if (result.success) {
            console.log('✅ 三页结构文档生成成功!');
            console.log('输出文件:', result.outputFile);
            console.log('📖 文档结构: 第1页封面 → 第2页目录 → 第3页开始正文');
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

testThreePageStructure(); 