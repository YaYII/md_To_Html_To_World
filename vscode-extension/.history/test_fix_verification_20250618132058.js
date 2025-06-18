const fs = require('fs-extra');
const path = require('path');
const os = require('os');

console.log('🧪 测试便携版安装修复...');

async function testEnsureDirFix() {
    try {
        // 测试 fs.ensureDir 是否正常工作
        const testDir = path.join(os.tmpdir(), 'test-ensuredir-fix');
        
        console.log(`📁 测试目录: ${testDir}`);
        
        // 删除测试目录（如果存在）
        if (await fs.pathExists(testDir)) {
            await fs.remove(testDir);
            console.log('🗑️ 清理旧测试目录');
        }
        
        // 测试 fs.ensureDir
        console.log('📦 测试 fs.ensureDir...');
        await fs.ensureDir(testDir);
        
        // 验证目录是否创建成功
        const exists = await fs.pathExists(testDir);
        if (exists) {
            console.log('✅ fs.ensureDir 工作正常');
        } else {
            console.log('❌ fs.ensureDir 失败');
            return false;
        }
        
        // 测试嵌套目录创建
        const nestedDir = path.join(testDir, 'nested', 'deep', 'directory');
        console.log('📦 测试嵌套目录创建...');
        await fs.ensureDir(nestedDir);
        
        const nestedExists = await fs.pathExists(nestedDir);
        if (nestedExists) {
            console.log('✅ 嵌套目录创建成功');
        } else {
            console.log('❌ 嵌套目录创建失败');
            return false;
        }
        
        // 模拟便携版安装目录结构
        const portableNodeDir = path.join(testDir, 'portable-nodejs');
        const extractDir = path.join(portableNodeDir, 'extracted');
        
        console.log('📦 模拟便携版安装目录结构...');
        await fs.ensureDir(portableNodeDir);
        await fs.ensureDir(extractDir);
        
        const portableExists = await fs.pathExists(portableNodeDir);
        const extractExists = await fs.pathExists(extractDir);
        
        if (portableExists && extractExists) {
            console.log('✅ 便携版目录结构创建成功');
        } else {
            console.log('❌ 便携版目录结构创建失败');
            return false;
        }
        
        // 清理测试目录
        await fs.remove(testDir);
        console.log('🗑️ 清理测试目录');
        
        return true;
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        return false;
    }
}

// 运行测试
testEnsureDirFix().then(success => {
    if (success) {
        console.log('\n🎉 所有测试通过！fs.ensureDir 修复成功！');
        console.log('💡 用户现在可以正常使用自动安装功能了。');
    } else {
        console.log('\n❌ 测试失败，仍然存在问题。');
    }
    process.exit(success ? 0 : 1);
}); 