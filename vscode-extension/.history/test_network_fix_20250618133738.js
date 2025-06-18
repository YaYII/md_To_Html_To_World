const axios = require('axios');

console.log('🧪 测试网络检查修复...');

/**
 * 测试URL有效性
 */
async function testUrlValidity() {
    const testUrls = [
        'cd',  // 错误的URL
        'https://kroki.io',  // 正确的URL
        'http://invalid-url-test.com'  // 可能无效的URL
    ];

    console.log('📋 测试不同URL的有效性:');
    
    for (const url of testUrls) {
        try {
            console.log(`\n🔍 测试URL: "${url}"`);
            
            // 尝试创建axios请求
            const response = await axios.get(url, {
                timeout: 5000,
                validateStatus: function (status) {
                    return status < 500;
                }
            });
            
            console.log(`✅ URL有效 - 状态码: ${response.status}`);
            
        } catch (error) {
            if (error.message.includes('Invalid URL')) {
                console.log(`❌ URL无效 - ${error.message}`);
            } else if (error.code === 'ECONNABORTED') {
                console.log(`⏰ 连接超时 - ${error.message}`);
            } else if (error.code === 'ENOTFOUND') {
                console.log(`🔍 域名解析失败 - ${error.message}`);
            } else {
                console.log(`❌ 其他错误 - ${error.message}`);
            }
        }
    }
}

/**
 * 测试图表处理器的网络检查
 */
async function testChartProcessorNetworkCheck() {
    console.log('\n🎨 测试图表处理器网络检查...');
    
    // 模拟图表处理器的配置
    const configs = [
        {
            name: '错误配置 (cd)',
            charts: {
                enabled: true,
                kroki_url: 'cd'
            }
        },
        {
            name: '正确配置 (https://kroki.io)',
            charts: {
                enabled: true,
                kroki_url: 'https://kroki.io'
            }
        }
    ];

    for (const config of configs) {
        console.log(`\n📊 测试配置: ${config.name}`);
        
        try {
            const response = await axios.get(config.charts.kroki_url, {
                timeout: 5000,
                validateStatus: function (status) {
                    return status < 500;
                }
            });
            
            console.log(`✅ 网络检查成功 - 状态码: ${response.status}`);
            
        } catch (error) {
            if (error.message.includes('Invalid URL')) {
                console.log(`❌ URL无效错误 - 这就是之前的问题！`);
            } else {
                console.log(`❌ 网络连接失败 - ${error.message}`);
            }
        }
    }
}

/**
 * 测试Kroki服务可用性
 */
async function testKrokiService() {
    console.log('\n🌐 测试Kroki服务可用性...');
    
    try {
        const response = await axios.get('https://kroki.io', {
            timeout: 10000,
            validateStatus: function (status) {
                return status < 500;
            }
        });
        
        console.log(`✅ Kroki服务可用 - 状态码: ${response.status}`);
        console.log(`📄 响应头: ${JSON.stringify(response.headers, null, 2)}`);
        
        // 测试简单的图表转换
        console.log('\n🎯 测试简单图表转换...');
        const chartResponse = await axios.post('https://kroki.io/mermaid/png', {
            diagram_source: 'graph TD\n    A[开始] --> B[结束]',
            diagram_options: {}
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 15000,
            responseType: 'arraybuffer'
        });
        
        if (chartResponse.status === 200) {
            console.log(`✅ 图表转换成功 - 图片大小: ${chartResponse.data.length} bytes`);
        } else {
            console.log(`❌ 图表转换失败 - 状态码: ${chartResponse.status}`);
        }
        
    } catch (error) {
        console.log(`❌ Kroki服务不可用 - ${error.message}`);
        console.log('💡 这可能是网络问题，不是代码问题');
    }
}

// 运行所有测试
async function runAllTests() {
    try {
        await testUrlValidity();
        await testChartProcessorNetworkCheck();
        await testKrokiService();
        
        console.log('\n🎉 测试完成！');
        console.log('💡 如果看到"URL无效错误"，说明之前的问题已经被识别');
        console.log('✅ 修复后的版本应该不会再出现"Invalid URL"错误');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
    }
}

runAllTests(); 