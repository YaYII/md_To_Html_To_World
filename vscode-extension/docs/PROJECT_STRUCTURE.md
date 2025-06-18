# 项目结构说明

## 📁 目录结构

```
vscode-extension/
├── 📂 src/                    # TypeScript 源代码
│   ├── commands/              # VS Code 命令实现
│   ├── core/                  # 核心转换逻辑
│   ├── ui/                    # 用户界面组件
│   ├── utils/                 # 工具函数
│   └── extension.ts           # 插件入口文件
│
├── 📂 dist/                   # 编译后的代码
├── 📂 nodejs/                 # Node.js 转换器
├── 📂 nodeexcel/              # Excel 转换器
├── 📂 scripts/                # Python 转换脚本
├── 📂 examples/               # 示例文件
├── 📂 images/                 # 图标和图片资源
├── 📂 docs/                   # 文档和指南
│
├── package.json               # 项目配置
├── CHANGELOG.md               # 变更日志
├── README.md                  # 项目说明
└── excel-config.yaml          # Excel 配置文件
```

## 📋 核心文件说明

### 主要配置文件
- `package.json` - VS Code 插件配置和依赖
- `tsconfig.json` - TypeScript 编译配置
- `webpack.config.js` - Webpack 打包配置
- `excel-config.yaml` - Excel 转换配置

### 源代码目录
- `src/extension.ts` - 插件主入口，负责激活和依赖管理
- `src/core/nodeConverter.ts` - Node.js 转换器封装
- `src/ui/` - 用户界面组件（进度条、配置面板等）

### 转换器目录
- `nodejs/` - Node.js 版本的转换器（主要使用）
- `nodeexcel/` - Excel 专用转换器
- `scripts/` - Python 版本的转换器（备用）

### 文档目录
- `docs/` - 包含所有用户指南和技术文档
- `examples/` - 示例 Markdown 文件和测试用例

## 🗑️ 已清理的内容

### 删除的文件类型
- ✅ 所有测试文件 (`test_*.md`, `debug_*.js`)
- ✅ 旧版本安装包 (`markdown-to-word-0.1.*.vsix`)
- ✅ 临时输出文件 (`output/`, `temp/`)
- ✅ 系统缓存文件 (`.DS_Store`)
- ✅ 调试和验证脚本

### 整理的文档
- ✅ 历史发布说明移至 `docs/`
- ✅ 安装指南移至 `docs/`
- ✅ 技术文档移至 `docs/`
- ✅ 问题解决方案移至 `docs/`

## 📦 插件包内容

当前插件包 (`markdown-to-word-0.1.27.vsix`) 包含：
- 编译后的核心代码 (`dist/`)
- 必要的转换器 (`nodejs/`, `nodeexcel/`, `scripts/`)
- 示例文件 (`examples/`)
- 用户文档 (`docs/`)
- 配置文件和资源

总大小：约 4.37 MB（183 个文件）

## 🧹 维护建议

1. **定期清理**：每次发布前删除临时文件和旧版本
2. **文档管理**：新文档统一放入 `docs/` 目录
3. **测试文件**：开发测试文件不要提交到主分支
4. **版本管理**：只保留最新版本的安装包

---

*最后更新：2024-12-19 (v0.1.27)* 