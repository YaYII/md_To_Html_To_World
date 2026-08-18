/**
 * @description mermaid 渲染子进程（独立 node 进程，供 worker 池并行渲染）
 *
 * 为什么用子进程：
 *   1. sharp/libvips 依赖 GLib，而 VS Code Extension Host（Electron+GTK）已加载系统
 *      GLib → 符号冲突 → g_object_ref assertion failed → sharp 转换失败。
 *      子进程是独立 node 进程（无 Electron/GTK），sharp 可正常使用（0.14s/图）。
 *   2. mermaid.render（jsdom SVG）与 sharp 都是主线程串行慢；多子进程可真并行。
 *
 * 协议：父进程 send({ id, type, code|svg }) → 渲染 PNG（base64）→ send({ id, png }) 或 { id, error }。
 *   type='mermaid'：mermaid 源码 → mermaid.render → PNG（Word 链路旧路径）
 *   type='svg'：SVG 字符串 → sharp 直接转 PNG（HTML 链路已服务端渲染 SVG 内联）
 *
 * 注意：本文件独立运行（不经 webpack 打包），随 vsix 分发到 dist/。
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

// ===== vendor 路径候选（与主线程 mermaidProcessor 一致）=====
// - src 运行时：__dirname = src/mdtoworld/htmlToWord → vendor 在 src/mdtoworld/markdownToHtml/vendor
// - 打包后：__dirname = dist/ → vendor 在 dist/vendor
const extRootCandidates = [
  path.join(__dirname, '..', '..'), // src 运行时 → src/mdtoworld
  path.join(__dirname, '..'),       // dist 运行时 → vscode-extension 根？不对，dist/vendor 直接在其下
  __dirname                          // dist 运行时 → dist/（vendor 直接在其下）
];

function findVendor(sub) {
  const candidates = [
    path.join(__dirname, '..', 'markdownToHtml', 'vendor', sub), // src 运行时（htmlToWord → mdtoworld → markdownToHtml/vendor）
    path.join(__dirname, 'vendor', sub),                                // dist 运行时（dist/vendor/sub）
    path.join(__dirname, '..', 'vendor', sub)                           // 兜底
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch (e) {}
  }
  return null;
}

// ===== jsdom（离线渲染 DOM 环境）=====
function loadJsdom() {
  const vendor = findVendor('jsdom-deps');
  if (vendor) {
    const r = createRequire(path.join(vendor, 'loader.js'));
    return r('jsdom');
  }
  // fallback：项目 node_modules
  const r = createRequire(__filename);
  return r('jsdom');
}

// ===== mermaid.min.js =====
function loadMermaidJsPath() {
  const vendor = findVendor('');
  const candidates = [
    path.join(__dirname, '..', 'markdownToHtml', 'vendor', 'mermaid.min.js'),
    path.join(__dirname, 'vendor', 'mermaid.min.js'),
    path.join(__dirname, '..', 'vendor', 'mermaid.min.js')
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch (e) {}
  }
  return null;
}

// ===== sharp（SVG→PNG，子进程无 GLib 冲突）=====
let sharp = null;
function loadSharp() {
  if (sharp) return sharp;
  const vendor = findVendor('sharp-deps');
  if (vendor) {
    try {
      const r = createRequire(path.join(vendor, 'loader.js'));
      sharp = r('sharp');
      if (sharp && sharp.versions) return sharp;
    } catch (e) {
      console.warn('[renderChild] vendor sharp 加载失败:', e.message);
    }
  }
  try {
    const r = createRequire(__filename);
    sharp = r('sharp');
  } catch (e) {
    sharp = null;
  }
  return sharp;
}

// ===== jsdom 初始化 + mermaid polyfill（与主线程 getJsdomMermaid 同源）=====
const { JSDOM } = loadJsdom();
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
    // 与主线程一致：宽度/行高估算偏大，避免布局 viewBox 小于实际渲染导致内容被裁
    if (code >= 0x2E80) w += FONT_SIZE * 1.05;
    else if (code >= 0x20 && code <= 0x7E) w += FONT_SIZE * 0.62;
    else if (ch === ' ') w += FONT_SIZE * 0.35;
    else w += FONT_SIZE * 0.9;
  }
  return { width: Math.ceil(w), height: FONT_SIZE * 1.5 };
}

/**
 * 修正 SVG 底部空间（不裁剪内容）：height + viewBox 底部加安全 padding
 * （与主线程 fixSvgBottom 一致，子进程渲染的 PNG 同样不裁内容）
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
        const off = getTranslate(c);
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

const mermaidPath = loadMermaidJsPath();
if (!mermaidPath) {
  console.error('[renderChild] mermaid.min.js 未找到，子进程退出');
  process.exit(1);
}
const mermaid = require(mermaidPath);
mermaid.initialize({
  startOnLoad: false, theme: 'default', securityLevel: 'loose',
  fontFamily: 'PingFang SC, Microsoft YaHei UI, Noto Serif CJK SC, SimSun, sans-serif',
  fontSize: 14,
  flowchart: { htmlLabels: false, useMaxWidth: false },
  er: { useMaxWidth: false },
  sequence: { useMaxWidth: false }
});

/**
 * @function renderMermaidPng
 * @param {string} code - mermaid 源码
 * @returns {Promise<Buffer|null>}
 */
async function renderMermaidPng(code) {
  const { svg } = await mermaid.render('child-' + Date.now(), code);
  if (!svg) return null;
  const fixedSvg = fixSvgBottom(svg);
  const s = loadSharp();
  if (!s) return null;
  return await s(Buffer.from(fixedSvg)).png().toBuffer();
}

process.on('message', async (msg) => {
  try {
    let png = null;
    if (msg.type === 'svg') {
      // 直接 SVG→PNG（HTML 链路已服务端渲染 SVG，无需再跑 mermaid）
      const s = loadSharp();
      if (s) png = await s(Buffer.from(fixSvgBottom(msg.svg))).png().toBuffer();
    } else {
      png = await renderMermaidPng(msg.code);
    }
    process.send({ id: msg.id, png: png ? png.toString('base64') : null });
  } catch (e) {
    process.send({ id: msg.id, error: e.message });
  }
});

// 子进程就绪信号
process.send && process.send({ ready: true });
