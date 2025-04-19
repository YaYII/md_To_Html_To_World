"""
HTML到Word转换器
提供HTML内容转换为Word文档的功能
"""

import os
import re
import time
import logging
from typing import Dict, Any, Optional, List, Union
import codecs
from bs4 import BeautifulSoup, Tag
from docx import Document
from docx.shared import Pt, RGBColor, Inches

from .document_style import DocumentStyleManager
from .element_factory import ElementProcessorFactory
from ..html_elements_processor import HtmlElementsProcessor

class HtmlToWordConverter:
    """
    /**
     * HTML到Word转换器
     * 
     * 负责将HTML内容转换为格式化的Word文档
     */
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        /**
         * 初始化HTML到Word转换器
         * 
         * @param {Dict[str, Any]} config - 配置参数字典
         */
        """
        self.config = config
        self.document = None
        self.style_manager = DocumentStyleManager(config)
        self.processor_factory = None
        self.elements_processor = HtmlElementsProcessor(config)
        
        # 配置日志
        self.debug_mode = config.get('debug', {}).get('enabled', False)
        log_level = logging.DEBUG if self.debug_mode else logging.INFO
        
        # 创建logger
        self.logger = logging.getLogger('HtmlToWordConverter')
        self.logger.setLevel(log_level)
        
        # 如果没有处理器，添加一个控制台处理器
        if not self.logger.handlers:
            console_handler = logging.StreamHandler()
            console_handler.setLevel(log_level)
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            console_handler.setFormatter(formatter)
            self.logger.addHandler(console_handler)
        
        self.logger.info("HTML到Word转换器初始化完成")
        if self.debug_mode:
            self.logger.debug(f"调试模式已启用，配置: {config}")
    
    def convert_file(self, input_file: str, output_file: str) -> Document:
        """
        /**
         * 将HTML文件转换为Word文档
         * 
         * @param {str} input_file - 输入HTML文件路径
         * @param {str} output_file - 输出Word文件路径
         * @returns {Document} 生成的Word文档对象
         */
        """
        self.logger.info(f"开始转换文件: {input_file} -> {output_file}")
        start_time = time.time()
        
        if not os.path.exists(input_file):
            self.logger.error(f"输入文件不存在: {input_file}")
            raise FileNotFoundError(f"输入文件不存在: {input_file}")
        
        try:
            with codecs.open(input_file, 'r', encoding='utf-8') as f:
                html_content = f.read()
                self.logger.debug(f"成功读取HTML文件，大小: {len(html_content)} 字节")
                
            doc = self.convert_html(html_content)
            doc.save(output_file)
            
            elapsed_time = time.time() - start_time
            self.logger.info(f"文件转换完成，耗时: {elapsed_time:.2f} 秒")
            return doc
            
        except Exception as e:
            self.logger.error(f"转换过程中发生错误: {str(e)}", exc_info=True)
            raise
    
    def convert_html(self, html_content: str) -> Document:
        """
        /**
         * 将HTML内容转换为Word文档
         * 
         * @param {str} html_content - HTML格式的内容
         * @returns {Document} 生成的Word文档对象
         */
        """
        self.logger.info("开始转换HTML内容到Word")
        
        # 创建新文档
        self.document = Document()
        self.logger.debug("创建新文档对象")
        
        # 应用文档样式
        self.document = self.style_manager.setup_document(self.document)
        self.logger.debug("应用文档样式设置完成")
        
        # 初始化处理器工厂
        self.processor_factory = ElementProcessorFactory(self.document, self.style_manager)
        self.logger.debug("初始化元素处理器工厂")
        
        # 解析HTML
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            body = soup.body or soup
            self.logger.debug(f"HTML解析完成，找到 {len(list(body.descendants))} 个元素")
        except Exception as e:
            self.logger.error(f"HTML解析失败: {str(e)}")
            raise
        
        # 处理主体内容
        self._process_body(body)
        
        self.logger.info("HTML内容转换完成")
        return self.document
    
    def _process_body(self, body: Tag):
        """
        /**
         * 处理HTML文档主体
         * 
         * @param {Tag} body - HTML文档主体元素
         */
        """
        self.logger.debug("开始处理文档主体")
        
        # 统计处理的元素
        processed_count = 0
        
        # 遍历所有直接子元素
        for child in body.children:
            if isinstance(child, Tag):
                self._process_element(child)
                processed_count += 1
                
        self.logger.debug(f"文档主体处理完成，共处理 {processed_count} 个顶级元素")
    
    def _process_element(self, element: Tag):
        """
        /**
         * 处理HTML元素
         * 
         * @param {Tag} element - HTML元素
         */
        """
        if self.debug_mode:
            self.logger.debug(f"处理元素: <{element.name}> {element.get('id', '')} {element.get('class', '')}")
        
        # 检查是否是特殊处理的媒体元素
        if element.name == 'img':
            # 使用专门的图片处理器
            self.logger.debug(f"处理图片元素: {element.get('src', '未知源')}")
            self.elements_processor.process_image(element, self.document)
            return
        
        # 获取元素处理器
        try:
            processor = self.processor_factory.get_processor(element)
            
            if processor:
                # 使用处理器处理元素
                processor.process(element)
                if self.debug_mode:
                    self.logger.debug(f"使用 {processor.__class__.__name__} 处理元素 <{element.name}> 完成")
            else:
                # 如果没有找到处理器，处理其子元素
                if self.debug_mode:
                    self.logger.debug(f"未找到元素 <{element.name}> 的处理器，处理其子元素")
                for child in element.children:
                    if isinstance(child, Tag):
                        self._process_element(child)
        except Exception as e:
            self.logger.error(f"处理元素 <{element.name}> 时发生错误: {str(e)}")
            # 继续处理，不中断转换过程
    
    def cleanup(self):
        """
        /**
         * 清理临时资源
         */
        """
        self.logger.debug("开始清理临时资源")
        # 清理HTML元素处理器的临时资源
        self.elements_processor.cleanup()
        self.logger.info("清理临时资源完成")