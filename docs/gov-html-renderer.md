# 政府公文规范 HTML 渲染器（gov HTML Renderer）

> 2026-08-14 ｜ 让「生成 HTML 文档」输出像 Readmdvue 一样美观、且符合政府公文规范的单文件 HTML
> 2026-08-14 更新：**样式参数从用户配置（defaultConfig.js）生成**——字体/字号/行高/缩进/表格/颜色/目录全部按配置
> 2026-08-14 更新2：**代码高亮（hljs 服务端）+ 表格字体自适应 + 公式误判修复 + 批量入口统一 + 配置系统重构**

## 〇、2026-08-14 重构记录

### 新增能力（借鉴 Readmdvue）
1. **代码高亮**：`highlightMarkdownCode()` 服务端用 highlight.js（lib/common，36 种常用语言：php/sql/bash/...）高亮代码块，输出带 `hljs-*` span 的 HTML——浏览器无需加载 highlight.js（体积最优）。hljs 主题 CSS 为 GitHub 风格浅色（黑白灰为主，公文不花哨）。开关：`config.highlight.enabled === false` 关闭。
2. **表格字体自适应**（GOV_JS）：内容放不下时自动缩小表格字号（最小 9px），借鉴 Readmdvue `autoFitTableFont`——数据库字典等宽表格不再大量换行。
3. **公式误判修复**：`hasLatexFormula()` 用**已知 LaTeX 命令白名单** + `^/_` 后跟 `{`/数字 判断真公式，避免误判 PHP 变量（`$fillable`）、PHP 命名空间（`App\Repository`）、货币（`$500`）。无真公式的文档不再内嵌 KaTeX（database-dictionary 706KB→475KB）。

### 批量入口统一（修复不一致 bug）
- 之前：单个「生成HTML文档」走 gov 模板，**批量「批量生成HTML文档」仍走 legacy 旧模板**（朴素 HTML）
- 现在：`nodeConverter.batchConvertToHtml` 默认走 gov（`convertGovFile`），`useLegacyHtml` 可回退

### 配置系统重构（垃圾代码清理）
- 删除 `utils/config.js`（旧 Config 类，仅 4 键默认值，与 COMPLETE_DEFAULTS 不一致）
- 重构 `utils/configManager.js`：不再继承旧 Config，直接基于 `COMPLETE_DEFAULTS`（deepMerge）
- **修复 bug**：旧 `loadFromYaml` 用 `...this.defaultConfig`（4 键）合并，加载 YAML 会丢失完整配置项；现在 `deepMerge(COMPLETE_DEFAULTS, configData)`
- 保留全部方法：get/set（点号嵌套）/getAll/reset/loadFromFile/saveToFile/loadFromYaml/saveToYaml/loadExampleConfig/createDefaultConfig/getConfigSchema/validateChartConfig/createNetworkFriendlyConfig

### 渲染引擎决策（证据：结构对比验证）
- **HTML 文档转换**：marked（gov 模板，浏览器端渲染）✓
- **Word 转换链路**（md→html→word）：**保留 markdown-it**（legacy convertString）——已实证 markdown-it 与 marked 标签结构一致，但 `typographer`（弯引号/破折号）与 `linkify`（自动链接）行为不同，替换会改变 Word 输出文本细节，稳定性优先不换
- **Excel 转换链路**（nodeexcel）：保留不动

## 一、背景与需求

原 `MarkdownToHtml.convertString` 生成的 HTML 非常朴素（微软雅黑 + max-width 960px + 简单表格样式，无 JS 渲染、无代码高亮、无目录），远不如 Readmdvue 项目（`/home/as-workstation01/Documents/project/Readmdvue`）渲染出的阅读排版。

用户要求：**md→HTML 转换使用 Readmdvue 的样式（JS 渲染），但必须符合政府文档规范——不能出戏、必须严谨**。

Readmdvue 的 `src/styles/content-variables.css` 已内置政府公文规范：正文宋体系 serif、标题黑体系、正文首行缩进 2em、两端对齐、表格严谨无斑马纹——本实现抽取了这部分规范，去掉苹果 Liquid Glass 花哨效果（阴影/动画/强调色渐变），保持黑白严谨。

## 二、实现内容（3 个文件）

### 1. 新增 `vscode-extension/src/mdtoworld/markdownToHtml/govHtmlTemplate.js`

政府公文规范 HTML 模板模块，输出**单文件自包含、完全离线**的 HTML：

- **样式**（`GOV_CSS`）：CSS 变量体系 + 公文排版
  - 正文：宋体系 serif（Noto Serif CJK SC → 仿宋 → 宋体/SimSun），16px，1.8 行高，两端对齐，**首行缩进 2em**
  - 标题：黑体系（黑体/SimHei），黑色、加粗、无阴影无动画；h1 底部 1px 线、h2 左侧 4px 竖线
  - 表格：严谨全边框（1px #8a8a8a）、表头浅灰居中、无斑马纹
  - 代码块：简洁灰底等宽，不做彩色高亮（公文不花哨）
  - 目录：`.gov-toc` 简洁边框容器 + 缩进层级
  - 打印优化（@media print）
- **配置驱动**（`buildConfigCss`）：从 `defaultConfig.js` 结构生成 CSS 变量覆盖：
  - `fonts.default/headings/code/english` → 正文宋体系 / 标题黑体系 / 等宽 / 西文
  - `sizes.default/heading1-6` → 正文字号（pt→px）/ 各级标题字号
  - `paragraph.line_spacing/first_line_indent` → 行高 / 首行缩进（2em）
  - `colors.default/headings/link` → 正文 / 标题 / 链接颜色
  - `enhanced_table_styles.border_color/header_bg_color/header_font_color` → 表格边框 / 表头背景 / 表头文字
  - `document.generate_toc/toc_depth` → 无 `[TOC]` 也自动生成目录 / 目录深度
- **渲染**（`GOV_JS` + 内嵌 marked.min.js v15.0.12）：
  - markdown 原文存 `<script type="text/markdown" id="md-source">`（`</script>` 已转义）
  - 浏览器打开时 marked 渲染 → 标题锚点（h1-h4 加 id）→ `[TOC]` 标记自动生成目录 → 图片路径规范化
  - 内嵌 `<script id="gov-config" type="application/json">` 携带目录开关/深度
  - 公式：检测 `$..$`/`$$..$$` 时按需内嵌 KaTeX（katex.min.js + katex.min.css）
- **离线**：marked/KaTeX 均内嵌，零外部请求

### 2. 修改 `vscode-extension/src/mdtoworld/markdownToHtml/index.js`

新增 `convertGovString(markdownContent, outputDir)` 与 `convertGovFile(inputFile, outputFile)` 方法（复用简繁转换，`[TOC]` 由 JS 端处理；**自动传入 `this.config` 生成样式参数**）。**legacy `convertString`/`convertFile` 保持不变**——Word 转换链路（md→html→word）零回归。

### 3. 修改 `vscode-extension/src/core/nodeConverter.ts`

- `IConversionOptions` 新增 `useLegacyHtml?: boolean`
- `convertToHtml` 默认走 gov 模板（`md_to_html.convertGovFile`），传 `useLegacyHtml: true` 回退旧模板

## 三、验证证据（Chrome headless 实测）

1. **JS 渲染成功**：`<h1 id="...">`、表格、代码块、引用、锚点全部生成
2. **目录功能**：带 `[TOC]` 的文档自动生成 `.gov-toc`（层级缩进正确，41 个锚点）
3. **CSS 计算样式生效**：
   - body 字体 = Noto Serif CJK SC/仿宋/宋体（宋体系 serif）✓
   - h1/h2 字体 = 黑体系，h2 左侧 4px 深灰竖线 ✓
   - p 首行缩进 32px(2em)、两端对齐 justify ✓
   - th 1px 边框 + 浅灰底 + 居中加粗 ✓
4. **无 console 错误 / 无 pageerror**
5. **legacy 回归**：`convertString` 输出不变（Word 链路不受影响）
6. **配置驱动**：自定义 `fonts/sizes/paragraph/colors/enhanced_table_styles/document` 后，CSS 计算样式同步变化（仿宋正文/黑体标题/14pt/2 倍行距/表格色/自动目录 40 条），无 pageerror
7. **编译**：`npx tsc --noEmit` 通过、`npx webpack` 打包成功

## 四、如何使用

VS Code 扩展「生成HTML文档」命令现在默认输出 gov 模板 HTML。也可直接调用：

```bash
cd vscode-extension
node -e "
const MarkdownToHtml = require('./src/mdtoworld/markdownToHtml');
new MarkdownToHtml({}).convertGovFile('输入.md', '输出.html').then(() => console.log('done'));
"
```

需要旧版模板：`convertToHtml` 传 `{ useLegacyHtml: true }`。

## 五、技术栈说明（2026-08-14 确认）

**本项目为 Node.js 项目**（VS Code 扩展 `vscode-extension/` 纯 TypeScript/JavaScript，`mdtoworld` 转换核心完全独立，不依赖 Python）。

Python CLI 引擎（根目录 `run.py`/`src/`/`.venv`/`build/`/`dist/`）为早期版本，**已由用户提交 `57e39df3 chore: 移除 Python 实现，全面迁移至 Node.js` 清理完毕**，`.gitignore` 已同步更新。

## 六、遗留问题与下一步

- **mermaid 图表**：gov 模板暂不渲染（保留代码块显示）。现有 `chartProcessor` 可将 mermaid 转 PNG 图片，后续可按需接入
- **代码高亮**：按公文规范刻意不做彩色高亮（黑白简洁）。如需可加 highlight.js 精简版
- **KaTeX 体积**：含公式时 HTML 约 350KB（katex ~270KB）。无公式文档默认仍内嵌 katex（`math.enabled===false` 可关）
- **目录**：`[TOC]` 标记触发；`document.generate_toc=true` 时无标记也自动生成
- **未提交**：本次改动尚未 git commit（工作区另有用户之前的未提交改动：converter.js/mediaProcessor.js 图片分页、package.json 命令精简、browserService.ts 等）

## 七、关键文件索引

| 文件 | 说明 |
|---|---|
| `vscode-extension/src/mdtoworld/markdownToHtml/govHtmlTemplate.js` | 新增：gov 模板（CSS + JS + marked/KaTeX 内嵌） |
| `vscode-extension/src/mdtoworld/markdownToHtml/index.js` | 新增 convertGovString/convertGovFile |
| `vscode-extension/src/core/nodeConverter.ts` | convertToHtml 默认走 gov |
| `md/` 目录 | 真实转换样例源文件 |
| 验证产物 | `/tmp/gov-test-20260814/香港ITF_gov.html`（带目录）、`产品使用手册_gov_v2.html` |
