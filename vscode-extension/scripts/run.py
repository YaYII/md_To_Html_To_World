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
import traceback
from pathlib import Path
import importlib

# --- 导入模块查找助手 ---
try:
    # 尝试导入模块查找助手
    script_dir = os.path.dirname(os.path.abspath(__file__))
    module_finder_path = os.path.join(script_dir, 'module_finder.py')
    
    if os.path.exists(module_finder_path):
        print("使用模块查找助手...")
        import importlib.util
        spec = importlib.util.spec_from_file_location("module_finder", module_finder_path)
        module_finder = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module_finder)
        module_finder.setup_module_paths()
except Exception as e:
    print(f"导入模块查找助手时出错: {e}")
    # 继续使用原始路径设置方法

# --- 路径设置 ---
# 将scripts目录添加到sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

# 将src目录添加到sys.path
SRC_DIR = os.path.join(SCRIPT_DIR, 'src')
if os.path.exists(SRC_DIR) and SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

# 将父目录添加到sys.path，以便能找到src模块
PARENT_DIR = os.path.dirname(SCRIPT_DIR)
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

# 添加modules目录
MODULES_DIR = os.path.join(SRC_DIR, 'modules')
if os.path.exists(MODULES_DIR) and MODULES_DIR not in sys.path:
    sys.path.insert(0, MODULES_DIR)

# --- 日志设置 ---
def setup_logging(log_level=logging.INFO):
    """
    设置日志配置
    """
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler()]
    )

# --- 诊断信息 ---
def print_diagnostics():
    """
    打印诊断信息
    """
    print("--- run.py 启动诊断信息 ---", file=sys.stderr)
    print(f"Python Executable: {sys.executable}", file=sys.stderr)
    print(f"Python Version: {sys.version}", file=sys.stderr)
    print(f"运行目录: {os.getcwd()}", file=sys.stderr)
    print(f"脚本目录: {SCRIPT_DIR}", file=sys.stderr)
    print("sys.path:", file=sys.stderr)
    for p in sys.path:
        print(f"  - {p}", file=sys.stderr)

    # 检查依赖可用性
    dependencies = [
        ('python-docx', 'docx'),
        ('markdown', 'markdown'),
        ('beautifulsoup4', 'bs4'),
        ('opencc-python-reimplemented', 'opencc'),
        ('pyyaml', 'yaml'),
        ('lxml', 'lxml'),
        ('requests', 'requests')
    ]

    print("\n检查依赖:", file=sys.stderr)
    for package_name, module_name in dependencies:
        try:
            module = importlib.import_module(module_name)
            version = getattr(module, '__version__', '未知')
            print(f"✓ {package_name} 已安装 (版本: {version})", file=sys.stderr)
        except ModuleNotFoundError:
            print(f"✗ {package_name} 未找到", file=sys.stderr)
        except Exception as e:
            print(f"? {package_name} 导入出错: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)

    print("--- 诊断信息结束 ---\n", file=sys.stderr)

# 打印诊断信息
print_diagnostics()

# 尝试安装缺失的依赖
def install_missing_dependencies():
    """
    尝试安装缺失的依赖
    """
    try:
        # 尝试运行安装脚本
        install_script = os.path.join(SCRIPT_DIR, 'install_dependencies.py')
        if os.path.exists(install_script):
            print("尝试安装缺失的依赖...", file=sys.stderr)
            import subprocess
            result = subprocess.run(
                [sys.executable, install_script],
                stderr=subprocess.PIPE,
                stdout=subprocess.PIPE,
                text=True
            )
            if result.returncode == 0:
                print("依赖安装成功", file=sys.stderr)
                # 重新导入模块
                import importlib
                importlib.invalidate_caches()
                return True
            else:
                print(f"依赖安装失败: {result.stderr}", file=sys.stderr)
                return False
        return False
    except Exception as e:
        print(f"安装依赖时出错: {e}", file=sys.stderr)
        return False

# 设置默认路径
DEFAULT_INPUT_DIR = "md"  # 默认输入目录
DEFAULT_OUTPUT_DIR = "world"  # 默认输出目录
DEFAULT_KEEP_HTML = True  # 默认保存HTML文件
DEFAULT_CONFIG_FILE = "config_example.yaml"  # 默认配置文件名

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
    
    # 检查scripts目录下的配置文件
    scripts_config = os.path.join(SCRIPT_DIR, DEFAULT_CONFIG_FILE)
    if os.path.exists(scripts_config):
        return scripts_config
    
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
    导入必要的模块
    返回导入状态和错误信息
    """
    try:
        # 尝试使用模块查找助手
        try:
            # 首先尝试使用模块查找助手找到converter模块
            script_dir = os.path.dirname(os.path.abspath(__file__))
            module_finder_path = os.path.join(script_dir, 'module_finder.py')
            
            if os.path.exists(module_finder_path):
                import importlib.util
                spec = importlib.util.spec_from_file_location("module_finder", module_finder_path)
                module_finder = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module_finder)
                
                # 获取Config和Converter
                try:
                    from src.config import Config
                except ImportError:
                    # 直接从文件导入
                    config_path = os.path.join(script_dir, 'src', 'config.py')
                    if os.path.exists(config_path):
                        spec = importlib.util.spec_from_file_location("config", config_path)
                        config_module = importlib.util.module_from_spec(spec)
                        spec.loader.exec_module(config_module)
                        Config = config_module.Config
                
                # 尝试导入converter模块
                converter_module = module_finder.find_converter_module()
                Converter = converter_module.Converter
                
                # 将模块添加到全局命名空间
                globals()['Config'] = Config
                globals()['Converter'] = Converter
                
                print("✓ 已使用模块查找助手成功导入模块")
                return True, None
        except Exception as module_finder_error:
            print(f"! 使用模块查找助手导入失败: {module_finder_error}")
            # 继续尝试常规导入
        
        # 尝试标准导入
        from src.config import Config
        
        # 尝试多种导入路径
        try:
            from src.modules.converter import Converter
        except ImportError:
            try:
                from modules.converter import Converter
            except ImportError:
                import converter
                Converter = converter.Converter
                
        # 将模块添加到全局命名空间
        globals()['Config'] = Config
        globals()['Converter'] = Converter
        
        return True, None
    except ImportError as e:
        # 尝试安装依赖
        if install_missing_dependencies():
            # 重试导入
            try:
                # 与上面相同的导入逻辑，但在安装依赖后
                # 尝试使用模块查找助手
                try:
                    script_dir = os.path.dirname(os.path.abspath(__file__))
                    module_finder_path = os.path.join(script_dir, 'module_finder.py')
                    
                    if os.path.exists(module_finder_path):
                        import importlib.util
                        spec = importlib.util.spec_from_file_location("module_finder", module_finder_path)
                        module_finder = importlib.util.module_from_spec(spec)
                        spec.loader.exec_module(module_finder)
                        
                        # 获取Config和Converter
                        try:
                            from src.config import Config
                        except ImportError:
                            # 直接从文件导入
                            config_path = os.path.join(script_dir, 'src', 'config.py')
                            if os.path.exists(config_path):
                                spec = importlib.util.spec_from_file_location("config", config_path)
                                config_module = importlib.util.module_from_spec(spec)
                                spec.loader.exec_module(config_module)
                                Config = config_module.Config
                        
                        # 尝试导入converter模块
                        converter_module = module_finder.find_converter_module()
                        Converter = converter_module.Converter
                        
                        # 将模块添加到全局命名空间
                        globals()['Config'] = Config
                        globals()['Converter'] = Converter
                        
                        print("✓ 已使用模块查找助手成功导入模块(安装依赖后)")
                        return True, None
                except Exception as module_finder_error:
                    print(f"! 安装依赖后使用模块查找助手导入失败: {module_finder_error}")
                
                # 尝试标准导入
                from src.config import Config
                
                # 尝试多种导入路径
                try:
                    from src.modules.converter import Converter
                except ImportError:
                    try:
                        from modules.converter import Converter
                    except ImportError:
                        import converter
                        Converter = converter.Converter
                
                # 将模块添加到全局命名空间
                globals()['Config'] = Config
                globals()['Converter'] = Converter
                
                return True, None
            except ImportError as e2:
                return False, f"导入失败: {e2}"
            except Exception as e3:
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