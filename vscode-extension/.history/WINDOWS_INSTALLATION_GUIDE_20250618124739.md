# Windows 环境安装指导

## 概述

本指导专门针对 Windows 用户在使用 Markdown to Word Converter 插件时可能遇到的问题。

## 常见问题与解决方案

### 1. Sharp 库安装问题

**问题现象:**
```
⚠️ sharp 库未安装: Could not load the "sharp" module using the win32-x64 runtime
```

**解决方案:**

#### 方法一：自动安装（推荐）
插件会自动尝试安装 Sharp 库，通常无需手动干预。

#### 方法二：手动安装
如果自动安装失败，请按以下步骤操作：

1. **打开命令提示符或 PowerShell**
   - 按 `Win + R`，输入 `cmd` 或 `powershell`
   - 或在开始菜单搜索"命令提示符"

2. **切换到插件目录**
   ```cmd
   cd "%USERPROFILE%\.vscode\extensions\markdowntoword.markdown-to-word-*\nodejs"
   ```
   或
   ```cmd
   cd "%USERPROFILE%\.cursor\extensions\markdowntoword.markdown-to-word-*\nodejs"
   ```

3. **安装 Sharp 库**
   ```cmd
   npm install --include=optional sharp
   ```
   
   如果上述命令失败，尝试：
   ```cmd
   npm install --os=win32 --cpu=x64 sharp
   ```

### 2. 包管理器检测问题

**问题现象:**
```
pnpm 不可用
Error: pnpm 不可用
```

**解决方案:**

#### 检查包管理器安装状态
1. **检查 npm**
   ```cmd
   npm --version
   ```

2. **检查 yarn**（如果已安装）
   ```cmd
   yarn --version
   ```

3. **检查 pnpm**（如果已安装）
   ```cmd
   pnpm --version
   ```

#### 安装缺失的包管理器
如果系统中没有任何包管理器，请安装 Node.js：

1. **下载 Node.js**
   - 访问 [Node.js 官网](https://nodejs.org/)
   - 下载 LTS 版本
   - 运行安装程序

2. **验证安装**
   ```cmd
   node --version
   npm --version
   ```

### 3. 权限问题

**问题现象:**
- 安装过程中出现权限错误
- 无法写入文件或目录

**解决方案:**

1. **以管理员身份运行**
   - 右键点击命令提示符或 PowerShell
   - 选择"以管理员身份运行"

2. **或配置 npm 全局目录**
   ```cmd
   npm config set prefix "%APPDATA%\npm"
   ```

### 4. 网络连接问题

**问题现象:**
- 下载依赖包超时
- 连接 npm 仓库失败

**解决方案:**

1. **使用国内镜像**
   ```cmd
   npm config set registry https://registry.npmmirror.com/
   ```

2. **配置代理**（如果使用代理）
   ```cmd
   npm config set proxy http://proxy-server:port
   npm config set https-proxy http://proxy-server:port
   ```

## 环境要求

### 最低系统要求
- Windows 10 或更高版本
- Node.js 16.0 或更高版本
- 至少 2GB 可用磁盘空间

### 推荐配置
- Windows 11
- Node.js 18.0 或更高版本
- 4GB 或更多可用磁盘空间
- 稳定的网络连接

## 故障排除步骤

### 1. 完全重置插件
如果遇到严重问题，可以完全重置插件：

1. **卸载插件**
   - 在 VS Code 中找到插件
   - 点击卸载

2. **清理残留文件**
   ```cmd
   rmdir /s "%USERPROFILE%\.vscode\extensions\markdowntoword.markdown-to-word-*"
   ```

3. **重新安装插件**

### 2. 检查系统环境
```cmd
# 检查 Node.js 版本
node --version

# 检查 npm 版本
npm --version

# 检查 PATH 环境变量
echo %PATH%

# 检查插件安装位置
dir "%USERPROFILE%\.vscode\extensions" | findstr markdown
```

### 3. 收集诊断信息
如果问题仍然存在，请收集以下信息：

1. **系统信息**
   ```cmd
   systeminfo | findstr /B /C:"OS Name" /C:"OS Version"
   ```

2. **Node.js 环境**
   ```cmd
   node --version
   npm --version
   npm config list
   ```

3. **插件日志**
   - 在 VS Code 中打开输出面板
   - 选择 "Markdown to Word Converter" 通道
   - 复制所有日志信息

## 联系支持

如果按照本指导仍无法解决问题，请：

1. 收集上述诊断信息
2. 详细描述问题现象
3. 提供错误日志
4. 通过 GitHub Issues 或其他支持渠道联系开发者

## 更新记录

- **v0.1.18**: 增强 Windows 环境支持，改进错误处理
- **v0.1.17**: 修复 Sharp 库安装问题
- **v0.1.16**: 优化包管理器检测逻辑 