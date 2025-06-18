# HTML转Word功能演示指南

## 功能概述

本项目提供了强大的HTML到Word文档转换功能，支持多种转换方式和丰富的配置选项。

### 核心特性

- ✅ **多种转换方式**：支持HTML文件转换和HTML内容直接转换
- ✅ **智能样式处理**：自动处理标题、段落、列表、表格、代码块等元素
- ✅ **自动目录生成**：支持自动生成目录和封面页
- ✅ **图片处理**：支持本地图片和网络图片的嵌入
- ✅ **灵活配置**：支持页面大小、边距、字体等自定义配置
- ✅ **缓存机制**：提供文件缓存以提高转换效率

## 使用方法

### 1. 基本HTML内容转换

```javascript
const { HtmlToWordConverter } = require('../src/htmlToWord/converter');
const { FileHandler } = require('../src/utils/fileHandler');

// 创建转换器实例
const converter = new HtmlToWordConverter({
    output_format: 'docx',
    cache_enabled: true,
    cache_dir: './cache'
});

// HTML内容转换
const htmlContent = `
<h1>演示文档</h1>
<p>这是一个HTML转Word的演示。</p>
<h2>功能特性</h2>
<ul>
    <li>支持标题转换</li>
    <li>支持段落和列表</li>
    <li>支持表格和图片</li>
</ul>
`;

const wordBuffer = await converter.convertHtmlContent(htmlContent, {
    generateToc: true,
    pageSize: 'A4'
});

// 保存文档
const fileHandler = new FileHandler();
await fileHandler.saveFile('./output/demo.docx', wordBuffer);
```

### 2. HTML文件转换

```javascript
// 直接转换HTML文件
await converter.convertFile(
    './input/demo.html',
    './output/demo.docx',
    {
        generateToc: true,
        tocDepth: 3,
        pageSize: 'A4',
        orientation: 'portrait'
    }
);
```

### 3. 自定义配置转换

```javascript
const customConfig = {
    // 页面设置
    pageSize: 'A4',
    orientation: 'portrait',
    margins: {
        top: 2.5,
        right: 2,
        bottom: 2.5,
        left: 2
    },
    
    // 目录设置
    generateToc: true,
    tocDepth: 3,
    
    // 字体设置
    defaultFontSize: 12,
    defaultFontName: 'Times New Roman',
    
    // 文档属性
    title: '自定义配置演示文档',
    author: 'HTML转Word转换器',
    subject: '演示文档'
};

const wordBuffer = await converter.convertHtmlContent(htmlContent, customConfig);
```

## 支持的HTML元素

### 文本元素
- `<h1>` - `<h6>`: 标题（自动生成目录）
- `<p>`: 段落
- `<strong>`, `<b>`: 粗体
- `<em>`, `<i>`: 斜体
- `<code>`: 行内代码
- `<pre>`: 代码块

### 列表元素
- `<ul>`, `<ol>`: 无序和有序列表
- `<li>`: 列表项（支持嵌套）

### 表格元素
- `<table>`: 表格
- `<thead>`, `<tbody>`: 表格头部和主体
- `<tr>`, `<td>`, `<th>`: 表格行和单元格

### 媒体元素
- `<img>`: 图片（支持本地和网络图片）

### 其他元素
- `<blockquote>`: 引用块
- `<hr>`: 水平分割线
- `<div>`: 容器（递归处理内容）

## 配置选项说明

### 页面配置
```javascript
{
    pageSize: 'A4' | 'A3' | 'A5' | 'Letter',  // 页面大小
    orientation: 'portrait' | 'landscape',     // 页面方向
    margins: {                                 // 页边距（厘米）
        top: 2.5,
        right: 2,
        bottom: 2.5,
        left: 2
    }
}
```

### 目录配置
```javascript
{
    generateToc: true,        // 是否生成目录
    tocDepth: 3,             // 目录深度（1-6）
    tocTitle: '目录'         // 目录标题
}
```

### 字体配置
```javascript
{
    defaultFontSize: 12,                    // 默认字体大小
    defaultFontName: 'Times New Roman',    // 默认字体名称
    lineSpacing: 1.15                      // 行间距
}
```

### 文档属性
```javascript
{
    title: '文档标题',
    author: '作者',
    subject: '主题',
    description: '描述'
}
```

## 演示结果

运行演示脚本后，将在 `output/` 目录下生成以下文件：

- `html_to_word_demo.docx` - 基本HTML内容转换演示
- `html_file_to_word_demo.docx` - HTML文件转换演示
- `custom_config_demo.docx` - 自定义配置转换演示

每个文档都包含：
- 自动生成的封面页
- 完整的目录结构
- 格式化的正文内容
- 适当的样式和布局

## 技术实现

### 核心组件
1. **HtmlToWordConverter**: 主转换器类
2. **Element Processors**: 各种HTML元素处理器
3. **Style Generator**: 文档样式生成器
4. **TOC Generator**: 目录生成器
5. **File Handler**: 文件处理器

### 转换流程
1. 解析HTML内容
2. 提取文档结构和元数据
3. 生成Word文档样式
4. 处理各种HTML元素
5. 生成目录和封面
6. 输出Word文档

## 性能优化

- **缓存机制**: 支持转换结果缓存
- **流式处理**: 大文件分块处理
- **内存管理**: 及时释放不需要的资源
- **异步处理**: 支持异步转换操作

## 错误处理

转换器提供完善的错误处理机制：
- 输入验证
- 文件访问错误处理
- HTML解析错误处理
- Word文档生成错误处理
- 详细的错误日志记录

## 扩展性

系统设计具有良好的扩展性：
- 可添加新的HTML元素处理器
- 可自定义文档样式
- 可扩展配置选项
- 可集成到其他系统中

---

*本演示展示了HTML转Word功能的完整能力，为用户提供了灵活、强大的文档转换解决方案。*