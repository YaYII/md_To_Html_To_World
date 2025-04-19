#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
World MD 简单打包脚本
适用于Windows、macOS和Linux系统
"""

import os
import sys
import shutil
import platform
import subprocess
from pathlib import Path

def main():
    """主函数，执行打包操作"""
    print("开始打包 World MD 应用程序...")
    
    # 检测操作系统
    os_name = platform.system()
    print(f"检测到操作系统: {os_name}")
    
    # 确保PyInstaller已安装
    try:
        import PyInstaller
        print(f"PyInstaller版本: {PyInstaller.__version__}")
    except ImportError:
        print("安装PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
    
    # 创建dist目录
    dist_dir = Path("dist")
    dist_dir.mkdir(exist_ok=True)
    
    # 配置打包参数
    data_separator = ";" if os_name == "Windows" else ":"
    exe_extension = ".exe" if os_name == "Windows" else ""
    
    # 准备命令
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--name=world_md",
        "--onefile",
        f"--add-data=src/config_example.yaml{data_separator}.",
        "run.py"
    ]
    
    # 执行打包
    print(f"执行打包命令: {' '.join(cmd)}")
    subprocess.check_call(cmd)
    
    # 检查结果
    executable = dist_dir / f"world_md{exe_extension}"
    if executable.exists():
        print(f"打包成功! 可执行文件位于: {executable}")
        
        # 复制配置文件
        print("复制配置文件...")
        shutil.copy("src/config_example.yaml", dist_dir)
        
        # 创建示例目录
        md_dir = dist_dir / "md"
        md_dir.mkdir(exist_ok=True)
        
        # 创建示例文件
        example_md = md_dir / "示例文档.md"
        with open(example_md, "w", encoding="utf-8") as f:
            f.write("""# 示例文档

这是一个示例Markdown文档，用于测试World MD工具。

## 功能特点

- 支持Markdown转Word
- 支持中文处理
- 可自定义样式

### 表格示例

| 功能 | 状态 | 说明 |
|------|------|------|
| Markdown转Word | ✅ | 完全支持 |
| 中文处理 | ✅ | 支持简繁转换 |
| 表格样式 | ✅ | 支持自定义表格样式 |
""")
        
        print("--------------------")
        print("打包完成，请查看dist目录")
        print(f"使用方法: {executable} -i input.md -o output.docx")
        print("--------------------")
    else:
        print("打包失败，未找到生成的可执行文件")

if __name__ == "__main__":
    main() 