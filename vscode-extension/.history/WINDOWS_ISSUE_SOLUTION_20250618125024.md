# Windows 环境问题解决方案

## 问题分析

根据您朋友的错误信息，主要有以下几个问题：

### 1. Sharp 库安装问题
```
⚠️ sharp 库未安装: Could not load the "sharp" module using the win32-x64 runtime
```

### 2. 包管理器检测失败
```
pnpm 不可用
Error: pnpm 不可用
```

## 解决方案

### 🔧 方案一：使用新版本插件（推荐）

**步骤 1：安装新版本**
1. 卸载当前版本的插件
2. 安装 `markdown-to-word-0.1.19.vsix` 版本
3. 重启 VS Code 或 Cursor

**新版本改进：**
- ✅ 修复了 Windows 环境下包管理器检测问题
- ✅ 增强了 Sharp 库安装支持
- ✅ 改进了错误处理机制
- ✅ 添加了详细的诊断信息

### 🛠️ 方案二：手动修复当前版本

如果无法立即更新插件，可以按以下步骤手动修复：

**步骤 1：定位插件目录**
```cmd
# 对于 Cursor
cd "%USERPROFILE%\.cursor\extensions\markdowntoword.markdown-to-word-0.1.18\nodejs"

# 对于 VS Code
cd "%USERPROFILE%\.vscode\extensions\markdowntoword.markdown-to-word-0.1.18\nodejs"
```

**步骤 2：检查 Node.js 环境**
```cmd
# 检查 Node.js 版本
node --version

# 检查 npm 版本
npm --version
```

**步骤 3：安装依赖**
```cmd
# 安装所有依赖（包括可选依赖）
npm install --include=optional

# 专门安装 Sharp 库
npm install --os=win32 --cpu=x64 sharp
```

**步骤 4：验证安装**
```cmd
# 检查依赖是否安装成功
npm list --depth=0

# 检查 Sharp 库
npm list sharp
```

### 🚨 方案三：完全重置

如果上述方案都不生效，执行完全重置：

**步骤 1：卸载插件**
1. 在编辑器中卸载 Markdown to Word 插件
2. 重启编辑器

**步骤 2：清理残留文件**
```cmd
# 删除插件目录
rmdir /s "%USERPROFILE%\.cursor\extensions\markdowntoword.markdown-to-word-*"
# 或
rmdir /s "%USERPROFILE%\.vscode\extensions\markdowntoword.markdown-to-word-*"
```

**步骤 3：重新安装**
1. 重新安装插件
2. 等待自动依赖安装完成

## 环境要求检查

### 最低要求
- ✅ Windows 10 或更高版本
- ✅ Node.js 16.0 或更高版本
- ✅ 至少 2GB 可用磁盘空间

### 检查命令
```cmd
# 检查系统版本
ver

# 检查 Node.js
node --version

# 检查磁盘空间
dir /-c
```

## 常见问题解答

### Q1: 为什么会出现 "pnpm 不可用" 错误？
**A:** 这是因为插件尝试使用 pnpm 作为包管理器，但系统中没有安装 pnpm。新版本会自动降级到 npm。

### Q2: Sharp 库是必需的吗？
**A:** Sharp 库不是必需的，主要用于 SVG 图表的高质量渲染。如果没有安装，插件会使用文本占位符显示图表。

### Q3: 如何确认问题已解决？
**A:** 
1. 打开一个包含图表的 Markdown 文件
2. 执行转换命令
3. 检查输出面板是否有错误信息

### Q4: 安装过程中网络超时怎么办？
**A:** 
```cmd
# 使用国内镜像
npm config set registry https://registry.npmmirror.com/

# 重新安装
npm install
```

## 预防措施

### 1. 定期更新 Node.js
- 建议使用 Node.js LTS 版本
- 定期检查更新

### 2. 网络环境
- 确保网络连接稳定
- 如果在公司网络，可能需要配置代理

### 3. 权限设置
- 某些情况下可能需要管理员权限
- 右键以管理员身份运行命令提示符

## 技术支持

如果按照上述方案仍无法解决问题，请提供以下信息：

### 系统信息
```cmd
systeminfo | findstr /B /C:"OS Name" /C:"OS Version"
```

### Node.js 环境
```cmd
node --version
npm --version
npm config list
```

### 错误日志
1. 打开 VS Code/Cursor 输出面板
2. 选择 "Markdown to Word Converter" 通道
3. 复制完整的错误日志

### 依赖状态
```cmd
cd "%USERPROFILE%\.cursor\extensions\markdowntoword.markdown-to-word-*\nodejs"
npm list --depth=0
```

## 版本更新记录

- **v0.1.19**: 修复 Windows 环境兼容性问题
  - 包管理器检测增强
  - Sharp 库安装优化
  - 错误处理改进
  - 新增 Windows 安装指导

- **v0.1.18**: 引入自动依赖安装系统
  - 自动检测和安装依赖
  - 智能包管理器选择
  - 但存在 Windows 兼容性问题

## 联系方式

如需进一步帮助，请通过以下方式联系：
- GitHub Issues
- 插件评论区
- 开发者邮箱 