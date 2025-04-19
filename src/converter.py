#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
转换器模块
提供从Markdown到Word文档的转换功能的向后兼容性接口
"""

import logging
import os
import sys
from pathlib import Path

# 导入模块化的实现
try:
    # 作为包导入
    from src.modules.converter import Converter
    from src.modules.markdown_to_html import MarkdownToHtml
    from src.modules.html_to_word import HtmlToWordConverter
except ImportError:
    try:
        # 从当前目录导入
        from modules.converter import Converter
        from modules.markdown_to_html import MarkdownToHtml
        from modules.html_to_word import HtmlToWordConverter
    except ImportError:
        # 最后尝试相对导入
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from src.modules.converter import Converter
        from src.modules.markdown_to_html import MarkdownToHtml
        from src.modules.html_to_word import HtmlToWordConverter

# 为旧版API提供向后兼容类
class MarkdownToHtml(MarkdownToHtml):
    """
    /**
     * Markdown到HTML的转换器
     * 为旧版API提供向后兼容性
     */
    """
    pass

class HtmlToWord(HtmlToWordConverter):
    """
    /**
     * HTML到Word的转换器
     * 为旧版API提供向后兼容性
     */
    """
    def convert(self, html_content, output_file):
        """
        /**
         * 将HTML内容转换为Word文档
         * 
         * @param {str} html_content - HTML内容
         * @param {str} output_file - 输出文件路径
         */
        """
        doc = self.convert_html(html_content)
        doc.save(output_file)
        return doc

# 导出与旧版API兼容的类和函数
__all__ = ['Converter', 'MarkdownToHtml', 'HtmlToWord']