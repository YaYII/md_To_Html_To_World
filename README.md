# World MD 转换工具

将Markdown文件转换为Word文档的工具，支持中文处理、自定义样式、批量转换等功能。

## 功能特点

- Markdown转Word格式转换
- 支持简繁中文转换
- 自定义段落格式（行间距、首行缩进等）
- 表格样式优化
- 代码块高亮显示
- 批量处理多个文件

## 安装方法

### 方法一：从源码安装

```bash
# 克隆项目
git clone https://github.com/example/world_md.git
cd world_md

# 安装依赖
pip install -r src/requirements.txt
```

### 方法二：使用可执行文件

从发布页面下载对应操作系统的可执行文件，无需安装Python环境。

## 使用方法

### 命令行使用

```bash
# 基本用法
python run.py -i input.md -o output.docx

# 批量处理整个目录
python run.py -i markdown目录 -o word目录 -b

# 使用自定义配置文件
python run.py -i input.md -o output.docx -c 自定义配置.yaml

# 保持简体中文（不转换为繁体）
python run.py -i input.md -o output.docx -s

# 调试模式
python run.py -i input.md -o output.docx -d

# 不保存中间HTML文件
python run.py -i input.md -o output.docx -n
```

### 参数说明

- `-i, --input`: 输入文件或目录路径
- `-o, --output`: 输出文件或目录路径
- `-b, --batch`: 批量处理模式
- `-c, --config`: 配置文件路径
- `-s, --simplified`: 保持简体中文
- `-d, --debug`: 启用调试模式
- `-n, --no-html`: 不保留中间HTML文件

## 配置文件

主配置文件为`config_example.yaml`，包含以下主要配置项：

```yaml
# 字体配置
fonts:
  default: 蒙纳宋体
  code: Courier New
  headings: 蒙纳宋体

# 段落配置
paragraph:
  line_spacing: 1.5     # 行间距
  space_before: 6       # 段前间距
  space_after: 6        # 段后间距
  first_line_indent: 2  # 首行缩进字符数

# 中文配置
chinese:
  convert_to_traditional: true  # 是否转换为繁体中文
  auto_spacing: true            # 中英文间自动添加空格
```

## 打包为可执行文件

可以使用提供的打包脚本生成独立可执行文件：

```bash
# 运行打包脚本
python build_app.py
```

打包成功后，可执行文件将位于`dist`目录下。

## 开发说明

### 项目结构

```
world_md/
├── run.py                 # 主入口脚本
├── build_app.py           # 打包脚本
├── src/
│   ├── __init__.py
│   ├── config.py          # 配置管理
│   ├── config_example.yaml # 配置示例
│   ├── modules/
│   │   ├── converter.py   # 转换器入口
│   │   ├── markdown_to_html.py # Markdown到HTML转换
│   │   ├── html_to_word/  # HTML到Word转换
│   │       ├── converter.py
│   │       ├── document_style.py
│   │       ├── processors/
│   │           ├── base.py
│   │           ├── paragraph.py
│   │           ├── table.py
│   │           ├── code.py
│   │           └── inline.py
```

### 添加新功能

1. 要添加新的Markdown特性支持，修改`markdown_to_html.py`中的扩展配置。
2. 要调整Word输出样式，修改`document_style.py`中的样式设置。
3. 要添加新的HTML元素处理，在`processors`目录下创建对应的处理器。