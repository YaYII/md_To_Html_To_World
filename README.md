# md_To_Html_To_World — Markdown 文档转换工具

将 Markdown 文档转换为 **Word / HTML / Excel** 的跨平台工具，基于 **Node.js** 全栈实现（架构：Markdown → HTML → Word），无 Python 依赖。

## ✨ 核心特性（v0.1.92）

### 📄 政府公文格式（Word 与 HTML 双形态统一）
- **正文宋体、标题黑体、楷体/标楷体**：符合政府公文（GB/T 9704）与澳门政府公文规范
- **正文首行缩进 2 字符、1.5 倍行距、两端对齐**（inter-ideograph）
- **页脚居中页码**（Word PAGE 域，实时准确）
- **目录真实页码**：PAGEREF 域（全选按 F9 更新），点击条目可跳转
- **默认 A3 纸张**：内容区更大，一页容纳更多内容，减少打印浪费（实测大文档页数减少 39%）

### 🧮 流程图/图表：服务端静态渲染（一劳永逸）
- **mermaid 生成时服务端渲染为 SVG 直接内联进 HTML**——HTML 完全静态
- 不依赖浏览器执行脚本：**任何服务器（nginx / Live Server / python http.server）、甚至禁用 JS 都能显示流程图**
- 图片高度自动安全 padding，**内容绝不裁剪丢失**
- Word 端 mermaid 用子进程池并行渲染 PNG 嵌入（98 图约数秒）

### 🛡️ 生产模式：禁止错误弹窗
- 错误消息全部静默写入「输出」面板（`视图 → 输出 → Markdown to Word`），不弹窗打扰用户
- 正常消息（转换成功等）保留提示

### ⚙️ 配置单一权威源
- 所有默认配置统一在 `defaultConfig.js`（`COMPLETE_DEFAULTS`）——**改默认值只改一处**
- 用户可通过 **YAML 配置 / VS Code 设置面板** 覆盖任何参数，满足个性化需求
- 默认字号规范：正文 11pt、H1 15pt、H2 13pt、H3 12pt（可配置）

### 🖼️ 图片智能尺寸
- 小图标/示意图保持原始尺寸（不再被拉伸到整页宽）
- 大图等比缩放至内容区、超高自动缩至单页（整图完整可见，不分割、不裁剪）

## 项目组成

### vscode-extension/ —— VS Code 扩展「Markdown to Word」（主产品）

右键 Markdown 文件即可一键转换，支持：

- 📄 **Word 转换**：标题、列表、表格、代码块、图片、页眉页脚、页码、目录（真实页码）
- 📚 **智能目录与封面**：支持 `[TOC]` 标记、自动生成封面页
- 🧮 **公式与图表**：LaTeX 公式（KaTeX）、Mermaid/PlantUML 图自动渲染（HTML 静态 SVG / Word PNG）
- 📊 **Excel 转换**：Markdown 表格 → Excel 工作表
- 🔄 **Word → Markdown**：反向转换（mammoth + turndown）
- 🌐 **浏览器直读**：在浏览器中实时预览 Markdown 文档
- ⚙️ **自定义配置**：字体、字号、行距、页面大小/方向/边距、目录深度等（YAML 配置 + 设置面板）
- 📦 **批量转换**：整个目录批量转 Word / HTML / Excel

### 命令行使用（Node.js）

```bash
cd vscode-extension
node src/mdtoworld/index.js -i input.md -o output.docx
node src/mdtoworld/index.js -i 输入目录 -o 输出目录 -b   # 批量转换
```

### 开发与打包

```bash
cd vscode-extension
pnpm install          # 安装依赖
bash pack.sh          # 一键打包：版本号+1 → webpack 编译 → 生成 .vsix
```

技术栈：TypeScript + docx + marked + cheerio + exceljs + KaTeX + sharp/resvg + jsdom 等。

## 配置

- **单一权威默认源**：`vscode-extension/src/mdtoworld/utils/defaultConfig.js`（`COMPLETE_DEFAULTS`）
- **YAML 示例**：`vscode-extension/src/mdtoworld/config_example.yaml`
- **VS Code 设置面板**：搜索 `Markdown to Word` 可调字体/字号/纸张/间距等
- 政府公文字体（Linux）：安装 `Fandol`（仿宋/楷体）+ 思源宋体/黑体，详见 `docs/` 或系统字体说明

## 文档

- vscode-extension/README.md — 扩展详细说明与更新日志
- product_requirements.md — 产品需求文档（PRD）
- vscode-extension/CME-TMS_PRD_V2.6.md — 大型测试文档（图片分页、跨页场景验证）
- docs/word-format-optimization-2026-08-18.md — md→Word 政府公文格式优化交接文档

## 历史说明

早期版本（v0.1.x 之前）曾以 Python（python-docx + PyInstaller）实现 CLI 版，现已**全面迁移至 Node.js**，Python 源码与构建产物已从仓库移除（如需参考可查看 git 历史）。
