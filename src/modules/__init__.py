"""
World MD 模块包
提供Markdown到Word文档转换功能
"""

# 使用try-except处理不同的导入场景
try:
    # 相对导入（作为包的一部分被导入时）
    from .converter import Converter
    from .markdown_to_html import MarkdownToHtml
    from .html_to_word import HtmlToWordConverter
    from .html_elements_processor import HtmlElementsProcessor
except ImportError:
    # 绝对导入（直接运行时）
    try:
        from src.modules.converter import Converter
        from src.modules.markdown_to_html import MarkdownToHtml
        from src.modules.html_to_word import HtmlToWordConverter
        from src.modules.html_elements_processor import HtmlElementsProcessor
    except ImportError:
        # 当前目录导入
        from converter import Converter
        from markdown_to_html import MarkdownToHtml
        from html_to_word import HtmlToWordConverter
        from html_elements_processor import HtmlElementsProcessor

__all__ = ['Converter', 'MarkdownToHtml', 'HtmlToWordConverter', 'HtmlElementsProcessor'] 