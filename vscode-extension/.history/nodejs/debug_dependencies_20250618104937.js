/**
 * @file debug_dependencies.js
 * @description 依赖项检查工具
 * 用于检测项目依赖是否完整，特别是可能被全局安装但本地缺失的包
 */
const fs = require('fs');
const path = require('path');

/**
 * @description 项目实际需要的依赖列表
 * 通过分析代码中的require语句得出
 */
const REQUIRED_DEPENDENCIES = {
  // 生产环境依赖
  dependencies: {
    'axios': '^1.0.0',           // HTTP客户端，图表功能必需
    'fs-extra': '^11.0.0',       // 文件系统扩展
    'glob': '^8.0.0',            // 文件匹配模式
    'docx': '^8.0.0',            // Word文档生成
    'markdown-it': '^13.0.0',    // Markdown解析器
    'cheerio': '^1.0.0',         // HTML解析器
    'opencc-js': '^1.0.5',       // 简繁体转换
    'js-yaml': '^4.0.0',         // YAML解析器
    'yargs': '^17.0.0',          // 命令行参数解析
    'inquirer': '^9.0.0'         // 交互式命令行
  },
  // 开发环境依赖
  devDependencies: {}
};

/**
 * @function checkDependency
 * @description 检查单个依赖是否可用
 * @param {string} packageName - 包名
 * @returns {Object} - 检查结果
 */
function checkDependency(packageName) {
  const result = {
    name: packageName,
    available: false,
    location: null,
    version: null,
    error: null
  };

  try {
    // 尝试加载模块
    const modulePath = require.resolve(packageName);
    result.available = true;
    result.location = modulePath;
    
    // 尝试获取版本信息
    try {
      const packageJsonPath = path.join(path.dirname(modulePath), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        result.version = packageJson.version;
      }
    } catch (versionError) {
      // 版本信息获取失败不影响主要检查
    }
    
  } catch (error) {
    result.available = false;
    result.error = error.message;
    
    if (error.code === 'MODULE_NOT_FOUND') {
      result.error = '模块未找到，可能未安装';
    }
  }

  return result;
}

/**
 * @function detectPackageManager
 * @description 检测项目使用的包管理器
 * @returns {Object} - 包管理器信息
 */
function detectPackageManager() {
  const result = {
    manager: 'unknown',
    lockFile: null,
    hasLockFile: false,
    workspaceRoot: null
  };

  // 检查不同包管理器的lock文件
  const packageManagers = [
    { name: 'pnpm', lockFile: 'pnpm-lock.yaml', workspaceFile: 'pnpm-workspace.yaml' },
    { name: 'yarn', lockFile: 'yarn.lock', workspaceFile: 'package.json' },
    { name: 'npm', lockFile: 'package-lock.json', workspaceFile: null }
  ];

  // 先检查当前目录
  for (const pm of packageManagers) {
    const lockPath = path.join(__dirname, pm.lockFile);
    if (fs.existsSync(lockPath)) {
      result.manager = pm.name;
      result.lockFile = pm.lockFile;
      result.hasLockFile = true;
      result.workspaceRoot = __dirname;
      return result;
    }
  }

  // 检查上级目录（workspace的情况）
  const parentDir = path.dirname(__dirname);
  for (const pm of packageManagers) {
    const lockPath = path.join(parentDir, pm.lockFile);
    if (fs.existsSync(lockPath)) {
      result.manager = pm.name;
      result.lockFile = pm.lockFile;
      result.hasLockFile = true;
      result.workspaceRoot = parentDir;
      return result;
    }
  }

  // 默认假设使用npm
  result.manager = 'npm';
  return result;
}

/**
 * @function checkPackageJson
 * @description 检查package.json文件
 * @returns {Object} - 检查结果
 */
function checkPackageJson() {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const result = {
    exists: false,
    hasDependencies: false,
    dependencies: {},
    recommendations: [],
    packageManager: detectPackageManager()
  };

  try {
    if (fs.existsSync(packageJsonPath)) {
      result.exists = true;
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      result.hasDependencies = !!(packageJson.dependencies || packageJson.devDependencies);
      result.dependencies = {
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {}
      };
      
      if (!result.hasDependencies) {
        result.recommendations.push('❌ package.json 缺少 dependencies 字段');
        result.recommendations.push('这可能导致依赖未被正确安装');
      }
      
      // 根据检测到的包管理器给出建议
      const pm = result.packageManager;
      if (pm.hasLockFile) {
        result.recommendations.push(`✅ 检测到 ${pm.manager} 包管理器 (${pm.lockFile})`);
        if (pm.workspaceRoot !== __dirname) {
          result.recommendations.push(`📁 Workspace根目录: ${pm.workspaceRoot}`);
        }
      } else {
        result.recommendations.push(`⚠️  未找到lock文件，建议使用 ${pm.manager} 安装依赖`);
      }
    } else {
      result.recommendations.push('❌ package.json 文件不存在');
    }
  } catch (error) {
    result.recommendations.push(`❌ 读取 package.json 失败: ${error.message}`);
  }

  return result;
}

/**
 * @function generatePackageJson
 * @description 生成完整的package.json
 * @returns {Object} - 生成的package.json内容
 */
function generatePackageJson() {
  const existingPackageJsonPath = path.join(__dirname, 'package.json');
  let existingPackageJson = {};
  
  try {
    if (fs.existsSync(existingPackageJsonPath)) {
      existingPackageJson = JSON.parse(fs.readFileSync(existingPackageJsonPath, 'utf8'));
    }
  } catch (error) {
    console.warn('读取现有package.json失败:', error.message);
  }

  return {
    ...existingPackageJson,
    ...REQUIRED_DEPENDENCIES,
    dependencies: {
      ...existingPackageJson.dependencies,
      ...REQUIRED_DEPENDENCIES.dependencies
    },
    devDependencies: {
      ...existingPackageJson.devDependencies,
      ...REQUIRED_DEPENDENCIES.devDependencies
    }
  };
}

/**
 * @function diagnoseGraphFeature
 * @description 专门诊断图表功能相关的依赖
 * @returns {Object} - 诊断结果
 */
function diagnoseGraphFeature() {
  const graphDependencies = ['axios', 'fs-extra', 'cheerio'];
  const result = {
    chartFunctionWorking: true,
    missingDependencies: [],
    availableDependencies: [],
    recommendations: []
  };

  console.log('\n📊 专项检查：图表功能依赖');
  console.log('===============================');

  for (const dep of graphDependencies) {
    const check = checkDependency(dep);
    console.log(`${check.available ? '✅' : '❌'} ${dep}: ${check.available ? `已安装 (${check.version || '版本未知'})` : check.error}`);
    
    if (check.available) {
      result.availableDependencies.push(dep);
    } else {
      result.missingDependencies.push(dep);
      result.chartFunctionWorking = false;
    }
  }

  if (!result.chartFunctionWorking) {
    result.recommendations.push('❌ 图表功能无法正常工作，缺少必要依赖');
    const pm = detectPackageManager();
    const installCommand = pm.manager === 'pnpm' ? 'pnpm install' : 
                          pm.manager === 'yarn' ? 'yarn install' : 'npm install';
    result.recommendations.push(`建议运行: ${installCommand}`);
  } else {
    result.recommendations.push('✅ 图表功能相关依赖完整');
  }

  return result;
}

/**
 * @function main
 * @description 主函数
 */
async function main() {
  console.log('🔍 Node.js项目依赖诊断工具');
  console.log('============================\n');

  // 检查package.json
  console.log('📦 检查 package.json 文件');
  console.log('========================');
  const packageCheck = checkPackageJson();
  console.log(`存在: ${packageCheck.exists ? '✅' : '❌'}`);
  console.log(`包含依赖: ${packageCheck.hasDependencies ? '✅' : '❌'}`);
  
  if (packageCheck.recommendations.length > 0) {
    console.log('\n建议:');
    packageCheck.recommendations.forEach(rec => console.log(`  ${rec}`));
  }

  // 检查所有依赖
  console.log('\n🔍 检查项目依赖');
  console.log('================');
  
  const missingDeps = [];
  const availableDeps = [];
  
  for (const [depName, version] of Object.entries(REQUIRED_DEPENDENCIES.dependencies)) {
    const check = checkDependency(depName);
    console.log(`${check.available ? '✅' : '❌'} ${depName}: ${check.available ? `已安装 (${check.version || '版本未知'})` : check.error}`);
    
    if (check.available) {
      availableDeps.push(depName);
    } else {
      missingDeps.push(depName);
    }
  }

  // 专项检查图表功能
  const graphDiagnosis = diagnoseGraphFeature();

  // 生成报告
  console.log('\n📋 诊断报告');
  console.log('============');
  console.log(`总依赖数: ${Object.keys(REQUIRED_DEPENDENCIES.dependencies).length}`);
  console.log(`已安装: ${availableDeps.length}`);
  console.log(`缺失: ${missingDeps.length}`);
  
  if (missingDeps.length > 0) {
    console.log('\n❌ 缺失的依赖:');
    missingDeps.forEach(dep => console.log(`  - ${dep}`));
    
    console.log('\n🔧 解决方案:');
    console.log('1. 修复 package.json 文件');
    console.log('2. 安装缺失的依赖');
    console.log('3. 重新测试功能');
    
    // 生成修复的package.json
    const fixedPackageJson = generatePackageJson();
    const fixedPackageJsonPath = path.join(__dirname, 'package_fixed.json');
    
    try {
      fs.writeFileSync(fixedPackageJsonPath, JSON.stringify(fixedPackageJson, null, 2), 'utf8');
      console.log(`\n✅ 已生成修复后的 package.json: ${fixedPackageJsonPath}`);
      console.log('请执行以下步骤:');
      console.log('1. 备份当前的 package.json (如果需要)');
      console.log('2. 替换 package.json: mv package_fixed.json package.json');
      console.log('3. 安装依赖: npm install');
    } catch (error) {
      console.error('生成修复文件失败:', error.message);
    }
  } else {
    console.log('\n✅ 所有依赖都已正确安装');
  }

  // 图表功能特别提示
  if (!graphDiagnosis.chartFunctionWorking) {
    console.log('\n⚠️  关于图表功能失败的可能原因:');
    console.log('1. 依赖缺失（本诊断已发现）');
    console.log('2. 网络连接问题（运行 debug_network_connectivity.js 检查）');
    console.log('3. 配置问题（检查 charts.enabled 设置）');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('诊断过程中发生错误:', error.message);
    process.exit(1);
  });
}

module.exports = {
  checkDependency,
  checkPackageJson,
  diagnoseGraphFeature,
  REQUIRED_DEPENDENCIES
}; 