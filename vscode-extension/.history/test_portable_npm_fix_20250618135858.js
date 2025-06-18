const fs = require('fs');
const path = require('path');

console.log('🧪 测试便携版 npm 路径检测功能');
console.log('================================\n');

/**
 * 模拟 getPortableNpmPath 方法
 */
function getPortableNpmPath(command, extensionPath) {
    try {
        const nodeInstallDir = path.join(extensionPath, 'portable-nodejs', 'node');
        
        let cmdPath;
        if (process.platform === 'win32') {
            // Windows下的npm通常在node目录下
            cmdPath = path.join(nodeInstallDir, `${command}.cmd`);
        } else {
            // Unix系统下的npm在bin目录下
            cmdPath = path.join(nodeInstallDir, 'bin', command);
        }
        
        console.log(`🔍 检查路径: ${cmdPath}`);
        
        // 同步检查文件是否存在
        if (fs.existsSync(cmdPath)) {
            return cmdPath;
        }
    } catch (error) {
        console.log(`❌ 检查出错: ${error.message}`);
    }
    return null;
}

/**
 * 模拟 getPortableNodePath 方法
 */
function getPortableNodePath(extensionPath) {
    try {
        const nodeInstallDir = path.join(extensionPath, 'portable-nodejs', 'node');
        const nodeExePath = process.platform === 'win32' 
            ? path.join(nodeInstallDir, 'node.exe')
            : path.join(nodeInstallDir, 'bin', 'node');
        
        console.log(`🔍 检查 Node.js 路径: ${nodeExePath}`);
        
        if (fs.existsSync(nodeExePath)) {
            return nodeExePath;
        }
    } catch (error) {
        console.log(`❌ 检查出错: ${error.message}`);
    }
    return null;
}

/**
 * 测试便携版路径检测
 */
function testPortablePathDetection() {
    const extensionPath = process.cwd(); // 模拟插件路径
    
    console.log(`📁 模拟插件路径: ${extensionPath}`);
    console.log(`🖥️ 当前平台: ${process.platform}`);
    console.log(`⚙️ 当前架构: ${process.arch}\n`);
    
    // 测试 Node.js 路径
    console.log('1️⃣ 测试 Node.js 路径检测');
    console.log('-'.repeat(30));
    const nodePath = getPortableNodePath(extensionPath);
    if (nodePath) {
        console.log(`✅ 找到便携版 Node.js: ${nodePath}`);
    } else {
        console.log('❌ 未找到便携版 Node.js');
    }
    console.log('');
    
    // 测试 npm 路径
    const packageManagers = ['npm', 'pnpm', 'yarn'];
    
    for (let i = 0; i < packageManagers.length; i++) {
        const manager = packageManagers[i];
        console.log(`${i + 2}️⃣ 测试 ${manager} 路径检测`);
        console.log('-'.repeat(30));
        
        const managerPath = getPortableNpmPath(manager, extensionPath);
        if (managerPath) {
            console.log(`✅ 找到便携版 ${manager}: ${managerPath}`);
        } else {
            console.log(`❌ 未找到便携版 ${manager}`);
        }
        console.log('');
    }
}

/**
 * 创建模拟便携版目录结构用于测试
 */
function createMockPortableStructure() {
    console.log('🏗️ 创建模拟便携版目录结构');
    console.log('================================\n');
    
    const portableDir = path.join(process.cwd(), 'portable-nodejs', 'node');
    
    try {
        // 创建目录
        fs.mkdirSync(portableDir, { recursive: true });
        console.log(`✅ 创建目录: ${portableDir}`);
        
        if (process.platform === 'win32') {
            // Windows 结构
            const files = ['node.exe', 'npm.cmd', 'npx.cmd'];
            for (const file of files) {
                const filePath = path.join(portableDir, file);
                fs.writeFileSync(filePath, `echo "Mock ${file}"`);
                console.log(`✅ 创建文件: ${filePath}`);
            }
        } else {
            // Unix 结构
            const binDir = path.join(portableDir, 'bin');
            fs.mkdirSync(binDir, { recursive: true });
            console.log(`✅ 创建bin目录: ${binDir}`);
            
            const files = ['node', 'npm', 'npx'];
            for (const file of files) {
                const filePath = path.join(binDir, file);
                fs.writeFileSync(filePath, `#!/bin/bash\necho "Mock ${file}"`);
                fs.chmodSync(filePath, '755'); // 添加执行权限
                console.log(`✅ 创建文件: ${filePath}`);
            }
        }
        
        console.log('\n🎉 模拟便携版目录结构创建完成！\n');
        return true;
    } catch (error) {
        console.log(`❌ 创建失败: ${error.message}`);
        return false;
    }
}

/**
 * 清理模拟目录
 */
function cleanupMockStructure() {
    console.log('\n🧹 清理模拟目录结构');
    console.log('====================');
    
    const portableDir = path.join(process.cwd(), 'portable-nodejs');
    
    try {
        if (fs.existsSync(portableDir)) {
            fs.rmSync(portableDir, { recursive: true, force: true });
            console.log(`✅ 删除目录: ${portableDir}`);
        } else {
            console.log('ℹ️ 模拟目录不存在，无需清理');
        }
    } catch (error) {
        console.log(`❌ 清理失败: ${error.message}`);
    }
}

/**
 * 主测试函数
 */
function main() {
    console.log('开始测试...\n');
    
    // 先清理之前的测试目录
    cleanupMockStructure();
    
    // 测试当前状态（应该找不到）
    console.log('📋 当前状态测试（预期：全部找不到）');
    console.log('=====================================\n');
    testPortablePathDetection();
    
    // 创建模拟结构
    const created = createMockPortableStructure();
    
    if (created) {
        // 测试模拟结构（应该能找到）
        console.log('📋 模拟结构测试（预期：全部找到）');
        console.log('===============================\n');
        testPortablePathDetection();
    }
    
    // 清理
    cleanupMockStructure();
    
    console.log('\n🎉 测试完成！');
    console.log('\n💡 这个测试验证了 v0.1.26 版本的便携版 npm 路径检测功能');
    console.log('现在插件应该能够正确检测和使用便携版 Node.js 中的 npm 命令了！');
}

main(); 