#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
World MD 运行脚本
提供从命令行运行转换工具的入口点
"""

import os
import sys
import argparse
import logging
from pathlib import Path

# 将当前目录添加到系统路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 设置默认路径
DEFAULT_INPUT_DIR = "md"  # 默认输入目录
DEFAULT_OUTPUT_DIR = "world"  # 默认输出目录
DEFAULT_KEEP_HTML = True  # 默认保存HTML文件
DEFAULT_CONFIG_FILE = "config_example.yaml"  # 默认配置文件名

# 为了防止导入问题，我们直接在这里实现main函数
def setup_logging(log_level=logging.INFO):
    """
    设置日志配置
    """
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler()]
    )

def find_config_file():
    """
    查找配置文件
    
    返回找到的配置文件路径或None
    """
    # 首先检查当前目录
    if os.path.exists(DEFAULT_CONFIG_FILE):
        return DEFAULT_CONFIG_FILE
    
    # 检查src目录
    src_config = os.path.join("src", DEFAULT_CONFIG_FILE)
    if os.path.exists(src_config):
        return src_config
    
    # 检查可执行文件所在目录
    exe_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
    exe_config = os.path.join(exe_dir, DEFAULT_CONFIG_FILE)
    if os.path.exists(exe_config):
        return exe_config
    
    return None

def parse_args():
    """
    解析命令行参数
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

def main():
    """
    主函数
    """
    # 导入必要的模块
    from src.config import Config
    from src.modules.converter import Converter
    
    # 解析命令行参数
    args = parse_args()
    
    # 设置日志级别
    log_level = logging.DEBUG if args.debug else logging.INFO
    setup_logging(log_level)
    
    logger = logging.getLogger('main')
    logger.info('开始执行World MD转换工具')
    
    # 加载配置
    config = Config()
    
    # 首先检查命令行指定的配置文件
    if args.config:
        if os.path.exists(args.config):
            logger.info(f'从命令行指定的配置文件加载: {args.config}')
            config.load_from_file(args.config)
        else:
            logger.warning(f'命令行指定的配置文件不存在: {args.config}')
    else:
        # 尝试加载默认配置文件
        default_config = find_config_file()
        if default_config:
            logger.info(f'从默认位置加载配置文件: {default_config}')
            config.load_from_file(default_config)
        else:
            logger.info('未找到配置文件，使用默认配置')
    
    # 设置简繁转换选项
    if args.simplified:
        config.set('chinese.convert_to_traditional', False)
        logger.info('设置为保持简体中文')
    
    # 确保输入路径存在
    input_path = Path(args.input)
    if not input_path.exists():
        logger.error(f'输入路径不存在: {input_path}')
        sys.exit(1)
    
    # 确保输出目录存在
    output_path = Path(args.output)
    output_dir = output_path if output_path.is_dir() else output_path.parent
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

def process_single_file(input_path, output_path, config, keep_html=DEFAULT_KEEP_HTML):
    """
    处理单个文件
    """
    from src.modules.converter import Converter
    
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
    批量处理目录
    """
    from src.modules.converter import Converter
    
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

if __name__ == "__main__":
    main() 