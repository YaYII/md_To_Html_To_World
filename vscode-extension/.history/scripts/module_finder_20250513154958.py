#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
模块查找助手脚本
在运行时添加必要的目录到Python路径，确保模块可以被正确导入
"""

import os
import sys
import logging
import importlib.util
from pathlib import Path

logger = logging.getLogger('module_finder')

def setup_module_paths():
    """
    设置模块查找路径，确保所有必要的模块可以被找到
    """
    # 添加当前脚本所在目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)
        print(f"添加路径: {script_dir}")
    
    # 添加父目录
    parent_dir = os.path.dirname(script_dir)
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)
        print(f"添加路径: {parent_dir}")
    
    # 添加src目录和其子目录
    src_paths = [
        os.path.join(script_dir, 'src'),  # scripts/src
        os.path.join(parent_dir, 'src'),  # ../src
        os.path.join(script_dir, 'src', 'modules'),  # scripts/src/modules
    ]
    
    for path in src_paths:
        if os.path.exists(path) and path not in sys.path:
            sys.path.insert(0, path)
            print(f"添加路径: {path}")
    
    # 添加扩展安装目录的特殊处理
    vscode_ext_dir = None
    
    # 检查是否在VS Code扩展目录下运行
    if '.vscode/extensions' in script_dir or '.cursor/extensions' in script_dir:
        vscode_ext_dir = script_dir
        # 向上查找到扩展根目录
        while vscode_ext_dir and not os.path.exists(os.path.join(vscode_ext_dir, 'package.json')):
            parent = os.path.dirname(vscode_ext_dir)
            if parent == vscode_ext_dir:  # 已到达根目录
                break
            vscode_ext_dir = parent
        
        if vscode_ext_dir:
            print(f"检测到扩展目录: {vscode_ext_dir}")
            # 添加扩展的所有可能的Python路径
            ext_paths = [
                os.path.join(vscode_ext_dir, 'scripts', 'src'),
                os.path.join(vscode_ext_dir, 'scripts', 'src', 'modules'),
                os.path.join(vscode_ext_dir, 'src', 'python'),
                os.path.join(vscode_ext_dir, 'python'),
            ]
            
            for path in ext_paths:
                if os.path.exists(path) and path not in sys.path:
                    sys.path.insert(0, path)
                    print(f"添加扩展路径: {path}")

def find_converter_module():
    """
    尝试查找和导入converter模块，返回导入的模块对象
    """
    possible_paths = [
        ('src.modules.converter', '标准导入路径'),
        ('modules.converter', '相对导入路径'),
        ('converter', '直接导入'),
        ('src.converter', 'src目录下的直接导入'),
    ]
    
    for module_path, description in possible_paths:
        try:
            print(f"尝试导入: {module_path} ({description})")
            module = importlib.import_module(module_path)
            print(f"✓ 成功导入: {module_path}")
            return module
        except ImportError as e:
            print(f"✗ 导入失败: {module_path} - {str(e)}")
    
    # 如果常规导入都失败，尝试从文件路径直接导入
    script_dir = os.path.dirname(os.path.abspath(__file__))
    src_dir = os.path.join(script_dir, 'src')
    
    converter_files = [
        os.path.join(src_dir, 'modules', 'converter.py'),
        os.path.join(src_dir, 'converter.py'),
        os.path.join(script_dir, 'converter.py'),
    ]
    
    for file_path in converter_files:
        if os.path.exists(file_path):
            try:
                print(f"尝试从文件导入: {file_path}")
                module_name = os.path.splitext(os.path.basename(file_path))[0]
                spec = importlib.util.spec_from_file_location(module_name, file_path)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                print(f"✓ 成功从文件导入: {file_path}")
                return module
            except Exception as e:
                print(f"✗ 从文件导入失败: {file_path} - {str(e)}")
    
    raise ImportError("无法找到或导入converter模块")

def check_module_exists(module_name):
    """
    检查指定的模块是否存在
    """
    try:
        importlib.import_module(module_name)
        return True
    except ImportError:
        return False

def main():
    """
    主函数，用于测试模块导入
    """
    print("--- 模块查找诊断 ---")
    print(f"Python: {sys.version}")
    print(f"运行路径: {os.getcwd()}")
    
    setup_module_paths()
    
    print("\nPython路径:")
    for path in sys.path:
        print(f"  - {path}")
    
    print("\n检查关键模块:")
    modules_to_check = [
        'src', 'modules', 'converter', 
        'src.modules', 'src.modules.converter',
        'modules.converter'
    ]
    
    for module in modules_to_check:
        status = "✓ 存在" if check_module_exists(module) else "✗ 不存在"
        print(f"{module}: {status}")
    
    print("\n尝试导入converter模块:")
    try:
        converter = find_converter_module()
        print(f"模块导入成功，类: {converter.Converter}")
    except Exception as e:
        print(f"导入失败: {e}")
    
    print("--- 诊断结束 ---")

if __name__ == "__main__":
    main() 