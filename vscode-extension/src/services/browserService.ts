/**
 * @file browserService.ts
 * @description 浏览器服务 - 智能检测默认浏览器并启动
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ErrorHandler } from '../utils/errorHandler';
import { execWithDetails } from '../utils/execUtils';
import { notifyError } from '../utils/notify';

/**
 * 浏览器信息接口
 */
interface BrowserInfo {
    name: string;
    bundleId?: string;
    appName?: string;
    executable?: string;
}

/**
 * 浏览器服务类 - 智能检测版本
 */
export class BrowserService {
    private errorHandler: ErrorHandler;
    private availableBrowsers: BrowserInfo[] = [];

    constructor() {
        this.errorHandler = new ErrorHandler();
        this.initializeBrowsers();
    }

    /**
     * 初始化可用浏览器列表
     */
    private initializeBrowsers(): void {
        const platform = process.platform;
        
        if (platform === 'darwin') {
            this.availableBrowsers = [
                { name: 'Google Chrome', bundleId: 'com.google.Chrome', appName: 'Google Chrome' },
                { name: '豆包浏览器', bundleId: 'com.bot.pc.doubao', appName: 'Doubao' },
                { name: 'Safari', bundleId: 'com.apple.Safari', appName: 'Safari' },
                { name: 'Firefox', bundleId: 'org.mozilla.firefox', appName: 'Firefox' },
                { name: 'Microsoft Edge', bundleId: 'com.microsoft.edgemac', appName: 'Microsoft Edge' },
                { name: 'Arc', bundleId: 'company.thebrowser.Browser', appName: 'Arc' },
                { name: 'Brave', bundleId: 'com.brave.Browser', appName: 'Brave Browser' }
            ];
        } else if (platform === 'win32') {
            this.availableBrowsers = [
                { name: 'Google Chrome', executable: 'chrome' },
                { name: 'Microsoft Edge', executable: 'msedge' },
                { name: 'Firefox', executable: 'firefox' },
                { name: 'Opera', executable: 'opera' }
            ];
        } else if (platform === 'linux') {
            this.availableBrowsers = [
                { name: 'Google Chrome', executable: 'google-chrome' },
                { name: 'Firefox', executable: 'firefox' },
                { name: 'Chromium', executable: 'chromium-browser' }
            ];
        }
    }

    /**
     * 在浏览器中直接打开Markdown文件
     * @param filePath Markdown文件路径
     */
    async openInBrowser(filePath: string): Promise<void> {
        try {
            // 获取文件的绝对路径
            const absolutePath = path.resolve(filePath);
            const fileUrl = `file://${absolutePath.replace(/\\/g, '/')}`;
            console.log('准备打开文件:', absolutePath);
            console.log('文件URL:', fileUrl);
            
            // 检测默认浏览器
            const defaultBrowser = await this.detectDefaultBrowser();
            console.log('检测到的默认浏览器:', defaultBrowser);
            
            // 尝试用默认浏览器打开
            const success = await this.openWithBrowser(fileUrl, defaultBrowser);
            
            if (success) {
                vscode.window.showInformationMessage(
                    `文件已在${defaultBrowser?.name || '浏览器'}中打开: ${path.basename(filePath)}`
                );
            } else {
                // 如果默认浏览器失败，提供其他选择
                await this.handleOpenFailure(fileUrl);
            }

        } catch (error) {
            await this.errorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                '在浏览器中打开失败'
            );
        }
    }

    /**
     * 检测默认浏览器
     */
    private async detectDefaultBrowser(): Promise<BrowserInfo | null> {
        const platform = process.platform;
        
        try {
            let defaultBrowser: BrowserInfo | null = null;
            
            if (platform === 'darwin') {
                defaultBrowser = await this.detectDefaultBrowserMacOS();
            } else if (platform === 'win32') {
                defaultBrowser = await this.detectDefaultBrowserWindows();
            } else if (platform === 'linux') {
                defaultBrowser = await this.detectDefaultBrowserLinux();
            }
            
            // 检查是否为真正的浏览器
            if (defaultBrowser && this.isActualBrowser(defaultBrowser)) {
                return defaultBrowser;
            } else if (defaultBrowser) {
                console.log(`检测到的默认应用 "${defaultBrowser.name}" 不是真正的浏览器，将寻找备用浏览器`);
                // 如果默认应用不是浏览器，尝试找到系统中可用的浏览器
                return await this.findBestAvailableBrowser();
            }
            
        } catch (error) {
            console.log('检测默认浏览器失败:', error);
        }
        
        return null;
    }

    /**
     * 检查是否为真正的浏览器
     */
    private isActualBrowser(browser: BrowserInfo): boolean {
        // 已知的非浏览器应用（不包括豆包，因为豆包是基于Google开源浏览器的真正浏览器）
        const nonBrowserApps = [
            'com.tencent.xinWeChat', // 微信
            'com.tencent.qq', // QQ
            'com.apple.TextEdit', // 文本编辑器
            'com.microsoft.VSCode', // VS Code
            'com.apple.dt.Xcode' // Xcode
        ];
        
        // 检查Bundle ID
        if (browser.bundleId && nonBrowserApps.includes(browser.bundleId)) {
            return false;
        }
        
        // 检查应用名称（不包括豆包/Doubao，因为它们是真正的浏览器）
        const nonBrowserNames = ['微信', 'WeChat', 'QQ', 'TextEdit', 'VS Code', 'Xcode'];
        if (browser.name && nonBrowserNames.some(name => browser.name.includes(name))) {
            return false;
        }
        
        return true;
    }

    /**
     * 查找系统中最佳可用的浏览器
     */
    private async findBestAvailableBrowser(): Promise<BrowserInfo | null> {
        const platform = process.platform;
        
        if (platform === 'darwin') {
            // 按优先级检查浏览器是否安装
            const preferredOrder = [
                'com.google.Chrome',
                'com.bot.pc.doubao', // 豆包浏览器（基于Google开源项目）
                'com.apple.Safari',
                'org.mozilla.firefox',
                'com.microsoft.edgemac'
            ];
            
            for (const bundleId of preferredOrder) {
                const browser = this.availableBrowsers.find(b => b.bundleId === bundleId);
                if (browser && await this.isBrowserInstalled(browser)) {
                    console.log(`找到可用浏览器: ${browser.name}`);
                    return browser;
                }
            }
        } else if (platform === 'win32') {
            // Windows平台检查
            const preferredOrder = ['chrome', 'msedge', 'firefox'];
            for (const executable of preferredOrder) {
                const browser = this.availableBrowsers.find(b => b.executable === executable);
                if (browser && await this.isBrowserInstalled(browser)) {
                    return browser;
                }
            }
        } else if (platform === 'linux') {
            // Linux平台检查
            const preferredOrder = ['google-chrome', 'firefox', 'chromium-browser'];
            for (const executable of preferredOrder) {
                const browser = this.availableBrowsers.find(b => b.executable === executable);
                if (browser && await this.isBrowserInstalled(browser)) {
                    return browser;
                }
            }
        }
        
        return null;
    }

    /**
     * 检查浏览器是否已安装
     */
    private async isBrowserInstalled(browser: BrowserInfo): Promise<boolean> {
        const platform = process.platform;
        
        try {
            if (platform === 'darwin') {
                if (browser.bundleId) {
                    const result = await execWithDetails(`osascript -e 'tell application "Finder" to get application file id "${browser.bundleId}"'`);
                    return result.success;
                } else if (browser.appName) {
                    const result = await execWithDetails(`ls "/Applications/${browser.appName}.app" 2>/dev/null`);
                    return result.success;
                }
            } else if (platform === 'win32') {
                if (browser.executable) {
                    const result = await execWithDetails(`where ${browser.executable}`);
                    return result.success;
                }
            } else if (platform === 'linux') {
                if (browser.executable) {
                    const result = await execWithDetails(`which ${browser.executable}`);
                    return result.success;
                }
            }
        } catch (error) {
            console.log(`检查浏览器 ${browser.name} 安装状态失败:`, error);
        }
        
        return false;
    }

    /**
     * 检测macOS默认浏览器
     */
    private async detectDefaultBrowserMacOS(): Promise<BrowserInfo | null> {
        try {
            // 获取HTTP协议的默认处理程序
            const result = await execWithDetails('defaults read com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers | grep -A1 -B1 "LSHandlerURLScheme.*http" | grep "LSHandlerRoleAll" | head -1');
            
            if (result.success && result.stdout) {
                // 提取Bundle ID
                const match = result.stdout.match(/LSHandlerRoleAll\s*=\s*"([^"]+)"/);
                if (match) {
                    const bundleId = match[1];
                    console.log('检测到的Bundle ID:', bundleId);
                    
                    // 查找对应的浏览器
                    const browser = this.availableBrowsers.find(b => b.bundleId === bundleId);
                    if (browser) {
                        return browser;
                    }
                    
                    // 如果不在列表中，尝试获取应用名称
                    const appInfo = await this.getBrowserInfoByBundleId(bundleId);
                    if (appInfo) {
                        return appInfo;
                    }
                }
            }
            
            // 如果上面的方法失败，尝试另一种方法（直接读取完整 LSHandlers，无需 Python）
            const altResult = await execWithDetails('defaults read com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers 2>/dev/null || echo ""');
            if (altResult.success && altResult.stdout) {
                // 解析plist输出
                return this.parseMacOSDefaultBrowser(altResult.stdout);
            }
            
        } catch (error) {
            console.log('macOS浏览器检测出错:', error);
        }
        
        return null;
    }

    /**
     * 通过Bundle ID获取浏览器信息
     */
    private async getBrowserInfoByBundleId(bundleId: string): Promise<BrowserInfo | null> {
        try {
            const result = await execWithDetails(`osascript -e 'tell application "Finder" to get name of application file id "${bundleId}"'`);
            if (result.success && result.stdout) {
                const appName = result.stdout.trim();
                return {
                    name: appName,
                    bundleId: bundleId,
                    appName: appName
                };
            }
        } catch (error) {
            console.log('获取应用信息失败:', error);
        }
        return null;
    }

    /**
     * 解析macOS默认浏览器（备用方法）
     */
    private parseMacOSDefaultBrowser(plistOutput: string): BrowserInfo | null {
        // 简单的正则解析，寻找HTTP协议处理程序
        const lines = plistOutput.split('\n');
        let foundHttp = false;
        let bundleId = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes('LSHandlerURLScheme') && line.includes('http')) {
                foundHttp = true;
            } else if (foundHttp && line.includes('LSHandlerRoleAll')) {
                const match = line.match(/LSHandlerRoleAll\s*=\s*"([^"]+)"/);
                if (match) {
                    bundleId = match[1];
                    break;
                }
            }
        }
        
        if (bundleId) {
            const browser = this.availableBrowsers.find(b => b.bundleId === bundleId);
            return browser || { name: bundleId, bundleId: bundleId, appName: bundleId };
        }
        
        return null;
    }

    /**
     * 检测Windows默认浏览器
     */
    private async detectDefaultBrowserWindows(): Promise<BrowserInfo | null> {
        try {
            const result = await execWithDetails('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice" /v ProgId');
            if (result.success && result.stdout) {
                const match = result.stdout.match(/ProgId\s+REG_SZ\s+(.+)/);
                if (match) {
                    const progId = match[1].trim();
                    return this.mapWindowsProgIdToBrowser(progId);
                }
            }
        } catch (error) {
            console.log('Windows浏览器检测出错:', error);
        }
        return null;
    }

    /**
     * 将Windows ProgId映射到浏览器
     */
    private mapWindowsProgIdToBrowser(progId: string): BrowserInfo | null {
        const mapping: { [key: string]: BrowserInfo } = {
            'ChromeHTML': { name: 'Google Chrome', executable: 'chrome' },
            'MSEdgeHTM': { name: 'Microsoft Edge', executable: 'msedge' },
            'FirefoxURL': { name: 'Firefox', executable: 'firefox' },
            'OperaStable': { name: 'Opera', executable: 'opera' }
        };
        
        return mapping[progId] || { name: progId, executable: 'start' };
    }

    /**
     * 检测Linux默认浏览器
     */
    private async detectDefaultBrowserLinux(): Promise<BrowserInfo | null> {
        try {
            const result = await execWithDetails('xdg-settings get default-web-browser');
            if (result.success && result.stdout) {
                const desktopFile = result.stdout.trim();
                return this.mapLinuxDesktopFileToBrowser(desktopFile);
            }
        } catch (error) {
            console.log('Linux浏览器检测出错:', error);
        }
        return null;
    }

    /**
     * 将Linux desktop文件映射到浏览器
     */
    private mapLinuxDesktopFileToBrowser(desktopFile: string): BrowserInfo | null {
        const mapping: { [key: string]: BrowserInfo } = {
            'google-chrome.desktop': { name: 'Google Chrome', executable: 'google-chrome' },
            'firefox.desktop': { name: 'Firefox', executable: 'firefox' },
            'chromium.desktop': { name: 'Chromium', executable: 'chromium-browser' }
        };
        
        return mapping[desktopFile] || { name: desktopFile, executable: 'xdg-open' };
    }

    /**
     * 用指定浏览器打开URL
     */
    private async openWithBrowser(fileUrl: string, browser: BrowserInfo | null): Promise<boolean> {
        if (!browser) {
            console.log('没有检测到默认浏览器，使用系统默认方式');
            return await this.openWithSystemDefault(fileUrl);
        }

        const platform = process.platform;
        let command = '';

        try {
            if (platform === 'darwin') {
                if (browser.appName) {
                    command = `open -a "${browser.appName}" "${fileUrl}"`;
                } else if (browser.bundleId) {
                    command = `open -b "${browser.bundleId}" "${fileUrl}"`;
                } else {
                    return await this.openWithSystemDefault(fileUrl);
                }
            } else if (platform === 'win32') {
                if (browser.executable) {
                    command = `start ${browser.executable} "${fileUrl}"`;
                } else {
                    return await this.openWithSystemDefault(fileUrl);
                }
            } else if (platform === 'linux') {
                if (browser.executable) {
                    command = `${browser.executable} "${fileUrl}"`;
                } else {
                    return await this.openWithSystemDefault(fileUrl);
                }
            }

            console.log('执行浏览器命令:', command);
            const result = await execWithDetails(command);
            
            if (result.success) {
                console.log('浏览器启动成功');
                await new Promise(resolve => setTimeout(resolve, 1500));
                return true;
            } else {
                console.log('浏览器启动失败:', result.stderr);
                return false;
            }
            
        } catch (error) {
            console.log('浏览器启动异常:', error);
            return false;
        }
    }

    /**
     * 使用系统默认方式打开
     */
    private async openWithSystemDefault(fileUrl: string): Promise<boolean> {
        const platform = process.platform;
        let command = '';

        if (platform === 'darwin') {
            command = `open "${fileUrl}"`;
        } else if (platform === 'win32') {
            command = `start "" "${fileUrl}"`;
        } else if (platform === 'linux') {
            command = `xdg-open "${fileUrl}"`;
        }

        try {
            console.log('使用系统默认方式打开:', command);
            const result = await execWithDetails(command);
            return result.success;
        } catch (error) {
            console.log('系统默认方式打开失败:', error);
            return false;
        }
    }

    /**
     * 处理打开失败的情况
     */
    private async handleOpenFailure(fileUrl: string): Promise<void> {
        // 生产产品禁止错误弹窗：默认浏览器打开失败不弹窗，
        // 自动复制 file:// 链接到剪贴板 + 正常信息提示（用户可手动粘贴或选择其他浏览器）
        notifyError(`无法用默认浏览器打开文件（${fileUrl}），已复制 file:// 链接到剪贴板`);
        await vscode.env.clipboard.writeText(fileUrl);
        vscode.window.showInformationMessage('file://链接已复制，可粘贴到浏览器地址栏');
    }

    /**
     * 销毁服务
     */
    dispose(): void {
        // 没有需要清理的资源
    }
}
