#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
测试脚本
用于验证 Markdown 到 Word 的转换功能
"""

import os
import sys
import logging
from pathlib import Path

# 添加当前目录到系统路径，以便导入当前目录的模块
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src import convert_md_to_word

def setup_logging():
    """
    设置日志配置
    """
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler()]
    )

def test_single_file():
    """
    测试单个文件转换
    """
    # 获取项目根目录
    root_dir = Path(__file__).parent.parent
    
    # 定义输入和输出路径
    input_file = root_dir / 'md' / 'sample.md'
    output_dir = root_dir / 'world'
    os.makedirs(output_dir, exist_ok=True)
    output_file = output_dir / 'sample.docx'
    
    # 转换文件
    logging.info(f'正在转换文件: {input_file} -> {output_file}')
    convert_md_to_word(input_file, output_file, keep_html=True)
    logging.info(f'转换完成，输出文件: {output_file}')

def test_batch():
    """
    测试批量转换
    """
    # 获取项目根目录
    root_dir = Path(__file__).parent.parent
    
    # 定义输入和输出目录
    input_dir = root_dir / 'md'
    output_dir = root_dir / 'world'
    
    # 确保输出目录存在
    os.makedirs(output_dir, exist_ok=True)
    
    # 遍历输入目录中的所有md文件
    md_files = list(input_dir.glob('**/*.md'))
    logging.info(f'找到 {len(md_files)} 个 Markdown 文件')
    
    for md_file in md_files:
        # 构建相对路径
        rel_path = md_file.relative_to(input_dir)
        
        # 构建输出文件路径
        output_subdir = output_dir / rel_path.parent
        os.makedirs(output_subdir, exist_ok=True)
        
        output_file = output_subdir / f'{md_file.stem}.docx'
        
        # 转换文件
        logging.info(f'正在转换文件: {md_file} -> {output_file}')
        convert_md_to_word(str(md_file), str(output_file), keep_html=True)
    
    logging.info('批量转换完成')

if __name__ == '__main__':
    setup_logging()
    
    # 判断命令行参数
    if len(sys.argv) > 1 and sys.argv[1] == '--batch':
        test_batch()
    else:
        test_single_file() 