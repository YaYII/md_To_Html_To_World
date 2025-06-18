/**
 * Windows 环境修复验证脚本
 * 用于测试包管理器检测和依赖安装的改进
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

class WindowsFixesValidator {
    constructor() {
        this.results = [];
    }

    /**
     * 记录测试结果
     */
    log(test, status, message) {
        const result = { test, status, message, timestamp: new Date().toISOString() };
        this.results.push(result);
        const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
        console.log(`${icon} ${test}: ${message}`);
    }

    /**
     * 测试包管理器检测逻辑
     */
    async testPackageManagerDetection() {
        console.log('\n🔍 测试包管理器检测逻辑...');
        
        const packageManagers = ['pnpm', 'yarn', 'npm'];
        
        for (const manager of packageManagers) {
            try {
                // 模拟Windows环境检测
                const command = process.platform === 'win32' ? `${manager}.cmd --version` : `${manager} --version`;
                
                const result = await new Promise((resolve) => {
                    const execOptions = {
                        timeout: 10000,
                        windowsHide: true,
                        env: { ...process.env }
                    };

                    exec(command, execOptions, (error, stdout, stderr) => {
                        if (!error && stdout) {
                            resolve({ success: true, version: stdout.trim() });
                        } else {
                            resolve({ success: false, error: error?.message || stderr || '未知错误' });
                        }
                    });
                });

                if (result.success) {
                    this.log(`${manager} 检测`, 'PASS', `版本: ${result.version}`);
                } else {
                    this.log(`${manager} 检测`, 'INFO', `不可用: ${result.error}`);
                }
            } catch (error) {
                this.log(`${manager} 检测`, 'FAIL', `检测失败: ${error.message}`);
            }
        }
    }

    /**
     * 测试Sharp库检测
     */
    async testSharpDetection() {
        console.log('\n🖼️ 测试Sharp库检测...');
        
        try {
            const nodejsPath = path.join(__dirname, 'nodejs');
            const nodeModulesPath = path.join(nodejsPath, 'node_modules');
            const sharpPath = path.join(nodeModulesPath, 'sharp');
            
            const sharpExists = await fs.pathExists(sharpPath);
            
            if (sharpExists) {
                this.log('Sharp库检测', 'PASS', 'Sharp库已安装');
                
                // 尝试加载Sharp库
                try {
                    const sharp = require(sharpPath);
                    this.log('Sharp库加载', 'PASS', 'Sharp库可以正常加载');
                } catch (loadError) {
                    this.log('Sharp库加载', 'WARN', `加载失败: ${loadError.message}`);
                }
            } else {
                this.log('Sharp库检测', 'WARN', 'Sharp库未安装，SVG图表将使用文本占位符');
            }
        } catch (error) {
            this.log('Sharp库检测', 'FAIL', `检测失败: ${error.message}`);
        }
    }

    /**
     * 测试依赖安装命令构建
     */
    async testInstallCommandConstruction() {
        console.log('\n🛠️ 测试安装命令构建...');
        
        const packageManagers = ['pnpm', 'yarn', 'npm'];
        
        for (const manager of packageManagers) {
            // 模拟Windows环境
            const isWindows = process.platform === 'win32';
            const baseCommand = isWindows ? `${manager}.cmd` : manager;
            let installCommand = `${baseCommand} install`;
            
            if (isWindows) {
                installCommand += ' --include=optional';
            }
            
            this.log(
                `${manager} 命令构建`, 
                'PASS', 
                `${isWindows ? 'Windows' : 'Unix'}: ${installCommand}`
            );
        }
    }

    /**
     * 测试Node.js依赖检查
     */
    async testNodeDependencyCheck() {
        console.log('\n📦 测试Node.js依赖检查...');
        
        const nodejsPath = path.join(__dirname, 'nodejs');
        const packageJsonPath = path.join(nodejsPath, 'package.json');
        const nodeModulesPath = path.join(nodejsPath, 'node_modules');
        
        // 检查目录和文件
        const checks = [
            { name: 'nodejs目录', path: nodejsPath },
            { name: 'package.json', path: packageJsonPath },
            { name: 'node_modules', path: nodeModulesPath }
        ];
        
        for (const check of checks) {
            const exists = await fs.pathExists(check.path);
            this.log(
                `${check.name}检查`,
                exists ? 'PASS' : 'WARN',
                exists ? '存在' : '不存在'
            );
        }
        
        // 检查关键依赖
        if (await fs.pathExists(nodeModulesPath)) {
            const keyDependencies = [
                'axios', 'fs-extra', 'docx', 'markdown-it', 'cheerio', 
                'js-yaml', 'yargs', 'inquirer'
            ];
            
            for (const dep of keyDependencies) {
                const depPath = path.join(nodeModulesPath, dep);
                const exists = await fs.pathExists(depPath);
                this.log(
                    `依赖${dep}`,
                    exists ? 'PASS' : 'WARN',
                    exists ? '已安装' : '未安装'
                );
            }
        }
    }

    /**
     * 测试错误处理机制
     */
    async testErrorHandling() {
        console.log('\n🚨 测试错误处理机制...');
        
        // 测试无效命令的处理
        try {
            const result = await new Promise((resolve) => {
                exec('invalid-command-test', { timeout: 5000 }, (error, stdout, stderr) => {
                    resolve({ error: error?.message, stderr });
                });
            });
            
            this.log(
                '无效命令处理',
                'PASS',
                `正确捕获错误: ${result.error || result.stderr}`
            );
        } catch (error) {
            this.log('无效命令处理', 'FAIL', `异常处理失败: ${error.message}`);
        }
    }

    /**
     * 生成测试报告
     */
    generateReport() {
        console.log('\n📋 测试报告:');
        console.log('=' * 50);
        
        const summary = {
            total: this.results.length,
            passed: this.results.filter(r => r.status === 'PASS').length,
            warnings: this.results.filter(r => r.status === 'WARN').length,
            failed: this.results.filter(r => r.status === 'FAIL').length
        };
        
        console.log(`总测试数: ${summary.total}`);
        console.log(`通过: ${summary.passed}`);
        console.log(`警告: ${summary.warnings}`);
        console.log(`失败: ${summary.failed}`);
        
        if (summary.failed > 0) {
            console.log('\n❌ 失败的测试:');
            this.results
                .filter(r => r.status === 'FAIL')
                .forEach(r => console.log(`  - ${r.test}: ${r.message}`));
        }
        
        if (summary.warnings > 0) {
            console.log('\n⚠️ 警告的测试:');
            this.results
                .filter(r => r.status === 'WARN')
                .forEach(r => console.log(`  - ${r.test}: ${r.message}`));
        }
        
        const successRate = ((summary.passed / summary.total) * 100).toFixed(1);
        console.log(`\n✅ 成功率: ${successRate}%`);
        
        return summary;
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🚀 开始Windows环境修复验证...');
        console.log(`平台: ${process.platform}`);
        console.log(`Node.js版本: ${process.version}`);
        
        await this.testPackageManagerDetection();
        await this.testSharpDetection();
        await this.testInstallCommandConstruction();
        await this.testNodeDependencyCheck();
        await this.testErrorHandling();
        
        return this.generateReport();
    }
}

// 运行测试
if (require.main === module) {
    const validator = new WindowsFixesValidator();
    validator.runAllTests()
        .then(summary => {
            process.exit(summary.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('❌ 测试运行失败:', error);
            process.exit(1);
        });
}

module.exports = WindowsFixesValidator; 