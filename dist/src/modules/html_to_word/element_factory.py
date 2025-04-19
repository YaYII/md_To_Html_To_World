"""
元素处理器工厂模块
负责创建和管理各类HTML元素处理器
"""

import logging
from typing import Dict, Any, Optional, List, Type
from bs4 import Tag
from docx import Document

from .document_style import DocumentStyleManager
from .processors.base import BaseElementProcessor
from .processors.paragraph import ParagraphProcessor
from .processors.heading import HeadingProcessor
from .processors.list import ListProcessor
from .processors.table import TableProcessor
from .processors.inline import InlineElementProcessor
from .processors.code import CodeBlockProcessor

class ElementProcessorFactory:
    """
    /**
     * 元素处理器工厂
     * 
     * 负责创建和管理各类HTML元素处理器，
     * 根据元素类型返回适当的处理器
     */
    """
    
    def __init__(self, document: Document, style_manager: DocumentStyleManager):
        """
        /**
         * 初始化元素处理器工厂
         * 
         * @param {Document} document - Word文档对象
         * @param {DocumentStyleManager} style_manager - 文档样式管理器
         */
        """
        self.document = document
        self.style_manager = style_manager
        self.debug_mode = style_manager.config.get('debug', {}).get('enabled', False)
        self.logger = logging.getLogger('HtmlToWordConverter.ElementProcessorFactory')
        
        if self.debug_mode:
            self.logger.debug("初始化元素处理器工厂")
        
        # 初始化各类处理器
        self.processors = {
            # 创建各种处理器实例
            'paragraph': ParagraphProcessor(document, style_manager),
            'heading': HeadingProcessor(document, style_manager),
            'list': ListProcessor(document, style_manager),
            'table': TableProcessor(document, style_manager),
            'inline': InlineElementProcessor(document, style_manager),
            'code': CodeBlockProcessor(document, style_manager)
        }
        
        if self.debug_mode:
            self.logger.debug(f"已创建 {len(self.processors)} 个处理器实例")
        
        # 元素类型与处理器映射
        self.element_map = {
            'p': self.processors['paragraph'],
            'h1': self.processors['heading'],
            'h2': self.processors['heading'],
            'h3': self.processors['heading'],
            'h4': self.processors['heading'],
            'h5': self.processors['heading'],
            'h6': self.processors['heading'],
            'ul': self.processors['list'],
            'ol': self.processors['list'],
            'table': self.processors['table'],
            'pre': self.processors['code'],
            'blockquote': self.processors['paragraph'],  # 特殊处理的段落
            'div': self.processors['paragraph'],         # 特殊处理的段落
            'section': self.processors['paragraph'],     # 特殊处理的段落
            'article': self.processors['paragraph'],     # 特殊处理的段落
            'main': self.processors['paragraph'],        # 特殊处理的段落
            'header': self.processors['paragraph'],      # 特殊处理的段落
            'footer': self.processors['paragraph'],      # 特殊处理的段落
        }
        
        # 内联元素由内联处理器处理
        inline_tags = ['strong', 'b', 'em', 'i', 'u', 'code', 'a', 'span', 'br']
        for tag in inline_tags:
            self.element_map[tag] = self.processors['inline']
            
        if self.debug_mode:
            self.logger.debug(f"已映射 {len(self.element_map)} 种HTML元素类型到对应处理器")
            self.logger.debug("元素处理器工厂初始化完成")
    
    def get_processor(self, element: Tag) -> Optional[BaseElementProcessor]:
        """
        /**
         * 根据元素获取对应的处理器
         * 
         * @param {Tag} element - HTML元素
         * @returns {Optional[BaseElementProcessor]} 对应的元素处理器或None
         */
        """
        if not element or not element.name:
            if self.debug_mode:
                self.logger.debug(f"无法处理空元素或没有名称的元素")
            return None
            
        # 使用元素类型映射获取处理器
        processor = self.element_map.get(element.name)
        
        if processor and self.debug_mode:
            self.logger.debug(f"为元素 <{element.name}> 找到处理器: {processor.__class__.__name__}")
        
        # 如果没有找到处理器，尝试使用自动检测
        if not processor:
            if self.debug_mode:
                self.logger.debug(f"在映射中未找到元素 <{element.name}> 的处理器，尝试自动检测")
            for name, p in self.processors.items():
                if p.can_process(element):
                    if self.debug_mode:
                        self.logger.debug(f"通过自动检测为元素 <{element.name}> 找到处理器: {p.__class__.__name__}")
                    return p
            
            if self.debug_mode:
                self.logger.debug(f"无法找到元素 <{element.name}> 的处理器")
        
        return processor 