/**
 * @description SVG → PNG 渲染器（服务端，Word 链路图片嵌入用）
 *
 * 为什么不用 sharp 直接转：
 *   sharp/libvips 依赖系统 GLib，而 VS Code Extension Host 是 Electron+GTK 进程，
 *   已加载系统 GLib/GTK —— 两套 GLib 符号冲突 → g_object_ref/unref assertion failed
 *   （GLib-GObject-CRITICAL），sharp 转换静默失败 → mermaid 全降级代码块。
 *   src 直跑（独立 node 进程）无此冲突，所以之前一直没暴露。
 *
 * 方案：优先 @resvg/resvg-js（Rust 实现，静态链接，零 GLib/libvips 依赖），
 *   sharp 仅作 fallback（非 Extension Host 场景仍可用）。
 * 与 sharpLoader 同一模式：vendor + createRequire（webpack 无法打包 .node 二进制）。
 */
const path = require('path');
const fs = require('fs-extra');
const { createRequire } = require('module');
const { getSharp } = require('./sharpLoader');

let resvgModule = null;
let resvgAttempted = false;
let resvgPromise = null;

/**
 * @function getResvg
 * @description 从 vendor/resvg-deps 加载 resvg-js（缓存单例）
 * @returns {Promise<Object|null>} { Resvg } 或 null
 */
async function getResvg() {
  // promise 单例：98 个并发调用共享同一个加载 promise，避免重复初始化 native
  // 模块（并发 createRequire 加载 .node 可能死锁/竞争）
  if (!resvgPromise) {
    resvgPromise = (async () => {
      // 扩展根候选（与 sharpLoader 一致）：
      // - src 运行时：utils → htmlToWord → mdtoworld → src → vscode-extension（4 级）
      // - 打包后：__dirname = dist/（resvg-deps 在 dist/vendor/ 下，把 __dirname 本身作根）
      const extRootCandidates = [
        path.join(__dirname, '..', '..', '..', '..'), // src 运行时 → vscode-extension
        __dirname,                                     // dist 运行时 → dist/
        path.join(__dirname, '..')                     // dist 运行时 → vscode-extension
      ];
      const subs = ['vendor/resvg-deps', 'src/mdtoworld/markdownToHtml/vendor/resvg-deps'];

      let resvgDepsRoot = null;
      for (const root of extRootCandidates) {
        for (const sub of subs) {
          const p = path.join(root, sub);
          if (fs.existsSync(path.join(p, 'node_modules', '@resvg', 'resvg-js'))) {
            resvgDepsRoot = p;
            break;
          }
        }
        if (resvgDepsRoot) break;
      }

      if (resvgDepsRoot) {
        try {
          const resvgRequire = createRequire(path.join(resvgDepsRoot, 'loader.js'));
          const { Resvg } = resvgRequire('@resvg/resvg-js');
          if (Resvg) {
            resvgModule = { Resvg };
            return resvgModule;
          }
        } catch (e) {
          console.warn('[svgToPng] vendor resvg 加载失败:', e.message);
        }
      }

      // fallback：项目 node_modules（src 直跑开发模式）
      try {
        const fallbackRequire = createRequire(__filename);
        const { Resvg } = fallbackRequire('@resvg/resvg-js');
        if (Resvg) {
          resvgModule = { Resvg };
          return resvgModule;
        }
      } catch (e) {
        /* 未安装 resvg-js */
      }
      return null;
    })();
  }
  return resvgPromise;
}

/**
 * @function svgToPng
 * @description SVG 字符串 → PNG buffer（resvg 优先，sharp fallback）
 * @param {string} svg - SVG 内容
 * @param {Object} [opts] - { fitWidth: 目标宽度（px，可选） }
 * @returns {Promise<Buffer|null>}
 */
async function svgToPng(svg, opts = {}) {
  if (!svg) return null;
  const fitWidth = opts.fitWidth || 1600;

  // 优先 resvg（Extension Host 安全）
  try {
    const { Resvg } = (await getResvg()) || {};
    if (Resvg) {
      const r = new Resvg(svg, { fitTo: { mode: 'width', value: fitWidth } });
      const png = r.render().asPng();
      return png && png.length > 0 ? Buffer.from(png) : null;
    }
  } catch (e) {
    console.warn('[svgToPng] resvg 渲染失败:', e.message);
  }

  // fallback：sharp（非 Extension Host 场景）
  try {
    const sharp = await getSharp();
    if (!sharp) return null;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    return png && png.length > 0 ? png : null;
  } catch (e) {
    console.warn('[svgToPng] sharp 渲染失败:', e.message);
    return null;
  }
}

module.exports = { svgToPng, getResvg };
