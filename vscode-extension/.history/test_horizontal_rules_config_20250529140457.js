/**
 * 段落线配置测试脚本
 * 用于验证show_horizontal_rules配置是否正确传递
 */

// 模拟配置对象
const testConfig = {
    fonts: {
        default: '微软雅黑',
        code: 'Courier New',
        headings: '微软雅黑'
    },
    sizes: {
        default: 12,
        code: 10
    },
    colors: {
        default: '#000000',
        headings: '#000000',
        code: '#333333',
        link: '#0563C1'
    },
    paragraph: {
        line_spacing: 1.5,
        space_before: 0,
        space_after: 6,
        first_line_indent: 0
    },
    document: {
        page_size: 'A4',
        margin_top: 2.54,
        margin_bottom: 2.54,
        margin_left: 3.18,
        margin_right: 3.18,
        generate_toc: false,
        show_horizontal_rules: true,  // ⭐ 测试段落线配置
        header: '',
        footer: ''
    },
    chinese: {
        convert_to_traditional: false,
        punctuation_spacing: true,
        auto_spacing: true
    }
};

// 测试配置转换函数（模拟NodeMarkdownConverter.convertConfig）
function testConvertConfig(config) {
    console.log('🔍 测试配置转换...');
    console.log('输入配置 - show_horizontal_rules:', config.document?.show_horizontal_rules);
    
    const convertedConfig = {
        document: {
            page_size: config.document?.page_size || 'A4',
            orientation: 'portrait',
            margin_top: config.document?.margin_top || 2.54,
            margin_bottom: config.document?.margin_bottom || 2.54,
            margin_left: config.document?.margin_left || 3.18,
            margin_right: config.document?.margin_right || 3.18,
            generate_toc: config.document?.generate_toc || false,
            show_horizontal_rules: config.document?.show_horizontal_rules !== false, // ⭐ 关键转换
            toc_depth: 3
        }
    };
    
    console.log('输出配置 - show_horizontal_rules:', convertedConfig.document.show_horizontal_rules);
    console.log('✅ 配置转换测试完成');
    
    return convertedConfig;
}

// 执行测试
console.log('🚀 开始段落线配置测试...\n');

// 测试1: 启用段落线
console.log('📋 测试1: 启用段落线 (true)');
const config1 = { ...testConfig };
config1.document.show_horizontal_rules = true;
const result1 = testConvertConfig(config1);

// 测试2: 禁用段落线
console.log('\n📋 测试2: 禁用段落线 (false)');
const config2 = { ...testConfig };
config2.document.show_horizontal_rules = false;
const result2 = testConvertConfig(config2);

// 测试3: 未设置段落线配置 (默认启用)
console.log('\n📋 测试3: 未设置段落线配置 (默认启用)');
const config3 = { ...testConfig };
delete config3.document.show_horizontal_rules;
const result3 = testConvertConfig(config3);

console.log('\n🎉 所有测试完成!');
console.log('测试结果总结:');
console.log('- 启用段落线:', result1.document.show_horizontal_rules);
console.log('- 禁用段落线:', result2.document.show_horizontal_rules);
console.log('- 默认行为:', result3.document.show_horizontal_rules); 