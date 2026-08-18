/**
 * @description Mermaid 图表处理器（Word 链路服务端渲染）
 * 背景：HTML 文档的 mermaid 由浏览器内嵌 mermaid.min.js 渲染为 SVG（单文件自包含），
 * 但 Word 需要 PNG 图片嵌入 docx（无法执行浏览器 JS）。本处理器在 htmlToWord 阶段
 * 遇到 mermaid 代码块时，用在线 Kroki API 渲染 PNG → ImageRun 嵌入 docx。
 * 策略：在线 Kroki（5 秒超时）→ 超时自动切换离线 jsdom 渲染（纯 Node，无 Chrome）→ 降级代码块。
 * （已废弃 headless Chrome 方案：无需外部浏览器）
 */
const { Paragraph, TextRun, ImageRun, AlignmentType } = require('docx');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { createRequire } = require('module');
const { getSharp } = require('../utils/sharpLoader');
const { svgToPng } = require('../utils/svgToPng');
const logger = require('../../utils/fileLogger');

// 离线 jsdom 渲染器（纯 Node，无需 Chrome/playwright）
let jsdomMermaid = null;
let jsdomMermaidPromise = null;
async function getJsdomMermaid() {
  if (jsdomMermaid) return jsdomMermaid;
  // promise 单例：98 个并发预渲染共享同一份 jsdom 初始化，避免并发创建
  // JSDOM + 全局注入互相覆盖/竞争（并发初始化曾导致卡死）
  if (!jsdomMermaidPromise) {
    jsdomMermaidPromise = (async () => {
      try {
    // 用 createRequire 从 vendor/jsdom-deps 加载 jsdom（webpack 无法完整打包 jsdom，
    // 运行时从 vendor 目录 require 保证所有传递依赖可用）
    // 双运行时候选（与 govHtmlTemplate loadMermaidMin 一致）：
    // - src 直跑：__dirname = src/mdtoworld/htmlToWord/processors → ../../.. = src/mdtoworld/htmlToWord/vendor？不对
    // - 实际 mermaidProcessor 在 src/mdtoworld/htmlToWord/processors/，vendor 在 src/mdtoworld/markdownToHtml/vendor/
    // - 打包后：__dirname = dist/ → dist/vendor/
    const jsdomCandidates = [
      path.join(__dirname, '..', '..', '..', 'mdtoworld', 'markdownToHtml', 'vendor', 'jsdom-deps'), // src 直跑
      path.join(__dirname, '..', '..', '..', 'vendor', 'jsdom-deps') // 打包后（dist/../../.. → 扩展根？不对）
    ];
    // 更稳妥：从扩展根搜索 jsdom-deps（src 与 dist 两种布局）
    // 扩展根 = src 运行时 ../../../../（src/mdtoworld/htmlToWord/processors → 4 级到 vscode-extension）
    //        = dist 运行时 ..（dist → vscode-extension）
    // 且打包后 __dirname 直接就是 dist/（webpack node.__dirname=false 保留真实路径），
    // vendor/jsdom-deps 就在 dist/vendor/ 下，故把 __dirname 本身也作为候选根。
    const extRootCandidates = [
      path.join(__dirname, '..', '..', '..', '..'), // src 运行时 → vscode-extension
      __dirname,                                     // 打包后 dist/（vendor/jsdom-deps 直接在其下）
      path.join(__dirname, '..')                     // dist 运行时 → vscode-extension
    ];
    let jsdomDepsRoot = null;
    for (const root of extRootCandidates) {
      for (const sub of ['vendor/jsdom-deps', 'src/mdtoworld/markdownToHtml/vendor/jsdom-deps']) {
        const p = path.join(root, sub);
        if (fs.existsSync(path.join(p, 'node_modules', 'jsdom'))) {
          jsdomDepsRoot = p;
          break;
        }
      }
      if (jsdomDepsRoot) break;
    }
    if (!jsdomDepsRoot) {
      console.warn('[MermaidProcessor] vendor jsdom-deps 未找到，离线渲染不可用');
      return null;
    }
    // 关键：不能用 `= require` 作为初始值（webpack 会静态分析 jsdomRequire('jsdom')
    // 为 require('jsdom')，导致打包后顶层 require 插件环境找不到模块 → 激活失败）
    // 必须纯用 createRequire 从 vendor 路径加载
    let jsdomRequire = null;
    try {
      jsdomRequire = createRequire(path.join(jsdomDepsRoot, 'loader.js'));
    } catch (e) { /* 保持 null */ }
    if (!jsdomRequire) return null;
    const { JSDOM } = jsdomRequire('jsdom');
    if (!JSDOM) return null;
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      pretendToBeVisual: true, url: 'http://localhost'
    });
    const { window } = dom;
    for (const key of Object.getOwnPropertyNames(window)) {
      if (!(key in global)) { try { global[key] = window[key]; } catch (e) {} }
    }
    global.window = window;
    global.document = window.document;
    global.navigator = window.navigator;

    // SVG 布局测量 polyfill（jsdom 不实现 getBBox/getTotalLength 等）
    const FONT_SIZE = 16;
    function measureText(text) {
      let w = 0;
      for (const ch of String(text || '')) {
        const code = ch.codePointAt(0);
        // 宽度估算故意偏大（含字间距/边距），避免布局 viewBox 小于实际渲染尺寸
        // （估算偏小 → 节点实际换行/更高 → 底部内容超出 viewBox 被裁剪 = 内容丢失）
        if (code >= 0x2E80) w += FONT_SIZE * 1.05;
        else if (code >= 0x20 && code <= 0x7E) w += FONT_SIZE * 0.62;
        else if (ch === ' ') w += FONT_SIZE * 0.35;
        else w += FONT_SIZE * 0.9;
      }
      // 行高估算偏大（含文字上下留白），保证节点高度容纳实际文字渲染
      return { width: Math.ceil(w), height: FONT_SIZE * 1.5 };
    }

    // 解析 transform="translate(x,y)"（关键：聚合子元素 bbox 时必须计入 transform 偏移，
    // 否则根 SVG 的 viewBox 只覆盖部分内容 → sharp 按 viewBox 裁剪导致图片内容缺失）
    function getTranslate(el) {
      const t = el.getAttribute?.('transform') || '';
      const m = t.match(/translate\(\s*([\d.-]+)\s*[, ]\s*([\d.-]+)/);
      return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
    }

    window.SVGElement.prototype.getBBox = function() {
      const tag = this.tagName;
      if (tag === 'text' || tag === 'tspan') return measureText(this.textContent || '');
      if (['path','line','polyline','polygon','circle','ellipse','rect','foreignObject'].includes(tag)) {
        const x = parseFloat(this.getAttribute?.('x')) || 0;
        const y = parseFloat(this.getAttribute?.('y')) || 0;
        const w = parseFloat(this.getAttribute?.('width')) || 0;
        const h = parseFloat(this.getAttribute?.('height')) || 0;
        if (w && h) return { x, y, width: w, height: h, left: x, top: y, right: x+w, bottom: y+h };
        return { x: 0, y: 0, width: 100, height: 50, left: 0, top: 0, right: 100, bottom: 50 };
      }
      if (this.childElementCount) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const c of this.children) {
          const b = c.getBBox && c.getBBox();
          if (b && b.width > 0) {
            const off = getTranslate(c); // 计入子元素 transform 偏移，避免 viewBox 只覆盖部分内容
            const x = b.x + off.x;
            const y = b.y + off.y;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x + b.width > maxX) maxX = x + b.width;
            if (y + b.height > maxY) maxY = y + b.height;
          }
        }
        if (maxX !== -Infinity) return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, left: minX, top: minY, right: maxX, bottom: maxY };
      }
      return { x: 0, y: 0, width: 60, height: 40, left: 0, top: 0, right: 60, bottom: 40 };
    };
    window.SVGElement.prototype.getBoundingClientRect = function() {
      const bb = this.getBBox();
      return { x: 0, y: 0, width: bb.width, height: bb.height, left: 0, top: 0, right: bb.width, bottom: bb.height };
    };
    window.SVGElement.prototype.getTotalLength = function() {
      const d = this.getAttribute?.('d') || '';
      return Math.max(100, d.length * 3);
    };
    window.SVGElement.prototype.getPointAtLength = function(d) {
      const len = this.getTotalLength();
      const t = len ? d / len : 0;
      return { x: 100 * t, y: 50 * t };
    };
    window.SVGElement.prototype.getComputedTextLength = function() { return measureText(this.textContent || '').width; };
    window.SVGElement.prototype.getSubStringLength = function() { return measureText(this.textContent || '').width; };

    // 读取 mermaid.min.js（vendor 或 node_modules）
    const candidates = [
      path.join(__dirname, '..', '..', '..', 'mdtoworld', 'markdownToHtml', 'vendor', 'mermaid.min.js'),
      path.join(__dirname, '..', '..', '..', 'node_modules', 'mermaid', 'dist', 'mermaid.min.js')
    ];
    let mermaidJsPath = null;
    for (const p of candidates) {
      try { if (fs.existsSync(p)) { mermaidJsPath = p; break; } } catch (e) {}
    }
    if (!mermaidJsPath) return null;
    jsdomMermaid = require(mermaidJsPath);
    jsdomMermaid.initialize({
      startOnLoad: false, theme: 'default', securityLevel: 'loose',
      fontFamily: 'PingFang SC, Microsoft YaHei UI, Noto Serif CJK SC, SimSun, sans-serif',
      fontSize: 14,
      flowchart: { htmlLabels: false, useMaxWidth: false },
      er: { useMaxWidth: false },
      sequence: { useMaxWidth: false }
    });
        return jsdomMermaid;
      } catch (e) {
        console.warn('[MermaidProcessor] jsdom 离线渲染器初始化失败:', e.message);
        return null;
      }
    })();
  }
  jsdomMermaid = await jsdomMermaidPromise;
  return jsdomMermaid;
}

/** 离线 jsdom 渲染（纯 Node，无 Chrome）→ SVG → PNG（resvg，无 GLib 依赖） */
async function renderOffline(code) {
  const mermaid = await getJsdomMermaid();
  if (!mermaid) return null;
  try {
    const t0 = Date.now();
    const { svg } = await mermaid.render('offline-' + Date.now(), code);
    const t1 = Date.now();
    if (!svg) { logger.w(`renderOffline: mermaid.render 返回空 svg（${t1 - t0}ms）`); return null; }
    // 底部安全 padding（不裁剪内容）
    const fixedSvg = fixSvgBottom(svg);
    // SVG → PNG（resvg 优先，sharp fallback；Extension Host 下 sharp 有 GLib 冲突）
    const png = await svgToPng(fixedSvg, { fitWidth: 857 });
    const t2 = Date.now();
    logger.i(`renderOffline: mermaid.render ${t1 - t0}ms + svg→png ${t2 - t1}ms = ${t2 - t0}ms（svg ${(svg.length / 1024).toFixed(0)}KB）`);
    return png;
  } catch (e) {
    console.warn('[MermaidProcessor] 离线 jsdom 渲染失败:', e.message);
    return null;
  }
}

/**
 * 离线 jsdom 渲染（纯 Node，无 Chrome）→ 返回 SVG 字符串
 * 用途：md→HTML 链路把 mermaid 服务端静态渲染成 SVG 内联进 HTML（一劳永逸，
 * HTML 完全静态，不依赖浏览器执行脚本，任何服务器/禁用 JS 都能显示流程图）
 * @param {string} code - mermaid 源码
 * @returns {Promise<string|null>} - SVG 字符串或 null（失败）
 */
async function renderOfflineSvg(code) {
  const mermaid = await getJsdomMermaid();
  if (!mermaid) return null;
  try {
    const t0 = Date.now();
    const { svg } = await mermaid.render('inline-' + Date.now() + '-' + Math.floor(Math.random() * 1e6), code);
    const t1 = Date.now();
    if (!svg) {
      logger.w(`renderOfflineSvg: mermaid.render 返回空 svg（${t1 - t0}ms）`);
      return null;
    }
    logger.i(`renderOfflineSvg: mermaid.render ${t1 - t0}ms（svg ${(svg.length / 1024).toFixed(0)}KB）`);
    // 底部安全 padding：确保内容绝不贴边/被裁（mermaid jsdom 布局可能低估高度）
    return fixSvgBottom(svg);
  } catch (e) {
    console.warn('[MermaidProcessor] renderOfflineSvg 离线渲染失败:', e.message);
    return null;
  }
}

/**
 * 修正 mermaid SVG 底部空间（不裁剪内容）：
 * mermaid 在 jsdom（无真实布局引擎）下用 polyfill 估算文字尺寸，viewBox 高度可能低估，
 * 导致渲染时底部文字/内容贴边甚至被裁。这里把 height + viewBox 底部加安全 padding，
 * 保证渲染输出包含全部内容（宁可底部多留白，绝不丢内容）。
 * @param {string} svg - mermaid 渲染的 SVG
 * @param {number} [pad] - 底部 padding（viewBox 单位，默认按高度比例）
 * @returns {string} - 修正后的 SVG
 */
function fixSvgBottom(svg, pad) {
  if (!svg) return svg;
  const vbMatch = svg.match(/viewBox="([^"]+)"/);
  const hMatch = svg.match(/height="([\d.]+)"/);
  if (!vbMatch) return svg;
  const vb = vbMatch[1].split(/[ ,]+/).map(Number);
  if (vb.length !== 4) return svg;
  const h = hMatch ? parseFloat(hMatch[1]) : vb[3];
  const p = pad || Math.max(80, Math.round(h * 0.2));
  const newH = Math.round((vb[3] + p) * 10) / 10;
  let s = svg;
  if (hMatch) {
    s = s.replace(/height="([\d.]+)"/, (mm, v) => `height="${Math.round((parseFloat(v) + p) * 10) / 10}"`);
  }
  s = s.replace(/viewBox="([^"]+)"/, `viewBox="${vb[0]} ${vb[1]} ${vb[2]} ${newH}"`);
    return s;
}

/**
 * @class MermaidProcessor
 */
class MermaidProcessor {
  constructor(config, converter) {
    this.config = config;
    this.converter = converter;
    this._pngCache = new Map(); // code → PNG buffer（预渲染缓存，避免重复渲染）
  }

  /**
   * 判断是否为 mermaid 代码块
   */
  isMermaid($el, $) {
    const codeEl = $el.find('code').first();
    if (!codeEl.length) return false;
    const cls = codeEl.attr('class') || '';
    return /language-mermaid/.test(cls);
  }

  /**
   * 渲染 mermaid 代码块为 PNG 并嵌入 docx
   * @param {string} code - mermaid 源码
   * @returns {Promise<boolean>} 是否成功
   */
  async processMermaid(code) {
    // 查缓存：已预渲染则直接用
    if (this._pngCache.has(code)) {
      const png = this._pngCache.get(code);
      if (png && await this._addPngToDocument(png)) {
        return true;
      }
    }

    // ===== 唯一策略：离线 jsdom 渲染（纯 Node，无 Chrome/无网络/无在线，稳定不卡） =====
    // 用户要求：去掉在线渲染（Kroki），全部离线；渲染失败直接降级代码块（不等 5 秒超时）
    try {
      const png = await renderOffline(code);
      if (png && await this._addPngToDocument(png)) {
        this._pngCache.set(code, png);
        console.log('[MermaidProcessor] 离线 jsdom 渲染成功');
        return true;
      }
    } catch (e) {
      console.warn(`[MermaidProcessor] 离线 jsdom 渲染失败（${e.message}），mermaid 降级为代码块`);
    }
    return false; // 降级：调用方按普通代码块显示
  }

  /**
   * 预渲染文档中所有 mermaid 代码块为 PNG（并行渲染，避免 processElements 串行等待）
   * @param {string[]} codes - 所有 mermaid 代码块源码（去重）
   * @returns {Promise<Map<string, Buffer|null>>} code → PNG buffer（失败为 null）
   */
  async preRenderMermaids(codes) {
    const unique = [...new Set(codes)];
    const t0 = Date.now();
    logger.i(`preRenderMermaids: 开始预渲染 ${unique.length} 个 mermaid（唯一）`);

    // 优先：子进程池并行渲染（独立 node 进程，sharp 无 Extension Host GLib 冲突，
    // 且 mermaid.render + sharp 真并行 → 98 图 ~15-20s）
    let results = await this._renderWithChildPool(unique);

    // fallback：主线程串行（子进程不可用/异常时）
    if (!results) {
      logger.w('preRenderMermaids: 子进程池不可用，回退主线程串行渲染');
      results = [];
      for (const code of unique) {
        const png = await renderOffline(code);
        results.push({ code, png });
      }
    }

    // 图片只放内存缓存（用户要求：不生成 img 附加文件）：
    // Word 插入 100% 走 _pngCache，转换完成随进程释放，零磁盘附加数据。
    for (const { code, png } of results) {
      if (png) {
        this._pngCache.set(code, png);
      }
    }
    logger.i(`preRenderMermaids: 完成，${results.filter(r => r.png).length}/${unique.length} 成功，耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    return this._pngCache;
  }

  /**
   * 子进程池并行渲染（sharp 无 GLib 冲突 + 真并行）
   * @private
   * @returns {Promise<Array<{code, png: Buffer|null}>|null>} 失败返回 null（调用方回退主线程）
   */
  async _renderWithChildPool(codes) {
    const { fork } = require('child_process');
    const childPath = this._findRenderChild();
    if (!childPath) {
      logger.w(`_renderWithChildPool: renderChild.js 未找到（${childPath}）`);
      return null;
    }

    const childCount = Math.min(4, Math.max(1, codes.length));
    logger.i(`_renderWithChildPool: 启动 ${childCount} 个子进程: ${childPath}`);
    const children = [];
    const results = new Map();
    let done = 0;
    let cleaned = false;

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      children.forEach(c => { try { c.kill(); } catch (e) {} });
    };

    return await new Promise((resolve) => {
      let nextIdx = 0;
      let started = false;
      let failTimer = null;

      for (let i = 0; i < childCount; i++) {
        const c = fork(childPath, { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
        c.on('message', (msg) => {
          if (msg && msg.ready) return;
          if (msg && msg.id !== undefined) {
            results.set(msg.id, msg);
            done++;
            if (done === codes.length) {
              if (failTimer) clearTimeout(failTimer);
              cleanup();
              const out = codes.map((code, idx) => {
                const r = results.get(idx);
                return { code, png: r && r.png ? Buffer.from(r.png, 'base64') : null };
              });
              resolve(out);
            }
          }
        });
        c.on('error', () => { cleanup(); if (failTimer) clearTimeout(failTimer); resolve(null); });
        c.on('exit', () => {
          // 子进程异常退出且任务未完成 → fallback
          if (done < codes.length) { cleanup(); if (failTimer) clearTimeout(failTimer); resolve(null); }
        });
        children.push(c);
      }

      // 子进程就绪后分发（等 1.2s，超时直接分发）
      failTimer = setTimeout(() => {
        if (!started) {
          started = true;
          codes.forEach((code, idx) => {
            const c = children[nextIdx % childCount];
            if (c && c.connected) c.send({ id: idx, code });
            nextIdx++;
          });
        }
      }, 1200);
    });
  }

  /**
   * 定位 renderChild.js（src 运行时 processors/../renderChild.js；dist 运行时 dist/renderChild.js）
   * @private
   */
  _findRenderChild() {
    const candidates = [
      path.join(__dirname, '..', 'renderChild.js'),
      path.join(__dirname, 'renderChild.js')
    ];
    for (const p of candidates) {
      try { if (fs.existsSync(p)) return p; } catch (e) {}
    }
    return null;
  }

  /**
   * 将 PNG buffer 按内容区尺寸嵌入 docx（与普通图片一致：宽度占满，高度按比例）
   * @private
   */
  async _addPngToDocument(png) {
    try {
      const imageUtils = require('../../utils/imageUtils');
      const sizeOptions = this.converter.mediaProcessor ? this.converter.mediaProcessor.getImageSizeOptions() : null;
      const maxSize = sizeOptions
        ? imageUtils.calculateMaxImageSize(sizeOptions.pageConfig)
        : { maxWidth: 643, maxHeight: 931 };
      const ptToPx = 96 / 72;
      const pageContentWidthPx = Math.round(maxSize.maxWidth * ptToPx);
      const sharp = await getSharp();
      if (!sharp) return false;
      const meta = await sharp(png).metadata();
      const aspect = meta.height && meta.width ? meta.width / meta.height : 1;
      // 完整展示图片（不裁剪）：宽度占满内容区，高度按原比例
      // 超高保护：mermaid 纵向大图不跨页截断，等比缩放至单页内容区高度内（与普通图片一致）
      const heightPxRaw = Math.round(pageContentWidthPx / aspect);
      const maxPageHeightPx = Math.round(maxSize.maxHeight * ptToPx);
      let widthPx = pageContentWidthPx;
      let heightPx = heightPxRaw;
      if (heightPxRaw > maxPageHeightPx) {
        const scaleRatio = maxPageHeightPx / heightPxRaw;
        heightPx = maxPageHeightPx;
        widthPx = Math.round(heightPxRaw * aspect * scaleRatio);
        console.log(`📐 mermaid 图超高保护: ${heightPxRaw}px > 页面${maxPageHeightPx}px，等比缩放至 ${widthPx}x${heightPx}px`);
      }

      const paragraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: png,
            type: 'png',
            transformation: { width: widthPx, height: heightPx }
          })
        ],
        spacing: { before: 200, after: 200 }
      });
      this.converter.addDocElement(paragraph, heightPx + 40);
      return true;
    } catch (e) {
      console.warn(`[MermaidProcessor] PNG 嵌入失败: ${e.message}`);
      return false;
    }
  }
}

module.exports = MermaidProcessor;
// 调试/测试导出（正式功能不依赖）
module.exports.renderOffline = renderOffline;
module.exports.renderOfflineSvg = renderOfflineSvg;
module.exports.getJsdomMermaid = getJsdomMermaid;
