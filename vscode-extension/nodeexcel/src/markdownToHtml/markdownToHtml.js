/**
 * Markdown到HTML转换器
 * 基于markdown-it实现，支持扩展功能
 */

const MarkdownIt = require('markdown-it');
const anchor = require('markdown-it-anchor');
const toc = require('markdown-it-table-of-contents');
const fs = require('fs-extra');
const path = require('path');

class MarkdownToHtml {
    constructor(config = {}) {
        this.config = config;
        this.md = this.initializeMarkdownIt();
    }
    
    /**
     * 初始化Markdown-it实例
     */
    initializeMarkdownIt() {
        const md = new MarkdownIt({
            html: true,
            linkify: true,
            typographer: true,
            breaks: false
        });
        
        // 添加锚点插件 - 修复8.x版本API
        try {
            if (typeof anchor === 'function') {
                md.use(anchor, {
                    permalink: anchor.permalink ? anchor.permalink.headerLink() : true,
                    permalinkBefore: true,
                    permalinkSymbol: '#'
                });
            } else {
                console.warn('markdown-it-anchor plugin not properly loaded');
            }
        } catch (error) {
            console.warn('Failed to load markdown-it-anchor:', error.message);
            // 继续执行，不使用锚点插件
        }
        
        // 添加目录插件 - 修复导入问题
        if (typeof toc === 'function') {
            md.use(toc, {
                includeLevel: [1, 2, 3, 4],
                containerClass: 'table-of-contents',
                markerPattern: /^\[\[toc\]\]/im
            });
        } else {
            console.warn('markdown-it-table-of-contents plugin not properly loaded');
        }
        
        // 自定义渲染规则
        this.setupCustomRules(md);
        
        return md;
    }
    
    /**
     * 设置自定义渲染规则
     */
    setupCustomRules(md) {
        // 为标题添加数据属性
        const originalHeadingOpen = md.renderer.rules.heading_open || function(tokens, idx, options, env, renderer) {
            return renderer.renderToken(tokens, idx, options);
        };
        
        md.renderer.rules.heading_open = function(tokens, idx, options, env, renderer) {
            const token = tokens[idx];
            const level = token.tag.slice(1); // h1 -> 1, h2 -> 2, etc.
            token.attrSet('data-level', level);
            token.attrSet('data-type', 'heading');
            return originalHeadingOpen(tokens, idx, options, env, renderer);
        };
        
        // 为段落添加数据属性
        const originalParagraphOpen = md.renderer.rules.paragraph_open || function(tokens, idx, options, env, renderer) {
            return renderer.renderToken(tokens, idx, options);
        };
        
        md.renderer.rules.paragraph_open = function(tokens, idx, options, env, renderer) {
            const token = tokens[idx];
            token.attrSet('data-type', 'paragraph');
            return originalParagraphOpen(tokens, idx, options, env, renderer);
        };
        
        // 为列表添加数据属性
        const originalListItemOpen = md.renderer.rules.list_item_open || function(tokens, idx, options, env, renderer) {
            return renderer.renderToken(tokens, idx, options);
        };
        
        md.renderer.rules.list_item_open = function(tokens, idx, options, env, renderer) {
            const token = tokens[idx];
            token.attrSet('data-type', 'list-item');
            return originalListItemOpen(tokens, idx, options, env, renderer);
        };
        
        // 为代码块添加数据属性
        const originalCodeBlock = md.renderer.rules.code_block || function(tokens, idx, options, env, renderer) {
            return renderer.renderToken(tokens, idx, options);
        };
        
        md.renderer.rules.code_block = function(tokens, idx, options, env, renderer) {
            const token = tokens[idx];
            token.attrSet('data-type', 'code-block');
            return originalCodeBlock(tokens, idx, options, env, renderer);
        };
        
        // 为围栏代码块添加数据属性
        const originalFenceOpen = md.renderer.rules.fence || function(tokens, idx, options, env, renderer) {
            return renderer.renderToken(tokens, idx, options);
        };
        
        md.renderer.rules.fence = function(tokens, idx, options, env, renderer) {
            const token = tokens[idx];
            const info = token.info ? token.info.trim() : '';
            const langName = info ? info.split(/\s+/g)[0] : '';
            
            let result = '<pre data-type="code-block"';
            if (langName) {
                result += ` data-language="${md.utils.escapeHtml(langName)}"`;
            }
            result += '><code';
            if (langName) {
                result += ` class="language-${md.utils.escapeHtml(langName)}"`;
            }
            result += '>';
            result += md.utils.escapeHtml(token.content);
            result += '</code></pre>\n';
            
            return result;
        };
        
        // 为引用块添加数据属性
        const originalBlockquoteOpen = md.renderer.rules.blockquote_open || function(tokens, idx, options, env, renderer) {
            return renderer.renderToken(tokens, idx, options);
        };
        
        md.renderer.rules.blockquote_open = function(tokens, idx, options, env, renderer) {
            const token = tokens[idx];
            token.attrSet('data-type', 'blockquote');
            return originalBlockquoteOpen(tokens, idx, options, env, renderer);
        };
        
        // 为表格添加数据属性
        const originalTableOpen = md.renderer.rules.table_open || function(tokens, idx, options, env, renderer) {
            return renderer.renderToken(tokens, idx, options);
        };
        
        md.renderer.rules.table_open = function(tokens, idx, options, env, renderer) {
            const token = tokens[idx];
            token.attrSet('data-type', 'table');
            token.attrSet('class', 'markdown-table');
            return originalTableOpen(tokens, idx, options, env, renderer);
        };
    }
    
    /**
     * 转换Markdown文件为HTML
     */
    async convertFile(inputPath, outputPath = null) {
        try {
            // 读取Markdown文件
            const markdownContent = await fs.readFile(inputPath, 'utf8');
            
            // 转换为HTML
            const htmlContent = this.convertString(markdownContent);
            
            // 如果指定了输出路径，保存HTML文件
            if (outputPath) {
                await fs.ensureDir(path.dirname(outputPath));
                await fs.writeFile(outputPath, htmlContent, 'utf8');
                console.log(`HTML file saved to: ${outputPath}`);
            }
            
            return htmlContent;
        } catch (error) {
            throw new Error(`Failed to convert Markdown file: ${error.message}`);
        }
    }
    
    /**
     * 转换Markdown字符串为HTML
     */
    convertString(markdownContent) {
        try {
            // 预处理Markdown内容
            const processedContent = this.preprocessMarkdown(markdownContent);
            
            // 转换为HTML
            const htmlContent = this.md.render(processedContent);
            
            // 后处理HTML内容
            const finalHtml = this.postprocessHtml(htmlContent);
            
            return finalHtml;
        } catch (error) {
            throw new Error(`Failed to convert Markdown string: ${error.message}`);
        }
    }
    
    /**
     * 预处理Markdown内容
     */
    preprocessMarkdown(content) {
        // 处理TOC标记
        content = content.replace(/^\[\[TOC\]\]$/gm, '[[TOC]]');
        
        // 处理水平分割线
        content = content.replace(/^---+$/gm, '---');
        
        // 确保代码块正确格式化
        content = content.replace(/```([\s\S]*?)```/g, (match, code) => {
            return '```\n' + code.trim() + '\n```';
        });
        
        return content;
    }
    
    /**
     * 后处理HTML内容
     */
    postprocessHtml(html) {
        // 包装在完整的HTML文档中
        const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Converted Document</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .table-of-contents {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 20px;
            margin: 20px 0;
        }
        .markdown-table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        .markdown-table th,
        .markdown-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        .markdown-table th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        pre {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 16px;
            overflow-x: auto;
        }
        blockquote {
            border-left: 4px solid #ddd;
            margin: 0;
            padding-left: 16px;
            color: #666;
        }
    </style>
</head>
<body>
${html}
</body>
</html>`;
        
        return fullHtml;
    }
    
    /**
     * 批量转换Markdown文件
     */
    async convertBatch(inputPattern, outputDir) {
        const glob = require('glob');
        const files = glob.sync(inputPattern);
        
        if (files.length === 0) {
            throw new Error(`No files found matching pattern: ${inputPattern}`);
        }
        
        const results = [];
        
        for (const file of files) {
            try {
                const basename = path.basename(file, path.extname(file));
                const outputPath = path.join(outputDir, `${basename}.html`);
                
                await this.convertFile(file, outputPath);
                results.push({ input: file, output: outputPath, success: true });
            } catch (error) {
                results.push({ input: file, error: error.message, success: false });
            }
        }
        
        return results;
    }
}

module.exports = MarkdownToHtml;