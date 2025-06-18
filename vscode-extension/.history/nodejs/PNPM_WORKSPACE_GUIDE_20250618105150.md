# PNPM Workspace 环境差异问题指南

## 问题背景

当项目使用 `pnpm` 作为包管理器时，可能会出现"您的环境可以正常运行，但同事的环境无法正常工作"的情况。这主要是由于 `pnpm` 的依赖管理方式与 `npm` 不同导致的。

## pnpm vs npm 的关键差异

### 1. 依赖解析机制
- **pnpm**: 使用符号链接和硬链接，只安装项目明确声明的依赖
- **npm**: 会提升依赖到 `node_modules` 根目录，可能访问到未声明的依赖

### 2. Lock 文件
- **pnpm**: 使用 `pnpm-lock.yaml`
- **npm**: 使用 `package-lock.json`

### 3. 依赖安装位置
- **pnpm**: 依赖存储在全局 store，通过链接共享
- **npm**: 依赖直接安装在项目的 `node_modules` 中

## 常见问题场景

### 场景1：您使用 pnpm，同事使用 npm

**问题表现**：
- 您的环境可以正常运行图表功能
- 同事运行时出现 `MODULE_NOT_FOUND` 错误

**原因分析**：
```javascript
// 您的环境可能全局安装了某些包，pnpm 可以访问到
// 但同事的 npm 环境无法访问到这些未在 package.json 中声明的依赖
const axios = require('axios'); // 如果未在 package.json 中声明
```

### 场景2：缺少 pnpm-lock.yaml

**问题表现**：
- 您有完整的 `pnpm-lock.yaml` 文件
- 同事没有这个文件，导致安装的依赖版本不一致

### 场景3：Workspace 配置差异

**问题表现**：
- 您在 workspace 根目录安装了依赖
- 同事只在子目录安装依赖

## 诊断步骤

### 1. 检查包管理器类型
```bash
# 运行我们的诊断工具
cd nodejs
node debug_dependencies.js
```

工具会自动检测：
- 当前使用的包管理器 (pnpm/npm/yarn)
- Lock 文件是否存在
- Workspace 根目录位置

### 2. 检查依赖完整性
```bash
# 检查所有必需的依赖是否正确安装
pnpm run check-deps
```

### 3. 验证图表功能
```bash
# 综合检查依赖和网络
pnpm run check-all
```

## 解决方案

### 方案1：统一使用 pnpm（推荐）

**给同事的步骤**：
```bash
# 1. 安装 pnpm
npm install -g pnpm

# 2. 删除可能存在的 npm 依赖
rm -rf node_modules
rm package-lock.json  # 如果存在

# 3. 使用 pnpm 安装依赖
cd vscode-extension  # 项目根目录
pnpm install

# 4. 在 nodejs 子目录中工作
cd nodejs
pnpm run check-all
```

### 方案2：确保 package.json 完整

确保所有子项目的 `package.json` 都包含完整的依赖声明：

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "fs-extra": "^11.1.1",
    "glob": "^8.1.0",
    "docx": "^8.5.0",
    "markdown-it": "^13.0.2",
    "cheerio": "^1.0.0-rc.12",
    "opencc-js": "^1.0.5",
    "js-yaml": "^4.1.0",
    "yargs": "^17.7.2",
    "inquirer": "^9.2.11"
  }
}
```

### 方案3：团队规范

**建立团队开发规范**：

1. **统一包管理器**：团队所有成员使用 `pnpm`
2. **提交 Lock 文件**：确保 `pnpm-lock.yaml` 被提交到版本控制
3. **依赖声明规范**：所有直接使用的包都必须在 `package.json` 中声明
4. **环境检查**：新成员入职时运行诊断工具

## 特殊情况处理

### 如果必须使用 npm

如果团队必须使用 npm，可以：

1. **生成 npm 兼容配置**：
```bash
# 运行依赖检查工具会自动生成
node debug_dependencies.js
# 会创建 package_fixed.json，替换原有的 package.json
```

2. **手动安装依赖**：
```bash
npm install axios fs-extra glob docx markdown-it cheerio opencc-js js-yaml yargs inquirer
```

### CI/CD 环境配置

在 CI/CD 中确保使用正确的包管理器：

```yaml
# GitHub Actions 示例
- name: Setup pnpm
  uses: pnpm/action-setup@v2
  with:
    version: latest

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

## 常见错误信息

### 1. 图表转换失败
```
❌ 转换 mermaid 图表失败: Cannot find module 'axios'
```
**解决**：运行 `pnpm install` 安装缺失依赖

### 2. 模块解析失败
```
Error: Cannot resolve module 'cheerio'
```
**解决**：确保 `package.json` 中声明了该依赖

### 3. 版本冲突
```
pnpm ERR! peer dep missing
```
**解决**：检查依赖版本兼容性，更新 `package.json`

## 预防措施

1. **代码审查时检查**：确保新增的 `require()` 都有对应的依赖声明
2. **定期运行诊断**：使用 `pnpm run check-all` 定期检查环境
3. **文档同步**：更新依赖时同步更新 README 和安装指南
4. **新人入职检查**：提供标准的环境设置清单

---

通过遵循这个指南，可以有效避免由于包管理器差异导致的环境问题，确保团队所有成员都能正常使用图表功能。 