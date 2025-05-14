"""
文档样式管理模块
负责管理Word文档样式、字体、颜色等
"""

import logging
from typing import Dict, Any, Optional, Tuple
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml.ns import qn
from docx import Document
from docx.text.run import Run
from docx.text.paragraph import Paragraph
import re

class DocumentStyleManager:
    """
    /**
     * 文档样式管理器
     * 
     * 负责管理Word文档样式、字体、颜色等设置，
     * 提供统一的样式应用接口
     */
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        /**
         * 初始化文档样式管理器
         * 
         * @param {Dict[str, Any]} config - 配置参数字典，包含文档样式设置
         */
        """
        self.config = config
        
        # 配置日志
        self.debug_mode = config.get('debug', {}).get('enabled', False)
        self.logger = logging.getLogger('HtmlToWordConverter.DocumentStyleManager')
        self.logger.info("初始化文档样式管理器...")
        
        # 字体配置
        self.fonts = self.config.get('fonts', {})
        self.default_font = self.fonts.get('default', '宋体')
        self.code_font = self.fonts.get('code', 'Courier New')
        self.heading_font = self.fonts.get('headings', '黑体')
        self.logger.info(f"字体配置: 默认={self.default_font}, 代码={self.code_font}, 标题={self.heading_font}")
        
        # 字号配置
        self.sizes = self.config.get('sizes', {})
        self.default_size = self.sizes.get('default', 12)
        self.code_size = self.sizes.get('code', 10)
        self.heading_sizes = {
            1: self.sizes.get('heading1', 18),
            2: self.sizes.get('heading2', 16),
            3: self.sizes.get('heading3', 14),
            4: self.sizes.get('heading4', 12),
            5: self.sizes.get('heading5', 11),
            6: self.sizes.get('heading6', 10)
        }
        self.logger.info(f"字号配置: 默认={self.default_size}, 代码={self.code_size}")
        if self.debug_mode:
            self.logger.debug(f"标题字号: {self.heading_sizes}")
        
        # 颜色配置
        self.colors = self.config.get('colors', {})
        self.default_color = self._parse_color(self.colors.get('default', '#000000'))
        self.heading_color = self._parse_color(self.colors.get('headings', '#000000'))
        self.code_color = self._parse_color(self.colors.get('code', '#000000'))
        self.link_color = self._parse_color(self.colors.get('links', '#0000FF'))
        self.logger.info(f"颜色配置: 默认={self.colors.get('default', '#000000')}, 标题={self.colors.get('headings', '#000000')}")
        if self.debug_mode:
            self.logger.debug(f"颜色配置: 代码={self.colors.get('code', '#000000')}, 链接={self.colors.get('links', '#0000FF')}")
        
        # 段落格式配置
        self.paragraph = self.config.get('paragraph', {})
        self.line_spacing = self.paragraph.get('line_spacing', 1.15)
        self.paragraph_spacing = self.paragraph.get('space_after', 6)
        self.logger.info(f"段落格式: 行间距={self.line_spacing}, 段落间距={self.paragraph_spacing}")
        
        # 页面设置
        self.doc_properties = self.config.get('document_properties', {})
        self.margin_top = self.doc_properties.get('margin_top', 2.54)
        self.margin_bottom = self.doc_properties.get('margin_bottom', 2.54)
        self.margin_left = self.doc_properties.get('margin_left', 3.17)
        self.margin_right = self.doc_properties.get('margin_right', 3.17)
        self.logger.info(f"页面设置: 上={self.margin_top}cm, 下={self.margin_bottom}cm, 左={self.margin_left}cm, 右={self.margin_right}cm")
        self.logger.info("文档样式管理器初始化完成")
    
    def _parse_color(self, color_str: str) -> RGBColor:
        """
        /**
         * 解析颜色字符串为RGBColor对象
         * 
         * @param {str} color_str - 十六进制颜色字符串，例如 #RRGGBB
         * @returns {RGBColor} docx颜色对象
         */
        """
        if not color_str:
            self.logger.warning("颜色字符串为空，使用默认黑色")
            return RGBColor(0, 0, 0)
            
        color_str = color_str.lstrip('#')
        if self.debug_mode:
            self.logger.debug(f"解析颜色: {color_str}")
        
        try:
            r, g, b = tuple(int(color_str[i:i+2], 16) for i in (0, 2, 4))
            if self.debug_mode:
                self.logger.debug(f"解析颜色成功: R={r}, G={g}, B={b}")
            return RGBColor(r, g, b)
        except ValueError as e:
            self.logger.error(f"颜色解析失败: {e}, 使用默认黑色")
            # 如果解析失败，返回黑色
            return RGBColor(0, 0, 0)
        except Exception as e:
            self.logger.error(f"颜色解析发生意外错误: {e}, 使用默认黑色")
            return RGBColor(0, 0, 0)
    
    def setup_document(self, document: Document) -> Document:
        """
        /**
         * 设置文档全局样式
         * 
         * @param {Document} document - Word文档对象
         * @returns {Document} 设置好样式的Word文档对象
         */
        """
        # 设置文档属性
        section = document.sections[0]
        section.top_margin = Cm(self.margin_top)
        section.bottom_margin = Cm(self.margin_bottom)
        section.left_margin = Cm(self.margin_left)
        section.right_margin = Cm(self.margin_right)
        
        # 设置文档默认样式
        style = document.styles['Normal']
        font = style.font
        font.name = self.default_font
        font.size = Pt(self.default_size)
        font.color.rgb = self.default_color
        
        # 设置中文字体
        style._element.rPr.rFonts.set(qn('w:eastAsia'), self.default_font)
        
        return document
    
    def apply_default_style(self, run: Run) -> Run:
        """
        /**
         * 应用默认文本样式
         * 
         * @param {Run} run - 文本运行对象
         * @returns {Run} 应用样式后的文本运行对象
         */
        """
        run.font.name = self.default_font
        run.font.size = Pt(self.default_size)
        run.font.color.rgb = self.default_color
        run._element.rPr.rFonts.set(qn('w:eastAsia'), self.default_font)
        return run
    
    def apply_heading_style(self, run: Run, level: int) -> Run:
        """
        /**
         * 应用标题样式
         * 
         * @param {Run} run - 文本运行对象
         * @param {int} level - 标题级别 (1-6)
         * @returns {Run} 应用样式后的文本运行对象
         */
        """
        run.font.name = self.heading_font
        size = self.heading_sizes.get(level, self.default_size)
        run.font.size = Pt(size)
        run.font.color.rgb = self.heading_color
        run.bold = True
        run._element.rPr.rFonts.set(qn('w:eastAsia'), self.heading_font)
        return run
    
    def apply_code_style(self, run: Run) -> Run:
        """
        /**
         * 应用代码样式
         * 
         * @param {Run} run - 文本运行对象
         * @returns {Run} 应用样式后的文本运行对象
         */
        """
        run.font.name = self.code_font
        run.font.size = Pt(self.code_size)
        run.font.color.rgb = self.code_color
        return run
    
    def apply_link_style(self, run: Run) -> Run:
        """
        /**
         * 应用链接样式
         * 
         * @param {Run} run - 文本运行对象
         * @returns {Run} 应用样式后的文本运行对象
         */
        """
        run.font.name = self.default_font
        run.font.size = Pt(self.default_size)
        run.font.color.rgb = self.link_color
        run.underline = True
        run._element.rPr.rFonts.set(qn('w:eastAsia'), self.default_font)
        return run
    
    def apply_paragraph_format(self, paragraph: Paragraph, alignment: Optional[str] = None) -> Paragraph:
        """
        /**
         * 应用段落格式
         * 
         * @param {Paragraph} paragraph - 段落对象
         * @param {Optional[str]} alignment - 对齐方式 (left, center, right, justify)
         * @returns {Paragraph} 应用格式后的段落对象
         */
        """
        # 设置行间距，对特殊值使用特定处理
        if self.line_spacing == 1.0:
            paragraph.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        elif self.line_spacing == 1.5:
            paragraph.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        elif self.line_spacing == 2.0:
            paragraph.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE
        else:
            paragraph.paragraph_format.line_spacing = self.line_spacing
            
        # 设置段落间距
        paragraph.paragraph_format.space_after = Pt(self.paragraph_spacing)
        
        # 获取并应用首行缩进设置
        first_line_indent = self.config.get('paragraph', {}).get('first_line_indent', 0)
        if first_line_indent > 0:
            # 转换字符数为磅值，假设中文字符平均宽度为字号的单位值
            font_size = self.default_size
            paragraph.paragraph_format.first_line_indent = Pt(first_line_indent * font_size)
            if self.debug_mode:
                self.logger.debug(f"应用首行缩进: {first_line_indent} 字符")
        
        if alignment:
            if alignment == 'center':
                paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif alignment == 'right':
                paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            elif alignment == 'justify':
                paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            else:
                paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
                
        return paragraph
    
    def apply_list_item_format(self, paragraph: Paragraph, level: int = 0) -> Paragraph:
        """
        /**
         * 应用列表项格式
         * 
         * @param {Paragraph} paragraph - 段落对象
         * @param {int} level - 列表嵌套级别
         * @returns {Paragraph} 应用格式后的段落对象
         */
        """
        # 设置行间距，对特殊值使用特定处理
        if self.line_spacing == 1.0:
            paragraph.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        elif self.line_spacing == 1.5:
            paragraph.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        elif self.line_spacing == 2.0:
            paragraph.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE
        else:
            paragraph.paragraph_format.line_spacing = self.line_spacing
            
        paragraph.paragraph_format.space_after = Pt(self.paragraph_spacing / 2)  # 列表项间隔较小
        paragraph.paragraph_format.left_indent = Inches(level * 0.25)
        return paragraph
    
    def apply_quote_format(self, paragraph: Paragraph) -> Paragraph:
        """
        /**
         * 应用引用格式
         * 
         * @param {Paragraph} paragraph - 段落对象
         * @returns {Paragraph} 应用格式后的段落对象
         */
        """
        # 设置行间距，对特殊值使用特定处理
        if self.line_spacing == 1.0:
            paragraph.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        elif self.line_spacing == 1.5:
            paragraph.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        elif self.line_spacing == 2.0:
            paragraph.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE
        else:
            paragraph.paragraph_format.line_spacing = self.line_spacing
            
        paragraph.paragraph_format.space_after = Pt(self.paragraph_spacing)
        paragraph.paragraph_format.left_indent = Inches(0.5)
        return paragraph 