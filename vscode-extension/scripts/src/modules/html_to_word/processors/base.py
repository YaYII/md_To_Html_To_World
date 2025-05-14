"""
基础元素处理器模块
定义元素处理器的基类和通用接口
"""

import logging
from typing import Dict, Any, Optional, List, Union
from abc import ABC, abstractmethod
from bs4 import Tag
from docx import Document
from docx.text.paragraph import Paragraph

from ..document_style import DocumentStyleManager

class BaseProcessor(ABC):
    """
    /**
     * 基础元素处理器
     * 
     * 定义所有元素处理器的基类和通用接口
     */
    """
    
    def __init__(self, document: Document, style_manager: DocumentStyleManager):
        """
        /**
         * 初始化基础元素处理器
         * 
         * @param {Document} document - Word文档对象
         * @param {DocumentStyleManager} style_manager - 文档样式管理器
         */
        """
        self.document = document
        self.style_manager = style_manager
        self.logger = logging.getLogger(f'HtmlToWordConverter.{self.__class__.__name__}')
        self.debug_mode = style_manager.config.get('debug', {}).get('enabled', False)
    
    @abstractmethod
    def process(self, element: Tag) -> Union[Paragraph, List[Paragraph], None]:
        """
        /**
         * 处理HTML元素
         * 
         * @param {Tag} element - HTML元素
         * @returns {Union[Paragraph, List[Paragraph], None]} 处理结果，可能是段落对象、段落列表或None
         */
        """
        pass
    
    def can_process(self, element: Tag) -> bool:
        """
        /**
         * 检查是否可以处理指定元素
         * 
         * @param {Tag} element - HTML元素
         * @returns {bool} 是否可以处理该元素
         */
        """
        return False
        
    def get_text_content(self, element: Tag) -> str:
        """
        /**
         * 获取元素的文本内容
         * 
         * @param {Tag} element - HTML元素
         * @returns {str} 元素的文本内容
         */
        """
        return element.get_text() if element else "" 