#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
将Markdown文件转换为Word文档
"""

import argparse
import logging
import os
import sys
import subprocess
from pathlib import Path
import importlib.util
import importlib.metadata
import platform

# 设置默认值
DEFAULT_INPUT_DIR = "."
DEFAULT_OUTPUT_DIR = "."
DEFAULT_KEEP_HTML = True

# 设置日志格式
logger = None

def setup_logging(log_level=logging.INFO):
    """
    设置日志记录
    """
    global logger
    
    # 创建日志格式化器
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # 创建控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    
    # 配置根日志记录器
    logging.basicConfig(level=log_level, handlers=[console_handler])
    
    # 获取主日志记录器
    logger = logging.getLogger('markdown_to_word')

def print_diagnostics():
    """
    打印诊断信息
    """
    print("系统信息:")
    print(f"  操作系统: {platform.system()} {platform.release()}")
    print(f"  Python版本: {platform.python_version()}")
    print(f"  解释器路径: {sys.executable}")
    
    print("\n已安装的包:")
    try:
        for package in importlib.metadata.distributions():
            pkg_name = package.metadata['Name']
            pkg_version = package.metadata['Version']
            if pkg_name in ['python-docx', 'markdown', 'beautifulsoup4', 'opencc-python-reimplemented', 'pyyaml']:
                print(f"  {pkg_name}: {pkg_version}")
    except Exception as e:
        print(f"  无法获取包信息: {e}")
    
    print("\n环境变量:")
    print(f"  PYTHONPATH: {os.environ.get('PYTHONPATH', '未设置')}")
    
    # 检查文件目录结构
    curr_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"\n当前文件夹结构 ({curr_dir}):")
    for root, dirs, files in os.walk(curr_dir, topdown=True):
        depth = root[len(curr_dir):].count(os.sep)
        indent = ' ' * 2 * depth
        print(f"{indent}{os.path.basename(root)}/")
        for f in files:
            if f.endswith(('.py', '.md', '.yaml', '.txt')):
                print(f"{indent}  {f}")
                
    # 检查是否可以导入关键模块
    print("\n模块导入测试:")
    modules_to_test = ['markdown', 'docx', 'bs4', 'yaml']
    for module in modules_to_test:
        try:
            spec = importlib.util.find_spec(module)
            if spec is not None:
                print(f"  {module}: 可用")
            else:
                print(f"  {module}: 不可用 (找不到规格)")
        except ImportError as e:
            print(f"  {module}: 导入错误 ({e})")

def install_missing_dependencies():
    """
    安装缺失的Python依赖
    """
    packages = [
        'python-docx',
        'markdown',
        'beautifulsoup4',
        'opencc-python-reimplemented',
        'pyyaml',
        'lxml'
    ]
    
    pip_cmd = [sys.executable, '-m', 'pip', 'install']
    
    print("正在安装依赖...")
    for package in packages:
        print(f"安装 {package}...")
        try:
            subprocess.check_call(pip_cmd + [package])
            print(f"✓ 成功安装 {package}")
        except subprocess.CalledProcessError as e:
            print(f"✗ 安装 {package} 失败: {e}")
            
    print("\n依赖安装完成。请重新运行转换命令。")

def find_config_file():
    """
    查找配置文件
    """
    # 首先检查当前目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    config_paths = [
        os.path.join(current_dir, 'config.yaml'),
        os.path.join(current_dir, 'config_example.yaml'),
        os.path.join(current_dir, '..', 'config.yaml')
    ]
    
    for path in config_paths:
        if os.path.exists(path):
            return path
    
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
    parser.add_argument('--print-html', '-p', action='store_true', help='将HTML内容输出到标准输出')
    return parser.parse_args()

def import_modules():
    """
    导入必要模块
    返回: (success, error_message)
    """
    try:
        # 首先尝试导入基础依赖
        import yaml
        import markdown
        from bs4 import BeautifulSoup
        
        # 然后尝试导入源代码模块
        try:
            # 添加当前目录到Python路径
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            
            # 尝试导入
            from src import config
            from src.modules import converter
            from src.modules.markdown_to_html import MarkdownToHtml
            from src.modules.html_to_word.converter import HtmlToWordConverter
            
            return True, None
        except ImportError as e:
            try:
                # 如果直接导入失败，尝试在src目录中查找相应的模块
                src_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src")
                sys.path.insert(0, src_dir)
                
                import config
                from modules import converter
                from modules.markdown_to_html import MarkdownToHtml
                from modules.html_to_word.converter import HtmlToWordConverter
                
                return True, None
            except ImportError as e2:
                try:
                    # 最后尝试直接导入模块
                    import converter
                    import markdown_to_html
                    import html_to_word_converter
                    
                    return True, None
                except ImportError as e3:
                    return False, f"导入出错: {e3}"
        return False, f"导入失败: {e}"
    except Exception as e:
        return False, f"导入出错: {e}"

def main():
    """
    主函数
    """
    # 解析命令行参数
    args = parse_args()
    
    # 设置日志级别 (确保在尝试导入 src 之前设置)
    log_level = logging.DEBUG if args.debug else logging.INFO
    setup_logging(log_level)
    logger = logging.getLogger('main')
    logger.info('开始执行World MD转换工具')

    # 导入必要的模块
    import_success, import_error = import_modules()
    if not import_success:
        logger.error(f'无法导入必要的模块: {import_error}')
        sys.exit(1)

    # 现在可以安全导入所需模块
    from src.config import Config
    from src.modules.converter import Converter
    logger.debug('成功导入 src 模块')
        
    logger.info('开始加载配置...')
    
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
    # 添加print_html参数传递
    print_html = args.print_html
    
    logger.info('准备处理转换...')
    
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
        process_single_file(args.input, output_file, config, keep_html, print_html)
    
    logger.info('转换完成')

def process_single_file(input_path, output_path, config, keep_html=DEFAULT_KEEP_HTML, print_html=False):
    """
    处理单个文件
    
    Args:
        input_path: 输入文件路径
        output_path: 输出文件路径
        config: 配置对象
        keep_html: 是否保留HTML文件
        print_html: 是否将HTML内容输出到标准输出
    """
    logger = logging.getLogger('process_single_file')
    logger.info(f'处理文件: {input_path} -> {output_path}')
    
    # 创建转换器实例
    # 使用已导入的Converter类
    global Converter
    if 'Converter' not in globals():
        # 尝试多种方式导入
        try:
            from src.modules.converter import Converter
        except ImportError:
            try:
                from modules.converter import Converter
            except ImportError:
                import converter
                Converter = converter.Converter
    
    # 进行转换
    try:
        converter = Converter(config.config)
        
        # 如果需要输出HTML到标准输出
        if print_html:
            # 先转换Markdown到HTML，但不保存到文件
            html_content = converter.md_to_html.convert_file(input_path)
            print(html_content)  # 直接打印HTML内容到标准输出
            
            # 如果不需要生成word文档，可以在这里返回
            if not os.path.dirname(output_path):
                return
        
        # 处理HTML文件路径 - 直接保存在源文件所在目录
        if keep_html:
            # 获取源文件所在目录
            source_dir = os.path.dirname(input_path)
            base_name = os.path.basename(os.path.splitext(input_path)[0])
            # 直接在源文件目录创建HTML文件
            html_file = os.path.join(source_dir, f"{base_name}.html")
            logger.info(f'HTML文件将保存到: {html_file}')
        else:
            html_file = None
                
        # 调用转换函数    
        if html_file:
            # 直接转换并保存到指定的HTML文件路径
            html_content = converter.md_to_html.convert_file(input_path, html_file)
            # 继续转换HTML到Word
            converter.html_to_word.convert_file(html_file, output_path)
        else:
            # 使用原始的转换流程
            converter.convert_file(input_path, output_path, keep_html)
            
        logger.info(f'Word文档已生成: {output_path}')
    finally:
        # 清理临时资源
        converter.cleanup()

def process_batch(input_dir, output_dir, config, keep_html=DEFAULT_KEEP_HTML):
    """
    批量处理目录
    """
    logger = logging.getLogger('process_batch')
    logger.info(f'批量处理目录: {input_dir} -> {output_dir}')
    
    # 创建转换器实例
    # 使用已导入的Converter类
    global Converter
    if 'Converter' not in globals():
        # 尝试多种方式导入
        try:
            from src.modules.converter import Converter
        except ImportError:
            try:
                from modules.converter import Converter
            except ImportError:
                import converter
                Converter = converter.Converter
    
    try:
        # 进行批量转换
        converter_instance = Converter(config.config)
        results = converter_instance.batch_convert(input_dir, output_dir, keep_html)
        
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
        if 'converter_instance' in locals():
            converter_instance.cleanup()

if __name__ == "__main__":
    main() 