"""
Markdown到HTML转换模块
提供将Markdown文本转换为HTML的功能
"""

import re
import os
import markdown
import logging
from typing import Dict, Any, Optional, List, Union
import codecs
import opencc
from bs4 import BeautifulSoup, Tag, NavigableString
from markdown.extensions.codehilite import CodeHiliteExtension
from markdown.extensions.fenced_code import FencedCodeExtension
from markdown.extensions.tables import TableExtension

class MarkdownToHtml:
    """
    /**
     * Markdown到HTML转换器类
     * 
     * 负责将Markdown格式的文本转换为HTML格式，支持各种Markdown语法元素，
     * 并提供中文文本优化功能
     */
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        /**
         * 初始化MarkdownToHtml转换器
         * 
         * @param {Dict[str, Any]} config - 配置参数字典，包含Markdown解析选项和中文处理设置
         */
        """
        self.config = config
        
        # 配置日志
        self.debug_mode = config.get('debug', {}).get('enabled', False)
        self.logger = logging.getLogger('MarkdownToHtml')
        log_level_name = config.get('debug', {}).get('log_level', 'INFO')
        log_level = getattr(logging, log_level_name, logging.INFO)
        self.logger.setLevel(log_level)
        
        # 如果没有处理器，添加一个控制台处理器
        if not self.logger.handlers:
            console_handler = logging.StreamHandler()
            console_handler.setLevel(log_level)
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            console_handler.setFormatter(formatter)
            self.logger.addHandler(console_handler)
            
            # 如果配置了输出到文件，添加文件处理器
            if config.get('debug', {}).get('log_to_file', False):
                log_file = config.get('debug', {}).get('log_file', 'conversion.log')
                file_handler = logging.FileHandler(log_file, encoding='utf-8')
                file_handler.setLevel(log_level)
                file_handler.setFormatter(formatter)
                self.logger.addHandler(file_handler)
        
        self.logger.info("初始化Markdown到HTML转换器")
        
        self.markdown_extensions = self._get_markdown_extensions()
        
        # 表格样式配置
        self.table_styles = self.config.get('table_styles', {})
        self.even_row_color = self.table_styles.get('even_row_color', '#f2f2f2')  # 偶数行背景色
        self.odd_row_color = self.table_styles.get('odd_row_color', '#ffffff')    # 奇数行背景色
        self.header_bg_color = self.table_styles.get('header_bg_color', '#e0e0e0') # 表头背景色
        self.border_color = self.table_styles.get('border_color', '#dddddd')      # 边框颜色
        self.cell_height = self.table_styles.get('cell_height', '0.95em')         # 单元格高度
        self.table_width = self.table_styles.get('table_width', '100%')           # 表格宽度，默认100%
        
        if self.debug_mode:
            self.logger.debug(f"表格样式配置: 头部背景={self.header_bg_color}, 偶数行背景={self.even_row_color}, 奇数行背景={self.odd_row_color}")
        
        # 获取简繁转换配置
        chinese_config = self.config.get('chinese', {})
        convert_to_traditional = chinese_config.get('convert_to_traditional', False)
        
        # 输出详细配置信息
        self.logger.info(f"中文配置详情: {chinese_config}")
        self.logger.info(f"简繁转换设置: {'启用' if convert_to_traditional else '禁用'}")
        
        # 修复opencc初始化
        try:
            conversion_config = 's2t' if convert_to_traditional else 's2s'
            self.logger.info(f"OpenCC转换配置: {conversion_config}")
            self.cc = opencc.OpenCC(conversion_config)
            self.logger.info(f"中文转换配置: {'简体转繁体' if convert_to_traditional else '保持简体'}")
        except Exception as e:
            self.logger.error(f"OpenCC初始化失败: {str(e)}")
            # 创建一个简单的替代对象，防止代码崩溃
            class NoOpCC:
                def convert(self, text):
                    return text
            self.cc = NoOpCC()
            self.logger.warning("使用NoOp转换器替代OpenCC")
        
    def _get_markdown_extensions(self) -> List:
        """
        /**
         * 获取Markdown扩展配置
         * 
         * @returns {List} 配置好的Markdown扩展列表
         */
        """
        md_configs = self.config.get('markdown_extensions', {})
        extensions = []
        
        self.logger.info("配置Markdown扩展")
        
        # 添加代码高亮扩展
        codehilite_configs = {}
        if 'codehilite' in md_configs:
            for key, value in md_configs['codehilite'].items():
                codehilite_configs[key] = value
            if self.debug_mode:
                self.logger.debug(f"CodeHilite配置: {codehilite_configs}")
        extensions.append(CodeHiliteExtension(**codehilite_configs))
        
        # 添加围栏式代码块扩展
        fenced_code_configs = {}
        if 'fenced_code' in md_configs:
            for key, value in md_configs['fenced_code'].items():
                fenced_code_configs[key] = value
            if self.debug_mode:
                self.logger.debug(f"FencedCode配置: {fenced_code_configs}")
        extensions.append(FencedCodeExtension(**fenced_code_configs))
        
        # 添加表格扩展
        table_configs = {}
        if 'tables' in md_configs:
            for key, value in md_configs['tables'].items():
                table_configs[key] = value
            if self.debug_mode:
                self.logger.debug(f"Table配置: {table_configs}")
        extensions.append(TableExtension(**table_configs))
        
        # 添加其他扩展
        for ext_name, ext_configs in md_configs.items():
            if ext_name not in ['codehilite', 'fenced_code', 'tables']:
                if isinstance(ext_configs, dict):
                    extensions.append(ext_name)
                else:
                    extensions.append(ext_name)
                if self.debug_mode:
                    self.logger.debug(f"添加扩展: {ext_name}")
                    
        self.logger.info(f"Markdown扩展配置完成，共 {len(extensions)} 个扩展")
        return extensions
    
    def convert_file(self, input_file: str, output_file: Optional[str] = None) -> str:
        """
        /**
         * 转换Markdown文件为HTML
         * 
         * @param {str} input_file - 输入Markdown文件路径
         * @param {Optional[str]} output_file - 输出HTML文件路径，如果不提供则不保存文件
         * @returns {str} 转换后的HTML内容
         */
        """
        self.logger.info(f"开始转换文件: {input_file}")
        
        if not os.path.exists(input_file):
            self.logger.error(f"输入文件不存在: {input_file}")
            raise FileNotFoundError(f"输入文件不存在: {input_file}")
        
        try:
            with codecs.open(input_file, 'r', encoding='utf-8') as f:
                md_content = f.read()
                self.logger.info(f"读取Markdown文件，大小: {len(md_content)} 字节")
        
            html_content = self.convert_text(md_content)
            
            if output_file:
                with codecs.open(output_file, 'w', encoding='utf-8') as f:
                    f.write(html_content)
                self.logger.info(f"HTML内容已保存到: {output_file}, 大小: {len(html_content)} 字节")
            
            return html_content
        except Exception as e:
            self.logger.error(f"转换文件时发生错误: {str(e)}", exc_info=True)
            raise
    
    def convert_text(self, md_content: str) -> str:
        """
        /**
         * 转换Markdown文本为HTML
         * 
         * @param {str} md_content - Markdown格式的文本内容
         * @returns {str} 转换后的HTML内容
         */
        """
        self.logger.info("开始转换Markdown文本到HTML")
        
        # 将Markdown转换为HTML
        html_content = markdown.markdown(md_content, extensions=self.markdown_extensions)
        if self.debug_mode:
            self.logger.debug(f"Markdown基础转换完成，HTML大小: {len(html_content)} 字节")
        
        # 进行中文处理
        if self.config.get('chinese', {}).get('optimize_spacing', True):
            self.logger.info("优化中文间距")
            html_content = self._optimize_chinese_spacing(html_content)
        
        # 美化表格
        self.logger.info("美化HTML表格")
        html_content = self._beautify_tables(html_content)
            
        # 进行简繁转换
        convert_to_traditional = self.config.get('chinese', {}).get('convert_to_traditional', False)
        self.logger.info(f"简繁转换设置: {'启用' if convert_to_traditional else '禁用'}")
        
        if convert_to_traditional:
            self.logger.info("执行简体到繁体中文转换")
            html_content = self.cc.convert(html_content)
            
        self.logger.info("Markdown转HTML完成")
        return html_content
    
    def _optimize_chinese_spacing(self, html_content: str) -> str:
        """
        /**
         * 优化中文间距
         * 处理中英文、中文与数字、符号之间的间距，提高排版美观度
         * 
         * @param {str} html_content - HTML内容
         * @returns {str} 优化间距后的HTML内容
         */
        """
        if self.debug_mode:
            self.logger.debug("开始优化中文间距")
            
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 递归处理所有文本节点
        self._process_node(soup)
        
        if self.debug_mode:
            self.logger.debug("中文间距优化完成")
            
        return str(soup)
    
    def _beautify_tables(self, html_content: str) -> str:
        """
        /**
         * 美化HTML表格
         * 为表格添加交替背景色、设置单元格高度、居中显示和宽度限制
         * 
         * @param {str} html_content - HTML内容
         * @returns {str} 美化表格后的HTML内容
         */
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 检查并创建完整的HTML结构
        if soup.html is None:
            # 如果没有完整的HTML结构，创建一个新的HTML结构
            new_html = BeautifulSoup('<html><head></head><body></body></html>', 'html.parser')
            # 将原内容移动到body中
            for tag in list(soup):
                new_html.body.append(tag)
            soup = new_html
        elif soup.head is None:
            # 如果有html但没有head，添加head
            head_tag = soup.new_tag('head')
            if soup.body:
                soup.html.insert(0, head_tag)
            else:
                # 如果没有body标签，先添加head，再添加body
                soup.html.append(head_tag)
                body_tag = soup.new_tag('body')
                soup.html.append(body_tag)
                # 将所有内容移动到body中
                for tag in list(soup.html.contents):
                    if tag != head_tag and tag != body_tag:
                        body_tag.append(tag)
        
        # 创建样式标签
        style_tag = soup.new_tag('style')
        style_tag.string = f"""
        table {{
            border-collapse: collapse;
            width: {self.table_width};
            max-width: 100%;
            margin-bottom: 1em;
            border: 1px solid {self.border_color};
        }}
        th, td {{
            text-align: left;
            padding: 8px;
            vertical-align: middle;
            height: {self.cell_height};
            border: 1px solid {self.border_color};
        }}
        th {{
            background-color: {self.header_bg_color};
            font-weight: bold;
            text-align: center;
        }}
        tr:nth-child(even) {{
            background-color: {self.even_row_color};
        }}
        tr:nth-child(odd) {{
            background-color: {self.odd_row_color};
        }}
        """
        
        # 将样式添加到头部
        soup.head.append(style_tag)
        
        # 处理所有表格
        tables = soup.find_all('table')
        for table in tables:
            # 添加表格类名以应用样式
            table['class'] = table.get('class', []) + ['styled-table']
            
            # 确保第一行是表头
            rows = table.find_all('tr')
            if rows and not table.find('thead') and not rows[0].find('th'):
                # 如果没有thead且第一行没有th，将第一行中的td转为th
                first_row = rows[0]
                for td in first_row.find_all('td'):
                    th = soup.new_tag('th')
                    th.string = td.get_text()
                    td.replace_with(th)
                
                # 创建thead并将第一行移动进去
                thead = soup.new_tag('thead')
                thead.append(first_row.extract())
                table.insert(0, thead)
                
                # 如果需要，创建tbody
                if not table.find('tbody'):
                    tbody = soup.new_tag('tbody')
                    for row in table.find_all('tr'):
                        tbody.append(row.extract())
                    table.append(tbody)
            
            # 确保所有单元格都有正确的对齐方式
            for td in table.find_all('td'):
                # 设置单元格样式
                td['style'] = 'vertical-align: middle; word-break: break-word;'
            
            for th in table.find_all('th'):
                # 设置表头样式
                th['style'] = 'vertical-align: middle; text-align: center; font-weight: bold;'
        
        return str(soup)
    
    def _process_node(self, node: Union[Tag, NavigableString]):
        """
        /**
         * 递归处理HTML节点中的文本
         * 
         * @param {Union[Tag, NavigableString]} node - BeautifulSoup节点
         */
        """
        # 如果是文本节点
        if isinstance(node, NavigableString):
            if node.parent.name not in ['pre', 'code']:  # 不处理代码块中的文本
                # 处理字符间空格
                new_text = self._add_spaces_between_text(str(node))
                node.replace_with(new_text)
            return
            
        # 如果是标签节点，递归处理其子节点
        if hasattr(node, 'children'):
            # 创建一个列表保存当前所有子节点，避免在迭代过程中修改子节点导致问题
            children = list(node.children)
            for child in children:
                self._process_node(child)
    
    def _add_spaces_between_text(self, text: str) -> str:
        """
        /**
         * 在中英文、中文与数字之间添加适当的空格
         * 
         * @param {str} text - 需要处理的文本
         * @returns {str} 添加空格后的文本
         */
        """
        # 在中文与英文字母之间添加空格
        text = re.sub(r'([\u4e00-\u9fa5])([a-zA-Z])', r'\1 \2', text)
        text = re.sub(r'([a-zA-Z])([\u4e00-\u9fa5])', r'\1 \2', text)
        
        # 在中文与数字之间添加空格
        text = re.sub(r'([\u4e00-\u9fa5])([0-9])', r'\1 \2', text)
        text = re.sub(r'([0-9])([\u4e00-\u9fa5])', r'\1 \2', text)
        
        return text 