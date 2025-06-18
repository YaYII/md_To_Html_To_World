#!/usr/bin/env node

/**
 * 版本号自动更新脚本
 * 在打包前自动增加package.json中的版本号
 */

const fs = require('fs');
const path = require('path');

// 读取package.json文件
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = require(packageJsonPath);

// 获取当前版本号
const currentVersion = packageJson.version;
console.log(`当前版本号: ${currentVersion}`);

// 解析版本号
const versionParts = currentVersion.split('.');
const major = parseInt(versionParts[0], 10);
const minor = parseInt(versionParts[1], 10);
const patch = parseInt(versionParts[2], 10);

// 增加补丁版本号
const newPatch = patch + 1 ;
const newVersion = `${major}.${minor}.${newPatch}`;

// 更新版本号
packageJson.version = newVersion;

// 写回package.json文件
fs.writeFileSync(
  packageJsonPath,
  JSON.stringify(packageJson, null, 2) + '\n',
  'utf8'
);

console.log(`版本号已更新: ${currentVersion} -> ${newVersion}`); 