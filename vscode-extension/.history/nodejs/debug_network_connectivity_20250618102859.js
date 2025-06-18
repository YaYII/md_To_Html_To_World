/**
 * @file debug_network_connectivity.js
 * @description 网络连接诊断工具
 * 用于检测图表转换功能的网络依赖是否正常
 */
const axios = require('axios');
const { ConfigManager } = require('./src/utils/configManager');

/**
 * @function checkKrokiConnectivity
 * @description 检查Kroki服务连接状态
 * @param {string} url - Kroki服务URL
 * @returns {Promise<Object>} - 检查结果
 */
async function checkKrokiConnectivity(url = 'https://kroki.io') {
  const result = {
    url: url,
    accessible: false,
    responseTime: null,
    error: null,
    details: {}
  };

  const startTime = Date.now();
  
  try {
    console.log(`🌐 正在检查 ${url} 的连接状态...`);
    
    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500; // 接受4xx状态码
      }
    });
    
    result.accessible = true;
    result.responseTime = Date.now() - startTime;
    result.details.status = response.status;
    result.details.statusText = response.statusText;
    
    console.log(`✅ 连接成功! 响应时间: ${result.responseTime}ms`);
    
  } catch (error) {
    result.accessible = false;
    result.responseTime = Date.now() - startTime;
    result.error = error.message;
    
    if (error.code === 'ECONNABORTED') {
      console.log(`❌ 连接超时 (${result.responseTime}ms)`);
      result.details.reason = '连接超时';
    } else if (error.code === 'ENOTFOUND') {
      console.log(`❌ 域名解析失败`);
      result.details.reason = '域名解析失败，可能被防火墙阻挡';
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`❌ 连接被拒绝`);
      result.details.reason = '连接被拒绝，可能被防火墙阻挡';
    } else {
      console.log(`❌ 连接失败: ${error.message}`);
      result.details.reason = error.message;
    }
  }
  
  return result;
}

/**
 * @function testChartConversion
 * @description 测试图表转换功能
 * @param {string} url - Kroki服务URL
 * @returns {Promise<Object>} - 测试结果
 */
async function testChartConversion(url = 'https://kroki.io') {
  const result = {
    success: false,
    error: null,
    chartTypes: {}
  };

  // 测试不同类型的图表
  const testCharts = {
    mermaid: `graph TD
    A[开始] --> B[处理]
    B --> C[结束]`,
    
    plantuml: `@startuml
Alice -> Bob: Hello
Bob -> Alice: Hi
@enduml`
  };

  console.log('\n📊 测试图表转换功能...');
  
  for (const [chartType, chartCode] of Object.entries(testCharts)) {
    try {
      console.log(`🎨 测试 ${chartType} 图表转换...`);
      
      const response = await axios.post(
        `${url}/${chartType}/png`,
        {
          diagram_source: chartCode,
          diagram_options: {}
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000,
          responseType: 'arraybuffer'
        }
      );
      
      if (response.status === 200) {
        result.chartTypes[chartType] = {
          success: true,
          size: response.data.length
        };
        console.log(`✅ ${chartType} 转换成功 (${response.data.length} bytes)`);
      } else {
        result.chartTypes[chartType] = {
          success: false,
          error: `HTTP ${response.status}`
        };
        console.log(`❌ ${chartType} 转换失败: HTTP ${response.status}`);
      }
      
    } catch (error) {
      result.chartTypes[chartType] = {
        success: false,
        error: error.message
      };
      console.log(`❌ ${chartType} 转换失败: ${error.message}`);
    }
  }
  
  result.success = Object.values(result.chartTypes).some(r => r.success);
  return result;
}

/**
 * @function generateReport
 * @description 生成诊断报告
 * @param {Object} connectivityResult - 连接检查结果
 * @param {Object} conversionResult - 转换测试结果
 * @returns {Object} - 诊断报告
 */
function generateReport(connectivityResult, conversionResult) {
  const report = {
    timestamp: new Date().toISOString(),
    overall_status: 'unknown',
    connectivity: connectivityResult,
    conversion: conversionResult,
    recommendations: []
  };

  if (connectivityResult.accessible && conversionResult.success) {
    report.overall_status = 'good';
    report.recommendations.push('✅ 网络连接正常，图表功能完全可用');
  } else if (connectivityResult.accessible && !conversionResult.success) {
    report.overall_status = 'partial';
    report.recommendations.push('⚠️  网络可达但图表转换失败，可能是服务暂时不可用');
    report.recommendations.push('建议稍后重试或临时禁用图表功能');
  } else {
    report.overall_status = 'bad';
    report.recommendations.push('❌ 网络连接失败，无法使用图表功能');
    
    if (connectivityResult.details.reason) {
      report.recommendations.push(`原因: ${connectivityResult.details.reason}`);
    }
    
    report.recommendations.push('解决方案:');
    report.recommendations.push('1. 检查网络连接和防火墙设置');
    report.recommendations.push('2. 配置代理服务器（如果需要）');
    report.recommendations.push('3. 在配置文件中设置 charts.enabled: false 禁用图表功能');
  }

  return report;
}

/**
 * @function main
 * @description 主函数
 */
async function main() {
  console.log('🔍 Markdown转Word图表功能网络诊断工具');
  console.log('=====================================\n');

  try {
    // 加载配置
    const configManager = new ConfigManager();
    const config = configManager.getAll();
    const krokiUrl = config.charts?.kroki_url || 'https://kroki.io';
    
    console.log(`配置的Kroki URL: ${krokiUrl}`);
    console.log(`图表功能状态: ${config.charts?.enabled ? '启用' : '禁用'}\n`);

    // 检查网络连接
    const connectivityResult = await checkKrokiConnectivity(krokiUrl);
    
    // 测试图表转换
    const conversionResult = connectivityResult.accessible 
      ? await testChartConversion(krokiUrl)
      : { success: false, error: '网络不可达', chartTypes: {} };

    // 生成报告
    const report = generateReport(connectivityResult, conversionResult);
    
    console.log('\n📋 诊断报告');
    console.log('============');
    console.log(`整体状态: ${report.overall_status}`);
    console.log(`检查时间: ${report.timestamp}`);
    console.log('\n建议:');
    report.recommendations.forEach(rec => console.log(`  ${rec}`));
    
    // 如果网络有问题，提供配置修改建议
    if (report.overall_status === 'bad') {
      console.log('\n🔧 配置修改建议');
      console.log('================');
      console.log('创建或修改 config.yaml 文件，添加以下配置:');
      console.log(`
charts:
  enabled: false  # 禁用图表转换功能
  # 其他配置保持不变...
      `);
      
      // 创建网络友好配置文件
      const networkFriendlyConfig = configManager.createNetworkFriendlyConfig();
      const configPath = './config_no_charts.yaml';
      await configManager.saveToFile(configPath, networkFriendlyConfig);
      console.log(`✅ 已生成无图表功能的配置文件: ${configPath}`);
    }
    
  } catch (error) {
    console.error('❌ 诊断过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('全局错误:', error);
    process.exit(1);
  });
}

module.exports = {
  checkKrokiConnectivity,
  testChartConversion,
  generateReport
}; 