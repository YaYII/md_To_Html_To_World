"""
HTML到Word转换模块
提供HTML内容转换为Word文档的功能
"""

# 从子模块导入相关类
from .converter import HtmlToWordConverter
from .document_style import DocumentStyleManager

__all__ = ['HtmlToWordConverter', 'DocumentStyleManager'] 