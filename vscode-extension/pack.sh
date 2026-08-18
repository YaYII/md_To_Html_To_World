#!/usr/bin/env bash
# ============================================================================
# 打包脚本：自动版本号+1、编译、打包为 .vsix
# 用法：bash pack.sh
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "  Markdown to Word - 打包脚本"
echo "========================================"

# ── 1. 读取当前版本 ──
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "当前版本: $CURRENT_VERSION"

# ── 2. 版本号 +1（patch） ──
echo "正在更新版本号..."
npm version patch --no-git-tag-version --no-commit-hooks 2>&1 | tail -1
NEW_VERSION=$(node -p "require('./package.json').version")
echo "新版本: $NEW_VERSION"

# ── 3. 清理 dist 目录 ──
echo "清理 dist 目录..."
if [ -d "dist" ]; then
  # 用 Node.js 删除（兼容 root 所有文件的场景）
  node -e "
    const fs = require('fs');
    const dist = './dist';
    if (fs.existsSync(dist)) {
      for (const e of fs.readdirSync(dist, { withFileTypes: true })) {
        const p = dist + '/' + e.name;
        try {
          if (e.isDirectory()) fs.rmSync(p, { recursive: true });
          else fs.unlinkSync(p);
        } catch (_) {}
      }
    }
  "
  echo "  dist 清理完成"
fi

# ── 4. 临时修改 vscode:prepublish（避免 pnpm 不可用） ──
#    注意：vsce 会执行 prepublish 自动运行 webpack
echo "准备打包环境..."
node -e "
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const orig = pkg.scripts['vscode:prepublish'];
  if (orig && orig.includes('pnpm')) {
    pkg.scripts['vscode:prepublish'] = orig.replace('pnpm', 'npm');
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  }
"

# ── 5. 打包（vsce 会自动执行 webpack） ──
echo "打包中（vsce package）..."
npx --yes vsce package --no-dependencies 2>&1

# ── 6. 恢复 vscode:prepublish ──
node -e "
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const orig = pkg.scripts['vscode:prepublish'];
  if (orig && orig.includes('npm run webpack')) {
    pkg.scripts['vscode:prepublish'] = orig.replace('npm run webpack', 'pnpm run webpack');
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  }
"

# ── 7. 验证产物 ──
VSIX_FILE="markdown-to-word-${NEW_VERSION}.vsix"
if [ -f "$VSIX_FILE" ]; then
  SIZE=$(du -h "$VSIX_FILE" | cut -f1)
  echo ""
  echo "========================================"
  echo "  ✅ 打包成功！"
  echo "  版本: $NEW_VERSION"
  echo "  文件: $VSIX_FILE"
  echo "  大小: $SIZE"
  echo "========================================"
else
  echo "ERROR: 未找到打包产物 $VSIX_FILE"
  ls -la *.vsix 2>/dev/null || true
  exit 1
fi
