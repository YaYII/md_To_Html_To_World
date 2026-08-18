# Word 转 Markdown 功能测试说明

## 功能概述

现在 VS Code 插件已经成功集成了 Word 转 Markdown 的功能，基于 WorldToMD 项目实现。

## 新增功能

### 1. 单个文件转换
- **命令**: `markdowntoword.word-to-markdown.convert`
- **标题**: "转换为Markdown"
- **使用方式**: 
  - 右键点击 `.docx` 文件 → "转换为Markdown"
  - 命令面板中搜索 "转换为Markdown"

### 2. 批量转换
- **命令**: `markdowntoword.word-to-markdown.batchConvert`
- **标题**: "批量转换Word为Markdown"
- **使用方式**:
  - 右键点击文件夹 → "批量转换Word为Markdown"
  - 命令面板中搜索 "批量转换Word为Markdown"

## 技术实现

### 架构设计
- 直接使用 WorldToMD 项目的 `index.js` 作为转换引擎
- 在 `CommandService` 中添加了 `IWordToMarkdownConverter` 接口定义
- 实现了完整的错误处理和用户交互

### 转换流程
1. **单个文件转换**:
   - 文件类型验证（仅支持 .docx 文件）
   - 输出目录选择（同目录或自定义目录）
   - 调用 WorldToMD API 进行转换
   - 提供打开文件或显示文件夹选项

2. **批量转换**:
   - 目录扫描和验证
   - 输出方式选择（同目录或统一目录）
   - 批量处理所有 Word 文档
   - 详细的转换结果报告

### 用户体验
- 进度提示和状态反馈
- 友好的错误信息
- 转换完成后的快捷操作
- 详细的批量转换结果展示

## 配置选项

转换器使用以下默认配置：
```javascript
{
    preserveImages: true,      // 保留图片
    preserveTables: true,      // 保留表格
    preserveFormatting: true,  // 保留格式
    verbose: false            // 非详细模式
}
```

## 测试建议

1. 准备一个包含文本、图片、表格的 Word 文档
2. 测试单个文件转换功能
3. 创建包含多个 Word 文档的文件夹
4. 测试批量转换功能
5. 验证转换结果的质量和完整性

## 注意事项

- 目前仅支持 `.docx` 格式的 Word 文档
- 转换过程中会生成临时的 HTML 文件用于调试
- 图片会被提取并保存到相应目录
- 复杂的格式可能需要手动调整