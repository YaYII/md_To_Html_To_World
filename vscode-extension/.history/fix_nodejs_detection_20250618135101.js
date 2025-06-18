const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🔧 Node.js 检测和修复工具');
console.log('============================\n');

/**
 * 检查命令是否可用
 */
function checkCommand(command, args = '--version') {
    return new Promise((resolve) => {
        const fullCommand = process.platform === 'win32' ? `${command}.cmd ${args}` : `${command} ${args}`;
        
        exec(fullCommand, { timeout: 5000, windowsHide: true }, (error, stdout) => {
            if (error) {
                console.log(`❌ ${command}: ${error.message}`);
                resolve(false);
            } else {
                console.log(`✅ ${command}: ${stdout.trim()}`);
                resolve(true);
            }
        });
    });
}

/**
 * 检查系统环境
 */
async function checkSystemEnvironment() {
    console.log('🔍 检查系统环境...');
    console.log(`操作系统: ${process.platform}`);
    console.log(`架构: ${process.arch}`);
    console.log(`Node.js 版本: ${process.version}`);
    console.log(`当前工作目录: ${process.cwd()}`);
    console.log(`PATH 环境变量: ${process.env.PATH?.split(path.delimiter).slice(0, 5).join('; ')}...`);
    console.log('');
}

/**
 * 检查包管理器
 */
async function checkPackageManagers() {
    console.log('📦 检查包管理器可用性...');
    
    const managers = ['node', 'npm', 'pnpm', 'yarn'];
    const results = {};
    
    for (const manager of managers) {
        results[manager] = await checkCommand(manager);
    }
    
    console.log('');
    return results;
}

/**
 * 分析问题并提供解决方案
 */
function analyzeAndSuggest(results) {
    console.log('🎯 问题分析和解决方案');
    console.log('========================');
    
    if (!results.node) {
        console.log('❌ 核心问题: Node.js 未安装或不在 PATH 中');
        console.log('');
        console.log('🛠️ 解决方案:');
        console.log('');
        console.log('方案一：自动安装（推荐）');
        console.log('1. 重新启动 VS Code/Cursor');
        console.log('2. 当插件提示安装 Node.js 时，选择"自动安装 Node.js"');
        console.log('3. 等待 2-5 分钟完成安装');
        console.log('4. 重启编辑器');
        console.log('');
        console.log('方案二：手动安装');
        console.log('1. 访问 https://nodejs.org/');
        console.log('2. 下载并安装 LTS 版本（当前推荐 v20.x）');
        console.log('3. 安装时确保勾选 "Add to PATH" 选项');
        console.log('4. 重启计算机');
        console.log('5. 重新打开编辑器');
        console.log('');
        console.log('方案三：便携版安装（如果自动安装失败）');
        console.log('1. 手动下载 Node.js 便携版');
        console.log('2. 解压到固定目录（如 C:\\nodejs）');
        console.log('3. 将该目录添加到系统 PATH 环境变量');
        console.log('4. 重启编辑器');
        
    } else if (!results.npm) {
        console.log('⚠️ Node.js 已安装，但 npm 不可用');
        console.log('');
        console.log('🛠️ 解决方案:');
        console.log('1. 重新安装 Node.js（选择完整安装）');
        console.log('2. 或者单独安装 npm: curl -L https://npmjs.org/install.sh | sh');
        
    } else {
        console.log('✅ Node.js 和 npm 都已安装');
        console.log('');
        console.log('🔍 如果仍然有问题，可能的原因:');
        console.log('1. 插件缓存问题 - 尝试重启编辑器');
        console.log('2. 权限问题 - 以管理员身份运行编辑器');
        console.log('3. 防火墙阻挡 - 检查网络连接');
        console.log('4. 代理设置 - 配置 npm 代理设置');
    }
}

/**
 * 生成诊断报告
 */
function generateReport(results) {
    const report = {
        timestamp: new Date().toISOString(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        environment: results,
        recommendations: []
    };
    
    if (!results.node) {
        report.status = 'critical';
        report.recommendations.push('立即安装 Node.js');
        report.recommendations.push('使用插件的自动安装功能');
    } else if (!results.npm) {
        report.status = 'warning';
        report.recommendations.push('修复 npm 安装');
    } else {
        report.status = 'good';
        report.recommendations.push('环境正常，检查其他问题');
    }
    
    // 保存报告
    const reportPath = path.join(process.cwd(), 'nodejs-diagnostic-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📋 诊断报告已保存: ${reportPath}`);
    
    return report;
}

/**
 * 主函数
 */
async function main() {
    try {
        await checkSystemEnvironment();
        const results = await checkPackageManagers();
        analyzeAndSuggest(results);
        generateReport(results);
        
        console.log('\n🎉 诊断完成！');
        console.log('💡 如果问题仍然存在，请将诊断报告发送给开发者');
        
    } catch (error) {
        console.error('❌ 诊断过程中发生错误:', error.message);
    }
}

main(); 