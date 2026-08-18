# md→Word 政府公文格式细节优化 — 交接文档（2026-08-18）

## 1. 任务背景与需求

用户要求针对 md→Word 转换功能做细节优化，重点核对：
生成的文档字号、间距、字体、代码 code 区块、图像内容插入显示、格式化内容是否按原格式显示、是否符合政府文档格式。

调研方式：真实转换测试 → 解包 docx 检查 XML（w:ind / w:spacing / w:rFonts / wp:extent）作为证据，而非猜测。

## 2. 已发现问题（证据）

| # | 问题 | 证据（旧产物 XML） | 影响 |
|---|------|---------------------|------|
| P1 | 首行缩进仅 2pt | `<w:ind w:firstLine="40"/>`（2×20） | 正文几乎无缩进，不符合公文 2 字符规范；与 gov HTML 端 `text-indent:2em` 不一致 |
| P2 | 正文行距 `lineRule="exact"` | `<w:spacing w:line="360" w:lineRule="exact"/>` | 固定行高裁剪行内大元素；非多倍行距 |
| P3 | 小图被强制拉伸到整页宽 | 100×100px 图 → Word 555×555px（14.7cm） | 小图标/示意图巨大模糊 |
| P4 | 正文无两端对齐 | 无 `<w:jc w:val="both"/>` | 右边缘参差，不符公文 justify |
| P5 | 附带 gov HTML 未注入用户配置 | HTML 无 `--gov-heading1-size` 等变量 | Word 与 HTML 排版参数不一致 |
| P6 | 标题段前/段后仅 3pt | heading spacing before/after=60twip | 标题层级不明显 |
| P7 | 目录页码是模拟值 | `${index + 2}` | 页码与实际不符，误导 |
| P8 | `[TOC]` 在 `generate_toc=false` 时被静默丢弃 | toc-placeholder 被 filter 掉 | 用户写 [TOC] 无目录 |
| P9 | README 声称页眉页脚页码，实际未实现 | Document 无 footer | 政府文档缺页码 |

已排除的疑点：字体 eastAsia —— docx 库 `font:{name:'SimSun'}` 会自动生成 `<w:rFonts w:eastAsia="SimSun"/>`（实测 44/44 均含），无需修改。

## 3. 已完成内容（commit 34f42b3c，已推送 GitHub）

修改 10 个文件（+112/-42）：

1. **textProcessor.js** — 首行缩进按「字符数×字号」换算（2×12pt×20=480twip）；行距去掉 `lineRule:'exact'`（auto 多倍行距）；正文 `AlignmentType.JUSTIFIED`
2. **mediaProcessor.js** — 图片尺寸策略：原物理尺寸≤内容区→保持原尺寸（含 DPI 换算）；超出→等比缩放；超高→缩至单页高
3. **mermaidProcessor.js** — mermaid PNG 加超高单页保护（纵向大图不再跨页截断）
4. **headingProcessor.js** — 标题段前 12pt/段后 6pt（`paragraph.heading_before/after` 可配）
5. **markdownToHtml/index.js + govHtmlTemplate.js** — convertString 注入 `buildConfigCss`（附带 HTML 与 Word 排版一致；buildConfigCss 补导出）
6. **converter.js** — 页脚居中页码（Word PAGE 域，`document.show_page_number` 开关，默认 true）；`[TOC]` 标记触发目录（`shouldGenerateToc = generate_toc || hasTocMarker`）
7. **tocProcessor.js** — 目录页码改 `PAGEREF` 域（`SimpleField`，注意构造签名是 `(instruction, cachedValue)` 且为段落级子元素）
8. **defaultConfig.js / config_example.yaml** — 新增 `heading_before/heading_after/show_page_number`

## 4. 验证证据

### 单元验证（/tmp/md2word_test/ 测试产物）
- 首行缩进：`<w:ind w:firstLine="480"/>`（139 个正文段落全部 2 字符）
- 行距：lineRule 分布为空（auto 多倍行距），line=360 保留 1.5 倍
- 两端对齐：`<w:jc w:val="both"/>` 139 次
- 标题间距：`<w:spacing w:before="240" w:after="120"/>`（12pt/6pt）
- 小图：100×100px → 2.6cm×2.6cm（原尺寸保留，不再 14.7cm）
- 页脚：footer1.xml + `<w:instrText>PAGE</w:instrText>` + SimSun 9pt + footerReference
- 目录：5 条目全部 `<w:fldSimple w:instr="PAGEREF heading-xxx \h"/>` + 书签 5 个
- 附带 HTML：第二个 `:root` 块含 `line-height:1.5 / text-indent:2em / --gov-heading1-size:21.33px`（buildConfigCss 后定义覆盖默认）

### 回归验证（CME-TMS_PRD_V2.6.md，75 页 898 元素）
- 转换成功 5.1s；9 个 mermaid 全部渲染嵌入；85 表；无超高图片（全部 ≤25cm）
- webpack 构建成功（extension.js 7.84 MiB，66.9s）

## 5. 遗留问题 / 下一步建议

1. **Word 端代码块无语法高亮**（纯 #333333），gov HTML 端有 hljs 彩色高亮 —— 双端不一致。若需 Word 彩色代码，需在 codeProcessor 解析 hljs span 生成多 TextRun（工程量中等，政府文档通常可不彩色，暂缓）
2. **封面页信息**：extractDocumentInfo 仅提取标题，无简介/日期。如需政府文档封面带日期，可扩展提取文档日期行
3. **目录页码 PAGEREF 首次打开为空**（Word 域无缓存值），需全选 F9 更新。已加提示文字。若需打开即显示，可在生成时用页面估算写入缓存值（但准确度依赖估算）
4. **generate_cover 与 [TOC]**：generate_cover 默认 true，[TOC] 修复后会在有 [TOC] 时生成「封面+目录+正文」三页结构 —— 确认这是期望行为
5. **VS Code 插件端**：修改在 src/mdtoworld 通用层，插件打包（webpack 已验）后生效；如需发布 vsix 需重新 package

## 6. 关键文件与命令

```
核心转换链路：
  vscode-extension/src/mdtoworld/converter.js                 # 总调度
  vscode-extension/src/mdtoworld/markdownToHtml/index.js      # md→gov HTML（convertString）
  vscode-extension/src/mdtoworld/markdownToHtml/govHtmlTemplate.js  # 政府模板 CSS/JS
  vscode-extension/src/mdtoworld/htmlToWord/converter.js       # HTML→Word Document
  vscode-extension/src/mdtoworld/htmlToWord/processors/        # text/heading/media/mermaid/toc/code/table...
  vscode-extension/src/mdtoworld/utils/defaultConfig.js        # 样式单一配置源

测试命令：
  node src/mdtoworld/index.js -i 输入.md -o 输出.docx          # 单文件转换
  node src/mdtoworld/index.js -i 输入目录 -o 输出目录 -b        # 批量
  cd vscode-extension && npx webpack --config webpack.config.js # 打包验证

产物 XML 验证：
  unzip -q 输出.docx -d _unz && 检查 word/document.xml / word/footer1.xml / word/styles.xml
```

Git：commit `34f42b3c`（feat: md转Word 政府公文格式细节优化），已 push 至 GitHub（YaYII/md_To_word，main 分支，与 origin 同步）。
