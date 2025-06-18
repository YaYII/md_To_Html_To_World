# Markdown转Word插件 - Python核心功能

此目录包含VS Code插件的Python核心功能代码，用于将Markdown文档转换为格式化的Word文档(.docx)文件。

## 目录结构

```
scripts/
├── run.py                   # 主运行脚本
├── config_example.yaml      # 默认配置文件
└── src/                     # 核心源代码
    ├── __init__.py          # 包初始化文件
    ├── config.py            # 配置处理模块
    ├── requirements.txt     # Python依赖库清单
    └── modules/             # 功能模块目录
        ├── __init__.py      # 模块初始化文件
        ├── converter.py     # 转换器主类
        ├── markdown_to_html.py        # Markdown转HTML处理
        ├── html_elements_processor.py # HTML元素处理器
        └── html_to_word/    # HTML转Word处理模块
            ├── __init__.py  # 子模块初始化文件
            ├── converter.py # HTML到Word转换器
            ├── element_factory.py     # 元素创建工厂
            ├── document_style.py      # 文档样式处理
            └── processors/  # 各类HTML元素处理器
                ├── __init__.py # 处理器初始化文件
                ├── base.py     # 基础处理器类
                ├── paragraph.py # 段落处理
                ├── heading.py   # 标题处理
                ├── list.py      # 列表处理
                ├── table.py     # 表格处理
                ├── image.py     # 图片处理
                ├── code.py      # 代码块处理
                └── inline.py    # 内联元素处理
```

## 运行方式

VS Code插件通过调用`run.py`脚本来执行Markdown到Word的转换：

```
python run.py -i <输入文件.md> -o <输出文件.docx>
```

## 依赖项

该功能需要以下Python包：

- python-docx: Word文档生成
- markdown: Markdown解析
- beautifulsoup4: HTML解析
- opencc-python-reimplemented: 简繁中文转换
- pyyaml: 配置文件解析
- requests: 网络请求(用于处理远程图片)
- lxml: XML和HTML处理

## 配置说明

转换过程可通过`config_example.yaml`文件配置，包括字体、颜色、段落样式等。

## 常见问题与解决方案

### 1. ModuleNotFoundError: No module named 'docx'

**问题**：运行时出现"ModuleNotFoundError: No module named 'docx'"错误。

**解决方案**：

1. 确认已安装python-docx包：
   ```bash
   pip install python-docx
   ```

2. 如果安装后仍然报错，尝试运行安装脚本：
   ```bash
   python install_dependencies.py
   ```

3. 检查是否使用了正确的Python环境（特别是使用虚拟环境时）。

### 2. 图片无法正确显示或导入

**问题**：转换后的Word文档中图片无法显示。

**解决方案**：

1. 确保Markdown文件中的图片路径正确且可访问。
2. 对于相对路径的图片，确保相对于Markdown文件的路径正确。
3. 对于网络图片，确保网络连接正常且图片URL可访问。
4. 安装必要的图片处理依赖：
   ```bash
   pip install Pillow
   ```

### 3. 中文字符显示为方块或乱码

**问题**：Word文档中的中文显示为方块或乱码。

**解决方案**：

1. 在配置文件中设置正确的中文字体，例如：
   ```yaml
   font:
     default_family: 微软雅黑    # Windows系统
     # 或
     default_family: PingFang SC # macOS系统
   ```

2. 确保系统已安装相应的字体。

3. 检查源Markdown文件的编码是否为UTF-8。

### 4. 转换过程中出现Python错误

**问题**：运行时出现Python异常或错误。

**解决方案**：

1. 启用调试模式查看更多信息：
   ```bash
   python run.py -i input.md -o output.docx -d
   ```

2. 检查Python版本，确保使用的是Python 3.6或更高版本：
   ```bash
   python --version
   ```

3. 尝试重新安装所有依赖：
   ```bash
   pip install -r requirements.txt --force-reinstall
   ```

### 5. 表格样式或代码块格式问题

**问题**：Word中的表格或代码块格式不正确。

**解决方案**：

1. 自定义配置文件中的相关样式设置，例如：
   ```yaml
   table:
     style: TableGrid
     header_bg_color: DDDDDD
   
   code_block:
     font_family: Consolas
     font_size: 10
     bg_color: F5F5F5
   ```

2. 确保原始Markdown中的表格和代码块语法正确。

## 诊断工具

如果遇到问题，可以运行诊断脚本查看环境信息：

```bash
python run.py --debug
```

## 自定义配置

可以通过修改`config_example.yaml`文件来自定义转换效果，然后使用`-c`参数指定配置文件：

```bash
python run.py -i input.md -o output.docx -c my_config.yaml
```

## 支持与反馈

如果您遇到任何问题或有任何建议，请提交Issue或联系开发团队。 