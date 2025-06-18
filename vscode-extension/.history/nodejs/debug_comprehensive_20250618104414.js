/**
 * @file debug_comprehensive.js
 * @description 综合诊断工具
 * 同时检查依赖和网络问题，全面诊断图表功能
 */
const dependencyChecker = require('./debug_dependencies');
const networkChecker = require('./debug_network_connectivity');

/**
 * @function main
 * @description 主函数
 */
async function main() {
  console.log('🔍 图表功能综合诊断工具');
  console.log('==========================\n');

  let overallStatus = 'good';
  const issues = [];
  const solutions = [];

  // 第一步：检查依赖
  console.log('步骤 1/2: 检查项目依赖');
  console.log('========================');
  
  try {
    const packageCheck = dependencyChecker.checkPackageJson();
    if (!packageCheck.hasDependencies) {
      overallStatus = 'bad';
      issues.push('❌ package.json缺少dependencies字段');
      solutions.push('1. 更新package.json文件，添加必要依赖');
      solutions.push('2. 运行 npm install 安装依赖');
    }

    const graphDiagnosis = dependencyChecker.diagnoseGraphFeature();
    if (!graphDiagnosis.chartFunctionWorking) {
      overallStatus = 'bad';
      issues.push(`❌ 图表功能依赖缺失: ${graphDiagnosis.missingDependencies.join(', ')}`);
    } else {
      console.log('✅ 图表功能依赖检查通过');
    }
  } catch (error) {
    overallStatus = 'bad';
    issues.push(`❌ 依赖检查失败: ${error.message}`);
  }

  console.log('\n');

  // 第二步：检查网络连接（只有在依赖正常时才进行）
  if (overallStatus !== 'bad') {
    console.log('步骤 2/2: 检查网络连接');
    console.log('========================');
    
    try {
      const connectivityResult = await networkChecker.checkKrokiConnectivity();
      
      if (connectivityResult.accessible) {
        console.log('✅ 网络连接检查通过');
        
        // 进行图表转换测试
        const conversionResult = await networkChecker.testChartConversion();
        if (!conversionResult.success) {
          overallStatus = 'partial';
          issues.push('⚠️  网络可达但图表转换失败');
          solutions.push('3. 稍后重试或临时禁用图表功能');
        }
      } else {
        overallStatus = overallStatus === 'good' ? 'partial' : 'bad';
        issues.push('❌ 网络连接失败');
        solutions.push('3. 检查网络连接和防火墙设置');
        solutions.push('4. 配置代理服务器（如果需要）');
        solutions.push('5. 临时禁用图表功能');
      }
    } catch (error) {
      overallStatus = overallStatus === 'good' ? 'partial' : 'bad';
      issues.push(`❌ 网络检查失败: ${error.message}`);
    }
  } else {
    console.log('步骤 2/2: 跳过网络检查（依赖问题未解决）');
    console.log('=======================================');
    solutions.push('请先解决依赖问题，然后重新运行此诊断工具');
  }

  // 生成最终报告
  console.log('\n📋 综合诊断报告');
  console.log('================');
  
  const statusEmoji = {
    'good': '✅',
    'partial': '⚠️',
    'bad': '❌'
  };
  
  const statusText = {
    'good': '正常',
    'partial': '部分问题',
    'bad': '存在问题'
  };

  console.log(`整体状态: ${statusEmoji[overallStatus]} ${statusText[overallStatus]}`);
  console.log(`检查时间: ${new Date().toISOString()}`);

  if (issues.length > 0) {
    console.log('\n发现的问题:');
    issues.forEach(issue => console.log(`  ${issue}`));
  }

  if (solutions.length > 0) {
    console.log('\n建议的解决方案:');
    solutions.forEach((solution, index) => console.log(`  ${solution}`));
  }

  // 根据状态给出特定建议
  console.log('\n💡 下一步操作建议:');
  switch (overallStatus) {
    case 'good':
      console.log('  ✅ 图表功能应该可以正常工作');
      console.log('  如果仍然遇到问题，请检查具体的错误信息');
      break;
    case 'partial':
      console.log('  ⚠️  图表功能可能不稳定');
      console.log('  建议先解决发现的问题，或临时禁用图表功能');
      break;
    case 'bad':
      console.log('  ❌ 图表功能无法正常工作');
      console.log('  请按照上述解决方案逐一解决问题');
      console.log('  或在配置中设置 charts.enabled: false 禁用图表功能');
      break;
  }

  console.log('\n🔧 快速修复命令:');
  console.log('  npm install                    # 安装依赖');
  console.log('  npm run check-deps            # 重新检查依赖');
  console.log('  npm run check-network         # 重新检查网络');

  return overallStatus;
}

// 如果直接运行此脚本
if (require.main === module) {
  main().then(status => {
    const exitCode = status === 'good' ? 0 : 1;
    process.exit(exitCode);
  }).catch(error => {
    console.error('诊断工具运行出错:', error.message);
    process.exit(1);
  });
}

module.exports = { main }; 