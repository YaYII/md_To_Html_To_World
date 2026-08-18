/**
 * @description LaTeX数学公式处理器
 * 将Markdown中的LaTeX数学公式转换为HTML元素，支持Word文档显示
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs-extra');

// KaTeX CSS 样式（内联版本）
const KATEX_CSS = `
.katex-display { display: block; margin: 1em 0; text-align: center; overflow-x: auto; overflow-y: hidden; }
.katex { font-family: KaTeX_Main, 'Times New Roman', serif; font-size: 1.1em; line-height: 1.2; white-space: nowrap; text-indent: 0; }
.katex .katex-html { display: inline-block; }
.katex .base { position: relative; display: inline-block; }
.katex .strut { display: inline-block; }
.katex .mord, .katex .mbin, .katex .mrel, .katex .mopen, .katex .mclose, .katex .mpunct, .katex .mop, .katex .mop-limits { margin-right: 0.05556em; }
.katex .mspace { display: inline-block; }
.katex .msupsub { text-align: left; }
.katex .mfrac { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; }
.katex .mfrac > span:first-child { border-bottom: 1px solid currentColor; padding-bottom: 0.05em; }
.katex .mfrac > span:last-child { padding-top: 0.05em; }
.katex .sqrt { display: inline-flex; align-items: center; }
.katex .sqrt > .sqrt-sign { position: relative; }
.katex .sqrt > .sqrt-sign::before { content: '√'; font-size: 1.2em; }
.katex .sqrt > span:last-child { border-top: 1px solid currentColor; margin-left: 0.1em; padding-left: 0.2em; }
.katex .delim-size1 { font-size: 1.2em; vertical-align: middle; }
`;

/**
 * @class MathProcessor
 * @description 处理LaTeX数学公式，转换为HTML格式
 */
class MathProcessor {
  /**
   * @constructor
   * @param {Object} config - 配置对象
   */
  constructor(config = {}) {
    this.config = config;
    this.mathConfig = config.math || {};
    this.enabled = this.mathConfig.enabled !== false; // 默认启用
    this.outputFormat = this.mathConfig.output_format || 'html'; // html 或 image
    
    // 缓存已处理的公式
    this.formulaCache = new Map();
  }

  /**
   * @method processMathFormulas
   * @description 处理Markdown内容中的LaTeX数学公式
   * @param {string} content - Markdown内容
   * @param {string} outputDir - 输出目录（用于保存图片）
   * @returns {Promise<string>} - 处理后的内容
   */
  async processMathFormulas(content, outputDir = null) {
    if (!this.enabled) {
      return content;
    }

    try {
      let processedContent = content;

      // 处理块级公式 $$...$$
      processedContent = await this.processBlockMath(processedContent, outputDir);

      // 处理行内公式 $...$（注意：需要避免误处理美元符号）
      processedContent = await this.processInlineMath(processedContent, outputDir);

      return processedContent;
    } catch (error) {
      console.error('处理数学公式时出错:', error.message);
      return content; // 出错时返回原内容
    }
  }

  /**
   * @method processBlockMath
   * @description 处理块级数学公式 $$...$$
   * @param {string} content - 内容
   * @param {string} outputDir - 输出目录
   * @returns {Promise<string>} - 处理后的内容
   */
  async processBlockMath(content, outputDir) {
    // 匹配 $$...$$ 块级公式（支持多行）
    const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
    
    let result = content;
    const matches = [...content.matchAll(blockMathRegex)];
    
    for (const match of matches) {
      const fullMatch = match[0];
      const formula = match[1].trim();
      
      // 生成HTML表示
      const html = await this.formulaToHtml(formula, true, outputDir);
      result = result.replace(fullMatch, html);
    }
    
    return result;
  }

  /**
   * @method processInlineMath
   * @description 处理行内数学公式 $...$
   * @param {string} content - 内容
   * @param {string} outputDir - 输出目录
   * @returns {Promise<string>} - 处理后的内容
   */
  async processInlineMath(content, outputDir) {
    // 匹配单个 $...$ 行内公式（避免匹配 $$）
    // 使用更精确的正则，避免匹配货币符号
    const inlineMathRegex = /(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g;
    
    let result = content;
    const matches = [...content.matchAll(inlineMathRegex)];
    
    for (const match of matches) {
      const fullMatch = match[0];
      const formula = match[1].trim();
      
      // 跳过看起来像货币的简单数字
      if (/^[\d,]+\.?\d*$/.test(formula)) {
        continue;
      }

      // 真公式判定：只有含 LaTeX 数学特征的 $...$ 才渲染（避免误判 PHP 变量/代码/货币）
      // 先排除明显的代码特征：PHP 对象操作符 ->、方法调用 (、命名空间 ::、数组键 [、
      // 分号结尾、代码关键字（避免把 E=mc^2 这类含 = 的公式误判）
      const codeLike = /(?:->|\(|\)|::|\[|\]|;|\b(?:function|class|namespace|use|new|return|if|else|foreach|while|for|public|private|protected|static|const|var)\b)/.test(formula);
      if (codeLike) {
        continue; // 代码片段，不是公式
      }
      // 特征1：含反斜杠 LaTeX 命令（\frac \sum \int \sqrt \alpha 等）
      const hasLatexCommand = /\\\\(?:frac|dfrac|sum|int|sqrt|alpha|beta|gamma|delta|lambda|sigma|omega|pi|theta|infty|times|cdot|leq|geq|neq|partial|prod|begin|end|text|mathrm|mathbb|left|right|rightarrow|to|pm|div|approx|equiv)/.test(formula);
      // 特征2：含上下标 ^ 或 _ 后跟 { 或数字（排除 PHP 变量名 _x）
      const hasSuperSubscript = /[\^_][{0-9]/.test(formula);
      if (!hasLatexCommand && !hasSuperSubscript) {
        // 不是真公式（如 $item->where(...) 的 PHP 变量/方法调用），保留原文
        continue;
      }
      
      // 生成HTML表示
      const html = await this.formulaToHtml(formula, false, outputDir);
      result = result.replace(fullMatch, html);
    }
    
    return result;
  }

  /**
   * @method formulaToHtml
   * @description 将LaTeX公式转换为HTML
   * @param {string} formula - LaTeX公式
   * @param {boolean} isBlock - 是否为块级公式
   * @param {string} outputDir - 输出目录
   * @returns {Promise<string>} - HTML字符串
   */
  async formulaToHtml(formula, isBlock = false, outputDir = null) {
    // 检查缓存
    const cacheKey = `${isBlock ? 'block' : 'inline'}_${formula}`;
    if (this.formulaCache.has(cacheKey)) {
      return this.formulaCache.get(cacheKey);
    }

    try {
      // 尝试使用KaTeX进行渲染
      const katexHtml = await this.renderWithKaTeX(formula, isBlock);
      
      if (katexHtml) {
        // 生成带有特殊标记的HTML，便于后续处理
        const wrapperClass = isBlock ? 'math-formula math-block' : 'math-formula math-inline';
        const html = `<span class="${wrapperClass}" data-formula="${this.escapeHtml(formula)}" data-display="${isBlock}">${katexHtml}</span>`;
        
        this.formulaCache.set(cacheKey, html);
        return html;
      }
    } catch (error) {
      console.warn(`KaTeX渲染失败，使用备用方案: ${error.message}`);
    }

    // 备用方案：生成简单的HTML表示
    const fallbackHtml = this.createFallbackHtml(formula, isBlock);
    this.formulaCache.set(cacheKey, fallbackHtml);
    return fallbackHtml;
  }

  /**
   * @method renderWithKaTeX
   * @description 使用KaTeX渲染公式
   * @param {string} formula - LaTeX公式
   * @param {boolean} isBlock - 是否为块级公式
   * @returns {Promise<string|null>} - HTML字符串或null
   */
  async renderWithKaTeX(formula, isBlock) {
    try {
      // 动态导入KaTeX（如果可用）
      const katex = await this.loadKaTeX();
      
      if (!katex) {
        return null;
      }

      const html = katex.renderToString(formula, {
        displayMode: isBlock,
        throwOnError: false,
        output: 'html',
        strict: false
      });

      return html;
    } catch (error) {
      return null;
    }
  }

  /**
   * @method loadKaTeX
   * @description 加载KaTeX库
   * @returns {Promise<Object|null>} - KaTeX对象或null
   */
  async loadKaTeX() {
    try {
      // 尝试加载katex模块
      const katex = require('katex');
      return katex;
    } catch (error) {
      // KaTeX未安装，返回null
      console.log('KaTeX未安装，使用备用数学公式渲染方案');
      return null;
    }
  }

  /**
   * @method createFallbackHtml
   * @description 创建备用HTML表示（当KaTeX不可用时）
   * @param {string} formula - LaTeX公式
   * @param {boolean} isBlock - 是否为块级公式
   * @returns {string} - HTML字符串
   */
  createFallbackHtml(formula, isBlock) {
    // 使用简单的HTML和Unicode数学符号来表示公式
    let displayFormula = formula;
    
    // 简单的LaTeX到Unicode转换
    const latexToUnicode = {
      '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
      '\\epsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ',
      '\\iota': 'ι', '\\kappa': 'κ', '\\lambda': 'λ', '\\mu': 'μ',
      '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\rho': 'ρ',
      '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
      '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
      '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ',
      '\\Xi': 'Ξ', '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Phi': 'Φ',
      '\\Psi': 'Ψ', '\\Omega': 'Ω',
      '\\infty': '∞', '\\pm': '±', '\\times': '×', '\\div': '÷',
      '\\leq': '≤', '\\geq': '≥', '\\neq': '≠', '\\approx': '≈',
      '\\sum': '∑', '\\prod': '∏', '\\int': '∫', '\\oint': '∮',
      '\\partial': '∂', '\\nabla': '∇', '\\forall': '∀', '\\exists': '∃',
      '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\supset': '⊃',
      '\\cup': '∪', '\\cap': '∩', '\\emptyset': '∅', '\\therefore': '∴',
      '\\because': '∵', '\\angle': '∠', '\\perp': '⊥', '\\parallel': '∥',
      '\\sqrt': '√', '\\bar': '‾', '\\hat': '^', '\\dot': '˙',
      '\\left(': '(', '\\right)': ')', '\\left[': '[', '\\right]': ']',
      '\\left\\{': '{', '\\right\\}': '}', '\\left|': '|', '\\right|': '|',
      '\\frac': '', '\\cdot': '·', '\\ldots': '…', '\\cdots': '⋯',
      '\\rightarrow': '→', '\\leftarrow': '←', '\\Rightarrow': '⇒',
      '\\Leftarrow': '⇐', '\\leftrightarrow': '↔', '\\Leftrightarrow': '⇔'
    };

    // 应用转换
    for (const [latex, unicode] of Object.entries(latexToUnicode)) {
      displayFormula = displayFormula.split(latex).join(unicode);
    }

    // 清理剩余的LaTeX命令
    displayFormula = displayFormula
      .replace(/\\[a-zA-Z]+/g, '') // 移除未知的LaTeX命令
      .replace(/\{/g, '').replace(/\}/g, '') // 移除花括号
      .replace(/\\_/g, '_') // 转义下划线
      .replace(/\\\$/g, '$'); // 转义美元符号

    const wrapperClass = isBlock ? 'math-formula math-block math-fallback' : 'math-formula math-inline math-fallback';
    
    if (isBlock) {
      return `<div class="${wrapperClass}" data-formula="${this.escapeHtml(formula)}" style="text-align: center; margin: 1em 0; font-family: 'Times New Roman', serif;"><code>${this.escapeHtml(displayFormula)}</code></div>`;
    } else {
      return `<span class="${wrapperClass}" data-formula="${this.escapeHtml(formula)}" style="font-family: 'Times New Roman', serif;"><code>${this.escapeHtml(displayFormula)}</code></span>`;
    }
  }

  /**
   * @method escapeHtml
   * @description 转义HTML特殊字符
   * @param {string} text - 原始文本
   * @returns {string} - 转义后的文本
   */
  escapeHtml(text) {
    const htmlEntities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, char => htmlEntities[char]);
  }

  /**
   * @method getMathStyles
   * @description 获取数学公式的CSS样式
   * @returns {string} - CSS样式字符串
   */
  getMathStyles() {
    return `
      /* 数学公式样式 */
      .math-formula {
        font-family: 'KaTeX_Main', 'Times New Roman', serif;
      }
      .math-block {
        display: block;
        text-align: center;
        margin: 1em 0;
        padding: 0.5em;
        overflow-x: auto;
        background-color: #f9f9f9;
        border-radius: 4px;
      }
      .math-inline {
        display: inline;
        padding: 0.1em 0.3em;
        background-color: #f0f0f0;
        border-radius: 3px;
      }
      .math-fallback code {
        font-family: 'Times New Roman', serif;
        font-size: 1.1em;
        color: #333;
      }
      ${KATEX_CSS}
    `;
  }
}

module.exports = MathProcessor;
