/**
 * @description sharp 原生模块加载器（服务端图片处理：SVG→PNG、图片元数据/缩放）
 *
 * 为什么不能直接 require('sharp')：
 *   sharp 是原生模块（含 .node 二进制 + @img/sharp-linux-x64 平台包），webpack 无法完整打包：
 *   - webpack 把 require('sharp') 编译成"永远抛 MODULE_NOT_FOUND 的空模块"
 *   - .vscodeignore 排除 node_modules/**，打包后的插件环境没有 sharp
 *   → 打包后插件里 SVG→PNG / 图片缩放全部静默失败（mermaid 降级为代码块、docx 无图）
 *
 * 解决方案（与 jsdom-deps 同一模式）：
 *   CopyVendorPlugin 构建时把 sharp 及其平台二进制独立 npm install 到 vendor/sharp-deps/
 *   （保持完整 node_modules 结构），运行时用 createRequire 从该目录加载——
 *   createRequire 的 require 是运行时动态的，webpack 无法静态分析，因此不会被打包。
 */
const fs = require('fs-extra');
const path = require('path');
const { createRequire } = require('module');

let sharpInstance = null;
let loadAttempted = false;

/**
 * @function getSharp
 * @description 从 vendor/sharp-deps 加载 sharp（缓存单例）
 * @returns {Promise<Object|null>} sharp 模块或 null（未找到 vendor 依赖时）
 */
async function getSharp() {
  if (loadAttempted) return sharpInstance;
  loadAttempted = true;

  try {
    // 扩展根 = src 运行时 ../../../../（utils → htmlToWord → mdtoworld → src → vscode-extension）
    //        = dist 运行时 ..（dist → vscode-extension）
    // 且打包后 __dirname 直接就是 dist/（webpack node.__dirname=false 保留真实路径），
    // vendor/sharp-deps 就在 dist/vendor/ 下，故把 __dirname 本身也作为候选根。
    const extRootCandidates = [
      path.join(__dirname, '..', '..', '..', '..'), // src 运行时 → vscode-extension
      __dirname,                                     // 打包后 dist/（vendor/sharp-deps 直接在其下）
      path.join(__dirname, '..')                     // dist 运行时 → vscode-extension
    ];

    let sharpDepsRoot = null;
    for (const root of extRootCandidates) {
      for (const sub of ['vendor/sharp-deps', 'src/mdtoworld/markdownToHtml/vendor/sharp-deps']) {
        const p = path.join(root, sub);
        if (fs.existsSync(path.join(p, 'node_modules', 'sharp'))) {
          sharpDepsRoot = p;
          break;
        }
      }
      if (sharpDepsRoot) break;
    }
    // 关键：不能用 `= require('sharp')` 作为初始值（webpack 会静态分析为 require('sharp')
    // 编译成坏模块）。必须纯用 createRequire 加载（webpack 无法静态分析 createRequire 的
    // 动态解析，打包后不会把这里的 require 编译成坏模块）。
    if (sharpDepsRoot) {
      // 优先：vendor/sharp-deps（打包后唯一可用来源）
      const sharpRequire = createRequire(path.join(sharpDepsRoot, 'loader.js'));
      try {
        sharpInstance = sharpRequire('sharp');
      } catch (vendorErr) {
        // vendor 里的 sharp 加载失败（如平台二进制缺失）→ 回退到项目 node_modules
        console.warn('[sharpLoader] vendor sharp 加载失败，尝试项目 node_modules:', vendorErr.message);
      }
    }
    if (!sharpInstance) {
      // 回退：项目 node_modules（src 直跑开发模式；打包后无 node_modules 会抛错被捕获）
      try {
        const fallbackRequire = createRequire(__filename);
        sharpInstance = fallbackRequire('sharp');
      } catch (e) {
        console.warn('[sharpLoader] sharp 加载失败（vendor 与 node_modules 均不可用）:', e.message);
      }
    }
    if (sharpInstance && sharpInstance.versions) {
      console.log(`[sharpLoader] sharp ${sharpInstance.versions.sharp} 已从 vendor 加载`);
    }
    return sharpInstance;
  } catch (e) {
    console.warn('[sharpLoader] sharp 加载失败:', e.message);
    sharpInstance = null;
    return null;
  }
}

module.exports = { getSharp };
