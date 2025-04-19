@echo off
REM World MD Windows打包脚本

echo 开始为Windows打包World MD应用程序...

REM 确保pyinstaller已安装
python -c "import PyInstaller" 2>nul
if %errorlevel% neq 0 (
    echo 安装PyInstaller...
    pip install pyinstaller
)

REM 创建dist目录
if not exist dist mkdir dist

REM 生成可执行文件
echo 生成可执行文件...
pyinstaller --name="world_md" ^
            --onefile ^
            --clean ^
            --add-data="src/config_example.yaml;." ^
            run.py

REM 检查打包是否成功
if exist "dist\world_md.exe" (
    echo 打包成功! 可执行文件位于: dist\world_md.exe
    
    REM 复制额外的文件
    echo 复制配置文件...
    copy src\config_example.yaml dist\
    
    REM 创建示例目录
    echo 创建示例目录...
    if not exist dist\md mkdir dist\md
    
    REM 创建示例Markdown文件
    (
    echo # 示例文档
    echo.
    echo 这是一个示例Markdown文档，用于测试World MD工具。
    echo.
    echo ## 功能特点
    echo.
    echo - 支持Markdown转Word
    echo - 支持中文处理
    echo - 可自定义样式
    echo.
    echo ### 表格示例
    echo.
    echo ^| 功能 ^| 状态 ^| 说明 ^|
    echo ^|------^|------^|------^|
    echo ^| Markdown转Word ^| ✅ ^| 完全支持 ^|
    echo ^| 中文处理 ^| ✅ ^| 支持简繁转换 ^|
    echo ^| 表格样式 ^| ✅ ^| 支持自定义表格样式 ^|
    ) > "dist\md\示例文档.md"
    
    echo --------------------
    echo 打包完成，请查看dist目录
    echo 使用方法: dist\world_md.exe -i 输入文件.md -o 输出文件.docx
    echo --------------------
) else (
    echo 打包失败，未找到生成的可执行文件
) 