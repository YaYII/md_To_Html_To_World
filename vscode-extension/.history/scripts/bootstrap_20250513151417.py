#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
引导脚本
用于初始化环境、检测依赖并启动主程序
"""

import os
import sys
import subprocess
import platform
import importlib
import logging
from pathlib import Path

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger('bootstrap')

# 当前脚本目录
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def print_header():
    """
    打印启动头信息
    """
    print("\n" + "=" * 60)
    print("Markdown 转 Word 启动助手")
    print("=" * 60)
    print(f"系统: {platform.system()} {platform.release()} ({platform.architecture()[0]})")
    print(f"Python: {platform.python_version()} ({sys.executable})")
    print("=" * 60 + "\n")

def check_python_version():
    """
    检查Python版本
    """
    major, minor = sys.version_info[:2]
    if major < 3 or (major == 3 and minor < 6):
        logger.error("需要Python 3.6或更高版本")
        return False
    logger.info(f"Python版本检查通过: {major}.{minor}")
    return True

def add_to_path():
    """
    将当前目录和src目录添加到系统路径
    """
    sys.path.insert(0, SCRIPT_DIR)
    
    src_dir = os.path.join(SCRIPT_DIR, 'src')
    if os.path.exists(src_dir) and src_dir not in sys.path:
        sys.path.insert(0, src_dir)
        logger.info(f"已添加到路径: {src_dir}")

def check_dependencies():
    """
    检查必要的依赖
    """
    missing_packages = []
    required_packages = [
        ('python-docx', 'docx'),
        ('markdown', 'markdown'),
        ('beautifulsoup4', 'bs4'),
        ('opencc-python-reimplemented', 'opencc'),
        ('pyyaml', 'yaml'),
        ('lxml', 'lxml'),
    ]
    
    logger.info("检查必要的依赖包...")
    
    for package_name, module_name in required_packages:
        try:
            module = importlib.import_module(module_name)
            version = getattr(module, '__version__', '未知')
            logger.info(f"✓ {package_name} 已安装 (版本: {version})")
        except ImportError:
            logger.warning(f"✗ {package_name} 未找到")
            missing_packages.append(package_name)
        except Exception as e:
            logger.error(f"? {package_name} 导入出错: {e}")
            missing_packages.append(package_name)
    
    return missing_packages

def install_dependencies(packages):
    """
    安装缺失的依赖
    """
    if not packages:
        return True
        
    logger.info(f"尝试安装缺失的依赖: {', '.join(packages)}")
    
    try:
        # 首先尝试使用特定脚本
        install_script = os.path.join(SCRIPT_DIR, 'install_dependencies.py')
        if os.path.exists(install_script):
            logger.info(f"使用安装脚本: {install_script}")
            result = subprocess.run(
                [sys.executable, install_script],
                check=True,
                capture_output=True,
                text=True
            )
            logger.info("依赖安装成功")
            return True
        
        # 如果脚本不存在，使用pip直接安装
        logger.info("使用pip安装依赖")
        for package in packages:
            logger.info(f"安装 {package}...")
            subprocess.run(
                [sys.executable, '-m', 'pip', 'install', package],
                check=True,
                capture_output=True,
                text=True
            )
        logger.info("所有依赖安装完成")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"安装依赖失败: {e.stderr if e.stderr else str(e)}")
        return False
    except Exception as e:
        logger.error(f"安装依赖时出错: {str(e)}")
        return False

def check_python_path():
    """
    检查Python路径
    """
    try:
        result = subprocess.run(
            [sys.executable, '-c', 'import sys; print(sys.executable)'],
            check=True,
            capture_output=True,
            text=True
        )
        logger.info(f"使用的Python解释器: {result.stdout.strip()}")
        return True
    except Exception as e:
        logger.error(f"获取Python路径时出错: {str(e)}")
        return False

def run_main_script(args=None):
    """
    运行主脚本
    """
    if args is None:
        args = sys.argv[1:]
    
    run_script = os.path.join(SCRIPT_DIR, 'run.py')
    
    if not os.path.exists(run_script):
        logger.error(f"找不到主脚本: {run_script}")
        return False
    
    try:
        command = [sys.executable, run_script] + args
        logger.info(f"执行命令: {' '.join(command)}")
        process = subprocess.Popen(
            command,
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        return_code = process.wait()
        
        if return_code != 0:
            logger.error(f"主脚本执行失败，退出码: {return_code}")
            return False
        
        logger.info("主脚本执行成功")
        return True
    except Exception as e:
        logger.error(f"运行主脚本时出错: {str(e)}")
        return False

def main():
    """
    主函数
    """
    print_header()
    
    # 检查Python版本
    if not check_python_version():
        sys.exit(1)
    
    # 检查Python路径
    check_python_path()
    
    # 添加到路径
    add_to_path()
    
    # 检查依赖
    missing_packages = check_dependencies()
    
    # 安装缺失的依赖
    if missing_packages and not install_dependencies(missing_packages):
        logger.warning("一些依赖未能安装，可能会影响功能")
        response = input("是否继续? (y/n): ").lower()
        if response != 'y':
            logger.info("用户选择退出")
            sys.exit(1)
    
    # 运行主脚本
    success = run_main_script()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main() 