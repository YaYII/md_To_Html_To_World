/**
 * 测试目录生成功能的调试脚本
 */

const path = require('path');
const NodeJsConverter = require('./nodejs/src/converter');
const ConfigManager = require('./nodejs/src/utils/configManager');

// 创建测试配置
const testConfig = {
    fonts: {
        default: '微软雅黑',
        code: 'Courier New',
        headings: '微软雅黑'
    },
    sizes: {
        default: 12,
        code: 10,
        heading1: 18,
        heading2: 16,
        heading3: 14
    },
    colors: {
        default: '#000000',
        headings: '#000000',
        code: '#333333'
    },
    paragraph: {
        line_spacing: 1.5,
        space_before: 0,
        space_after: 6
    },
    document: {
        page_size: 'A4',
        margin_top: 2.54,
        margin_bottom: 2.54,
        margin_left: 3.18,
        margin_right: 3.18,
        generate_toc: true,  // ⭐ 启用目录生成
        toc_depth: 3         // 目录深度
    },
    chinese: {
        convert_to_traditional: false,
        punctuation_spacing: true
    }
};

console.log('🧪 开始测试目录生成功能...');
console.log('目录配置:', {
    generate_toc: testConfig.document.generate_toc,
    toc_depth: testConfig.document.toc_depth
});

// 创建转换器实例
const converter = new NodeJsConverter(testConfig);

async function testTocGeneration() {
    try {
        const inputFile = 'test_final_horizontal_rules.md';
        const outputFile = 'test_toc_output.docx';
        
        console.log(`\n📖 测试文件: ${inputFile}`);
        console.log(`📝 输出文件: ${outputFile}`);
        
        // 执行转换
        const result = await converter.convert_file(inputFile, outputFile, false);
        
        if (result.success) {
            console.log('✅ 转换成功!');
            console.log('输出文件:', result.outputFile);
        } else {
            console.log('❌ 转换失败:', result.message);
        }
        
    } catch (error) {
        console.error('❌ 测试过程中出错:', error.message);
    }
}

testTocGeneration(); 