# Sharp 模块 macOS ARM64 兼容性问题解决方案

**解决时间**: 2025年7月14日 16:44:12 (北京时间)

## 问题描述

在 VS Code 扩展打包后，出现以下错误：

```
mainThreadExtensionService.ts:107 Activating extension 'markdowntoword.markdown-to-word' failed: 
Could not load the "sharp" module using the darwin-arm64 runtime
```

## 问题原因

1. **Sharp 模块构建依赖问题**: Sharp 是一个原生模块，需要针对特定平台编译
2. **pnpm 配置不完整**: Sharp 没有被正确配置在 `ignoredBuiltDependencies` 中
3. **扩展打包时的依赖处理**: VS Code 扩展打包时可能没有正确处理 Sharp 的原生依赖

## 解决步骤

### 1. 更新 package.json 配置

在 `package.json` 的 `pnpm` 配置中添加 `sharp` 到 `ignoredBuiltDependencies`：

```json
{
  "pnpm": {
    "ignoredBuiltDependencies": [
      "@vscode/vsce-sign",
      "keytar",
      "puppeteer",
      "sharp"  // 新增这一行
    ]
  }
}
```

### 2. 重新安装 Sharp 依赖

```bash
# 删除现有的 Sharp
pnpm remove sharp

# 重新安装 Sharp
pnpm add sharp
```

### 3. 验证 Sharp 功能

创建测试脚本 `test_sharp.js` 验证 Sharp 是否正常工作：

```javascript
const sharp = require('sharp');
console.log('Sharp 版本:', sharp.versions.sharp);
console.log('libvips 版本:', sharp.versions.vips);
```

## 验证结果

✅ **Sharp 模块加载成功**
- Sharp 版本: 0.34.3
- libvips 版本: 8.17.1
- 基本功能测试通过

## 关键配置说明

### pnpm ignoredBuiltDependencies

根据 [Sharp 官方文档](https://sharp.pixelplumbing.com/install#cross-platform) <mcreference link="https://sharp.pixelplumbing.com/install#cross-platform" index="0">0</mcreference>，当使用 pnpm 时，需要将 sharp 添加到 `ignoredBuiltDependencies` 中以避免构建警告。

### VS Code 扩展打包注意事项

1. **原生模块处理**: Sharp 等原生模块需要特殊处理
2. **平台兼容性**: 确保为目标平台安装正确的二进制文件
3. **依赖打包**: 使用 `--no-dependencies` 标志时要确保所有必要依赖都已正确安装

## 预防措施

1. **定期测试**: 在不同平台上测试扩展功能
2. **依赖管理**: 保持 Sharp 等关键依赖的版本更新
3. **配置文档**: 维护清晰的依赖配置文档
4. **自动化测试**: 集成 Sharp 功能测试到 CI/CD 流程

## 相关资源

- [Sharp 安装文档](https://sharp.pixelplumbing.com/install)
- [Sharp 跨平台安装指南](https://sharp.pixelplumbing.com/install#cross-platform)
- [pnpm 配置文档](https://pnpm.io/package_json)
- [VS Code 扩展开发指南](https://code.visualstudio.com/api)

## 故障排除

如果问题仍然存在，可以尝试：

1. **清理缓存**: `pnpm store prune`
2. **重新构建**: `pnpm run clean && pnpm run webpack`
3. **检查系统信息**: 
   ```bash
   node -p "process.arch"  # 应该显示 arm64
   node --version          # 确保 Node.js 版本兼容
   ```
4. **使用 npm 替代**: 如果 pnpm 仍有问题，可以尝试使用 npm

---

**解决状态**: ✅ 已解决  
**测试状态**: ✅ 通过  
**文档更新**: ✅ 完成