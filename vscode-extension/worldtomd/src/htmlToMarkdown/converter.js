const TurndownService = require('turndown');
const fs = require('fs');
const path = require('path');

/**
 * HTML 转 Markdown 转换器
 * 使用 turndown 库将 HTML 转换为 Markdown，支持语义化标记识别
 */
class HtmlToMarkdownConverter {
  constructor(options = {}) {
    this.options = {
      // Turndown 配置
      headingStyle: 'atx',           // 标题样式: 'atx' (#) 或 'setext' (===)
      hr: '---',                     // 水平线样式
      bulletListMarker: '-',         // 无序列表标记
      codeBlockStyle: 'fenced',      // 代码块样式: 'fenced' (```) 或 'indented'
      fence: '```',                  // 代码块围栏
      emDelimiter: '*',              // 斜体分隔符
      strongDelimiter: '**',         // 粗体分隔符
      linkStyle: 'inlined',          // 链接样式: 'inlined' 或 'referenced'
      linkReferenceStyle: 'full',    // 链接引用样式
      preformattedCode: false,       // 是否保留预格式化代码
      ...options
    };

    this.turndownService = new TurndownService(this.options);
    this.setupCustomRules();
  }

  /**
   * 设置自定义转换规则
   */
  setupCustomRules() {
    // 移除默认的列表规则，使用自定义规则
    this.turndownService.remove(['ul', 'ol', 'li']);
    
    // 处理带有 list-item 类的主列表项
    this.turndownService.addRule('semanticListItems', {
      filter: function(node) {
        return node.nodeName === 'P' && 
               node.className && 
               node.className.includes('list-item');
      },
      replacement: function(content, node) {
        content = content.trim();
        
        // 这些是主列表项，直接转换为 Markdown 列表项
        return '\n- ' + content + '\n';
      }
    });

    // 处理普通段落中的列表项（项目符号开头的段落）- 这些是子列表项
    this.turndownService.addRule('paragraphLists', {
      filter: function(node) {
        return node.nodeName === 'P' && 
               node.textContent && 
               node.textContent.trim().match(/^[•·▪▫◦‣⁃○●◉◎⦿①②③④⑤⑥⑦⑧⑨⑩1-9a-zA-Z][.)]?\s+/) &&
               !(node.className && node.className.includes('list-item'));
      },
      replacement: function(content, node) {
        // 移除项目符号并转换为Markdown子列表项（2空格缩进）
        content = content.trim().replace(/^[•·▪▫◦‣⁃○●◉◎⦿①②③④⑤⑥⑦⑧⑨⑩1-9a-zA-Z][.)]?\s*/, '');
        
        // 这些都是子列表项，使用2空格缩进
        return '\n  - ' + content + '\n';
      }
    });

    // 处理标题 - 移除粗体标记，标准化格式
    this.turndownService.addRule('headings', {
      filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      replacement: (content, node) => {
        const level = parseInt(node.tagName.charAt(1));
        const prefix = '#'.repeat(level);
        
        // 移除粗体标记和其他格式，标准化内容
        content = content
          .replace(/\*\*(.*?)\*\*/g, '$1')  // 移除粗体标记
          .replace(/__(.*?)__/g, '$1')      // 移除粗体标记（下划线）
          .replace(/\\\[/g, '[')            // 移除方括号转义
          .replace(/\\\]/g, ']')            // 移除方括号转义
          .replace(/\s+/g, ' ')             // 标准化空格
          .trim();
        
        return '\n\n' + prefix + ' ' + content + '\n\n';
      }
    });

    // 处理语义化段落（排除列表项）
    this.turndownService.addRule('semanticParagraphs', {
      filter: function(node) {
        return node.nodeName === 'P' && 
               node.className && 
               (node.className.includes('paragraph-') || node.className.includes('list-item')) &&
               !node.className.includes('list-item') && // 排除列表项，由专门规则处理
               !(node.textContent && node.textContent.trim().match(/^[•·▪▫◦‣⁃○●◉◎⦿①②③④⑤⑥⑦⑧⑨⑩1-9a-zA-Z][.)]?\s+/)); // 排除项目符号段落
      },
      replacement: function(content, node) {
        const className = node.className || '';
        
        // 根据段落类型添加特殊格式
        if (className.includes('paragraph-quote')) {
          return '\n> ' + content.trim() + '\n\n';
        } else if (className.includes('paragraph-note')) {
          return '\n> **注意：** ' + content.trim() + '\n\n';
        } else if (className.includes('paragraph-warning')) {
          return '\n> ⚠️ **警告：** ' + content.trim() + '\n\n';
        } else if (className.includes('paragraph-example')) {
          return '\n**示例：**\n\n' + content.trim() + '\n\n';
        }
        
        return '\n' + content.trim() + '\n\n';
      }
    });

    // 处理技术术语代码标记
    this.turndownService.addRule('techTermCode', {
      filter: function(node) {
        return node.nodeName === 'CODE' && 
               node.className && 
               node.className.includes('tech-term');
      },
      replacement: function(content) {
        // 直接返回反引号包围的内容，不保留HTML类名
        return '`' + content + '`';
      }
    });

    // 处理代码块
    this.turndownService.addRule('semanticCodeBlocks', {
      filter: function(node) {
        return node.nodeName === 'PRE' && 
               node.className && 
               node.className.includes('code-block');
      },
      replacement: function(content, node) {
        const language = this.detectLanguage(node);
        
        if (this.options.codeBlockStyle === 'fenced') {
          return `\n\`\`\`${language}\n${content.trim()}\n\`\`\`\n\n`;
        } else {
          return '\n' + content.split('\n').map(line => '    ' + line).join('\n') + '\n\n';
        }
      }.bind(this)
    });

    // 自定义列表处理规则 - 正确处理嵌套
    this.turndownService.addRule('lists', {
      filter: ['ul', 'ol'],
      replacement: (content, node) => {
        return '\n' + content + '\n';
      }
    });

    this.turndownService.addRule('listItems', {
      filter: 'li',
      replacement: (content, node) => {
        content = content.trim();
        if (!content) return '';

        // 计算缩进级别
        let parent = node.parentNode;
        let level = 0;
        while (parent) {
          if (parent.tagName === 'UL' || parent.tagName === 'OL') {
            level++;
          }
          parent = parent.parentNode;
        }

        // 生成正确的缩进
        const indent = '  '.repeat(Math.max(0, level - 1));
        const marker = '- ';
        
        // 处理多行内容
        const lines = content.split('\n');
        const firstLine = indent + marker + lines[0];
        const otherLines = lines.slice(1).map(line => {
          if (line.trim()) {
            return indent + '  ' + line;
          }
          return '';
        }).join('\n');

        return firstLine + (otherLines ? '\n' + otherLines : '') + '\n';
      }
    });

    // 保留代码标记
    this.turndownService.addRule('preserveInlineCode', {
      filter: 'code',
      replacement: (content, node) => {
        // 如果是在 pre 标签内，不处理（由 codeBlock 规则处理）
        if (node.parentNode && node.parentNode.tagName === 'PRE') {
          return content;
        }
        return '`' + content + '`';
      }
    });

    // 处理表格
    this.turndownService.addRule('table', {
      filter: 'table',
      replacement: (content, node) => {
        const rows = Array.from(node.querySelectorAll('tr'));
        if (rows.length === 0) return '';

        let markdown = '\n';
        
        rows.forEach((row, index) => {
          const cells = Array.from(row.querySelectorAll('td, th'));
          const cellContents = cells.map(cell => 
            cell.textContent.trim().replace(/\|/g, '\\|')
          );
          
          markdown += '| ' + cellContents.join(' | ') + ' |\n';
          
          // 添加表头分隔符
          if (index === 0 && row.querySelector('th')) {
            markdown += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
          }
        });
        
        return markdown + '\n';
      }
    });

    // 处理图片
    this.turndownService.addRule('image', {
      filter: 'img',
      replacement: (content, node) => {
        const alt = node.getAttribute('alt') || '';
        const src = node.getAttribute('src') || '';
        const title = node.getAttribute('title');
        
        if (src.startsWith('data:')) {
          // 对于内嵌图片数据，直接保留（但我们的系统现在只生成本地文件引用）
          return `![${alt}](${src}${title ? ` "${title}"` : ''})`;
        }
        
        return `![${alt}](${src}${title ? ` "${title}"` : ''})`;
      }
    });

    // 处理引用块
    this.turndownService.addRule('blockquote', {
      filter: 'blockquote',
      replacement: (content) => {
        return content.trim().split('\n').map(line => '> ' + line).join('\n') + '\n';
      }
    });
  }

  /**
   * 检测嵌套列表项 - 基于标准CHANGELOG.md的实际模式
   * @param {Element} node - 当前节点
   * @param {string} content - 内容
   * @returns {boolean} 是否为嵌套项
   */
  detectNestedListItem(node, content) {
    // 检查前一个兄弟元素
    const prevSibling = node.previousElementSibling;
    if (prevSibling && prevSibling.nodeName === 'P') {
      const prevContent = prevSibling.textContent ? prevSibling.textContent.trim() : '';
      
      // 移除前一个元素的项目符号
      const cleanPrevContent = prevContent.replace(/^[•·▪▫◦‣⁃○●◉◎⦿①②③④⑤⑥⑦⑧⑨⑩1-9a-zA-Z][.)]?\s*/, '');
      
      // 如果前一个元素是主列表项（包含粗体标记或冒号，且较长）
      if ((cleanPrevContent.includes('**') || cleanPrevContent.includes('：') || cleanPrevContent.includes(':')) 
          && cleanPrevContent.length > 20) {
        
        // 当前项如果是短的技术术语或配置项，很可能是子列表
        if (content.length < 100 && 
            (content.startsWith('支持') || 
             content.match(/^[a-zA-Z`-]+\s*[:：]/) ||
             content.match(/^`[^`]+`\s*[:：]/) ||
             content.includes('库名称') ||
             content.includes('技术术语') ||
             content.includes('类名') ||
             content.includes('配置选项'))) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 检测代码语言
   * @param {Element} node - 代码节点
   * @returns {string} 语言标识
   */
  detectLanguage(node) {
    // 尝试从 class 属性中检测语言
    const className = node.className || '';
    const langMatch = className.match(/language-(\w+)/);
    if (langMatch) {
      return langMatch[1];
    }

    // 尝试从父节点检测
    const parent = node.parentNode;
    if (parent && parent.className) {
      const parentLangMatch = parent.className.match(/language-(\w+)/);
      if (parentLangMatch) {
        return parentLangMatch[1];
      }
    }

    return '';
  }

  /**
   * 将 HTML 转换为 Markdown
   * @param {string} html - HTML 内容
   * @returns {string} Markdown 内容
   */
  convertToMarkdown(html) {
    try {
      console.log('正在转换 HTML 到 Markdown...');
      
      // 预处理 HTML
      const processedHtml = this.preprocessHtml(html);
      
      // 转换为 Markdown
      let markdown = this.turndownService.turndown(processedHtml);
      
      // 后处理 Markdown
      markdown = this.postprocessMarkdown(markdown);
      
      return markdown;
    } catch (error) {
      console.error(`HTML 转 Markdown 失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 预处理 HTML - 简化版本，避免与Word转HTML阶段重复处理
   * @param {string} html - 原始 HTML
   * @returns {string} 处理后的 HTML
   */
  preprocessHtml(html) {
    return html
      // 清理多余的空白
      .replace(/\s+/g, ' ')
      // 清理HTML注释
      .replace(/<!--[\s\S]*?-->/g, '')
      // 标准化换行
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }

  /**
   * 后处理 Markdown
   * @param {string} markdown - 原始 Markdown
   * @returns {string} 处理后的 Markdown
   */
  postprocessMarkdown(markdown) {
    // 1. 移除重复的主标题（保留第一个）
    const lines = markdown.split('\n');
    const titlePattern = /^#\s+WorldToMD\s+更新日志\s*$/;
    let titleFound = false;
    const filteredLines = lines.filter(line => {
      if (titlePattern.test(line)) {
        if (titleFound) {
          return false; // 移除重复的标题
        }
        titleFound = true;
        return true;
      }
      return true;
    });
    
    let result = filteredLines.join('\n');
    
    // 2. 标准化列表标记
    result = result.replace(/^(\s*)•\s+/gm, '$1- ');
    result = result.replace(/^(\s*)·\s+/gm, '$1- ');
    
    // 3. 移除列表项开头的项目符号
    result = result.replace(/^(\s*- )•\s*/gm, '$1');
    result = result.replace(/^(\s*- )·\s*/gm, '$1');
    
    // 4. 修复列表缩进 - 确保子列表项有正确的缩进
    const processedLines = result.split('\n');
    let inList = false;
    
    for (let i = 0; i < processedLines.length; i++) {
      const line = processedLines[i];
      
      // 检测列表项
      if (/^\s*-\s+/.test(line)) {
        const indent = line.match(/^(\s*)/)[1].length;
        
        if (indent === 0) {
          // 主列表项
          inList = true;
        } else if (indent >= 2) {
          // 子列表项 - 确保有正确的缩进（2个空格）
          const content = line.replace(/^\s*-\s*/, '');
          processedLines[i] = '  - ' + content;
        }
      } else if (line.trim() === '') {
        // 空行可能结束列表
        if (inList && i + 1 < processedLines.length && !/^\s*-\s+/.test(processedLines[i + 1])) {
          inList = false;
        }
      } else if (!/^\s/.test(line) && line.trim() !== '') {
        // 非缩进的非空行结束列表
        inList = false;
      }
    }
    
    result = processedLines.join('\n');
    
    // 5. 控制空行数量 - 最多两个连续换行
    result = result.replace(/\n{3,}/g, '\n\n');
    
    // 6. 移除列表项之间的多余空行
    result = result.replace(/^(\s*- .*)\n\n(\s*- )/gm, '$1\n$2');
    
    // 7. 确保标题前后有空行
    result = result.replace(/\n(#{1,6} )/g, '\n\n$1');
    result = result.replace(/(#{1,6} .*)\n([^#\n])/g, '$1\n\n$2');
    
    // 8. 移除标题中的粗体标记（如果还有残留）
    result = result.replace(/^(#{1,6} )\*\*(.*?)\*\*$/gm, '$1$2');
    
    // 9. 移除版本号中的转义字符
    result = result.replace(/\\(\[|\])/g, '$1');
    
    // 10. 清理开头和结尾的空白
    result = result.trim() + '\n';
    
    return result;
  }

  /**
   * 将 HTML 文件转换为 Markdown 文件
   * @param {string} inputPath - HTML 文件路径
   * @param {string} outputPath - 输出 Markdown 文件路径
   */
  async convertFile(inputPath, outputPath) {
    try {
      const html = fs.readFileSync(inputPath, 'utf8');
      const processedHtml = this.preprocessHtml(html);
      const markdown = this.turndownService.turndown(processedHtml);
      const finalMarkdown = this.postprocessMarkdown(markdown);
      
      fs.writeFileSync(outputPath, finalMarkdown);
      
      return {
        success: true,
        inputSize: html.length,
        outputSize: finalMarkdown.length,
        stats: this.getConversionStats(finalMarkdown)
      };
    } catch (error) {
      throw new Error(`转换失败: ${error.message}`);
    }
  }

  /**
   * 获取转换统计信息
   * @param {string} markdown - Markdown 内容
   * @returns {Object} 统计信息
   */
  getConversionStats(markdown) {
    const lines = markdown.split('\n');
    const headings = lines.filter(line => line.match(/^#{1,6}\s/)).length;
    const listItems = lines.filter(line => line.match(/^\s*-\s/)).length;
    const codeBlocks = (markdown.match(/```[\s\S]*?```/g) || []).length;
    const inlineCode = (markdown.match(/`[^`\n]+`/g) || []).length;
    const words = markdown.replace(/[^\w\s]/g, '').split(/\s+/).filter(word => word.length > 0).length;

    return {
      lines: lines.length,
      headings,
      listItems,
      codeBlocks,
      inlineCode,
      words
    };
  }
}

module.exports = HtmlToMarkdownConverter;