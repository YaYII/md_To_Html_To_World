#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
配置模块
负责加载、存储和提供项目配置
"""

import logging
import os
import yaml

class Config:
    """
    配置类
    用于管理配置项，支持从文件加载和内存操作
    """
    
    def __init__(self):
        """
        初始化配置对象，设置默认配置
        """
        self.logger = logging.getLogger('Config')
        
        # 默认配置
        self.config = {
            # 字体配置
            'fonts': {
                'default': '蒙纳宋体',
                'code': 'Courier New',
                'headings': '黑体',
            },
            
            # 大小配置
            'sizes': {
                'default': 12,
                'code': 10,
                'heading1': 18,
                'heading2': 16,
                'heading3': 14,
                'heading4': 12,
                'heading5': 11,
                'heading6': 10,
            },
            
            # 颜色配置
            'colors': {
                'default': '#000000',
                'headings': '#000000',
                'code': '#333333',
                'link': '#0563C1',
            },
            
            # 段落配置
            'paragraph': {
                'line_spacing': 1.15,
                'space_before': 6,
                'space_after': 6,
                'first_line_indent': 2,  # 段落首行缩进字符数
            },
            
            # 中文配置
            'chinese': {
                'convert_to_traditional': True,
                'punctuation_spacing': True,
                'auto_spacing': True,  # 自动在中英文之间添加空格
            },
            
            # 表格样式配置
            'table_styles': {
                'even_row_color': '#f2f2f2',      # 偶数行背景色
                'odd_row_color': '#ffffff',       # 奇数行背景色
                'header_bg_color': '#e0e0e0',     # 表头背景色
                'border_color': '#dddddd',        # 边框颜色
                'cell_height': '0.95em',          # 单元格高度
                'table_width': '100%',            # 表格宽度
            },
            
            # 增强表格样式配置（Word文档）
            'enhanced_table_styles': {
                'style': 'Table Grid',            # Word表格样式名称
                'width': 16.0,                    # 表格宽度（厘米）
                'border': True,                   # 是否显示边框
                'border_size': 1,                 # 边框宽度（磅）
                'border_color': '#000000',        # 边框颜色
                'header_bg_color': '#E7E6E6',     # 表头背景色
                'even_row_color': '#F2F2F2',      # 偶数行背景色（留空则不应用）
                'text_align': 'left',             # 单元格文本对齐方式: left, center, right, justify
                'vertical_align': 'center',       # 单元格垂直对齐方式: top, center, bottom
                'cell_padding': 2,                # 单元格内边距（磅）
                'cell_height': 0.95,              # 单元格高度（厘米）
                'autofit': False,                 # 是否自动调整宽度
                'first_row_as_header': True,      # 是否将第一行作为表头
                'keep_header_visible': True,      # 表头在分页时保持可见
                'row_height': {                   # 行高配置
                    'default': 0.95,              # 默认行高（厘米）
                    'header': 1.1,                # 表头行高（厘米）
                    'min': 0.5,                   # 最小行高（厘米）
                    'max': 5.0,                   # 最大行高（厘米）
                    'auto_adjust': True,          # 自动调整行高以适应内容
                },
            },
            
            # Markdown解析配置
            'markdown': {
                'extensions': [
                    'tables',
                    'fenced_code',
                    'codehilite',
                    'toc',
                    'footnotes',
                    'nl2br',
                ],
                'extension_configs': {
                    'codehilite': {
                        'linenums': False,
                        'use_pygments': True,
                    }
                }
            },
            
            # 文档配置
            'document': {
                'page_size': 'A4',
                'margin_top': 2.54,
                'margin_bottom': 2.54,
                'margin_left': 3.18,
                'margin_right': 3.18,
                'header': '',
                'footer': '',
                'generate_toc': True,
            },
            
            # 调试配置
            'debug': {
                'enabled': False,              # 是否启用调试模式
                'log_level': 'INFO',           # 日志级别: DEBUG, INFO, WARNING, ERROR, CRITICAL
                'log_to_file': False,          # 是否输出日志到文件
                'log_file': 'conversion.log',  # 日志文件路径
                'print_html_structure': False, # 是否打印HTML结构
                'verbose_element_info': False, # 是否打印详细的元素信息
                'timing': True,                # 是否输出处理时间统计
            },
        }
    
    def load_from_file(self, config_file):
        """
        从YAML文件加载配置
        
        @param {str} config_file - 配置文件路径
        """
        if not os.path.exists(config_file):
            self.logger.warning(f'配置文件不存在: {config_file}')
            return
        
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                user_config = yaml.safe_load(f)
                
            if user_config:
                # 递归更新配置
                self._update_dict(self.config, user_config)
                self.logger.info(f'已从 {config_file} 加载配置')
        except Exception as e:
            self.logger.error(f'加载配置文件失败: {str(e)}')
    
    def _update_dict(self, target, source):
        """
        递归更新字典
        
        @param {dict} target - 目标字典
        @param {dict} source - 源字典
        """
        for key, value in source.items():
            if isinstance(value, dict) and key in target and isinstance(target[key], dict):
                self._update_dict(target[key], value)
            else:
                target[key] = value
    
    def get(self, key, default=None):
        """
        获取配置项
        
        @param {str} key - 配置项键名，支持点号表示嵌套层级
        @param {any} default - 默认值，当配置项不存在时返回
        @returns {any} - 配置项值或默认值
        """
        keys = key.split('.')
        value = self.config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value
    
    def set(self, key, value):
        """
        设置配置项
        
        @param {str} key - 配置项键名，支持点号表示嵌套层级
        @param {any} value - 配置项值
        """
        keys = key.split('.')
        target = self.config
        
        # 遍历除最后一个键以外的所有键
        for k in keys[:-1]:
            if k not in target:
                target[k] = {}
            target = target[k]
        
        # 设置最后一个键的值
        target[keys[-1]] = value
    
    def get_all(self):
        """
        获取所有配置
        
        @returns {dict} - 完整配置字典
        """
        return self.config 