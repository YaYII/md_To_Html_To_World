#!/bin/bash

# World MD macOS打包脚本

echo "开始为macOS打包World MD应用程序..."

# 确保pyinstaller已安装
if ! python -c "import PyInstaller" &> /dev/null; then
    echo "安装PyInstaller..."
    pip install pyinstaller
fi

# 创建dist目录
mkdir -p dist

# 生成可执行文件
echo "生成可执行文件..."
pyinstaller --name="world_md" \
            --onefile \
            --clean \
            --add-data="src/config_example.yaml:." \
            run.py

# 检查打包是否成功
if [ -f "dist/world_md" ]; then
    echo "打包成功! 可执行文件位于: dist/world_md"
    
    # 复制额外的文件
    echo "复制配置文件..."
    cp src/config_example.yaml dist/
    
    # 创建示例目录
    echo "创建示例目录..."
    mkdir -p dist/md
    
    # 创建示例Markdown文件
    cat > dist/md/示例文档.md << EOL
# 示例文档

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
EOL
    
    # 为可执行文件添加执行权限
    chmod +x dist/world_md
    
    echo "--------------------"
    echo "打包完成，请查看dist目录"
    echo "使用方法: ./dist/world_md -i 输入文件.md -o 输出文件.docx"
    echo "--------------------"
else
    echo "打包失败，未找到生成的可执行文件"
fi 