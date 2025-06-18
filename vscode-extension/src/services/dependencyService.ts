/**
 * @file dependencyService.ts
 * @description 依赖管理服务 - 负责检查、安装和验证 Node.js 依赖
 */
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * 依赖管理服务类
 */
export class DependencyService {
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('Markdown to Word - 依赖安装');
    }

    /**
     * 检查并安装所有依赖
     */
    async checkAndInstallDependencies(): Promise<boolean> {
        try {
            this.outputChannel.show(true);
            this.outputChannel.appendLine('开始检查依赖环境...');

            // 只检查和安装 Node.js 依赖
            const nodeSuccess = await this.checkAndInstallNodeDependencies();

            if (nodeSuccess) {
                this.outputChannel.appendLine('✅ 所有依赖安装完成！');
                return true;
            } else {
                this.outputChannel.appendLine('❌ Node.js 依赖安装失败');
                return false;
            }
        } catch (error) {
            this.outputChannel.appendLine(`依赖安装过程中出现错误: ${error}`);
            return false;
        }
    }

    /**
     * 检查和安装Node.js依赖
     */
    private async checkAndInstallNodeDependencies(): Promise<boolean> {
        try {
            this.outputChannel.appendLine('🔍 检查 Node.js 依赖...');

            // 首先检查 Node.js 环境
            const nodeJsAvailable = await this.checkNodeJsEnvironment();
            if (!nodeJsAvailable) {
                this.outputChannel.appendLine('❌ Node.js 环境不可用，无法安装依赖');
                this.outputChannel.appendLine('💡 请先安装 Node.js，然后重新启动编辑器');
                return false;
            }

            const nodejsPath = path.join(this.context.extensionPath, 'nodejs');
            const packageJsonPath = path.join(nodejsPath, 'package.json');
            const nodeModulesPath = path.join(nodejsPath, 'node_modules');

            // 检查 package.json 是否存在
            if (!await fs.pathExists(packageJsonPath)) {
                this.outputChannel.appendLine('❌ 未找到 nodejs/package.json 文件');
                return false;
            }

            // 检查关键依赖是否存在
            const keyDependencies = [
                'axios', 'fs-extra', 'docx', 'markdown-it', 'cheerio'
            ];

            let needsInstall = false;

            if (!await fs.pathExists(nodeModulesPath)) {
                this.outputChannel.appendLine('📦 node_modules 目录不存在，需要安装依赖');
                needsInstall = true;
            } else {
                // 检查关键依赖
                for (const dep of keyDependencies) {
                    const depPath = path.join(nodeModulesPath, dep);
                    if (!await fs.pathExists(depPath)) {
                        this.outputChannel.appendLine(`📦 缺少关键依赖: ${dep}`);
                        needsInstall = true;
                        break;
                    }
                }
            }

            if (!needsInstall) {
                this.outputChannel.appendLine('✅ Node.js 依赖已存在');
                return true;
            }

            // 安装依赖
            this.outputChannel.appendLine('📦 开始安装 Node.js 依赖...');
            
            const npmCommand = await this.getNpmCommand();
            if (!npmCommand) {
                this.outputChannel.appendLine('❌ 未找到可用的包管理器 (npm/pnpm/yarn)');
                return false;
            }

            try {
                // 构建安装命令
                const installCommand = this.buildInstallCommand(npmCommand);
                this.outputChannel.appendLine(`执行命令: ${installCommand}`);
                
                const { stdout, stderr } = await execAsync(installCommand, {
                    cwd: nodejsPath,
                    timeout: 300000, // 5分钟超时
                    env: await this.getEnvWithNodePath() // 设置环境变量
                });

                if (stdout) this.outputChannel.appendLine(stdout);
                if (stderr && !stderr.includes('WARN')) {
                    this.outputChannel.appendLine(`安装警告: ${stderr}`);
                }

                // 再次检查node_modules是否存在
                if (await fs.pathExists(nodeModulesPath)) {
                    this.outputChannel.appendLine('✅ Node.js 依赖安装完成');
                    return true;
                } else {
                    this.outputChannel.appendLine('❌ 依赖安装失败：node_modules 目录未创建');
                    return false;
                }
            } catch (error: any) {
                this.outputChannel.appendLine(`❌ 依赖安装失败: ${error.message}`);
                if (error.stdout) this.outputChannel.appendLine(`stdout: ${error.stdout}`);
                if (error.stderr) this.outputChannel.appendLine(`stderr: ${error.stderr}`);
                return false;
            }
        } catch (error) {
            this.outputChannel.appendLine(`检查 Node.js 依赖时出错: ${error}`);
            return false;
        }
    }

    /**
     * 构建安装命令
     */
    private buildInstallCommand(npmCommand: string): string {
        // 如果npmCommand包含引号，说明是完整路径
        if (npmCommand.includes('"')) {
            return `${npmCommand} install`;
        }
        // 否则是系统命令
        return `${npmCommand} install`;
    }

    /**
     * 获取包含Node.js路径的环境变量
     */
    private async getEnvWithNodePath(): Promise<NodeJS.ProcessEnv> {
        const env = { ...process.env };
        
        // 尝试添加项目内部Node.js到PATH
        const internalNodePath = await this.getInternalNodePath();
        if (internalNodePath) {
            const binPaths = [
                path.join(internalNodePath, 'bin'),
                path.join(internalNodePath, 'node_modules', '.bin'),
                internalNodePath
            ];
            
            const existingPath = env.PATH || env.Path || '';
            const newPath = binPaths.join(path.delimiter) + path.delimiter + existingPath;
            env.PATH = newPath;
            env.Path = newPath; // Windows兼容性
        }
        
        return env;
    }

    /**
     * 检查Node.js环境是否可用
     * 优先检查系统Node.js，如果不可用则尝试使用便携版Node.js
     */
    private async checkNodeJsEnvironment(): Promise<boolean> {
        // 首先尝试系统Node.js
        try {
            const { stdout } = await execAsync('node --version');
            const version = stdout.trim();
            this.outputChannel.appendLine(`✅ 系统 Node.js 版本: ${version}`);
            
            // 检查版本是否满足要求 (>= 14)
            const versionNumber = parseInt(version.replace('v', '').split('.')[0]);
            if (versionNumber < 14) {
                this.outputChannel.appendLine(`⚠️ 系统 Node.js 版本过低，尝试使用便携版 Node.js`);
                return await this.checkPortableNodeJs();
            }
            
            return true;
        } catch (error) {
            this.outputChannel.appendLine('⚠️ 系统 Node.js 未安装或不在 PATH 中，尝试使用便携版 Node.js');
            return await this.checkPortableNodeJs();
        }
    }

    /**
     * 检查便携版Node.js是否可用
     */
    private async checkPortableNodeJs(): Promise<boolean> {
        const portableNodeDir = path.join(this.context.extensionPath, 'portable-nodejs', 'node');
        const nodeExecutable = os.platform() === 'win32' ? 'node.exe' : 'node';
        const nodePath = path.join(portableNodeDir, 'bin', nodeExecutable);
        const nodePathWin = path.join(portableNodeDir, nodeExecutable); // Windows便携版可能直接在根目录
        
        // 检查便携版Node.js是否存在
        const finalNodePath = await fs.pathExists(nodePath) ? nodePath : 
                             await fs.pathExists(nodePathWin) ? nodePathWin : null;
        
        if (finalNodePath) {
            try {
                const { stdout } = await execAsync(`"${finalNodePath}" --version`);
                const version = stdout.trim();
                this.outputChannel.appendLine(`✅ 便携版 Node.js 版本: ${version}`);
                return true;
            } catch (error) {
                this.outputChannel.appendLine(`❌ 便携版 Node.js 执行失败: ${error}`);
            }
        }
        
        this.outputChannel.appendLine('❌ 未找到可用的 Node.js 环境');
        return false;
    }

    /**
     * 获取可用的npm命令
     * 优先使用项目内部的Node.js环境中的包管理器
     */
    private async getNpmCommand(): Promise<string | null> {
        // 首先尝试使用项目内部的Node.js环境
        const internalNodePath = await this.getInternalNodePath();
        if (internalNodePath) {
            const internalCmd = await this.getInternalPackageManager(internalNodePath);
            if (internalCmd) {
                return internalCmd;
            }
        }
        
        // 如果项目内部环境不可用，回退到系统环境
        this.outputChannel.appendLine('⚠️ 项目内部Node.js环境不可用，尝试使用系统环境');
        const commands = ['pnpm', 'yarn', 'npm'];
        
        for (const cmd of commands) {
            try {
                await execAsync(`${cmd} --version`);
                this.outputChannel.appendLine(`✅ 找到系统包管理器: ${cmd}`);
                return cmd;
            } catch (error) {
                this.outputChannel.appendLine(`⚠️ 系统 ${cmd} 不可用`);
            }
        }
        
        return null;
    }

    /**
     * 获取项目内部Node.js路径
     */
    private async getInternalNodePath(): Promise<string | null> {
        // 检查nodejs目录（当前项目结构）
        const nodejsDir = path.join(this.context.extensionPath, 'nodejs');
        if (await fs.pathExists(nodejsDir)) {
            this.outputChannel.appendLine(`✅ 找到项目内部Node.js目录: ${nodejsDir}`);
            return nodejsDir;
        }
        
        // 检查便携版Node.js目录
        const portableNodeDir = path.join(this.context.extensionPath, 'portable-nodejs', 'node');
        if (await fs.pathExists(portableNodeDir)) {
            this.outputChannel.appendLine(`✅ 找到便携版Node.js目录: ${portableNodeDir}`);
            return portableNodeDir;
        }
        
        this.outputChannel.appendLine('⚠️ 未找到项目内部Node.js环境');
        return null;
    }

    /**
     * 获取项目内部的包管理器
     */
    private async getInternalPackageManager(nodePath: string): Promise<string | null> {
        const platform = os.platform();
        const isWindows = platform === 'win32';
        
        // 构建可能的包管理器路径
        const binDir = path.join(nodePath, 'node_modules', '.bin');
        const globalBinDir = path.join(nodePath, 'bin'); // 对于便携版Node.js
        
        const packageManagers = [
            { name: 'npm', paths: [
                path.join(binDir, isWindows ? 'npm.cmd' : 'npm'),
                path.join(globalBinDir, isWindows ? 'npm.cmd' : 'npm'),
                path.join(nodePath, isWindows ? 'npm.cmd' : 'npm')
            ]},
            { name: 'pnpm', paths: [
                path.join(binDir, isWindows ? 'pnpm.cmd' : 'pnpm'),
                path.join(globalBinDir, isWindows ? 'pnpm.cmd' : 'pnpm')
            ]},
            { name: 'yarn', paths: [
                path.join(binDir, isWindows ? 'yarn.cmd' : 'yarn'),
                path.join(globalBinDir, isWindows ? 'yarn.cmd' : 'yarn')
            ]}
        ];
        
        for (const pm of packageManagers) {
            for (const pmPath of pm.paths) {
                if (await fs.pathExists(pmPath)) {
                    try {
                        await execAsync(`"${pmPath}" --version`);
                        this.outputChannel.appendLine(`✅ 找到项目内部包管理器: ${pm.name} (${pmPath})`);
                        return `"${pmPath}"`; // 返回完整路径，用引号包围以处理空格
                    } catch (error) {
                        this.outputChannel.appendLine(`⚠️ 项目内部 ${pm.name} 不可执行: ${error}`);
                    }
                }
            }
        }
        
        // 如果没有找到预安装的包管理器，尝试使用Node.js自带的npm
        const nodeExecutable = isWindows ? 'node.exe' : 'node';
        const possibleNodePaths = [
            path.join(nodePath, 'bin', nodeExecutable),
            path.join(nodePath, nodeExecutable)
        ];
        
        for (const nodeExePath of possibleNodePaths) {
            if (await fs.pathExists(nodeExePath)) {
                try {
                    // 使用node -p "process.version"测试Node.js是否可用
                    await execAsync(`"${nodeExePath}" -p "process.version"`);
                    this.outputChannel.appendLine(`✅ 找到项目内部Node.js: ${nodeExePath}`);
                    // 返回使用npx npm的命令
                    return `"${nodeExePath}" -e "require('child_process').spawn('npm', process.argv.slice(1), {stdio:'inherit'})" --`;
                } catch (error) {
                    this.outputChannel.appendLine(`⚠️ 项目内部Node.js不可执行: ${error}`);
                }
            }
        }
        
        return null;
    }

    /**
     * 检查系统命令是否可用
     */
    async checkSystemCommand(command: string): Promise<boolean> {
        try {
            await execAsync(`${command} --version`);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 显示手动安装说明
     */
    async showManualInstallationInstructions(): Promise<void> {
        const message = `
📋 依赖安装失败 - 解决方案：

🔍 **问题诊断**
扩展尝试使用项目内部的 Node.js 环境，但未能成功安装依赖。

💡 **解决方案**

**方案1: 使用系统 Node.js (推荐)**
1. 确保系统已安装 Node.js (版本 >= 14)
2. 验证安装: 在终端运行 \`node --version\` 和 \`npm --version\`
3. 重启 VS Code 并重试

**方案2: 手动安装项目依赖**
1. 打开终端，导航到扩展目录:
   \`cd "${this.context.extensionPath}/nodejs"\`
2. 手动安装依赖:
   \`npm install\` 或 \`yarn install\` 或 \`pnpm install\`

🔧 **安装 Node.js (如果未安装)**

**Windows:**
1. 访问 https://nodejs.org/
2. 下载并安装 LTS 版本
3. 确保勾选 "Add to PATH" 选项
4. 重启 VS Code

**macOS:**
方法1 - 官方安装包：
1. 访问 https://nodejs.org/
2. 下载并安装 LTS 版本

方法2 - 使用 Homebrew：
\`\`\`bash
brew install node
\`\`\`

**Linux (Ubuntu/Debian):**
\`\`\`bash
# 使用 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 或使用包管理器
sudo apt update
sudo apt install nodejs npm
\`\`\`

**Linux (CentOS/RHEL/Fedora):**
\`\`\`bash
# 使用 NodeSource 仓库
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
sudo yum install -y nodejs npm
\`\`\`

🔍 **验证安装**
\`\`\`bash
node --version
npm --version
\`\`\`

🚨 **常见问题解决**
1. **命令未找到**: 确保 Node.js 已添加到系统 PATH
2. **权限问题**: 在 Linux/macOS 上可能需要 sudo
3. **网络问题**: 检查防火墙和代理设置
4. **重启**: 安装后重启终端或 VS Code
5. **项目依赖**: 确保 ${this.context.extensionPath}/nodejs 目录存在且包含 package.json

安装完成后，请重新尝试使用扩展功能。
        `;
        
        this.outputChannel.appendLine(message);
        
        const action = await vscode.window.showErrorMessage(
            '依赖安装失败，需要手动处理',
            '查看详细说明',
            '打开项目目录',
            '打开 Node.js 官网'
        );
        
        if (action === '查看详细说明') {
            this.outputChannel.show();
        } else if (action === '打开项目目录') {
            const nodejsPath = path.join(this.context.extensionPath, 'nodejs');
            vscode.env.openExternal(vscode.Uri.file(nodejsPath));
        } else if (action === '打开 Node.js 官网') {
            vscode.env.openExternal(vscode.Uri.parse('https://nodejs.org/'));
        }
    }

    /**
     * 获取输出通道
     */
    getOutputChannel(): vscode.OutputChannel {
        return this.outputChannel;
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
}