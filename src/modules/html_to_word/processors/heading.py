"""
标题处理器模块
处理HTML标题元素
"""

from typing import Dict, Any, Optional, Union, List
from bs4 import Tag
from docx.text.paragraph import Paragraph

from .base import BaseElementProcessor
from .inline import InlineElementProcessor

class HeadingProcessor(BaseElementProcessor):
    """
    /**
     * 标题处理器
     * 
     * 处理HTML标题元素，如h1-h6
     */
    """
    
    def can_process(self, element: Tag) -> bool:
        """
        /**
         * 检查是否可以处理指定元素
         * 
         * @param {Tag} element - HTML元素
         * @returns {bool} 是否可以处理该元素
         */
        """
        heading_tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
        return element.name in heading_tags
    
    def process(self, element: Tag) -> Optional[Paragraph]:
        """
        /**
         * 处理标题元素
         * 
         * @param {Tag} element - 标题HTML元素
         * @returns {Optional[Paragraph]} 处理后的段落对象
         */
        """
        level = int(element.name[1])  # h1 -> 1, h2 -> 2, ...
        
        if self.debug_mode:
            self.logger.debug(f"处理标题元素: <{element.name}> (级别: {level})")
        
        # 确定标题级别对应的样式
        if 1 <= level <= 6:
            heading_style = f'Heading {level}'
            p = self.document.add_paragraph(style=heading_style)
            
            # 应用自定义样式
            self.style_manager.apply_paragraph_format(p)
            
            # 使用内联元素处理器处理内容
            inline_processor = InlineElementProcessor(self.document, self.style_manager)
            inline_processor.process_inline_elements(element, p)
            
            # 设置字体和大小
            for run in p.runs:
                self.style_manager.apply_heading_style(run, level)
            
            if self.debug_mode:
                self.logger.debug(f"标题处理完成，级别: {level}, 文本: {p.text[:30]}{'...' if len(p.text) > 30 else ''}")
            return p
            
        if self.debug_mode:
            self.logger.warning(f"标题级别 {level} 超出有效范围 (1-6)，忽略处理")
        return None 