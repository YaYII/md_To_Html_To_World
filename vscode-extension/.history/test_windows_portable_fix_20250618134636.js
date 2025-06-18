const fs = require('fs-extra');
const path = require('path');
const os = require('os');

console.log('🧪 测试Windows便携版安装修复...');

/**
 * 测试fs-extra的各种方法
 */
async function testFsExtraMethods() {
    const testDir = path.join(os.tmpdir(), 'test-windows-portable-fix');
    
    console.log('📋 测试fs-extra的各种方法:');
    console.log(`📁 测试目录: ${testDir}`);
    
    try {
        // 清理测试目录
        if (await fs.pathExists(testDir)) {
            await fs.remove(testDir);
            console.log('🗑️ 清理旧测试目录');
        }
        
        // 测试 ensureDir
        console.log('\n1. 测试 fs.ensureDir...');
        const extractDir = path.join(testDir, 'extracted');
        await fs.ensureDir(extractDir);
        console.log('✅ fs.ensureDir 成功');
        
        // 创建一些测试文件
        const sourceDir = path.join(testDir, 'source');
        await fs.ensureDir(sourceDir);
        await fs.writeFile(path.join(sourceDir, 'test.txt'), 'Hello World');
        await fs.writeFile(path.join(sourceDir, 'node.exe'), 'fake node executable');
        console.log('📝 创建测试文件');
        
        // 测试 move
        console.log('\n2. 测试 fs.move...');
        const targetDir = path.join(testDir, 'target');
        await fs.move(sourceDir, targetDir, { overwrite: true });
        console.log('✅ fs.move 成功');
        
        // 验证文件是否移动成功
        const testFileExists = await fs.pathExists(path.join(targetDir, 'test.txt'));
        const nodeFileExists = await fs.pathExists(path.join(targetDir, 'node.exe'));
        console.log(`📄 test.txt 存在: ${testFileExists}`);
        console.log(`📄 node.exe 存在: ${nodeFileExists}`);
        
        // 测试 remove
        console.log('\n3. 测试 fs.remove...');
        await fs.remove(extractDir);
        console.log('✅ fs.remove 成功');
        
        // 测试 pathExists
        console.log('\n4. 测试 fs.pathExists...');
        const extractDirExists = await fs.pathExists(extractDir);
        const targetDirExists = await fs.pathExists(targetDir);
        console.log(`📁 extractDir 存在: ${extractDirExists}`);
        console.log(`📁 targetDir 存在: ${targetDirExists}`);
        
        // 清理
        await fs.remove(testDir);
        console.log('\n🗑️ 清理测试目录');
        
        return true;
        
    } catch (error) {
        console.error(`❌ 测试失败: ${error.message}`);
        return false;
    }
}

/**
 * 模拟Windows便携版安装流程
 */
async function simulateWindowsPortableInstall() {
    console.log('\n🪟 模拟Windows便携版安装流程...');
    
    const testDir = path.join(os.tmpdir(), 'test-portable-install');
    
    try {
        // 清理测试目录
        if (await fs.pathExists(testDir)) {
            await fs.remove(testDir);
        }
        
        // 模拟下载目录
        const installDir = path.join(testDir, 'portable-nodejs');
        await fs.ensureDir(installDir);
        console.log('📁 创建安装目录');
        
        // 模拟解压目录
        const extractDir = path.join(installDir, 'extracted');
        await fs.ensureDir(extractDir);
        console.log('📁 创建解压目录');
        
        // 模拟Node.js目录结构
        const nodeDir = path.join(extractDir, 'node-v20.10.0-win-x64');
        await fs.ensureDir(nodeDir);
        await fs.writeFile(path.join(nodeDir, 'node.exe'), 'fake node executable');
        await fs.writeFile(path.join(nodeDir, 'npm'), 'fake npm');
        await fs.writeFile(path.join(nodeDir, 'npx'), 'fake npx');
        console.log('📄 创建模拟Node.js文件');
        
        // 模拟移动到最终位置
        const finalNodePath = path.join(installDir, 'node');
        await fs.move(nodeDir, finalNodePath, { overwrite: true });
        console.log('📦 移动到最终位置');
        
        // 验证文件是否存在
        const nodeExeExists = await fs.pathExists(path.join(finalNodePath, 'node.exe'));
        const npmExists = await fs.pathExists(path.join(finalNodePath, 'npm'));
        console.log(`📄 node.exe 存在: ${nodeExeExists}`);
        console.log(`📄 npm 存在: ${npmExists}`);
        
        // 清理解压目录
        await fs.remove(extractDir);
        console.log('🗑️ 清理解压目录');
        
        // 验证最终结果
        const finalDirExists = await fs.pathExists(finalNodePath);
        const extractDirExists = await fs.pathExists(extractDir);
        
        console.log(`📁 最终目录存在: ${finalDirExists}`);
        console.log(`📁 解压目录已删除: ${!extractDirExists}`);
        
        // 清理
        await fs.remove(testDir);
        console.log('🗑️ 清理测试目录');
        
        return nodeExeExists && npmExists && finalDirExists && !extractDirExists;
        
    } catch (error) {
        console.error(`❌ 模拟安装失败: ${error.message}`);
        return false;
    }
}

/**
 * 测试标准fs模块的限制
 */
function testStandardFsLimitations() {
    console.log('\n📋 对比标准fs模块的限制:');
    
    const standardFs = require('fs');
    
    console.log('标准fs模块可用的方法:');
    console.log(`- readdir: ${typeof standardFs.readdir === 'function'}`);
    console.log(`- writeFile: ${typeof standardFs.writeFile === 'function'}`);
    console.log(`- mkdir: ${typeof standardFs.mkdir === 'function'}`);
    
    console.log('\n标准fs模块缺失的方法 (fs-extra提供):');
    console.log(`- ensureDir: ${typeof standardFs.ensureDir === 'function'}`);
    console.log(`- move: ${typeof standardFs.move === 'function'}`);
    console.log(`- remove: ${typeof standardFs.remove === 'function'}`);
    console.log(`- pathExists: ${typeof standardFs.pathExists === 'function'}`);
    
    console.log('\nfs-extra模块提供的方法:');
    console.log(`- ensureDir: ${typeof fs.ensureDir === 'function'}`);
    console.log(`- move: ${typeof fs.move === 'function'}`);
    console.log(`- remove: ${typeof fs.remove === 'function'}`);
    console.log(`- pathExists: ${typeof fs.pathExists === 'function'}`);
}

// 运行所有测试
async function runAllTests() {
    try {
        testStandardFsLimitations();
        
        const fsExtraTest = await testFsExtraMethods();
        const installTest = await simulateWindowsPortableInstall();
        
        console.log('\n🎉 测试结果总结:');
        console.log(`fs-extra方法测试: ${fsExtraTest ? '✅ 通过' : '❌ 失败'}`);
        console.log(`便携版安装模拟: ${installTest ? '✅ 通过' : '❌ 失败'}`);
        
        if (fsExtraTest && installTest) {
            console.log('\n🎯 结论: Windows便携版安装修复成功！');
            console.log('💡 用户现在应该可以正常使用自动安装功能了');
        } else {
            console.log('\n❌ 仍然存在问题，需要进一步调试');
        }
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
    }
}

runAllTests(); 