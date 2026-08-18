# Sharp 库安装指南

## 🤔 什么是 Sharp 库？

Sharp 是一个高性能的图像处理库，主要用于：
- SVG 图表转换为图片
- 图像格式转换和优化
- 图像尺寸调整

## ⚠️ 为什么 Sharp 是可选的？

1. **不是必需依赖**：插件的核心 Markdown 转 Word 功能不依赖 Sharp
2. **Windows 兼容性问题**：Sharp 在 Windows 环境下经常因为编译问题安装失败
3. **大多数用户不需要**：只有包含 SVG 图表的文档才需要 Sharp

## ✅ 没有 Sharp 库的影响

### 正常工作的功能：
- ✅ Markdown 文本转换
- ✅ 表格转换
- ✅ 列表和代码块
- ✅ PNG/JPG 图片插入
- ✅ 标题和格式化
- ✅ 链接和引用

### 受影响的功能：
- ⚠️ SVG 图表会显示为文本占位符
- ⚠️ Mermaid 图表无法转换为图片

## 🔧 手动安装 Sharp（可选）

如果您确实需要 SVG 图表支持，可以尝试手动安装：

### 方法一：使用便携版 npm
```cmd
# 进入插件的 nodejs 目录
cd "C:\Users\[用户名]\.cursor\extensions\markdowntoword.markdown-to-word-0.1.26\nodejs"

# 使用便携版 npm 安装 Sharp
"C:\Users\[用户名]\.cursor\extensions\markdowntoword.markdown-to-word-0.1.26\portable-nodejs\node\npm.cmd" install sharp
```

### 方法二：指定平台安装
```cmd
# 强制指定 Windows 平台
npm install --os=win32 --cpu=x64 sharp

# 或者使用预编译版本
npm install sharp --platform=win32 --arch=x64
```

### 方法三：使用替代方案
```cmd
# 安装轻量级替代库
npm install canvas
```

## 🧪 验证 Sharp 安装

安装后，重启编辑器，然后检查依赖状态：
1. 打开 VS Code/Cursor
2. 按 `Ctrl+Shift+P` 打开命令面板
3. 运行 "Markdown to Word: 检查依赖状态"
4. 查看 Sharp 是否显示为 ✅

## 🚫 如果 Sharp 安装仍然失败

**这是正常的！** 原因：
1. Windows 编译环境复杂
2. 需要 Python 和 Visual Studio 构建工具
3. 网络环境可能影响下载

**建议**：
- 继续使用插件，忽略 Sharp 警告
- 避免在文档中使用复杂的 SVG 图表
- 使用 PNG/JPG 图片替代 SVG

## 💡 最佳实践

1. **对于大多数用户**：忽略 Sharp 安装失败，正常使用插件
2. **如果有 SVG 需求**：将 SVG 转换为 PNG 后再插入文档
3. **企业环境**：联系 IT 管理员配置编译环境

## 🎉 总结

- **插件已经完全可用**，Sharp 只是锦上添花
- **所有核心功能正常**，可以开始使用 Markdown 转 Word
- **Sharp 安装失败是常见现象**，不用担心

---

*如果您成功安装了 Sharp 或有其他问题，欢迎反馈给开发者！* 