# Markdown 转 Word 文档项目功能列表

## 一、项目概述

World MD 是一个功能强大的 Markdown 转 Word 文档转换工具，支持完整的 Markdown 语法，并提供美观的格式化输出。该项目采用模块化设计，主要包含以下核心组件：

1. **核心转换器**：负责将 Markdown 解析为 HTML，然后转换为 Word 文档格式
2. **格式处理器**：处理各种特殊格式，如列表、表格、代码块等
3. **样式管理器**：管理文档的样式和格式
4. **CLI 工具**：提供命令行界面，方便用户使用

## 二、项目执行流程

### 2.1 主程序入口

主程序入口是 `run.py` 文件，它提供了命令行接口，实现了以下功能：

1. **命令行参数解析**：支持以下参数
   - `--input`/`-i`：输入文件或目录路径
   - `--output`/`-o`：输出文件或目录路径
   - `--batch`/`-b`：批量处理模式
   - `--config`/`-c`：配置文件路径
   - `--simplified`/`-s`：保持简体中文
   - `--debug`/`-d`：启用调试模式
   - `--no-html`/`-n`：不保留中间 HTML 文件

2. **日志配置**：根据是否开启调试模式设置日志级别

3. **配置加载**：加载默认配置或指定的配置文件

4. **转换处理**：根据输入路径决定是批量处理还是单文件处理

执行流程为：
1. 解析命令行参数
2. 设置日志级别
3. 加载配置
4. 检查输入输出路径
5. 执行转换处理
6. 输出处理结果

### 2.2 单文件处理流程

单文件处理通过 `process_single_file` 函数实现，流程如下：

1. 创建转换器实例
2. 调用转换器的 `convert_file` 方法
3. 清理临时资源

### 2.3 批量处理流程

批量处理通过 `process_batch` 函数实现，流程如下：

1. 创建转换器实例
2. 调用转换器的 `batch_convert` 方法
3. 计算统计信息（成功/失败）
4. 输出失败文件列表
5. 清理临时资源

## 三、核心模块结构

### 3.1 主转换器（Converter）

主转换器位于 `src/modules/converter.py`，是整个转换流程的核心，它集成了 Markdown 到 HTML 和 HTML 到 Word 的转换功能。

主要方法：

1. **`__init__(config)`**：初始化转换器
   - 加载配置
   - 初始化子模块（MarkdownToHtml、HtmlToWordConverter）

2. **`convert_file(input_file, output_file, keep_html)`**：转换单个 Markdown 文件
   - 检查输入文件是否存在
   - 确定 HTML 中间文件路径
   - 调用 MarkdownToHtml 转换器生成 HTML
   - 调用 HtmlToWordConverter 转换器生成 Word 文档

3. **`convert_text(md_content, output_file)`**：转换 Markdown 文本
   - 调用 MarkdownToHtml 转换器生成 HTML
   - 如果有输出文件，调用 HtmlToWordConverter 转换器生成 Word 文档
   - 否则返回 HTML 内容

4. **`batch_convert(input_dir, output_dir, keep_html)`**：批量转换目录中的 Markdown 文件
   - 创建输出目录
   - 查找所有 Markdown 文件
   - 遍历处理每个文件
   - 返回转换结果字典

5. **`_find_markdown_files(directory)`**：查找目录中的所有 Markdown 文件
   - 递归遍历目录
   - 筛选 .md 和 .markdown 文件

6. **`cleanup()`**：清理临时资源
   - 调用 HTML 处理器的清理方法

### 3.2 Markdown 到 HTML 转换器（MarkdownToHtml）

Markdown 到 HTML 转换器位于 `src/modules/markdown_to_html.py`，负责将 Markdown 文本转换为 HTML。

主要方法：

1. **`__init__(config)`**：初始化转换器
   - 配置日志
   - 获取 Markdown 扩展
   - 配置表格样式
   - 初始化中文转换器（OpenCC）

2. **`_get_markdown_extensions()`**：获取 Markdown 扩展配置
   - 配置代码高亮扩展（CodeHiliteExtension）
   - 配置围栏式代码块扩展（FencedCodeExtension）
   - 配置表格扩展（TableExtension）
   - 配置其他扩展

3. **`convert_file(input_file, output_file)`**：转换 Markdown 文件
   - 读取 Markdown 文件
   - 调用 convert_text 方法
   - 如果提供输出文件路径，保存 HTML 文件

4. **`convert_text(md_content)`**：转换 Markdown 文本
   - 使用 markdown 库转换为 HTML
   - 如果配置了优化中文间距，调用优化方法
   - 美化 HTML 表格
   - 如果配置了简繁转换，调用 OpenCC 转换
   - 返回 HTML 内容

5. **`_optimize_chinese_spacing(html_content)`**：优化中文间距
   - 使用 BeautifulSoup 解析 HTML
   - 递归处理所有文本节点，添加适当的空格

6. **`_beautify_tables(html_content)`**：美化 HTML 表格
   - 添加表格样式（边框、颜色、对齐方式）
   - 处理表头
   - 设置单元格垂直居中

### 3.3 HTML 到 Word 转换器（HtmlToWordConverter）

HTML 到 Word 转换器位于 `src/modules/html_to_word/converter.py`，负责将 HTML 内容转换为格式化的 Word 文档。

主要方法：

1. **`__init__(config)`**：初始化转换器
   - 配置日志
   - 初始化样式管理器
   - 初始化处理器工厂

2. **`convert_file(input_file, output_file)`**：转换 HTML 文件
   - 读取 HTML 文件
   - 调用 convert_html 方法
   - 保存 Word 文档

3. **`convert_html(html_content)`**：转换 HTML 内容
   - 创建新的 Word 文档
   - 应用文档样式
   - 解析 HTML
   - 处理 HTML 主体内容
   - 返回 Word 文档对象

4. **`_process_body(body)`**：处理 HTML 文档主体
   - 遍历所有直接子元素
   - 对每个元素调用 _process_element 方法

5. **`_process_element(element)`**：处理 HTML 元素
   - 对图片元素特殊处理
   - 使用处理器工厂获取元素对应的处理器
   - 调用处理器的 process 方法

6. **`cleanup()`**：清理临时资源
   - 调用 HTML 元素处理器的清理方法

### 3.4 样式管理器（DocumentStyleManager）

样式管理器位于 `src/modules/html_to_word/document_style.py`，负责管理 Word 文档的样式、字体、颜色等设置。

主要方法：

1. **`__init__(config)`**：初始化样式管理器
   - 配置字体（默认字体、代码字体、标题字体）
   - 配置字号（默认字号、代码字号、标题字号）
   - 配置颜色（默认颜色、标题颜色、代码颜色、链接颜色）
   - 配置段落格式（行间距、段落间距）
   - 配置页面设置（页边距）

2. **`_parse_color(color_str)`**：解析颜色字符串为 RGBColor 对象

3. **`setup_document(document)`**：设置文档全局样式
   - 设置页边距
   - 设置默认字体、字号和颜色

4. **`apply_default_style(run)`**：应用默认文本样式

5. **`apply_heading_style(run, level)`**：应用标题样式
   - 根据标题级别设置不同的字号

6. **`apply_code_style(run)`**：应用代码样式

7. **`apply_link_style(run)`**：应用链接样式

8. **`apply_paragraph_format(paragraph, alignment)`**：应用段落格式
   - 设置行间距和段落间距
   - 设置对齐方式

9. **`apply_list_item_format(paragraph, level)`**：应用列表项格式
   - 设置缩进

10. **`apply_quote_format(paragraph)`**：应用引用格式
    - 设置左缩进

### 3.5 元素处理器工厂（ElementProcessorFactory）

元素处理器工厂位于 `src/modules/html_to_word/element_factory.py`，负责创建和管理各类 HTML 元素处理器。

主要方法：

1. **`__init__(document, style_manager)`**：初始化元素处理器工厂
   - 初始化各类处理器（段落、标题、列表、表格、内联、代码）
   - 建立元素类型与处理器的映射

2. **`get_processor(element)`**：根据元素获取对应的处理器
   - 使用元素类型映射获取处理器
   - 如果没有找到，尝试使用自动检测

## 四、具体处理器模块

### 4.1 基础处理器（BaseElementProcessor）

位于 `src/modules/html_to_word/processors/base.py`，所有处理器的基类。

主要方法：
1. **`__init__(document, style_manager)`**：初始化处理器
2. **`process(element)`**：处理 HTML 元素（抽象方法）
3. **`can_process(element)`**：检查是否可以处理指定元素

### 4.2 段落处理器（ParagraphProcessor）

位于 `src/modules/html_to_word/processors/paragraph.py`，处理 HTML 段落元素。

处理的元素类型：p, div, section, article, blockquote 等。

主要功能：
1. 创建 Word 段落
2. 处理段落内的内联元素
3. 应用段落格式（对齐方式、段间距）
4. 处理引用样式（左缩进）

### 4.3 标题处理器（HeadingProcessor）

位于 `src/modules/html_to_word/processors/heading.py`，处理 HTML 标题元素。

处理的元素类型：h1, h2, h3, h4, h5, h6。

主要功能：
1. 根据标题级别创建相应样式的 Word 段落
2. 处理标题内的内联元素
3. 应用标题样式（字体、字号、颜色）

### 4.4 列表处理器（ListProcessor）

位于 `src/modules/html_to_word/processors/list.py`，处理 HTML 列表元素。

处理的元素类型：ul, ol, li。

主要功能：
1. 处理有序列表和无序列表
2. 支持多级嵌套列表
3. 设置适当的缩进和项目符号/编号
4. 处理列表项内的内联内容

### 4.5 表格处理器（TableProcessor）

位于 `src/modules/html_to_word/processors/table.py`，处理 HTML 表格元素。

处理的元素类型：table, tr, td, th。

主要功能：
1. 创建 Word 表格
2. 处理表头样式（背景色、居中、粗体）
3. 处理表格内容
4. 处理单元格合并
5. 设置表格样式（边框、宽度）
6. 设置表格单元格的垂直居中对齐
7. 处理偶数行背景色

### 4.6 代码块处理器（CodeBlockProcessor）

位于 `src/modules/html_to_word/processors/code.py`，处理 HTML 代码块元素。

处理的元素类型：pre, code。

主要功能：
1. 创建具有黑色背景的表格作为代码容器
2. 使用等宽字体显示代码
3. 使用白色文字在黑背景上显示代码
4. 保留代码的缩进和换行格式
5. 创建无边框效果，模拟现代 IDE 的代码展示

### 4.7 内联元素处理器（InlineElementProcessor）

位于 `src/modules/html_to_word/processors/inline.py`，处理 HTML 内联元素。

处理的元素类型：strong, b, em, i, u, code, a, span, br。

主要功能：
1. 处理粗体、斜体、下划线等文本格式
2. 处理行内代码
3. 处理超链接
4. 处理换行
5. 处理嵌套的内联元素

## 五、配置系统

### 5.1 配置管理器（Config）

位于 `src/config.py`，负责加载和管理项目配置。

主要方法：

1. **`__init__()`**：初始化配置管理器
   - 加载默认配置

2. **`load_from_file(config_file)`**：从 YAML 文件加载配置
   - 读取 YAML 文件
   - 与默认配置合并

3. **`get(key, default=None)`**：获取配置值
   - 支持点分隔的嵌套键名

4. **`set(key, value)`**：设置配置值
   - 支持点分隔的嵌套键名

5. **`_update_dict(target, source)`**：递归更新字典
   - 保留原有的嵌套结构

### 5.2 配置参数

默认配置包含以下部分：

1. **字体配置**：
   - 默认字体：宋体
   - 代码字体：Courier New
   - 标题字体：黑体

2. **字号配置**：
   - 默认字号：12 磅
   - 代码字号：10 磅
   - 标题字号（h1-h6）：18-10 磅递减

3. **颜色配置**：
   - 默认颜色：黑色 (#000000)
   - 标题颜色：黑色 (#000000)
   - 代码颜色：黑色 (#000000)
   - 链接颜色：蓝色 (#0000FF)

4. **段落格式**：
   - 行间距：1.15
   - 段落间距：8 磅

5. **页面设置**：
   - 上下边距：2.54 厘米
   - 左右边距：3.17 厘米

6. **表格样式**：
   - 表格样式名称：Table Grid
   - 边框样式：single
   - 边框宽度：1 磅
   - 边框颜色：#000000
   - 表头背景色：#E7E6E6
   - 偶数行背景色：#F2F2F2
   - 文本对齐方式：left
   - 垂直对齐方式：center
   - 行高配置：
     - 默认行高：0.95 厘米
     - 表头行高：1.1 厘米
     - 最小行高：0.5 厘米
     - 最大行高：5.0 厘米
     - 自动调整：true

7. **中文处理**：
   - 简繁转换：true（默认转为繁体）
   - 优化间距：true（优化中英文混排间距）

8. **Markdown 扩展**：
   - 代码高亮（CodeHilite）
   - 围栏式代码块（FencedCode）
   - 表格（Tables）

## 六、项目改进特性

### 6.1 表格处理改进

1. **表格行高自动调整**：根据内容自动调整表格行高，保证内容完整显示
2. **表格内容垂直居中**：单元格内容垂直居中对齐，提升阅读体验
3. **表格交替行背景色**：使用交替的背景色增强表格可读性
4. **表头样式优化**：为表头行应用特殊样式，使其更加突出

### 6.2 代码块显示改进

1. **黑底白字代码块**：使用黑色背景和白色文字显示代码，模拟现代 IDE 效果
2. **等宽字体**：使用 Courier New 等宽字体确保代码对齐
3. **保留代码格式**：完整保留代码的缩进和换行
4. **无边框设计**：使用与背景色相同的边框创造无边框效果

### 6.3 中文支持改进

1. **中文间距优化**：自动在中英文、中文与数字之间添加适当的空格
2. **简繁转换**：支持简体中文到繁体中文的转换
3. **中文字体支持**：默认使用宋体，适合中文显示

### 6.4 调试与日志功能

1. **详细日志记录**：记录转换过程中的各个步骤
2. **调试模式**：支持开启调试模式，输出更详细的日志信息
3. **错误处理**：完善的错误处理和异常捕获
4. **统计信息**：提供转换结果的统计信息
