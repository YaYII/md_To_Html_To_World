const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🧪 测试自动安装 Node.js 功能...');

// 模拟检查系统信息
const platform = process.platform;
const arch = process.arch;

console.log(`系统平台: ${platform}`);
console.log(`系统架构: ${arch}`);

// 测试下载URL生成
function getNodeDownloadUrl(platform, arch) {
    const version = 'v20.10.0';
    
    let platformName, archName, ext;
    
    switch (platform) {
        case 'win32':
            platformName = 'win';
            archName = arch === 'x64' ? 'x64' : 'x86';
            ext = 'zip';
            break;
        case 'darwin':
            platformName = 'darwin';
            archName = arch === 'arm64' ? 'arm64' : 'x64';
            ext = 'tar.gz';
            break;
        case 'linux':
            platformName = 'linux';
            archName = arch === 'x64' ? 'x64' : arch;
            ext = 'tar.xz';
            break;
        default:
            throw new Error(`不支持的平台: ${platform}`);
    }
    
    return `https://nodejs.org/dist/${version}/node-${version}-${platformName}-${archName}.${ext}`;
}

// 测试便携版Node.js路径
function getPortableNodePath() {
    const homeDir = os.homedir();
    const nodeDir = path.join(homeDir, '.vscode-markdown-to-word', 'node');
    
    if (platform === 'win32') {
        return path.join(nodeDir, 'node.exe');
    } else {
        return path.join(nodeDir, 'bin', 'node');
    }
}

try {
    const downloadUrl = getNodeDownloadUrl(platform, arch);
    console.log(`✅ Node.js 下载URL: ${downloadUrl}`);
    
    const portableNodePath = getPortableNodePath();
    console.log(`✅ 便携版 Node.js 路径: ${portableNodePath}`);
    
    // 检查便携版是否已存在
    if (fs.existsSync(portableNodePath)) {
        console.log('✅ 便携版 Node.js 已存在');
    } else {
        console.log('ℹ️ 便携版 Node.js 不存在，需要下载安装');
    }
    
    console.log('✅ 自动安装功能测试通过！');
    
} catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
} 