# 自动依赖安装系统

## 概述

本插件现在配备了完整的自动依赖安装系统，解决了之前用户需要手动安装依赖的问题。系统会在以下情况自动检查并安装必要的依赖：

- 插件首次激活时
- 检测到依赖缺失时
- 超过30天未检查依赖时（可选的定期检查）

## 工作原理

### 1. 自动检测时机

插件激活时会自动运行 `shouldRunDependencyInstall()` 函数，该函数会检查：

- 是否是首次安装（通过 `context.globalState` 记录）
- 关键 Node.js 依赖是否存在
- 上次检查时间是否超过30天

### 2. 依赖检查范围

#### Node.js 依赖
- **位置**: `nodejs/node_modules/`  
- **关键包**: axios, fs-extra, docx, markdown-it, cheerio
- **包管理器**: 自动检测 pnpm > yarn > npm

#### Python 依赖  
- **Python环境**: 自动检测 python3 > python > py
- **关键包**: python-docx, markdown, beautifulsoup4, lxml
- **安装方式**: 优先使用 requirements.txt，否则逐个安装

### 3. 安装流程

```
插件激活
    ↓
检查是否需要安装依赖
    ↓
显示进度条"初始化 Markdown to Word 插件"
    ↓
并行执行：
├── Node.js 依赖检查安装 (20-50%)
└── Python 依赖检查安装 (50-100%)
    ↓
显示完成消息或错误信息
```

## 用户体验

### 成功安装
- 显示进度条通知
- 显示成功消息："🎉 Markdown to Word 插件依赖安装完成！"
- 提供"查看日志"选项

### 安装失败
- 显示详细错误信息
- 提供"查看日志"和"手动安装指南"选项
- 插件仍可继续使用（降级功能）

## 手动操作

如果自动安装失败，用户可以：

### 1. 使用命令面板
- `Ctrl/Cmd + Shift + P`
- 搜索"手动安装依赖"或"检查依赖状态"

### 2. 手动安装命令
```bash
# 进入 nodejs 目录
cd vscode-extension/nodejs

# 检测并使用合适的包管理器
pnpm install  # 如果有 pnpm-lock.yaml
# 或
npm install   # 如果有 package-lock.json
```

### 3. Python 依赖手动安装
```bash
# 使用 requirements.txt
python -m pip install -r scripts/requirements.txt

# 或逐个安装
python -m pip install python-docx markdown beautifulsoup4 lxml
```

## 技术实现

### 核心类：AutoDependencyInstaller

主要方法：
- `checkAndInstallDependencies()`: 主入口点
- `checkAndInstallNodeDependencies()`: Node.js 依赖处理
- `checkAndInstallPythonDependencies()`: Python 依赖处理
- `detectPackageManager()`: 包管理器自动检测
- `executeCommand()`: 命令执行封装

### 状态管理

使用 VS Code 的 `context.globalState` 存储：
- `dependenciesInstalled`: 布尔值，标记是否已安装
- `lastInstallTime`: 时间戳，记录上次安装时间

### 日志系统

所有操作都会记录到专用的输出通道：
- 通道名称：`Markdown to Word - 依赖安装`
- 详细记录命令执行过程
- 错误信息和调试信息

## 错误处理

### 常见问题及解决方案

1. **Python 环境未找到**
   - 错误：`未找到可用的Python环境`
   - 解决：安装 Python 3.7+ 并添加到 PATH

2. **包管理器权限问题**
   - 错误：`EACCES: permission denied`
   - 解决：使用管理员权限或配置 npm 全局目录

3. **网络连接问题**
   - 错误：`network timeout`
   - 解决：检查网络连接或配置代理

4. **磁盘空间不足**
   - 错误：`ENOSPC: no space left on device`
   - 解决：清理磁盘空间

## 配置选项

目前系统自动检测所有设置，未来可能添加：

```json
{
  "markdown-to-word.autoDependencyInstall": true,
  "markdown-to-word.dependencyCheckInterval": 30,
  "markdown-to-word.preferredPackageManager": "auto"
}
```

## 性能优化

- 并行执行 Node.js 和 Python 依赖检查
- 缓存包管理器检测结果
- 智能跳过已安装的依赖
- 异步操作避免阻塞 UI

## 未来改进

1. **增量更新**: 仅更新有变化的依赖
2. **离线支持**: 预打包常用依赖
3. **多环境支持**: Docker、虚拟环境等
4. **依赖版本管理**: 版本兼容性检查
5. **用户配置**: 更多自定义选项

## 调试信息

启用详细日志：
1. 打开"输出"面板
2. 选择"Markdown to Word - 依赖安装"
3. 查看详细的安装过程

手动触发依赖检查：
```javascript
// 在开发者控制台执行
vscode.commands.executeCommand('markdowntoword.markdown-to-word.checkDependencies');
```

这个系统大大改善了用户体验，从之前需要手动执行多个命令，到现在的一键自动安装！ 