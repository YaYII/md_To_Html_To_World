#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
World MD - Markdown到Word文档转换工具
"""

# 使用绝对导入替代相对导入
try:
    # 当作为包安装时使用
    from src.modules.converter import Converter
    from src.config import Config
except ImportError:
    # 当在本地直接运行时使用
    from modules.converter import Converter
    from config import Config

__version__ = '1.0.0'
__all__ = ['Converter', 'Config']

def convert_md_to_word(input_file, output_file, config=None, keep_html=False):
    """
    /**
     * 转换Markdown文件到Word文档的便捷函数
     * 
     * @param {str} input_file - 输入Markdown文件路径
     * @param {str} output_file - 输出Word文件路径
     * @param {dict|Config} config - 配置参数或配置对象，如不提供则使用默认配置
     * @param {bool} keep_html - 是否保留中间HTML文件
     * @returns {Document} Word文档对象
     */
    """
    if config is None:
        # 使用绝对导入
        try:
            from src.config import Config
        except ImportError:
            from config import Config
        config = Config().config
    elif isinstance(config, Config):
        config = config.config
        
    converter = Converter(config)
    try:
        return converter.convert_file(input_file, output_file, keep_html)
    finally:
        converter.cleanup() 