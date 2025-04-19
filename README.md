# World MD

一个功能强大的Markdown转Word文档转换工具，支持完整的Markdown语法，并提供美观的格式化输出。

## 项目概述

World MD是一个专为需要将Markdown文件转换为格式化Word文档的用户设计的工具。它支持丰富的Markdown语法特性，可以保留文档的格式和结构，并提供良好的中文支持。

### 核心功能

- **完整Markdown语法支持**：支持标题、段落、列表（有序和无序）、表格、代码块、引用、加粗、斜体等Markdown元素
- **格式保留**：转换后的Word文档保留原始Markdown的格式和结构
- **批量转换**：支持将整个目录的Markdown文件一次性转换为Word文档
- **中文支持**：默认支持简繁中文转换，可选择保持简体中文
- **自定义样式**：允许通过配置文件自定义文档样式和格式
- **增强的表格处理**：支持表格内容垂直居中、自动行高调整、表头样式设置
- **美观的代码块**：代码使用黑底白字显示，提供类似IDE的代码展示效果

## 技术架构

项目采用模块化设计，主要包含以下组件：

- **核心转换器**：负责将Markdown解析为HTML，然后转换为Word文档格式
- **格式处理器**：处理各种特殊格式，如列表、表格、代码块等
- **样式管理器**：管理文档的样式和格式
- **CLI工具**：提供命令行界面，方便用户使用

### 依赖库

- `python-docx`: Word文档处理
- `markdown`: Markdown解析
- `beautifulsoup4`: HTML解析
- `opencc-python-reimplemented`: 简繁中文转换
- `pyyaml`: 配置文件支持

## 安装方法

### 从PyPI安装

```bash
pip install world-md
```

### 从源码安装

```bash
git clone https://github.com/yourusername/world_md.git
cd world_md
pip install -e .
```

## 使用指南

### 基本用法

#### 单文件转换

```bash
world-md --input example.md --output example.docx
```

#### 批量转换

```bash
world-md --batch --input ./md --output ./world
```

#### 使用配置文件

```bash
world-md --input example.md --output example.docx --config custom_config.yaml
```

#### 保持简体中文

```bash
world-md --input example.md --output example.docx --simplified
```

### 高级用法

#### 直接使用Python API

```python
from world_md import convert_md_to_word

convert_md_to_word('path/to/input.md', 'path/to/output.docx')
```

#### 自定义转换选项

可以通过配置文件自定义转换选项，包括字体、大小、颜色等：

```yaml
fonts:
  default: "蒙纳宋体"
  code: "Courier New"
  headings: "黑体"
  
sizes:
  default: 12
  code: 10
  heading1: 16
  heading2: 14
  heading3: 12
  
colors:
  default: "#000000"
  headings: "#333333"
  code: "#666666"
  
convert_to_traditional: false

# 增强表格样式设置
enhanced_table_styles:
  style: 'Table Grid'            # Word表格样式名称
  border_style: 'single'         # 边框样式: single, double, thick等
  border_size: 1                 # 边框宽度（磅）
  border_color: '#000000'        # 边框颜色
  header_bg_color: '#E7E6E6'     # 表头背景色
  even_row_color: '#F2F2F2'      # 偶数行背景色
  text_align: 'left'             # 单元格文本对齐方式
  vertical_align: 'center'       # 单元格垂直对齐方式
  row_height:                    # 行高配置
    default: 0.95                # 默认行高（厘米）
    header: 1.1                  # 表头行高（厘米）
    min: 0.5                     # 最小行高（厘米）
    max: 5.0                     # 最大行高（厘米）
    auto_adjust: true            # 自动调整行高
```

### 配置文件使用说明

程序会按照以下顺序查找配置文件：

1. 命令行参数 `--config` 指定的配置文件
2. 当前工作目录下的 `config_example.yaml` 文件
3. `src` 目录下的 `config_example.yaml` 文件
4. 程序可执行文件所在目录下的 `config_example.yaml` 文件

如果没有找到任何配置文件，将使用内置默认配置。

如果需要创建自己的配置文件，可以运行以下命令导出默认配置：

```bash
python export_config.py
```

然后编辑生成的 `config_example.yaml` 文件，修改所需的配置项。

## 特性支持

### Markdown元素支持

| 元素 | 支持状态 | 说明 |
|------|----------|------|
| 标题 | ✅ | 支持1-6级标题 |
| 段落 | ✅ | 完全支持 |
| 加粗 | ✅ | 使用**文本**格式 |
| 斜体 | ✅ | 使用*文本*格式 |
| 代码 | ✅ | 行内和块级代码，黑底白字显示 |
| 链接 | ✅ | 转换为Word超链接 |
| 列表 | ✅ | 有序和无序列表，支持嵌套 |
| 表格 | ✅ | 完全支持，内容垂直居中，自动行高 |
| 引用 | ✅ | 支持嵌套引用 |
| 图片 | ⚠️ | 基本支持，但可能需要调整大小 |

### 增强特性

| 特性 | 说明 |
|------|------|
| 表格行高自动调整 | 根据内容自动调整表格行高，保证内容完整显示 |
| 表格内容垂直居中 | 单元格内容垂直居中对齐，提升阅读体验 |
| 表格自定义样式 | 支持自定义表头和偶数行背景色，增强可读性 |
| 代码高亮显示 | 使用黑底白字显示代码，模拟IDE效果 |
| 中文间距优化 | 自动优化中英文混排间距 |

## 实现细节

### 模块化处理器

系统采用模块化的处理器设计，每种Markdown元素由专门的处理器处理：

- `TableProcessor`: 处理表格元素，支持合并单元格、垂直居中等特性
- `CodeBlockProcessor`: 处理代码块，实现黑底白字显示效果
- `HeadingProcessor`: 处理标题元素，应用正确的标题样式
- `ListProcessor`: 处理有序和无序列表，支持多级嵌套
- `ParagraphProcessor`: 处理普通段落和内联样式

### 表格处理技术

表格处理采用多层垂直居中设置，保证在所有Office版本中正确显示：

1. 使用Python-docx API设置垂直对齐
2. 使用XML直接设置垂直对齐属性
3. 对表头行进行特殊处理，确保垂直居中

### 代码块优化

代码块使用表格容器实现黑底白字效果：

1. 创建无边框的单元格表格
2. 设置深灰黑色背景色（#1A1A1A）
3. 应用等宽字体和白色文本
4. 保留代码缩进和换行格式

## 开发指南

### 环境设置

```bash
# 安装开发依赖
pip install -e ".[dev]"
```

### 开发工作流

```bash
# 运行测试
pytest

# 代码格式化
black src tests
isort src tests

# 类型检查
mypy src

# 代码质量检查
flake8 src tests
```

## 许可证

MIT