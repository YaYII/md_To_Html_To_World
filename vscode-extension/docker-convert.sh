#!/bin/bash

# 使用 Docker 运行 Markdown 转 Word 的脚本

echo "=== 使用 Docker 运行 Markdown 转 Word ==="

# 项目目录
PROJECT_DIR="/home/yangying/Documents/project/md_To_Html_To_World/vscode-extension"

# 输出目录（用于保存转换结果）
OUTPUT_DIR="${PROJECT_DIR}/output"

# 创建输出目录
mkdir -p "${OUTPUT_DIR}"

echo "1. 使用 Docker 运行转换..."

# 使用 Docker 直接运行，挂载项目目录
docker run --rm \
  -v "${PROJECT_DIR}:/app" \
  -v "${OUTPUT_DIR}:/output" \
  -w /app \
  node:18-bullseye \
  bash -c "
    # 安装 pnpm
    npm install -g pnpm
    
    # 安装项目依赖（如果 node_modules 不存在）
    if [ ! -d 'node_modules' ]; then
      echo '安装项目依赖...'
      pnpm install --frozen-lockfile
    fi
    
    # 编译项目（如果 out 目录不存在）
    if [ ! -d 'out' ]; then
      echo '编译项目...'
      pnpm run compile
    fi
    
    # 运行转换脚本
    echo '开始转换文档...'
    node test-convert.js
    
    # 复制输出文件到输出目录
    if [ -f 'CME-TMS_PRD_V2.1.docx' ]; then
      cp CME-TMS_PRD_V2.1.docx /output/
      echo '✅ 转换成功！'
      echo '输出文件: ${OUTPUT_DIR}/CME-TMS_PRD_V2.1.docx'
    else
      echo '❌ 转换失败，未找到输出文件'
    fi
  "

echo "完成！"
