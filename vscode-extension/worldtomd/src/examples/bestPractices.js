/**
 * Word to Markdown 转换器 - 最佳实践示例
 * 
 * 展示如何使用整合后的最佳实现进行Word文档转换
 * 
 * 作者：VSCode 研发高手智能体
 * 时间：2025年1月14日
 */

const path = require('path');
const {
    smartConvert,
    createOptimalConverter,
    convertDirectory,
    converterTypes,
    configManager
} = require('../index');

/**
 * 示例1：基础智能转换（推荐用法）
 */
async function basicSmartConversion() {
    console.log('\n🚀 示例1：基础智能转换');
    console.log('='.repeat(50));
    
    try {
        // 最简单的用法 - 自动选择最佳转换策略
        const result = await smartConvert(
            'example.docx',
            'output.md'
        );
        
        console.log('✅ 转换成功:', {
            输出文件: result.outputPath || result,
            转换器类型: result.converter || 'simplified',
            耗时: result.duration ? `${result.duration}ms` : '未知'
        });
        
    } catch (error) {
        console.error('❌ 转换失败:', error.message);
    }
}

/**
 * 示例2：高级配置转换
 */
async function advancedConfigConversion() {
    console.log('\n⚙️ 示例2：高级配置转换');
    console.log('='.repeat(50));
    
    try {
        const result = await smartConvert(
            'complex-document.docx',
            'output-advanced.md',
            {
                // 图像处理配置
                imageDir: 'assets/images',
                preserveImageFormat: false, // 转换TIFF/BMP为PNG
                useImprovedImageHandler: true, // 使用Sharp库
                
                // 转换策略配置
                preferSimplified: true, // 优先使用简化转换器
                useXMLProcessor: false, // 不使用XML处理器
                
                // 其他选项
                cleanupTempFiles: true,
                enableProgressTracking: true
            }
        );
        
        console.log('✅ 高级转换成功:', {
            输出文件: result.outputPath || result,
            图像数量: result.stats?.imageCount || 0,
            转换器: result.converter || 'simplified',
            耗时: result.duration ? `${result.duration}ms` : '未知'
        });
        
    } catch (error) {
        console.error('❌ 高级转换失败:', error.message);
    }
}

/**
 * 示例3：批量目录转换
 */
async function batchDirectoryConversion() {
    console.log('\n📦 示例3：批量目录转换');
    console.log('='.repeat(50));
    
    try {
        const results = await convertDirectory(
            'input-docs',
            'output-markdown',
            {
                imageDir: 'shared-images',
                preserveImageFormat: false,
                useImprovedImageHandler: true,
                
                // 批量处理选项
                maxConcurrency: 3,
                skipExisting: true,
                generateIndex: true
            }
        );
        
        console.log('✅ 批量转换完成:', {
            总文件数: results.total || 0,
            成功数: results.success || 0,
            失败数: results.failed || 0,
            总耗时: results.duration ? `${results.duration}ms` : '未知'
        });
        
        if (results.errors && results.errors.length > 0) {
            console.log('⚠️ 转换错误:');
            results.errors.forEach(error => {
                console.log(`  - ${error.file}: ${error.message}`);
            });
        }
        
    } catch (error) {
        console.error('❌ 批量转换失败:', error.message);
    }
}

/**
 * 示例4：自定义转换器创建
 */
async function customConverterExample() {
    console.log('\n🔧 示例4：自定义转换器创建');
    console.log('='.repeat(50));
    
    try {
        // 创建针对特定需求优化的转换器
        const converter = createOptimalConverter({
            preferSimplified: false, // 使用完整功能转换器
            useXMLProcessor: true,   // 启用XML处理器
            useImprovedImageHandler: true,
            
            // 自定义配置
            imageDir: 'custom-images',
            preserveImageFormat: true,
            enableDebugLogging: true
        });
        
        console.log('🔨 转换器创建成功:', {
            类型: converter.constructor.name,
            配置: {
                图像目录: converter.config?.imageDir || '默认',
                保持格式: converter.config?.preserveImageFormat || false
            }
        });
        
        // 执行转换
        const result = await converter.convert('test.docx', {
            outputPath: 'custom-output.md'
        });
        
        console.log('✅ 自定义转换完成:', result);
        
        // 清理资源
        if (typeof converter.dispose === 'function') {
            await converter.dispose();
        }
        
    } catch (error) {
        console.error('❌ 自定义转换失败:', error.message);
    }
}

/**
 * 示例5：配置管理和性能监控
 */
async function configAndMonitoringExample() {
    console.log('\n📊 示例5：配置管理和性能监控');
    console.log('='.repeat(50));
    
    try {
        // 查看当前配置
        console.log('📋 当前配置:');
        console.log('  - 图像目录:', configManager.get('word.imageDir'));
        console.log('  - 日志级别:', configManager.get('debug.logLevel'));
        console.log('  - 最大并发:', configManager.get('performance.maxConcurrency'));
        
        // 动态修改配置
        configManager.set('word.imageDir', 'monitoring-images');
        configManager.set('debug.logLevel', 'debug');
        
        console.log('\n🔄 配置已更新');
        
        // 执行转换并监控性能
        const startTime = Date.now();
        const result = await smartConvert(
            'performance-test.docx',
            'performance-output.md',
            {
                enablePerformanceMonitoring: true
            }
        );
        const endTime = Date.now();
        
        console.log('\n📈 性能统计:', {
            总耗时: `${endTime - startTime}ms`,
            转换耗时: result.duration ? `${result.duration}ms` : '未知',
            图像处理: result.stats?.imageProcessingTime || '未知',
            内存使用: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
        });
        
    } catch (error) {
        console.error('❌ 配置和监控示例失败:', error.message);
    }
}

/**
 * 示例6：错误处理和恢复
 */
async function errorHandlingExample() {
    console.log('\n🚨 示例6：错误处理和恢复');
    console.log('='.repeat(50));
    
    const testFiles = [
        'valid-document.docx',
        'non-existent.docx',
        'corrupted.docx',
        'another-valid.docx'
    ];
    
    for (const file of testFiles) {
        try {
            console.log(`\n🔄 处理文件: ${file}`);
            
            const result = await smartConvert(
                file,
                file.replace('.docx', '.md'),
                {
                    continueOnError: true,
                    retryAttempts: 2,
                    fallbackStrategy: 'simplified'
                }
            );
            
            console.log(`✅ ${file} 转换成功`);
            
        } catch (error) {
            console.log(`❌ ${file} 转换失败: ${error.message}`);
            
            // 尝试降级策略
            try {
                console.log(`🔄 尝试降级策略...`);
                const fallbackResult = await smartConvert(
                    file,
                    file.replace('.docx', '-fallback.md'),
                    {
                        preferSimplified: false,
                        useXMLProcessor: false,
                        useImprovedImageHandler: false
                    }
                );
                console.log(`✅ ${file} 降级转换成功`);
            } catch (fallbackError) {
                console.log(`❌ ${file} 降级转换也失败: ${fallbackError.message}`);
            }
        }
    }
}

/**
 * 主函数 - 运行所有示例
 */
async function runAllExamples() {
    console.log('🎯 Word to Markdown 转换器 - 最佳实践示例');
    console.log('='.repeat(60));
    console.log('整合了多个转换器的最佳实现，消除重复造轮子问题');
    
    try {
        await basicSmartConversion();
        await advancedConfigConversion();
        await batchDirectoryConversion();
        await customConverterExample();
        await configAndMonitoringExample();
        await errorHandlingExample();
        
        console.log('\n🎉 所有示例运行完成！');
        console.log('\n💡 推荐使用方式:');
        console.log('  1. 简单转换: smartConvert(input, output)');
        console.log('  2. 批量转换: convertDirectory(inputDir, outputDir)');
        console.log('  3. 自定义需求: createOptimalConverter(options)');
        
    } catch (error) {
        console.error('❌ 示例运行失败:', error.message);
    }
}

// 运行示例
if (require.main === module) {
    runAllExamples().catch(console.error);
}

module.exports = {
    basicSmartConversion,
    advancedConfigConversion,
    batchDirectoryConversion,
    customConverterExample,
    configAndMonitoringExample,
    errorHandlingExample,
    runAllExamples
};