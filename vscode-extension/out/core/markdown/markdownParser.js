"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownParser = void 0;
const markdown_it_1 = __importDefault(require("markdown-it"));
class MarkdownParser {
    constructor(options = {}) {
        this.md = new markdown_it_1.default({
            html: options.html !== undefined ? options.html : true,
            breaks: options.breaks !== undefined ? options.breaks : true,
            linkify: options.linkify !== undefined ? options.linkify : true,
            typographer: options.typographer !== undefined ? options.typographer : true,
            highlight: options.highlight,
        });
        this.enablePlugins();
    }
    enablePlugins() {
    }
    parse(markdown) {
        return this.md.render(markdown);
    }
    convertToHtml(markdown) {
        const content = this.parse(markdown);
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown转换</title>
  <style>
    body {
      font-family: "Microsoft YaHei", "Segoe UI", "Helvetica Neue", sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
      line-height: 1.25;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1em; }
    h5 { font-size: 0.875em; }
    h6 { font-size: 0.85em; color: #6a737d; }
    
    p, ul, ol, table, pre, blockquote {
      margin-top: 0;
      margin-bottom: 16px;
    }
    
    ul, ol {
      padding-left: 2em;
    }
    
    li + li {
      margin-top: 0.25em;
    }
    
    li > p {
      margin-top: 16px;
    }
    
    a {
      color: #0366d6;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      padding: 0.2em 0.4em;
      margin: 0;
      font-size: 85%;
      background-color: rgba(27, 31, 35, 0.05);
      border-radius: 3px;
    }
    
    pre {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      word-wrap: normal;
      padding: 16px;
      overflow: auto;
      font-size: 85%;
      line-height: 1.45;
      background-color: #f6f8fa;
      border-radius: 3px;
    }
    
    pre code {
      padding: 0;
      margin: 0;
      font-size: 100%;
      word-break: normal;
      white-space: pre;
      background: transparent;
      border: 0;
    }
    
    blockquote {
      padding: 0 1em;
      color: #6a737d;
      border-left: 0.25em solid #dfe2e5;
    }
    
    blockquote > :first-child {
      margin-top: 0;
    }
    
    blockquote > :last-child {
      margin-bottom: 0;
    }
    
    table {
      border-spacing: 0;
      border-collapse: collapse;
      width: 100%;
      overflow: auto;
    }
    
    table th {
      font-weight: 600;
      padding: 6px 13px;
      border: 1px solid #dfe2e5;
      background-color: #f6f8fa;
    }
    
    table td {
      padding: 6px 13px;
      border: 1px solid #dfe2e5;
    }
    
    table tr {
      background-color: #fff;
      border-top: 1px solid #c6cbd1;
    }
    
    table tr:nth-child(2n) {
      background-color: #f6f8fa;
    }
    
    img {
      max-width: 100%;
      box-sizing: content-box;
    }
    
    hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: #e1e4e8;
      border: 0;
    }
  </style>
</head>
<body>
  <div class="markdown-content">
    ${content}
  </div>
</body>
</html>
    `;
    }
}
exports.MarkdownParser = MarkdownParser;
//# sourceMappingURL=markdownParser.js.map