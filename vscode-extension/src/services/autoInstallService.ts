/**
 * @file autoInstallService.ts
 * @description 自动化安装服务 - 自动下载和安装 Node.js 及相关依赖
 */
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as https from 'https';
import * as http from 'http';
import { pipeline } from 'stream';
import { createWriteStream } from 'fs';
import { Extract } from 'unzipper';
import * as tar from 'tar';

const execAsync = promisify(exec);
const pipelineAsync = promisify(pipeline);

/**
 * Node.js 版本信息接口
 */
interface NodeVersion {
    version: string;
    lts: string | false;
    date: string;
    files: string[];
}



/**
 * 自动化安装服务类
 */
export class AutoInstallService {
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;
    private readonly NODE_DOWNLOAD_BASE = 'https://nodejs.org/dist';
    private readonly NODE_RELEASES_API = 'https://nodejs.org/dist/index.json';
    private readonly PORTABLE_NODE_DIR = 'portable-nodejs';
    private readonly MIN_NODE_VERSION = 16; // 最低支持的 Node.js 版本

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('Markdown to Word - 自动安装');
    }

    /**
     * 主要的自动安装流程
     */
    async autoInstall(): Promise<boolean> {
        try {
            this.outputChannel.show(true);
            this.outputChannel.appendLine('🚀 开始自动化安装流程...');
            this.outputChannel.appendLine('=' .repeat(50));

            // 1. 检查系统 Node.js
            const systemNodeAvailable = await this.checkSystemNode();
            if (systemNodeAvailable) {
                this.outputChannel.appendLine('✅ 系统 Node.js 可用，跳过自动安装');
                return await this.installProjectDependencies();
            }

            // 2. 检查便携版 Node.js
            const portableNodeAvailable = await this.checkPortableNode();
            if (portableNodeAvailable) {
                this.outputChannel.appendLine('✅ 便携版 Node.js 可用，跳过下载');
                return await this.installProjectDependencies();
            }

            // 3. 自动下载和安装 Node.js
            const downloadSuccess = await this.downloadAndInstallNode();
            if (!downloadSuccess) {
                this.outputChannel.appendLine('❌ Node.js 自动安装失败');
                await this.showManualInstallGuide();
                return false;
            }

            // 4. 安装项目依赖
            const dependenciesSuccess = await this.installProjectDependencies();
            if (!dependenciesSuccess) {
                this.outputChannel.appendLine('❌ 项目依赖安装失败');
                return false;
            }

            this.outputChannel.appendLine('🎉 自动化安装完成！');
            this.outputChannel.appendLine('=' .repeat(50));
            return true;

        } catch (error) {
            this.outputChannel.appendLine(`❌ 自动安装过程中出现错误: ${error}`);
            await this.showManualInstallGuide();
            return false;
        }
    }

    /**
     * 检查系统 Node.js
     */
    private async checkSystemNode(): Promise<boolean> {
        try {
            const { stdout } = await execAsync('node --version');
            const version = stdout.trim();
            const versionNumber = parseInt(version.replace('v', '').split('.')[0]);
            
            this.outputChannel.appendLine(`🔍 检测到系统 Node.js 版本: ${version}`);
            
            if (versionNumber >= this.MIN_NODE_VERSION) {
                this.outputChannel.appendLine('✅ 系统 Node.js 版本满足要求');
                return true;
            } else {
                this.outputChannel.appendLine(`⚠️ 系统 Node.js 版本过低 (需要 >= ${this.MIN_NODE_VERSION})`);
                return false;
            }
        } catch (error) {
            this.outputChannel.appendLine('⚠️ 系统未安装 Node.js 或不在 PATH 中');
            return false;
        }
    }

    /**
     * 检查便携版 Node.js
     */
    private async checkPortableNode(): Promise<boolean> {
        const portableDir = path.join(this.context.extensionPath, this.PORTABLE_NODE_DIR);
        const nodeExecutable = this.getNodeExecutableName();
        const possiblePaths = [
            path.join(portableDir, 'node', 'bin', nodeExecutable),
            path.join(portableDir, 'node', nodeExecutable),
            path.join(portableDir, 'bin', nodeExecutable),
            path.join(portableDir, nodeExecutable)
        ];

        for (const nodePath of possiblePaths) {
            if (await fs.pathExists(nodePath)) {
                try {
                    const { stdout } = await execAsync(`"${nodePath}" --version`);
                    const version = stdout.trim();
                    this.outputChannel.appendLine(`✅ 找到便携版 Node.js: ${version} (${nodePath})`);
                    return true;
                } catch (error) {
                    this.outputChannel.appendLine(`⚠️ 便携版 Node.js 不可执行: ${nodePath}`);
                }
            }
        }

        this.outputChannel.appendLine('⚠️ 未找到可用的便携版 Node.js');
        return false;
    }

    /**
     * 下载并安装 Node.js
     */
    private async downloadAndInstallNode(): Promise<boolean> {
        try {
            this.outputChannel.appendLine('📥 开始下载 Node.js...');

            // 1. 获取最新 LTS 版本信息
            const nodeVersion = await this.getLatestLTSVersion();
            if (!nodeVersion) {
                this.outputChannel.appendLine('❌ 无法获取 Node.js 版本信息');
                return false;
            }

            this.outputChannel.appendLine(`📋 准备下载 Node.js ${nodeVersion.version}`);

            // 2. 构建下载 URL
            const downloadUrl = this.buildDownloadUrl(nodeVersion.version);
            if (!downloadUrl) {
                this.outputChannel.appendLine('❌ 无法构建下载 URL');
                return false;
            }

            this.outputChannel.appendLine(`🔗 下载地址: ${downloadUrl}`);

            // 3. 下载文件
            const downloadPath = await this.downloadFile(downloadUrl);
            if (!downloadPath) {
                this.outputChannel.appendLine('❌ 文件下载失败');
                return false;
            }

            // 4. 解压文件
            const extractSuccess = await this.extractNodeArchive(downloadPath);
            if (!extractSuccess) {
                this.outputChannel.appendLine('❌ 文件解压失败');
                return false;
            }

            // 5. 清理下载文件
            await fs.remove(downloadPath);
            this.outputChannel.appendLine('🧹 清理临时文件完成');

            // 6. 验证安装
            const verifySuccess = await this.verifyNodeInstallation();
            if (!verifySuccess) {
                this.outputChannel.appendLine('❌ Node.js 安装验证失败');
                return false;
            }

            this.outputChannel.appendLine('✅ Node.js 自动安装完成');
            return true;

        } catch (error) {
            this.outputChannel.appendLine(`❌ Node.js 下载安装失败: ${error}`);
            return false;
        }
    }

    /**
     * 获取最新 LTS 版本
     */
    private async getLatestLTSVersion(): Promise<NodeVersion | null> {
        try {
            this.outputChannel.appendLine('🔍 获取 Node.js 版本信息...');
            
            const data = await this.httpGet(this.NODE_RELEASES_API);
            const releases: NodeVersion[] = JSON.parse(data);
            
            // 查找最新的 LTS 版本
            const ltsVersion = releases.find(release => 
                release.lts && 
                parseInt(release.version.replace('v', '').split('.')[0]) >= this.MIN_NODE_VERSION
            );
            
            if (ltsVersion) {
                this.outputChannel.appendLine(`✅ 找到 LTS 版本: ${ltsVersion.version}`);
                return ltsVersion;
            } else {
                this.outputChannel.appendLine('❌ 未找到合适的 LTS 版本');
                return null;
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ 获取版本信息失败: ${error}`);
            return null;
        }
    }

    /**
     * 构建下载 URL
     */
    private buildDownloadUrl(version: string): string | null {
        const platform = os.platform();
        const arch = os.arch();
        
        let platformName: string;
        let archName: string;
        let extension: string;
        
        // 平台映射
        switch (platform) {
            case 'win32':
                platformName = 'win';
                extension = 'zip';
                break;
            case 'darwin':
                platformName = 'darwin';
                extension = 'tar.gz';
                break;
            case 'linux':
                platformName = 'linux';
                extension = 'tar.xz';
                break;
            default:
                this.outputChannel.appendLine(`❌ 不支持的平台: ${platform}`);
                return null;
        }
        
        // 架构映射
        switch (arch) {
            case 'x64':
                archName = 'x64';
                break;
            case 'arm64':
                archName = 'arm64';
                break;
            case 'ia32':
                archName = 'x86';
                break;
            default:
                this.outputChannel.appendLine(`❌ 不支持的架构: ${arch}`);
                return null;
        }
        
        const filename = `node-${version}-${platformName}-${archName}.${extension}`;
        return `${this.NODE_DOWNLOAD_BASE}/${version}/${filename}`;
    }

    /**
     * 下载文件
     */
    private async downloadFile(url: string): Promise<string | null> {
        try {
            const filename = path.basename(url);
            const downloadPath = path.join(os.tmpdir(), filename);
            
            this.outputChannel.appendLine(`📥 开始下载: ${filename}`);
            this.outputChannel.appendLine(`💾 保存到: ${downloadPath}`);
            
            await this.downloadWithProgress(url, downloadPath);
            
            this.outputChannel.appendLine('✅ 下载完成');
            return downloadPath;
        } catch (error) {
            this.outputChannel.appendLine(`❌ 下载失败: ${error}`);
            return null;
        }
    }

    /**
     * 带进度的下载
     */
    private async downloadWithProgress(url: string, filePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https:') ? https : http;
            
            protocol.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // 处理重定向
                    if (response.headers.location) {
                        this.downloadWithProgress(response.headers.location, filePath)
                            .then(resolve)
                            .catch(reject);
                        return;
                    }
                }
                
                if (response.statusCode !== 200) {
                    reject(new Error(`下载失败: HTTP ${response.statusCode}`));
                    return;
                }
                
                const totalSize = parseInt(response.headers['content-length'] || '0');
                let downloadedSize = 0;
                let lastProgress = 0;
                
                const fileStream = createWriteStream(filePath);
                
                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    
                    if (totalSize > 0) {
                        const progress = Math.floor((downloadedSize / totalSize) * 100);
                        if (progress > lastProgress && progress % 10 === 0) {
                            this.outputChannel.appendLine(`📊 下载进度: ${progress}% (${this.formatBytes(downloadedSize)}/${this.formatBytes(totalSize)})`);
                            lastProgress = progress;
                        }
                    }
                });
                
                response.pipe(fileStream);
                
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve();
                });
                
                fileStream.on('error', (error) => {
                    fs.unlink(filePath).catch(() => {}); // 清理失败的文件
                    reject(error);
                });
            }).on('error', reject);
        });
    }

    /**
     * 解压 Node.js 归档文件
     */
    private async extractNodeArchive(archivePath: string): Promise<boolean> {
        try {
            const portableDir = path.join(this.context.extensionPath, this.PORTABLE_NODE_DIR);
            await fs.ensureDir(portableDir);
            
            this.outputChannel.appendLine(`📦 开始解压到: ${portableDir}`);
            
            const extension = path.extname(archivePath).toLowerCase();
            
            if (extension === '.zip') {
                await this.extractZip(archivePath, portableDir);
            } else if (extension === '.gz' || extension === '.xz') {
                await this.extractTar(archivePath, portableDir);
            } else {
                this.outputChannel.appendLine(`❌ 不支持的压缩格式: ${extension}`);
                return false;
            }
            
            this.outputChannel.appendLine('✅ 解压完成');
            return true;
        } catch (error) {
            this.outputChannel.appendLine(`❌ 解压失败: ${error}`);
            return false;
        }
    }

    /**
     * 解压 ZIP 文件
     */
    private async extractZip(zipPath: string, extractDir: string): Promise<void> {
        const readStream = fs.createReadStream(zipPath);
        const extractStream = Extract({ path: extractDir });
        
        await pipelineAsync(readStream, extractStream);
        
        // 重命名解压后的目录为 'node'
        const files = await fs.readdir(extractDir);
        const nodeDir = files.find(file => file.startsWith('node-'));
        if (nodeDir) {
            const oldPath = path.join(extractDir, nodeDir);
            const newPath = path.join(extractDir, 'node');
            await fs.move(oldPath, newPath);
        }
    }

    /**
     * 解压 TAR 文件
     */
    private async extractTar(tarPath: string, extractDir: string): Promise<void> {
        await tar.extract({
            file: tarPath,
            cwd: extractDir,
            strip: 1, // 去掉顶层目录
            newer: true
        });
        
        // 确保解压到 node 子目录
        const nodeDir = path.join(extractDir, 'node');
        if (!await fs.pathExists(nodeDir)) {
            // 如果没有 node 子目录，创建一个并移动文件
            await fs.ensureDir(nodeDir);
            const files = await fs.readdir(extractDir);
            for (const file of files) {
                if (file !== 'node') {
                    const oldPath = path.join(extractDir, file);
                    const newPath = path.join(nodeDir, file);
                    await fs.move(oldPath, newPath);
                }
            }
        }
    }

    /**
     * 验证 Node.js 安装
     */
    private async verifyNodeInstallation(): Promise<boolean> {
        try {
            this.outputChannel.appendLine('🔍 验证 Node.js 安装...');
            
            const portableDir = path.join(this.context.extensionPath, this.PORTABLE_NODE_DIR);
            const nodeExecutable = this.getNodeExecutableName();
            const possiblePaths = [
                path.join(portableDir, 'node', 'bin', nodeExecutable),
                path.join(portableDir, 'node', nodeExecutable),
                path.join(portableDir, 'bin', nodeExecutable),
                path.join(portableDir, nodeExecutable)
            ];
            
            for (const nodePath of possiblePaths) {
                if (await fs.pathExists(nodePath)) {
                    try {
                        const { stdout } = await execAsync(`"${nodePath}" --version`);
                        const version = stdout.trim();
                        this.outputChannel.appendLine(`✅ Node.js 验证成功: ${version}`);
                        this.outputChannel.appendLine(`📍 安装路径: ${nodePath}`);
                        return true;
                    } catch (error) {
                        this.outputChannel.appendLine(`⚠️ Node.js 不可执行: ${nodePath}`);
                    }
                }
            }
            
            this.outputChannel.appendLine('❌ Node.js 验证失败');
            return false;
        } catch (error) {
            this.outputChannel.appendLine(`❌ 验证过程出错: ${error}`);
            return false;
        }
    }

    /**
     * 安装项目依赖
     */
    private async installProjectDependencies(): Promise<boolean> {
        try {
            this.outputChannel.appendLine('📦 开始安装项目依赖...');
            
            const nodejsPath = path.join(this.context.extensionPath, 'nodejs');
            const packageJsonPath = path.join(nodejsPath, 'package.json');
            
            if (!await fs.pathExists(packageJsonPath)) {
                this.outputChannel.appendLine('❌ 未找到 nodejs/package.json 文件');
                return false;
            }
            
            // 获取 npm 命令
            const npmCommand = await this.getNpmCommand();
            if (!npmCommand) {
                this.outputChannel.appendLine('❌ 未找到可用的包管理器');
                return false;
            }
            
            this.outputChannel.appendLine(`🔧 使用包管理器: ${npmCommand}`);
            this.outputChannel.appendLine(`📂 工作目录: ${nodejsPath}`);
            
            // 执行安装命令
            const installCommand = `${npmCommand} install`;
            this.outputChannel.appendLine(`⚡ 执行命令: ${installCommand}`);
            
            const { stdout, stderr } = await execAsync(installCommand, {
                cwd: nodejsPath,
                timeout: 300000, // 5分钟超时
                env: await this.getEnvWithNodePath()
            });
            
            if (stdout) {
                this.outputChannel.appendLine('📋 安装输出:');
                this.outputChannel.appendLine(stdout);
            }
            
            if (stderr && !stderr.includes('WARN')) {
                this.outputChannel.appendLine('⚠️ 安装警告:');
                this.outputChannel.appendLine(stderr);
            }
            
            // 验证安装结果
            const nodeModulesPath = path.join(nodejsPath, 'node_modules');
            if (await fs.pathExists(nodeModulesPath)) {
                this.outputChannel.appendLine('✅ 项目依赖安装完成');
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
    }

    /**
     * 获取 npm 命令
     */
    private async getNpmCommand(): Promise<string | null> {
        // 首先尝试便携版 Node.js 的 npm
        const portableNpm = await this.getPortableNpm();
        if (portableNpm) {
            return portableNpm;
        }
        
        // 然后尝试系统 npm
        const systemCommands = ['npm', 'pnpm', 'yarn'];
        for (const cmd of systemCommands) {
            try {
                await execAsync(`${cmd} --version`);
                this.outputChannel.appendLine(`✅ 找到系统包管理器: ${cmd}`);
                return cmd;
            } catch (error) {
                // 继续尝试下一个
            }
        }
        
        this.outputChannel.appendLine('❌ 未找到可用的包管理器');
        return null;
    }

    /**
     * 获取便携版 npm
     */
    private async getPortableNpm(): Promise<string | null> {
        const portableDir = path.join(this.context.extensionPath, this.PORTABLE_NODE_DIR);
        const isWindows = os.platform() === 'win32';
        const npmExecutable = isWindows ? 'npm.cmd' : 'npm';
        
        const possiblePaths = [
            path.join(portableDir, 'node', 'bin', npmExecutable),
            path.join(portableDir, 'node', npmExecutable),
            path.join(portableDir, 'bin', npmExecutable),
            path.join(portableDir, npmExecutable)
        ];
        
        for (const npmPath of possiblePaths) {
            if (await fs.pathExists(npmPath)) {
                try {
                    await execAsync(`"${npmPath}" --version`);
                    this.outputChannel.appendLine(`✅ 找到便携版 npm: ${npmPath}`);
                    return `"${npmPath}"`;
                } catch (error) {
                    // 继续尝试下一个路径
                }
            }
        }
        
        return null;
    }

    /**
     * 获取包含 Node.js 路径的环境变量
     */
    private async getEnvWithNodePath(): Promise<NodeJS.ProcessEnv> {
        const env = { ...process.env };
        
        // 添加便携版 Node.js 到 PATH
        const portableDir = path.join(this.context.extensionPath, this.PORTABLE_NODE_DIR);
        const binPaths = [
            path.join(portableDir, 'node', 'bin'),
            path.join(portableDir, 'node'),
            path.join(portableDir, 'bin'),
            portableDir
        ];
        
        const existingPath = env.PATH || env.Path || '';
        const newPath = binPaths.join(path.delimiter) + path.delimiter + existingPath;
        env.PATH = newPath;
        env.Path = newPath; // Windows 兼容性
        
        return env;
    }

    /**
     * 获取 Node.js 可执行文件名
     */
    private getNodeExecutableName(): string {
        return os.platform() === 'win32' ? 'node.exe' : 'node';
    }

    /**
     * HTTP GET 请求
     */
    private async httpGet(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https:') ? https : http;
            
            protocol.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // 处理重定向
                    if (response.headers.location) {
                        this.httpGet(response.headers.location)
                            .then(resolve)
                            .catch(reject);
                        return;
                    }
                }
                
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }
                
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => resolve(data));
            }).on('error', reject);
        });
    }

    /**
     * 格式化字节数
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 显示手动安装指南
     */
    private async showManualInstallGuide(): Promise<void> {
        const message = `
🤖 自动安装失败 - 手动安装指南

📋 **自动安装尝试了以下步骤但失败了：**
1. 检查系统 Node.js 环境
2. 检查便携版 Node.js
3. 自动下载最新 LTS 版本
4. 解压并配置环境
5. 安装项目依赖

💡 **手动解决方案：**

**方案1: 安装系统 Node.js (推荐)**
1. 访问 https://nodejs.org/
2. 下载并安装 LTS 版本 (>= ${this.MIN_NODE_VERSION})
3. 确保添加到系统 PATH
4. 重启 VS Code
5. 重新尝试使用扩展

**方案2: 手动下载便携版**
1. 访问 https://nodejs.org/dist/
2. 下载适合您系统的便携版
3. 解压到扩展目录: ${path.join(this.context.extensionPath, this.PORTABLE_NODE_DIR)}
4. 重新尝试使用扩展

**方案3: 手动安装依赖**
1. 确保系统有 Node.js
2. 打开终端，执行：
   cd "${path.join(this.context.extensionPath, 'nodejs')}"
   npm install

🔧 **常见问题：**
- 网络连接问题：检查防火墙和代理设置
- 权限问题：在管理员模式下运行 VS Code
- 磁盘空间不足：确保有足够的存储空间

安装完成后，请重新尝试使用扩展功能。
        `;
        
        this.outputChannel.appendLine(message);
        
        const action = await vscode.window.showErrorMessage(
            '自动安装失败，需要手动处理',
            '查看详细说明',
            '打开 Node.js 官网',
            '打开扩展目录'
        );
        
        if (action === '查看详细说明') {
            this.outputChannel.show();
        } else if (action === '打开 Node.js 官网') {
            vscode.env.openExternal(vscode.Uri.parse('https://nodejs.org/'));
        } else if (action === '打开扩展目录') {
            vscode.env.openExternal(vscode.Uri.file(this.context.extensionPath));
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