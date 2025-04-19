#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
World MD 安装脚本
"""

from setuptools import setup, find_packages

with open('requirements.txt') as f:
    required = f.read().splitlines()

setup(
    name="world_md",
    version="0.1.0",
    description="将Markdown文件转换为Word文档的工具",
    author="World MD Team",
    author_email="example@example.com",
    url="https://github.com/example/world_md",
    packages=find_packages(),
    install_requires=required,
    entry_points={
        'console_scripts': [
            'world-md=src.main:main',
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.7",
) 