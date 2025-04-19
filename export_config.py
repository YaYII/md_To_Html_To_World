#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
配置导出工具
将默认配置从config.py导出到config_example.yaml文件
"""

import yaml
import os
from src.config import Config

def export_config():
    """
    /**
     * 将Config类中的默认配置导出到YAML文件
     * 
     * @returns {bool} 导出是否成功
     */
    """
    # 创建配置对象
    config = Config()
    
    # 获取所有配置项
    config_data = config.get_all()
    
    # 导出到YAML文件
    try:
        with open('src/config_example.yaml', 'w', encoding='utf-8') as f:
            yaml.dump(config_data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
        print("配置已成功导出到 src/config_example.yaml")
        return True
    except Exception as e:
        print(f"导出配置失败: {str(e)}")
        return False

if __name__ == "__main__":
    export_config() 