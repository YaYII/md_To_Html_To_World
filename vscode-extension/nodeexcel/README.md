# Markdown to Excel Converter

一个强大的 Markdown 到 Excel 转换器，支持智能内容映射、样式配置和批量处理。

## 🚀 特性

### 核心功能
- **智能内容映射**: 自动识别并转换 Markdown 元素（标题、段落、列表、代码块、引用、表格）
- **多工作表支持**: 可按标题层级或内容类型分割为多个工作表
- **样式配置**: 丰富的样式选项，支持字体、颜色、边框等自定义
- **表格处理**: 智能处理 Markdown 表格，支持独立工作表或内联引用
- **批量转换**: 支持单文件和批量文件转换

### 高级特性
- **配置管理**: 交互式配置工具，支持多配置文件管理
- **命令行接口**: 完整的 CLI 工具，支持脚本化操作
- **模块化设计**: 清晰的架构，易于扩展和维护
- **错误处理**: 完善的错误处理和日志记录

## 📦 安装

### 作为 Node.js 模块

```bash
# 克隆项目
git clone <repository-url>
cd nodeexcel

# 安装依赖
npm install

# 全局安装（可选）
npm install -g .
```

### 作为 VS Code 扩展的一部分

此模块设计为 VS Code 扩展的组件，通过扩展主项目使用。

## 🛠️ 使用方法

### 命令行使用

#### 基本转换

```bash
# 转换单个文件
node bin/cli.js convert input.md

# 指定输出路径
node bin/cli.js convert input.md -o output.xlsx

# 使用配置文件
node bin/cli.js convert input.md -c my-config.yaml
```

#### 批量转换

```bash
# 转换目录中的所有 Markdown 文件
node bin/cli.js batch ./docs

# 使用通配符
node bin/cli.js batch "./docs/**/*.md"

# 指定输出目录
node bin/cli.js batch ./docs -o ./output
```

#### 配置管理

```bash
# 启动交互式配置工具
node bin/config.js

# 或使用 CLI 配置命令
node bin/cli.js config create
node bin/cli.js config show
```

### 编程接口

#### 基本使用

```javascript
const { Converter, ExcelConfig } = require('./src/index');

// 创建转换器实例
const converter = new Converter();

// 转换单个文件
await converter.convertFile('input.md', 'output.xlsx');

// 转换字符串
const markdownContent = '# Hello\n\nThis is a test.';
const result = await converter.convertString(markdownContent, 'output.xlsx');
```

#### 自定义配置

```javascript
const { Converter, ExcelConfig } = require('./src/index');

// 创建自定义配置
const config = new ExcelConfig({
    worksheet: {
        name: 'MyContent',
        splitByHeaders: true
    },
    styles: {
        header: {
            font: { bold: true, size: 14 },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
        }
    }
});

// 使用自定义配置
const converter = new Converter(config);
await converter.convertFile('input.md', 'output.xlsx');
```

#### 批量处理

```javascript
const { Converter } = require('./src/index');

const converter = new Converter();

// 批量转换
const results = await converter.convertBatch([
    'doc1.md',
    'doc2.md',
    'doc3.md'
], './output');

console.log(`Converted ${results.length} files`);
```

## ⚙️ 配置选项

### 基础配置

```yaml
# 输出设置
outputPath: "./output"
filename: "converted"
overwriteExisting: true

# 工作表设置
worksheet:
  name: "Content"
  splitByHeaders: false
  maxRowsPerSheet: 1000000

# 列宽设置
columnWidths:
  content: 50
  type: 15
  level: 10
```

### 内容映射

```yaml
contentMapping:
  includeType: true      # 包含内容类型列
  includeLevel: true     # 包含标题层级列
  includeContent: true   # 包含内容列
  preserveFormatting: true  # 保留格式
  maxCellLength: 32767   # 最大单元格长度
```

### 样式配置

```yaml
styles:
  header:
    font:
      bold: true
      size: 12
      color: { argb: "FFFFFFFF" }
    fill:
      type: "pattern"
      pattern: "solid"
      fgColor: { argb: "FF4472C4" }
    border:
      top: { style: "thin" }
      bottom: { style: "thin" }
      left: { style: "thin" }
      right: { style: "thin" }
```

### 表格处理

```yaml
tableHandling:
  separateTableSheets: false  # 为表格创建独立工作表
  tableSheetPrefix: "Table_"  # 表格工作表前缀
  includeTableReferences: true # 在主工作表中包含表格引用
```

## 📊 输出格式

转换后的 Excel 文件包含以下列：

| 列名 | 描述 | 示例 |
|------|------|------|
| Type | 内容类型 | heading, paragraph, list, code, quote, table |
| Level | 标题层级 | 1, 2, 3, 4, 5, 6 |
| Content | 实际内容 | 标题文本、段落内容等 |
| Source | 源文件信息 | 文件名、行号等 |

### 内容类型说明

- **heading**: 标题（H1-H6）
- **paragraph**: 普通段落
- **list**: 列表项（有序/无序）
- **code**: 代码块
- **quote**: 引用块
- **table**: 表格
- **table_ref**: 表格引用（当使用独立表格工作表时）

## 🔧 开发

### 项目结构

```
nodeexcel/
├── src/
│   ├── config/
│   │   └── excelConfig.js          # 配置管理
│   ├── markdownToHtml/
│   │   └── markdownToHtml.js       # Markdown 到 HTML 转换
│   ├── htmlToExcel/
│   │   └── htmlToExcelConverter.js # HTML 到 Excel 转换
│   ├── converter.js                # 主转换器
│   └── index.js                    # 模块入口
├── bin/
│   ├── cli.js                      # 命令行接口
│   └── config.js                   # 配置管理工具
├── package.json
└── README.md
```

### 运行测试

```bash
# 运行基本测试
node bin/cli.js info

# 测试转换功能
echo "# Test\n\nThis is a test." > test.md
node bin/cli.js convert test.md
```

### 调试模式

```bash
# 启用详细输出
node bin/cli.js convert input.md --verbose

# 启用调试模式
DEBUG=md-to-excel:* node bin/cli.js convert input.md
```

## 🤝 集成

### VS Code 扩展集成

此模块设计为与 VS Code 扩展无缝集成：

```javascript
// 在 VS Code 扩展中使用
const { createConverter } = require('./nodeexcel/src/index');

const converter = createConverter();
const result = await converter.convertFile(inputPath, outputPath);
```

### API 集成

```javascript
// Express.js 示例
const express = require('express');
const { Converter } = require('./nodeexcel/src/index');

const app = express();
const converter = new Converter();

app.post('/convert', async (req, res) => {
    try {
        const result = await converter.convertString(req.body.markdown);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

## 📝 配置文件示例

### 基础配置 (basic.yaml)

```yaml
outputPath: "./output"
filename: "document"
worksheet:
  name: "Content"
  splitByHeaders: false
contentMapping:
  includeType: true
  includeLevel: true
  includeContent: true
styles:
  header:
    font: { bold: true, size: 12 }
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } }
```

### 高级配置 (advanced.yaml)

```yaml
outputPath: "./reports"
filename: "analysis"
worksheet:
  name: "Analysis"
  splitByHeaders: true
  maxRowsPerSheet: 50000
contentMapping:
  includeType: true
  includeLevel: true
  includeContent: true
  preserveFormatting: true
  maxCellLength: 10000
tableHandling:
  separateTableSheets: true
  tableSheetPrefix: "Data_"
  includeTableReferences: true
styles:
  header:
    font: { bold: true, size: 14, color: { argb: "FFFFFFFF" } }
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F5597" } }
    border:
      top: { style: "medium" }
      bottom: { style: "medium" }
  content:
    font: { size: 11 }
    alignment: { wrapText: true, vertical: "top" }
```

## 🐛 故障排除

### 常见问题

1. **文件权限错误**
   ```bash
   # 检查文件权限
   ls -la input.md
   
   # 修改权限
   chmod 644 input.md
   ```

2. **内存不足**
   ```bash
   # 增加 Node.js 内存限制
   node --max-old-space-size=4096 bin/cli.js convert large-file.md
   ```

3. **配置文件错误**
   ```bash
   # 验证配置文件
   node -e "console.log(require('js-yaml').load(require('fs').readFileSync('config.yaml', 'utf8')))"
   ```

### 调试信息

```bash
# 获取详细信息
node bin/cli.js info

# 检查配置
node bin/cli.js config show

# 测试转换
node bin/cli.js convert --dry-run input.md
```

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📞 支持

如有问题或建议，请：

- 提交 [GitHub Issue](https://github.com/your-repo/issues)
- 发送邮件至 your-email@example.com
- 查看 [文档](https://your-docs-url.com)

---

**Made with ❤️ for the Markdown community**