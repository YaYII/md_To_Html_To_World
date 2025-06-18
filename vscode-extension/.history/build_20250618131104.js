const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 开始打包 VSCode 插件...');

try {
    // 编译 TypeScript
    console.log('📦 编译 TypeScript...');
    execSync('npx tsc -p ./', { stdio: 'inherit' });

    // 使用 vsce 打包
    console.log('📦 开始打包...');
    execSync('npx @vscode/vsce package --no-dependencies --allow-missing-repository --allow-star-activation', { 
        stdio: 'inherit' 
    });

    console.log('✅ 打包完成！');
} catch (error) {
    console.error('❌ 打包失败:', error.message);
    process.exit(1);
} 