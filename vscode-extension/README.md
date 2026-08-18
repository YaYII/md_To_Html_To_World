# Markdown to Word Converter

将Markdown文档转换为Word文档的VS Code扩展。

> 🆕 **最新更新 v0.1.92**：政府公文格式（宋体正文/黑体标题/2 字符缩进/两端对齐/页码/PAGEREF 真实目录页码）、
> 默认 A3 纸张省纸、mermaid 服务端静态渲染 SVG 内联（任何服务器/禁用 JS 可看）、生产模式禁止错误弹窗、
> 配置单一权威源、图片高度不裁剪。
> 📋 [查看完整更新日志](CHANGELOG.md)

### ✨ 核心特性

- **政府公文格式**：正文宋体、标题黑体、首行缩进 2 字符、1.5 倍行距、两端对齐、页脚页码、目录真实页码（PAGEREF 域）
- **默认 A3 纸张**：内容区更大、省纸（实测大文档页数减少 39%）
- **mermaid 静态渲染**：生成 HTML 时服务端渲染 SVG 内联，任何服务器/禁用 JS 都能显示流程图；Word 端子进程池并行 PNG 嵌入
- **生产模式**：错误消息不弹窗（写入输出面板可查），正常消息保留
- **配置单一权威源**：默认配置统一在 `defaultConfig.js`，用户可用 YAML / 设置面板覆盖
- **图片智能尺寸**：小图保持原尺寸、大图自适应、超高缩至单页（不分割不裁剪）

## 作者


## 💖 支持开发者

如果这个插件对您有帮助，欢迎通过以下方式支持开发者继续创作：

<div align="center">

### 🙏 打赏支持

<table>
<tr>
<td align="center">
<img src="https://raw.githubusercontent.com/YaYII/md_To_Html_To_World/main/vscode-extension/images/24d4be73eecb41422cacfedef3002456.jpg" width="200" alt="支付宝打赏"/>
<br/>
<strong>支付宝</strong>
</td>
<td align="center">
<img src="https://raw.githubusercontent.com/YaYII/md_To_Html_To_World/main/vscode-extension/images/8832d512343a8573d8bb212463ae15a9.jpg" width="200" alt="微信打赏"/>
<br/>
<strong>微信</strong>
</td>
</tr>
</table>

**您的支持是我持续开发的动力！** ❤️

</div>

---


高观赏性质的浏览器插件（Readmdvue，Chrome 扩展），最新版本支持：

- 📖 **阅读**：打开 Markdown 文件 → 渲染为精美 HTML 文档
- ✏️ **修改**：可直接在页面上编辑 Markdown 内容，实时预览
- ⬇️ **下载为 Word**：一键导出为 Word（.docx）文档
- 🧮 流程图自动转化、PDF 导出

浏览器插件请搜索「markdown-reader-vue」，Readmdvue-v2.1.14
下载地址：https://1839911324.share.123pan.cn/123pan/AjhsTd-XgcAh?pwd=1B4p#　提取码：1B4p
插件有更新名称，版本号有时会变化，请下载文件夹内最新版本即可。

使用方法：

1. 下载浏览器插件。
2. 打开浏览器扩展管理页（复制打开）：chrome://extensions/
3. 把下载的插件拖动到扩展管理页，完成安装。
4. 打开 Markdown 文件 → 即可看到 Markdown 变成精美的 HTML 文档。
5. 鼠标靠近左侧 60px 位置即可看到菜单栏，可进行编辑、下载等操作。
6. **修改**：在页面中直接编辑 Markdown 内容，右侧实时预览。
7. **下载为 Word**：点击菜单栏「下载 Word」即可导出 .docx 文件。
8. 支持导出 PDF。
9. 支持各种流程图自动转化。

## 功能

- 将Markdown文件转换为Word文档
- 将Markdown文件转换为HTML文档
- 将Markdown文件转换为excel文档
- 批量转换Markdown文件为Word文档
- 支持自定义配置（字体、颜色、页面大小等）
- 支持中文路径和文件名
- 支持命令行直接转换
- 支持浏览器查看Mardown文档

## 使用方法

### 在VS Code中使用

1. 在VS Code中打开一个Markdown文件
2. 右键单击编辑器或文件资源管理器中的文件
3. 选择"生成Word文档"或"配置Word文档"
4. 转换完成后，会自动打开生成的Word文档

### 通过命令行使用

现在支持直接通过命令行参数转换Markdown文件，无需额外确认：

```bash
# Windows
code --extensions-dir <扩展目录> <Markdown文件路径>

# macOS
code --extensions-dir <扩展目录> <Markdown文件路径>

# 示例
code --extensions-dir ~/.vscode/extensions "/Users/yingyang/Documents/project/mdworld/AIWorld/资料规则/规则.md"
```

命令行使用注意事项：
- 支持包含中文字符的路径
- 支持包含空格的路径（需要使用引号包围）
- 转换完成后会自动打开生成的Word文档

## 配置选项

在VS Code设置中可以配置以下选项：

- `markdown-to-word.defaultFontFamily`: 默认字体
- `markdown-to-word.defaultFontSize`: 默认字号
- `markdown-to-word.defaultLineSpacing`: 默认行间距
- `markdown-to-word.includeToc`: 是否包含目录
- `markdown-to-word.keepHtml`: 是否保留中间HTML文件



## 功能特点

- 🚀 **一键转换**：右键点击 Markdown 文件即可转换为 Word 文档
- 🎨 **精美排版**：支持自定义字体、颜色、段落样式等
- 📊 **表格支持**：完美呈现 Markdown 表格，并应用表格样式
- 💻 **代码高亮**：保留代码块格式和语法高亮
- 📷 **图片处理**：自动将图片嵌入到 Word 文档中
- 📋 **智能目录**：支持 `[TOC]` 标记，目录可插入到指定位置
- 🔄 **批量转换**：支持转换整个目录下的 Markdown 文件
- 🌐 **HTML转换**：支持将Markdown转换为HTML文档

### 目录功能说明

本插件支持智能目录生成和专业的文档结构：

#### 📄 **专业三页文档结构**

插件默认生成符合专业文档标准的三页结构：

1. **第一页：封面页** - 自动提取文档标题和开头内容作为封面
2. **第二页：目录页** - 自动生成的完整目录，独占页面
3. **第三页开始：正文** - 文档的主要内容

#### 🎯 **目录位置控制**

1. **固定位置目录**：在配置中启用 `generate_toc: true` 时，目录会默认生成在第二页
2. **灵活位置目录**：在Markdown文档中使用 `[TOC]` 标记，目录将在该标记位置生成

#### ⚙️ **封面页配置**

封面页内容完全基于您的文档实际内容：

```yaml
document:
  generate_cover: true              # 是否生成封面页
  generate_cover_without_toc: false # 无目录时是否仍生成封面
  # 封面内容自动从文档中提取：
  # - 标题：使用文档的第一个标题
  # - 简介：如果文档开头有描述性内容
```

**封面页特点**：
- ✅ 使用文档的实际标题
- ✅ 提取文档开头的描述性内容
- ✅ 不会添加用户未提供的信息（版本号、作者等）
- ✅ 保持简洁、专业的外观

**使用示例**：
```markdown
# 项目技术文档

这是文档介绍。

[TOC]

## 第一章
内容...

## 第二章  
内容...
```

**生成效果**：
- 📄 第1页：封面（标题、版本、作者、日期）
- 📋 第2页：目录（所有章节的完整列表）  
- 📖 第3页起：正文内容

目录会自动收集文档中的所有标题，并根据配置的深度显示相应级别的标题。在生成的Word文档中，可以右键点击目录区域选择"更新域"来获得准确的页码。

## 特点优势

- **纯JavaScript实现**：无需安装Python或任何外部依赖
- **轻量级**：安装后即可使用，无需额外配置
- **高性能**：使用Node.js原生模块，转换速度更快
- **更好的兼容性**：适用于所有平台，无需担心Python环境问题

## 常见问题

1. **Q: 转换后的文档中文字乱码怎么办？**  
   A: 请确保您的系统安装了插件配置中指定的字体，或修改配置中的字体设置。

2. **Q: 如何自定义文档样式？**  
   A: 可以通过VS Code设置中的"Markdown to Word"部分进行基本配置，或使用"编辑配置"命令进行高级配置。

3. **Q: 支持哪些Markdown语法？**  
   A: 支持标准Markdown语法，包括标题、列表、表格、代码块、图片等，以及部分扩展语法。

4. **Q: 在 Qoder 中打开时弹出 `GitHubLoginFailed` 错误，是插件问题吗？**  
   A: **不是**。该错误来自 Qoder 内置的「GitHub Copilot Chat」扩展（`github.copilot-chat`），与本插件无关。
   根因是 Qoder 的 VS Code 认证体系中从未登录过 GitHub 账号（命令行 `gh` 的登录不算，两者互不相通）。
   解决方式二选一：
   - 若需要使用 GitHub Copilot：在 Qoder 命令面板（`Ctrl+Shift+P`）执行 `GitHub: Sign in`，按提示在浏览器授权一次即可；
   - 若不使用 Copilot：在 Qoder 扩展面板中禁用「GitHub Copilot Chat」与「GitHub Copilot」两个扩展，错误即不再出现。

5. **Q: 转换失败时为什么不弹错误提示？**  
   A: 本插件遵循生产产品规范：**错误消息不弹窗**（避免打扰使用者/被误认为插件异常）。转换失败等错误会静默写入
   「输出」面板（`视图 → 输出`，选择 `Markdown to Word`），正常操作（转换成功、配置保存等）仍有信息提示。
   如需排查问题，打开输出面板即可看到详细错误信息。

## 问题反馈

如果您在使用过程中遇到任何问题，或有任何功能建议，请到GitHub仓库提交Issue或通过抖音、小红书联系作者。
   https://github.com/YaYII/md_To_Html_To_World/issues。

---

### 其他支持方式

- ⭐ 给项目点个 Star
- 🐛 提交 Bug 报告和功能建议
- 📢 向朋友推荐这个插件
- 💬 在社交媒体上分享使用体验

感谢每一位用户的支持与信任！🎉
