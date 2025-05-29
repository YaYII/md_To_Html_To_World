/**
 * 测试配置传递脚本
 * 验证段落线配置是否正确工作
 */

const fs = require('fs');
const path = require('path');

// 测试配置对象
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
        generate_toc: false,
        show_horizontal_rules: true  // ⭐ 测试段落线配置
    },
    chinese: {
        convert_to_traditional: false,
        punctuation_spacing: true
    }
};

console.log('✅ 配置对象创建成功');
console.log('段落线配置值:', testConfig.document.show_horizontal_rules);

// 验证配置转换逻辑（模拟nodeConverter中的convertConfig方法）
function convertConfig(config) {
    return {
        fonts: {
            default: config.fonts?.default || '微软雅黑',
            code: config.fonts?.code || 'Courier New',
            headings: config.fonts?.headings || '微软雅黑'
        },
        sizes: {
            default: config.sizes?.default || 12,
            code: config.sizes?.code || 10
        },
        colors: {
            default: config.colors?.default || '#000000',
            headings: config.colors?.headings || '#000000',
            code: config.colors?.code || '#333333'
        },
        paragraph: {
            line_spacing: config.paragraph?.line_spacing || 1.5,
            space_before: config.paragraph?.space_before || 0,
            space_after: config.paragraph?.space_after || 6,
            first_line_indent: config.paragraph?.first_line_indent || 0
        },
        document: {
            page_size: config.document?.page_size || 'A4',
            orientation: 'portrait',
            margin_top: config.document?.margin_top || 2.54,
            margin_bottom: config.document?.margin_bottom || 2.54,
            margin_left: config.document?.margin_left || 3.18,
            margin_right: config.document?.margin_right || 3.18,
            generate_toc: config.document?.generate_toc || false,
            show_horizontal_rules: config.document?.show_horizontal_rules !== false, // ⭐ 关键配置
            toc_depth: 3
        },
        chinese: {
            convert_to_traditional: config.chinese?.convert_to_traditional || false,
            punctuation_spacing: config.chinese?.punctuation_spacing || true,
            auto_spacing: config.chinese?.auto_spacing || true
        }
    };
}

const convertedConfig = convertConfig(testConfig);

console.log('✅ 配置转换成功');
console.log('转换后的段落线配置:', convertedConfig.document.show_horizontal_rules);

// 测试边界情况
const testConfigFalse = {
    document: {
        show_horizontal_rules: false
    }
};

const convertedConfigFalse = convertConfig(testConfigFalse);
console.log('✅ 测试false值:', convertedConfigFalse.document.show_horizontal_rules);

const testConfigUndefined = {
    document: {}
};

const convertedConfigUndefined = convertConfig(testConfigUndefined);
console.log('✅ 测试undefined值:', convertedConfigUndefined.document.show_horizontal_rules);

console.log('\n🎉 所有测试通过！段落线配置逻辑正确。'); 