"""
处理器模块初始化文件
用于导入和注册各种HTML元素处理器
"""

from .base import BaseProcessor
from .paragraph import ParagraphProcessor
from .heading import HeadingProcessor
from .list import ListProcessor
from .table import TableProcessor
from .code import CodeProcessor
from .inline import InlineProcessor
from .image import ImageProcessor

# 注册处理器工厂
processor_factory = {
    'p': ParagraphProcessor,
    'h1': HeadingProcessor,
    'h2': HeadingProcessor,
    'h3': HeadingProcessor,
    'h4': HeadingProcessor,
    'h5': HeadingProcessor,
    'h6': HeadingProcessor,
    'ul': ListProcessor,
    'ol': ListProcessor,
    'table': TableProcessor,
    'pre': CodeProcessor,
    'code': CodeProcessor,
    'img': ImageProcessor,
}

__all__ = [
    'BaseProcessor',
    'ParagraphProcessor',
    'HeadingProcessor',
    'ListProcessor',
    'TableProcessor',
    'CodeProcessor',
    'InlineProcessor',
    'ImageProcessor',
    'processor_factory',
] 