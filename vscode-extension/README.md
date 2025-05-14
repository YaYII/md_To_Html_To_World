# Markdown 转 Word 插件

一键将 Markdown 文档转换为格式精美的 Word 文档（.docx 格式）。

## 功能特点

- 🚀 **一键转换**：右键点击 Markdown 文件即可转换为 Word 文档
- 🎨 **精美排版**：支持自定义字体、颜色、段落样式等
- 📊 **表格支持**：完美呈现 Markdown 表格，并应用表格样式
- 💻 **代码高亮**：保留代码块格式和语法高亮
- 📷 **图片处理**：自动将图片嵌入到 Word 文档中
- 🔄 **批量转换**：支持转换整个目录下的 Markdown 文件（命令行方式）

## 使用方法

### 基本用法

1. 在 VS Code 中打开一个 Markdown (.md) 文件
2. 右键点击文件内容或在文件资源管理器中右键点击文件
3. 选择 "转换为 Word 文档"
4. 转换完成后，会提示转换成功，并提供打开文件的选项

### 设置 Python 解释器路径

默认情况下，插件会自动检测系统中的 Python 环境。如果自动检测失败或想使用特定的 Python 环境，可以在设置中指定：

1. 打开 VS Code 设置（文件 > 首选项 > 设置）
2. 搜索 "markdown-to-word.pythonPath"
3. 输入 Python 解释器的完整路径，例如：
   - Windows: `C:\\Python39\\python.exe` 
   - macOS/Linux: `/usr/bin/python3`

## 必要依赖

本插件依赖以下 Python 包：

- python-docx：用于创建和编辑 Word 文档
- markdown：Markdown 解析器
- beautifulsoup4：HTML 解析
- opencc-python-reimplemented：简繁中文转换
- pyyaml：配置文件解析
- lxml：XML 和 HTML 处理

插件会在首次运行时检测并自动安装所需依赖，如果自动安装失败，请手动安装：

```bash
pip install python-docx markdown beautifulsoup4 opencc-python-reimplemented pyyaml lxml
```

## 高级配置

插件会使用合理的默认配置，但您可以通过编辑配置文件来自定义转换效果。具体请参考插件目录中的 `scripts/config_example.yaml` 文件。

## 常见问题

1. **Q: 转换后的文档中文字乱码怎么办？**  
   A: 请确保您的系统安装了插件配置中指定的字体，或修改配置文件中的字体设置。

2. **Q: 依赖包安装失败怎么办？**  
   A: 请尝试手动安装所需依赖，或检查网络连接和Python权限设置。

3. **Q: 如何批量转换整个文件夹的Markdown文件？**  
   A: 目前批量转换功能仅在命令行模式下可用，请在终端中运行插件目录下的 `run.py` 脚本。

## 问题反馈

如果您在使用过程中遇到任何问题，或有任何功能建议，请到GitHub仓库提交Issue。 