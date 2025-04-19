#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
World MD 打包脚本
用于将程序打包为可执行文件
"""

import os
import sys
import subprocess
import shutil
import platform

def main():
    """
    主函数，执行打包操作
    """
    print("开始打包 World MD 应用程序...")
    
    # 检测操作系统
    os_name = platform.system()
    print(f"检测到操作系统: {os_name}")
    
    # 安装打包所需依赖
    print("安装打包依赖...")
    subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller>=5.0.0"], check=True)
    
    # 确保目标目录存在
    dist_dir = "dist"
    if not os.path.exists(dist_dir):
        os.makedirs(dist_dir)
    
    # 准备pyinstaller参数
    pyinstaller_args = [
        "pyinstaller",
        "--name=world_md",
        "--onefile",
        "--clean",
        "--add-data=src/config_example.yaml:.",
    ]
    
    # 根据操作系统调整参数
    if os_name == "Windows":
        # Windows平台添加图标
        if os.path.exists("icon.ico"):
            pyinstaller_args.append("--icon=icon.ico")
        # 可以根据需求取消控制台窗口
        # pyinstaller_args.append("--noconsole")
    elif os_name == "Darwin":  # macOS
        # macOS平台添加图标
        if os.path.exists("icon.icns"):
            pyinstaller_args.append("--icon=icon.icns")
        # 调整分隔符格式
        pyinstaller_args[4] = "--add-data=src/config_example.yaml:."
    elif os_name == "Linux":
        # Linux平台添加图标
        if os.path.exists("icon.png"):
            pyinstaller_args.append("--icon=icon.png")
        # 调整分隔符格式
        pyinstaller_args[4] = "--add-data=src/config_example.yaml:."
    
    # 添加主程序文件
    pyinstaller_args.append("run.py")
    
    # 执行PyInstaller命令
    print(f"执行打包命令: {' '.join(pyinstaller_args)}")
    subprocess.run(pyinstaller_args, check=True)
    
    # 检查打包结果
    if os_name == "Windows":
        exe_path = os.path.join(dist_dir, "world_md.exe")
    else:
        exe_path = os.path.join(dist_dir, "world_md")
    
    if os.path.exists(exe_path):
        print(f"打包成功! 可执行文件位于: {exe_path}")
        
        # 复制额外的文件
        try:
            print("复制配置文件...")
            shutil.copy("src/config_example.yaml", dist_dir)
            print("创建示例目录...")
            
            # 创建示例目录
            md_dir = os.path.join(dist_dir, "md")
            if not os.path.exists(md_dir):
                os.makedirs(md_dir)
            
            # 创建示例Markdown文件
            with open(os.path.join(md_dir, "示例文档.md"), "w", encoding="utf-8") as f:
                f.write("# 示例文档\n\n这是一个示例Markdown文档，用于测试World MD工具。\n\n## 功能特点\n\n- 支持Markdown转Word\n- 支持中文处理\n- 可自定义样式")
            
            print("打包完成，请查看dist目录")
        except Exception as e:
            print(f"创建示例文件时出错: {str(e)}")
    else:
        print("打包失败，未找到生成的可执行文件")

if __name__ == "__main__":
    main() 