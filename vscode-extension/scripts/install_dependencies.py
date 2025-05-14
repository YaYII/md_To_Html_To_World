#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
依赖安装脚本
用于安装和验证Markdown到Word转换所需的Python依赖
"""

import os
import sys
import subprocess
import json
import platform
import logging
from pathlib import Path

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger('install_dependencies')

# 必要的依赖列表
REQUIRED_PACKAGES = [
    'python-docx',
    'markdown',
    'beautifulsoup4',
    'opencc-python-reimplemented',
    'pyyaml',
    'lxml'
]

def check_pip_version():
    """
    检查pip版本
    """
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'pip', '--version'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        logger.info(f"检测到pip: {result.stdout.strip()}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"pip检测失败: {e.stderr.strip() if e.stderr else str(e)}")
        return False
    except Exception as e:
        logger.error(f"检查pip时出错: {str(e)}")
        return False

def get_installed_packages():
    """
    获取已安装的包列表
    """
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'pip', 'list', '--format=json'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        packages = json.loads(result.stdout)
        # 创建包名到版本的映射
        package_dict = {pkg['name'].lower(): pkg['version'] for pkg in packages}
        return package_dict
    except subprocess.CalledProcessError as e:
        logger.error(f"获取已安装包列表失败: {e.stderr.strip() if e.stderr else str(e)}")
        return {}
    except json.JSONDecodeError:
        logger.error("解析pip列表输出失败")
        return {}
    except Exception as e:
        logger.error(f"获取已安装包列表时出错: {str(e)}")
        return {}

def install_package(package_name):
    """
    安装单个包
    """
    try:
        logger.info(f"正在安装 {package_name}...")
        result = subprocess.run(
            [sys.executable, '-m', 'pip', 'install', package_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        logger.info(f"{package_name} 安装成功")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"{package_name} 安装失败: {e.stderr.strip() if e.stderr else str(e)}")
        return False
    except Exception as e:
        logger.error(f"安装 {package_name} 时出错: {str(e)}")
        return False

def verify_installation():
    """
    验证关键模块的安装
    """
    verification_results = {}
    
    # 检查python-docx
    try:
        import docx
        verification_results['python-docx'] = f"已安装 (版本: {docx.__version__ if hasattr(docx, '__version__') else '未知'})"
    except ImportError:
        verification_results['python-docx'] = "安装失败"
    except Exception as e:
        verification_results['python-docx'] = f"验证出错: {str(e)}"
    
    # 检查markdown
    try:
        import markdown
        verification_results['markdown'] = f"已安装 (版本: {markdown.__version__ if hasattr(markdown, '__version__') else '未知'})"
    except ImportError:
        verification_results['markdown'] = "安装失败"
    except Exception as e:
        verification_results['markdown'] = f"验证出错: {str(e)}"
    
    # 检查beautifulsoup4
    try:
        import bs4
        verification_results['beautifulsoup4'] = f"已安装 (版本: {bs4.__version__ if hasattr(bs4, '__version__') else '未知'})"
    except ImportError:
        verification_results['beautifulsoup4'] = "安装失败"
    except Exception as e:
        verification_results['beautifulsoup4'] = f"验证出错: {str(e)}"
    
    # 检查opencc-python-reimplemented
    try:
        import opencc
        verification_results['opencc'] = f"已安装 (版本: {opencc.__version__ if hasattr(opencc, '__version__') else '未知'})"
    except ImportError:
        verification_results['opencc'] = "安装失败"
    except Exception as e:
        verification_results['opencc'] = f"验证出错: {str(e)}"
    
    # 检查pyyaml
    try:
        import yaml
        verification_results['pyyaml'] = f"已安装 (版本: {yaml.__version__ if hasattr(yaml, '__version__') else '未知'})"
    except ImportError:
        verification_results['pyyaml'] = "安装失败"
    except Exception as e:
        verification_results['pyyaml'] = f"验证出错: {str(e)}"
    
    # 检查lxml
    try:
        import lxml
        verification_results['lxml'] = f"已安装 (版本: {lxml.__version__ if hasattr(lxml, '__version__') else '未知'})"
    except ImportError:
        verification_results['lxml'] = "安装失败"
    except Exception as e:
        verification_results['lxml'] = f"验证出错: {str(e)}"
    
    return verification_results

def add_package_to_sys_path():
    """
    将当前目录添加到系统路径，确保可以导入本地模块
    """
    # 当前脚本所在目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # 父目录
    parent_dir = os.path.dirname(script_dir)
    # src目录
    src_dir = os.path.join(script_dir, 'src')
    
    paths_to_add = [script_dir, parent_dir, src_dir]
    for p in paths_to_add:
        if p not in sys.path:
            sys.path.insert(0, p)
            logger.info(f"已添加到sys.path: {p}")

def main():
    """
    主函数
    """
    logger.info(f"Python版本: {platform.python_version()}")
    logger.info(f"Python路径: {sys.executable}")
    logger.info(f"操作系统: {platform.platform()}")
    
    # 检查pip
    if not check_pip_version():
        logger.error("无法检测到pip，请确保pip已正确安装")
        sys.exit(1)
    
    # 获取已安装的包
    installed_packages = get_installed_packages()
    
    # 安装所需包
    all_success = True
    for package in REQUIRED_PACKAGES:
        if package.lower() not in installed_packages:
            success = install_package(package)
            if not success:
                all_success = False
        else:
            logger.info(f"{package} 已安装 (版本: {installed_packages[package.lower()]})")
    
    # 添加当前目录到sys.path
    add_package_to_sys_path()
    
    # 验证安装
    if all_success:
        logger.info("正在验证安装...")
        verification = verify_installation()
        
        # 打印验证结果
        for package, status in verification.items():
            logger.info(f"{package}: {status}")
        
        # 检查是否有失败的包
        failed = [pkg for pkg, status in verification.items() if "安装失败" in status]
        if failed:
            logger.error(f"以下包安装失败: {', '.join(failed)}")
            sys.exit(1)
        else:
            logger.info("所有依赖已成功安装和验证")
    else:
        logger.error("一些包安装失败，请查看日志获取详情")
        sys.exit(1)

if __name__ == "__main__":
    main() 