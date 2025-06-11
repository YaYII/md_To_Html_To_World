/**
 * Markdown to Excel Converter - 主入口文件
 * 导出所有核心功能模块
 */

const Converter = require('./converter');
const ExcelConfig = require('./config/excelConfig');
const MarkdownToHtml = require('./markdownToHtml/markdownToHtml');
const HtmlToExcelConverter = require('./htmlToExcel/htmlToExcelConverter');

/**
 * 创建转换器实例
 * @param {Object|ExcelConfig} config - 配置对象
 * @returns {Converter} 转换器实例
 */
function createConverter(config = {}) {
    return new Converter(config);
}

/**
 * 快速转换单个文件
 * @param {string} inputPath - 输入文件路径
 * @param {string} outputPath - 输出文件路径（可选）
 * @param {Object} config - 配置对象（可选）
 * @returns {Promise<Object>} 转换结果
 */
async function convertFile(inputPath, outputPath = null, config = {}) {
    const converter = new Converter(config);
    await converter.initialize();
    return await converter.convertFile(inputPath, outputPath);
}

/**
 * 快速批量转换
 * @param {string} inputPattern - 输入文件模式
 * @param {string} outputDir - 输出目录（可选）
 * @param {Object} config - 配置对象（可选）
 * @returns {Promise<Object>} 批量转换结果
 */
async function convertBatch(inputPattern, outputDir = null, config = {}) {
    const converter = new Converter(config);
    await converter.initialize();
    return await converter.convertBatch(inputPattern, outputDir);
}

/**
 * 快速转换字符串
 * @param {string} markdownContent - Markdown内容
 * @param {string} filename - 文件名（可选）
 * @param {Object} config - 配置对象（可选）
 * @returns {Promise<Object>} 转换结果（包含Buffer）
 */
async function convertString(markdownContent, filename = 'converted', config = {}) {
    const converter = new Converter(config);
    await converter.initialize();
    return await converter.convertString(markdownContent, filename);
}

/**
 * 创建默认配置
 * @returns {ExcelConfig} 默认配置实例
 */
function createDefaultConfig() {
    return ExcelConfig.getDefaultConfig();
}

/**
 * 从文件加载配置
 * @param {string} configPath - 配置文件路径
 * @returns {Promise<ExcelConfig>} 配置实例
 */
async function loadConfig(configPath) {
    return await ExcelConfig.loadFromFile(configPath);
}

/**
 * 创建默认配置文件
 * @param {string} configPath - 配置文件路径
 * @returns {Promise<string>} 创建的配置文件路径
 */
async function createDefaultConfigFile(configPath) {
    return await Converter.createDefaultConfig(configPath);
}

/**
 * 获取版本信息
 * @returns {Object} 版本信息
 */
function getVersion() {
    const packageJson = require('../package.json');
    return {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        author: packageJson.author,
        license: packageJson.license
    };
}

/**
 * 获取支持的功能列表
 * @returns {Object} 功能列表
 */
function getFeatures() {
    return {
        inputFormats: ['.md', '.markdown'],
        outputFormat: '.xlsx',
        features: [
            'Markdown to HTML conversion',
            'HTML to Excel conversion',
            'Intelligent content mapping',
            'Multiple worksheet support',
            'Customizable styling',
            'Table preservation',
            'Code block formatting',
            'Heading hierarchy mapping',
            'List structure preservation',
            'Blockquote styling',
            'Batch conversion',
            'Command line interface',
            'Configuration management'
        ],
        contentTypes: [
            'headings (h1-h6)',
            'paragraphs',
            'lists (ordered/unordered)',
            'code blocks',
            'blockquotes',
            'tables',
            'horizontal rules',
            'links',
            'emphasis (bold/italic)'
        ],
        excelFeatures: [
            'Multiple worksheets',
            'Cell styling',
            'Column width adjustment',
            'Row height adjustment',
            'Border formatting',
            'Font formatting',
            'Background colors',
            'Text alignment',
            'Cell wrapping',
            'Frozen headers'
        ]
    };
}

// 导出所有功能
module.exports = {
    // 核心类
    Converter,
    ExcelConfig,
    MarkdownToHtml,
    HtmlToExcelConverter,
    
    // 便捷函数
    createConverter,
    convertFile,
    convertBatch,
    convertString,
    
    // 配置管理
    createDefaultConfig,
    loadConfig,
    createDefaultConfigFile,
    
    // 信息获取
    getVersion,
    getFeatures,
    
    // 别名（向后兼容）
    convert: convertFile,
    batchConvert: convertBatch,
    stringConvert: convertString
};

// 默认导出主转换器类
module.exports.default = Converter;