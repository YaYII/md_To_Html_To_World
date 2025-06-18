/**
 * Node.js 环境检查测试脚本
 * 模拟插件中的环境检查逻辑
 */

const { exec } = require('child_process');

/**
 * 检查命令是否可用
 */
function checkCommandAvailable(command, args) {
    return new Promise((resolve) => {
        // Windows环境下可能需要添加.exe后缀
        const fullCommand = process.platform === 'win32' ? `${command}.exe ${args}` : `${command} ${args}`;
        
        const execOptions = {
            timeout: 10000,
            windowsHide: true,
            env: { ...process.env }
        };

        exec(fullCommand, execOptions, (error, stdout, stderr) => {
            if (!error && stdout) {
                console.log(`✅ ${command} 版本: ${stdout.trim()}`);
                resolve(true);
            } else {
                console.log(`❌ ${command} 不可用: ${error?.message || stderr || '未知错误'}`);
                resolve(false);
            }
        });
    });
}

/**
 * 检查Node.js环境
 */
async function checkNodeJsEnvironment() {
    console.log('🔍 检查 Node.js 环境...');
    
    try {
        // 检查 Node.js
        const nodeAvailable = await checkCommandAvailable('node', '--version');
        if (!nodeAvailable) {
            console.log('❌ Node.js 未安装或不可用');
            console.log('\n🚨 Node.js 环境缺失！');
            console.log('请按照以下步骤安装 Node.js：');
            console.log('1. 访问 Node.js 官网：https://nodejs.org/');
            console.log('2. 下载并安装 LTS 版本（推荐）');
            console.log('3. 安装完成后重启计算机');
            console.log('4. 重新运行此测试');
            return false;
        }
        
        console.log('✅ Node.js 环境可用');
        
        // 检查 npm
        const npmAvailable = await checkCommandAvailable('npm', '--version');
        if (npmAvailable) {
            console.log('✅ npm 包管理器可用');
        }
        
        return true;
        
    } catch (error) {
        console.log(`❌ Node.js 环境检查失败: ${error.message}`);
        return false;
    }
}

/**
 * 检查包管理器
 */
async function checkPackageManagers() {
    console.log('\n🔍 检查包管理器...');
    
    const packageManagers = ['pnpm', 'yarn', 'npm'];
    const availableManagers = [];
    
    for (const manager of packageManagers) {
        const available = await checkCommandAvailable(manager, '--version');
        if (available) {
            availableManagers.push(manager);
        }
    }
    
    if (availableManagers.length > 0) {
        console.log(`\n✅ 可用的包管理器: ${availableManagers.join(', ')}`);
        console.log(`推荐使用: ${availableManagers[0]}`);
    } else {
        console.log('\n❌ 没有找到可用的包管理器');
    }
    
    return availableManagers;
}

/**
 * 主测试函数
 */
async function runTest() {
    console.log('🚀 开始 Node.js 环境检查测试...');
    console.log(`平台: ${process.platform}`);
    console.log(`架构: ${process.arch}`);
    console.log(`Node.js 版本: ${process.version}`);
    
    const nodeOk = await checkNodeJsEnvironment();
    
    if (nodeOk) {
        await checkPackageManagers();
        console.log('\n✅ 环境检查完成，插件应该可以正常工作！');
    } else {
        console.log('\n❌ 环境检查失败，请先安装 Node.js');
    }
}

// 运行测试
if (require.main === module) {
    runTest().catch(console.error);
}

module.exports = { checkCommandAvailable, checkNodeJsEnvironment, checkPackageManagers }; 