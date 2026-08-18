/**
 * @description webpack配置文件
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

/**
 * 构建后复制 gov 模板依赖的 vendor 文件（mermaid.min.js）到 dist/vendor/
 * 原因：.vscodeignore 排除 src/**，打包后 __dirname 指向 dist/，vendor 文件必须随 dist 分发
 */
class CopyVendorPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('CopyVendorPlugin', () => {
      const vendorSrc = path.resolve(__dirname, 'src/mdtoworld/markdownToHtml/vendor');
      const vendorDest = path.resolve(__dirname, 'dist/vendor');
      if (!fs.existsSync(vendorSrc)) return;
      fs.mkdirSync(vendorDest, { recursive: true });
      for (const file of fs.readdirSync(vendorSrc)) {
        // 跳过目录（jsdom-deps 是目录，由 copyJsdomDeps 单独处理；copyFileSync 会 EISDIR）
        if (fs.statSync(path.join(vendorSrc, file)).isDirectory()) continue;
        fs.copyFileSync(path.join(vendorSrc, file), path.join(vendorDest, file));
      }
      // 复制 jsdom 离线渲染依赖（webpack 无法完整打包 jsdom 的深层依赖，
      // 运行时用 createRequire 从 dist/vendor/jsdom-deps 加载）
      // 用 npm 独立安装（正确解析所有传递依赖版本，避免 pnpm store 版本冲突）
      copyJsdomDeps(vendorDest);
      // 同时复制到 src/vendor（src 直跑时离线渲染可用）
      copyJsdomDeps(path.resolve(__dirname, 'src/mdtoworld/markdownToHtml/vendor'));
      // 复制 sharp 原生模块（webpack 无法打包 .node 二进制，运行时用 createRequire
      // 从 dist/vendor/sharp-deps 加载；src 直跑时也从 src/vendor 可用）
      copySharpDeps(vendorDest);
      copySharpDeps(path.resolve(__dirname, 'src/mdtoworld/markdownToHtml/vendor'));
      // 复制 resvg-js（Rust 原生模块，SVG→PNG 主引擎，Extension Host 下
      // sharp/libvips 有 GLib 冲突，resvg 静态链接零 GLib 依赖）
      copyResvgDeps(vendorDest);
      copyResvgDeps(path.resolve(__dirname, 'src/mdtoworld/markdownToHtml/vendor'));
      // 复制 renderChild.js（mermaid 渲染子进程，独立运行不经 webpack 打包）
      const renderChildSrc = path.resolve(__dirname, 'src/mdtoworld/htmlToWord/renderChild.js');
      const renderChildDest = path.resolve(__dirname, 'dist/renderChild.js');
      if (fs.existsSync(renderChildSrc)) {
        fs.copyFileSync(renderChildSrc, renderChildDest);
        // eslint-disable-next-line no-console
        console.log('[CopyVendorPlugin] renderChild.js 已复制到 dist/');
      }
      // eslint-disable-next-line no-console
      console.log('[CopyVendorPlugin] vendor 文件已复制到 dist/vendor/');
    });
  }
}

/**
 * 复制 jsdom 及其全部传递依赖到 dist/vendor/jsdom-deps/（保持 node_modules 结构）
 * 用于 mermaid 离线渲染（纯 Node，无 Chrome）。体积约 5.4MB。
 */
function copyJsdomDeps(vendorDest) {
  const destRoot = path.join(vendorDest, 'jsdom-deps');
  // 已存在且完整则跳过（避免每次构建重复安装）
  const marker = path.join(destRoot, 'node_modules', 'jsdom');
  if (fs.existsSync(marker)) return;

  // 用 npm 独立安装 jsdom（版本解析正确，包含所有传递依赖）
  fs.mkdirSync(destRoot, { recursive: true });
  const pkgJson = path.join(destRoot, 'package.json');
  if (!fs.existsSync(pkgJson)) {
    fs.writeFileSync(pkgJson, JSON.stringify({ name: 'jsdom-deps', private: true }, null, 2));
  }
  try {
    execSync('npm install jsdom@26.1.0 --no-audit --no-fund --loglevel=error', {
      cwd: destRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 180000
    });
    // eslint-disable-next-line no-console
    console.log('[CopyVendorPlugin] jsdom 离线渲染依赖已安装到 dist/vendor/jsdom-deps');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[CopyVendorPlugin] jsdom 安装失败（离线渲染将不可用）:', e.message);
  }
}

/**
 * 复制 sharp 原生模块到 vendor/sharp-deps/（保持 node_modules 结构）
 * sharp 含 .node 二进制 + @img/sharp-linux-x64 平台包，webpack 无法打包，
 * 必须独立 npm install（与 jsdom-deps 同一模式），运行时用 createRequire 加载。
 * 体积约 20-30MB（含 libvips），仅第一次安装耗时。
 */
function copySharpDeps(vendorDest) {
  const destRoot = path.join(vendorDest, 'sharp-deps');
  const marker = path.join(destRoot, 'node_modules', 'sharp');
  if (fs.existsSync(marker)) return;

  fs.mkdirSync(destRoot, { recursive: true });
  const pkgJson = path.join(destRoot, 'package.json');
  if (!fs.existsSync(pkgJson)) {
    fs.writeFileSync(pkgJson, JSON.stringify({ name: 'sharp-deps', private: true }, null, 2));
  }
  try {
    execSync('npm install sharp@0.34.3 --no-audit --no-fund --loglevel=error', {
      cwd: destRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300000
    });
    // eslint-disable-next-line no-console
    console.log('[CopyVendorPlugin] sharp 原生模块已安装到 ' + destRoot);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[CopyVendorPlugin] sharp 安装失败（图片/SVG 处理将不可用）:', e.message);
  }
}

/**
 * 复制 resvg-js 原生模块到 vendor/resvg-deps/（保持 node_modules 结构）
 * resvg-js 是 Rust 编译的 .node 二进制，webpack 无法打包，必须独立 npm install
 * （与 jsdom-deps / sharp-deps 同一模式），运行时用 createRequire 加载。
 * 体积约 10-20MB（含 resvg-js-linux-x64-gnu），仅第一次安装耗时。
 */
function copyResvgDeps(vendorDest) {
  const destRoot = path.join(vendorDest, 'resvg-deps');
  const marker = path.join(destRoot, 'node_modules', '@resvg', 'resvg-js');
  if (fs.existsSync(marker)) return;

  fs.mkdirSync(destRoot, { recursive: true });
  const pkgJson = path.join(destRoot, 'package.json');
  if (!fs.existsSync(pkgJson)) {
    fs.writeFileSync(pkgJson, JSON.stringify({ name: 'resvg-deps', private: true }, null, 2));
  }
  try {
    execSync('npm install @resvg/resvg-js@2.4.0 --no-audit --no-fund --loglevel=error', {
      cwd: destRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300000
    });
    // eslint-disable-next-line no-console
    console.log('[CopyVendorPlugin] resvg-js 原生模块已安装到 ' + destRoot);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[CopyVendorPlugin] resvg-js 安装失败（SVG→PNG 将回退 sharp）:', e.message);
  }
}

module.exports = {
  target: 'node',
  mode: 'production',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
    // 确保类构造函数正确处理
    environment: {
      module: false,
      dynamicImport: false
    }
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode', // vscode模块不打包
    // 排除一些不需要打包的Node.js核心模块
    'fs': 'commonjs fs',
    'path': 'commonjs path',
    'os': 'commonjs os',
    'child_process': 'commonjs child_process',
    // 原生模块（.node 二进制）一律外部化：webpack 无法打包，运行时走
    // createRequire 从 vendor 加载（sharpLoader / svgToPng）。若打包进 bundle，
    // 与 vendor 副本形成双份原生库 → GLib 符号冲突/加载失败。
    'sharp': 'commonjs sharp',
    '@img/sharp-linux-x64': 'commonjs @img/sharp-linux-x64',
    '@img/sharp-libvips-linux-x64': 'commonjs @img/sharp-libvips-linux-x64',
    '@resvg/resvg-js': 'commonjs @resvg/resvg-js',
    '@resvg/resvg-js-linux-x64-gnu': 'commonjs @resvg/resvg-js-linux-x64-gnu'
  },
  resolve: {
    extensions: ['.ts', '.js'],
    // 添加 worldtomd 的 node_modules 到解析路径
    modules: [
      'node_modules',
      path.resolve(__dirname, 'worldtomd/node_modules')
    ]
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  // 添加Node.js模块的处理
  node: {
    __dirname: false,
    __filename: false
  },
  // 忽略特定的警告
  ignoreWarnings: [
    {
      message: /Critical dependency: the request of a dependency is an expression/,
    },
    {
      message: /Can't resolve '@img\/sharp/,
    },
    {
      message: /Can't resolve 'bufferutil'/,
    },
    {
      message: /Can't resolve 'utf-8-validate'/,
    },
    {
      message: /Can't resolve 'canvas'/,
    }
  ],
  plugins: [
    new CopyVendorPlugin()
  ]
};
