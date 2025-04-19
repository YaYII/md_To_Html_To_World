#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
主程序入口文件
用于提供命令行界面以及调用项目各个模块进行转换操作
"""

import argparse
import logging
import os
import sys
from pathlib import Path

# 使用try-except处理不同的导入场景
try:
    # 作为包安装时使用
    from src.config import Config
    from src.modules.converter import Converter
except ImportError:
    try:
        # 从当前目录导入
        from config import Config
        from modules.converter import Converter
    except ImportError:
        # 最后尝试相对路径导入
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from src.config import Config
        from src.modules.converter import Converter

# 设置默认路径
DEFAULT_INPUT_DIR = "md"  # 默认输入目录
DEFAULT_OUTPUT_DIR = "world"  # 默认输出目录
DEFAULT_KEEP_HTML = True  # 默认保存HTML文件

def setup_logging(log_level=logging.INFO):
    """
    /**
     * 设置日志配置
     * 
     * @param {logging} log_level - 日志级别
     */
    """
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler()]
    )

def parse_args():
    """
    /**
     * 解析命令行参数
     * 
     * @returns {argparse.Namespace} - 解析后的参数
     */
    """
    parser = argparse.ArgumentParser(description='将Markdown文件转换为Word文档')
    parser.add_argument('--input', '-i', type=str, default=DEFAULT_INPUT_DIR, help=f'输入文件或目录路径（默认：{DEFAULT_INPUT_DIR}）')
    parser.add_argument('--output', '-o', type=str, default=DEFAULT_OUTPUT_DIR, help=f'输出文件或目录路径（默认：{DEFAULT_OUTPUT_DIR}）')
    parser.add_argument('--batch', '-b', action='store_true', help='批量处理模式')
    parser.add_argument('--config', '-c', type=str, help='配置文件路径')
    parser.add_argument('--simplified', '-s', action='store_true', help='保持简体中文')
    parser.add_argument('--debug', '-d', action='store_true', help='启用调试模式')
    parser.add_argument('--no-html', '-n', action='store_true', help='不保留中间HTML文件')
    return parser.parse_args()

def process_single_file(input_path, output_path, config, keep_html=DEFAULT_KEEP_HTML):
    """
    /**
     * 处理单个Markdown文件
     * 
     * @param {str} input_path - 输入文件路径
     * @param {str} output_path - 输出文件路径
     * @param {Config} config - 配置对象
     * @param {bool} keep_html - 是否保留中间HTML文件
     */
    """
    logger = logging.getLogger('process_single_file')
    logger.info(f'处理文件: {input_path} -> {output_path}')
    
    # 创建转换器实例
    converter = Converter(config.config)
    
    # 进行转换
    try:
        converter.convert_file(input_path, output_path, keep_html)
        logger.info(f'Word文档已生成: {output_path}')
    finally:
        # 清理临时资源
        converter.cleanup()

def process_batch(input_dir, output_dir, config, keep_html=DEFAULT_KEEP_HTML):
    """
    /**
     * 批量处理目录中的Markdown文件
     * 
     * @param {str} input_dir - 输入目录路径
     * @param {str} output_dir - 输出目录路径
     * @param {Config} config - 配置对象
     * @param {bool} keep_html - 是否保留中间HTML文件
     */
    """
    logger = logging.getLogger('process_batch')
    logger.info(f'批量处理目录: {input_dir} -> {output_dir}')
    
    # 创建转换器实例
    converter = Converter(config.config)
    
    try:
        # 进行批量转换
        results = converter.batch_convert(input_dir, output_dir, keep_html)
        
        # 计算统计信息
        success_count = sum(1 for v in results.values() if v)
        error_count = len(results) - success_count
        
        # 输出统计信息
        logger.info(f'批处理完成。成功: {success_count}, 失败: {error_count}')
        
        if error_count > 0:
            logger.info('失败的文件:')
            for file, success in results.items():
                if not success:
                    logger.info(f'  - {file}')
    finally:
        # 清理临时资源
        converter.cleanup()

def main():
    """
    /**
     * 主函数，程序入口点
     */
    """
    # 解析命令行参数
    args = parse_args()
    
    # 设置日志级别
    log_level = logging.DEBUG if args.debug else logging.INFO
    setup_logging(log_level)
    
    logger = logging.getLogger('main')
    logger.info('开始执行World MD转换工具')
    
    # 加载配置
    config = Config()
    if args.config:
        config.load_from_file(args.config)
    
    # 设置简繁转换选项
    if args.simplified:
        config.set('chinese.convert_to_traditional', False)
    
    # 确保输入路径存在
    input_path = Path(args.input)
    if not input_path.exists():
        logger.error(f'输入路径不存在: {input_path}')
        sys.exit(1)
    
    # 确保输出目录存在
    output_path = Path(args.output)
    output_dir = output_path.parent if not output_path.is_dir() else output_path
    os.makedirs(output_dir, exist_ok=True)
    
    # 决定是否保留HTML文件（默认保留，使用--no-html选项可以禁用保留）
    keep_html = not args.no_html
    
    # 处理转换
    if args.batch or input_path.is_dir():
        process_batch(args.input, args.output, config, keep_html)
    else:
        # 如果输出路径是目录，则生成默认输出文件名
        if output_path.is_dir():
            base_name = os.path.splitext(os.path.basename(input_path))[0]
            output_file = os.path.join(args.output, f"{base_name}.docx")
        else:
            output_file = args.output
        process_single_file(args.input, output_file, config, keep_html)
    
    logger.info('转换完成')

if __name__ == '__main__':
    main() 