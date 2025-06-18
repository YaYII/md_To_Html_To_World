# 自动安装测试文档

这是一个用于测试 Markdown to Word 插件自动安装功能的测试文档。

## 功能特性

- ✅ 自动检测系统 Node.js 环境
- ✅ 自动下载并安装便携版 Node.js
- ✅ 自动安装项目依赖
- ✅ 智能环境配置
- ✅ 用户友好的错误提示

## 测试步骤

1. 打开此文档
2. 右键点击文件
3. 选择 "转换为 Word 文档"
4. 观察自动安装过程

## 代码示例

```javascript
// 自动安装服务示例
const autoInstallService = new AutoInstallService(context);
const success = await autoInstallService.autoInstall();
if (success) {
    console.log('环境配置完成！');
}
```

## 表格测试

| 功能 | 状态 | 说明 |
|------|------|------|
| Node.js 检测 | ✅ | 自动检测系统环境 |
| 自动下载 | ✅ | 下载最新 LTS 版本 |
| 依赖安装 | ✅ | 自动安装所需依赖 |
| 错误处理 | ✅ | 友好的错误提示 |

---

**测试完成后，此文档应该能够成功转换为 Word 格式。**