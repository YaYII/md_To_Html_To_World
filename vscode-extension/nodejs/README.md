# Markdown转Word转换工具

一个纯Node.js实现的Markdown到Word文档转换工具，无需Python环境。

## 功能特点

- 将Markdown文件转换为Word文档（.docx格式）
- 支持单文件和批量目录转换
- 支持保留中间HTML文件
- 完全基于Node.js，无需Python环境
- 提供命令行和API两种使用方式
- 支持自定义配置文件

## 安装

```bash
# 全局安装
npm install -g md-to-word

# 本地安装
npm install md-to-word
```

## 命令行使用

### 基本用法

```bash
# 转换单个文件
md-to-word --input example.md --output example.docx

# 批量转换目录
md-to-word --input ./markdown_folder --output ./word_folder --batch

# 使用配置文件
md-to-word --input example.md --output example.docx --config config.yaml

# 保留中间HTML文件
md-to-word --input example.md --output example.docx --no-html false
```

### 配置工具

```bash
# 启动配置界面
md-to-word-config

# 加载现有配置文件
md-to-word-config --config config.yaml

# 创建新的配置文件
md-to-word-config --create --output my-config.yaml

# 在转换过程中编辑配置
md-to-word --input example.md --edit-config
```

### 命令行选项

| 选项 | 别名 | 描述 |
|------|------|------|
| `--input` | `-i` | 输入文件或目录路径 |
| `--output` | `-o` | 输出文件或目录路径 |
| `--batch` | `-b` | 批量处理模式 |
| `--config` | `-c` | 配置文件路径 |
| `--no-html` | `-n` | 不保留中间HTML文件 |
| `--print-html` | `-p` | 将HTML内容输出到标准输出 |
| `--edit-config` | `-e` | 编辑配置文件 |
| `--help` | `-h` | 显示帮助信息 |

## API使用

```javascript
const { Converter } = require('md-to-word');

// 使用默认配置
const converter = new Converter();

// 使用配置文件
const converter = new Converter('config.yaml');

// 使用配置对象
const converter = new Converter({
  fonts: {
    default: '微软雅黑',
    code: 'Courier New'
  },
  document: {
    page_size: 'A4'
  }
});

// 转换单个文件
async function convertSingleFile() {
  const result = await converter.convert_file(
    'example.md',
    'example.docx',
    true // 保留HTML
  );
  
  if (result.success) {
    console.log(`转换成功: ${result.outputFile}`);
  } else {
    console.error(`转换失败: ${result.message}`);
  }
}

// 批量转换
async function batchConvert() {
  const results = await converter.batch_convert(
    './markdown_folder',
    './word_folder',
    false // 不保留HTML
  );
  
  const successCount = Object.values(results).filter(v => v).length;
  const totalFiles = Object.keys(results).length;
  
  console.log(`批量处理完成。成功: ${successCount}, 失败: ${totalFiles - successCount}`);
}
```

## 配置文件

配置文件使用YAML格式，包含以下主要部分：

```yaml
# 字体配置
fonts:
  default: 微软雅黑      # 正文默认字体
  code: Courier New     # 代码块字体
  headings: 微软雅黑     # 标题字体

# 大小配置（单位：磅/pt）
sizes:
  default: 12           # 正文默认字号
  code: 10              # 代码块字号
  heading1: 18          # 一级标题字号
  heading2: 16          # 二级标题字号
  heading3: 14          # 三级标题字号

# 颜色配置
colors:
  default: '#000000'    # 正文默认颜色
  headings: '#000000'   # 标题颜色
  code: '#333333'       # 代码颜色
  link: '#0563C1'       # 链接颜色

# 段落配置
paragraph:
  line_spacing: 1.5     # 行间距倍数
  space_before: 0       # 段前间距（磅）
  space_after: 6        # 段后间距（磅）
  first_line_indent: 0  # 首行缩进字符数

# 文档配置
document:
  page_size: A4         # 页面大小
  margin_top: 2.54      # 上边距（厘米）
  margin_bottom: 2.54   # 下边距（厘米）
  margin_left: 3.18     # 左边距（厘米）
  margin_right: 3.18    # 右边距（厘米）
  generate_toc: false   # 是否生成目录
```

## 许可证

MIT

## 作者

木易君 (抖音号：YI.11.13) 