#!/usr/bin/env node

/**
 * Markdown to Excel Converter - 命令行接口
 * 提供完整的CLI功能
 */

const yargs = require('yargs');
const path = require('path');
const fs = require('fs-extra');
const { Converter, ExcelConfig } = require('../src/index');

// 配置yargs
const argv = yargs
    .usage('Usage: $0 <command> [options]')
    .command('convert <input>', 'Convert a single Markdown file to Excel', (yargs) => {
        yargs
            .positional('input', {
                describe: 'Input Markdown file path',
                type: 'string'
            })
            .option('output', {
                alias: 'o',
                describe: 'Output Excel file path',
                type: 'string'
            })
            .option('config', {
                alias: 'c',
                describe: 'Configuration file path',
                type: 'string'
            })
            .option('include-type', {
                describe: 'Include Type column in output',
                type: 'boolean',
                default: false
            })
            .option('include-level', {
                describe: 'Include Level column in output',
                type: 'boolean',
                default: false
            });
    })
    .command('batch <pattern>', 'Convert multiple Markdown files to Excel', (yargs) => {
        yargs
            .positional('pattern', {
                describe: 'Input file pattern (glob)',
                type: 'string'
            })
            .option('output-dir', {
                alias: 'd',
                describe: 'Output directory',
                type: 'string',
                default: './output'
            })
            .option('config', {
                alias: 'c',
                describe: 'Configuration file path',
                type: 'string'
            });
    })
    .command('config', 'Manage configuration', (yargs) => {
        yargs
            .command('create [path]', 'Create default configuration file', (yargs) => {
                yargs.positional('path', {
                    describe: 'Configuration file path',
                    type: 'string',
                    default: './excel-config.yaml'
                });
            })
            .command('show [path]', 'Show configuration', (yargs) => {
                yargs.positional('path', {
                    describe: 'Configuration file path',
                    type: 'string'
                });
            });
    })
    .command('info', 'Show converter information')
    .option('verbose', {
        alias: 'v',
        describe: 'Verbose output',
        type: 'boolean',
        default: false
    })
    .option('quiet', {
        alias: 'q',
        describe: 'Quiet mode (minimal output)',
        type: 'boolean',
        default: false
    })
    .help()
    .alias('help', 'h')
    .version()
    .alias('version', 'V')
    .example('$0 convert input.md -o output.xlsx', 'Convert single file')
    .example('$0 batch "docs/*.md" -d ./excel-output', 'Convert multiple files')
    .example('$0 config create', 'Create default configuration')
    .epilogue('For more information, visit: https://github.com/your-repo/md-to-excel-converter')
    .argv;

// 设置日志级别
const log = {
    info: (msg) => !argv.quiet && console.log(`ℹ ${msg}`),
    success: (msg) => !argv.quiet && console.log(`✅ ${msg}`),
    warn: (msg) => console.warn(`⚠️ ${msg}`),
    error: (msg) => console.error(`❌ ${msg}`),
    verbose: (msg) => argv.verbose && console.log(`🔍 ${msg}`)
};

// 主函数
async function main() {
    try {
        const command = argv._[0];
        
        switch (command) {
            case 'convert':
                await handleConvert();
                break;
            case 'batch':
                await handleBatch();
                break;
            case 'config':
                await handleConfig();
                break;
            case 'info':
                await handleInfo();
                break;
            default:
                yargs.showHelp();
                process.exit(1);
        }
    } catch (error) {
        log.error(`Command failed: ${error.message}`);
        if (argv.verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// 处理单文件转换
async function handleConvert() {
    const inputPath = argv.input;
    // 如果没有通过 --output 指定输出路径，但有额外的位置参数，使用第一个额外参数作为输出路径
    let outputPath = argv.output;
    if (!outputPath && argv._.length > 1) {
        // argv._[0] 是 'convert'，argv._[1] 是第二个位置参数
        outputPath = argv._[1];
    }
    const configPath = argv.config;
    
    log.info(`Converting file: ${inputPath}`);
    log.verbose(`Output path: ${outputPath || 'auto-generated'}`);
    log.verbose(`Config path: ${configPath || 'default'}`);
    
    // 加载配置
    let config = {};
    if (configPath) {
        if (await fs.pathExists(configPath)) {
            config = await ExcelConfig.loadFromFile(configPath);
            log.verbose(`Loaded configuration from: ${configPath}`);
        } else {
            log.warn(`Configuration file not found: ${configPath}. Using default configuration.`);
        }
    }
    
    // 合并命令行参数到配置
    if (argv.includeType || argv.includeLevel) {
        config.contentMapping = config.contentMapping || {};
        if (argv.includeType) {
            config.contentMapping.includeType = true;
        }
        if (argv.includeLevel) {
            config.contentMapping.includeLevel = true;
        }
        log.verbose(`Applied CLI options: includeType=${argv.includeType}, includeLevel=${argv.includeLevel}`);
    }
    
    // 创建转换器
    const converter = new Converter(config);
    await converter.initialize();
    
    // 执行转换
    const startTime = Date.now();
    const result = await converter.convertFile(inputPath, outputPath);
    const duration = Date.now() - startTime;
    
    if (result.success) {
        log.success(`Conversion completed in ${duration}ms`);
        log.info(`Output file: ${result.outputPath}`);
    } else {
        throw new Error(result.message || 'Conversion failed');
    }
}

// 处理批量转换
async function handleBatch() {
    const pattern = argv.pattern;
    const outputDir = argv.outputDir;
    const configPath = argv.config;
    
    log.info(`Batch converting files: ${pattern}`);
    log.verbose(`Output directory: ${outputDir}`);
    log.verbose(`Config path: ${configPath || 'default'}`);
    
    // 加载配置
    let config = {};
    if (configPath) {
        if (await fs.pathExists(configPath)) {
            config = await ExcelConfig.loadFromFile(configPath);
            log.verbose(`Loaded configuration from: ${configPath}`);
        } else {
            log.warn(`Configuration file not found: ${configPath}. Using default configuration.`);
        }
    }
    
    // 合并命令行参数到配置
    if (argv.includeType || argv.includeLevel) {
        config.contentMapping = config.contentMapping || {};
        if (argv.includeType) {
            config.contentMapping.includeType = true;
        }
        if (argv.includeLevel) {
            config.contentMapping.includeLevel = true;
        }
        log.verbose(`Applied CLI options: includeType=${argv.includeType}, includeLevel=${argv.includeLevel}`);
    }
    
    // 创建转换器
    const converter = new Converter(config);
    await converter.initialize();
    
    // 执行批量转换
    const startTime = Date.now();
    const result = await converter.convertBatch(pattern, outputDir);
    const duration = Date.now() - startTime;
    
    if (result.success) {
        log.success(`Batch conversion completed in ${duration}ms`);
        log.info(`Total files: ${result.totalFiles}`);
        log.info(`Successful: ${result.successCount}`);
        log.info(`Failed: ${result.failureCount}`);
        
        if (argv.verbose && result.results) {
            result.results.forEach((r, index) => {
                if (r.success) {
                    log.verbose(`${index + 1}. ✅ ${r.inputPath} -> ${r.outputPath}`);
                } else {
                    log.verbose(`${index + 1}. ❌ ${r.inputPath} - ${r.error}`);
                }
            });
        }
    } else {
        throw new Error(result.message || 'Batch conversion failed');
    }
}

// 处理配置命令
async function handleConfig() {
    const subCommand = argv._[1];
    
    switch (subCommand) {
        case 'create':
            await handleConfigCreate();
            break;
        case 'show':
            await handleConfigShow();
            break;
        default:
            log.error('Unknown config command. Use "create" or "show".');
            process.exit(1);
    }
}

// 创建配置文件
async function handleConfigCreate() {
    const configPath = argv.path || './excel-config.yaml';
    
    log.info(`Creating default configuration: ${configPath}`);
    
    if (await fs.pathExists(configPath)) {
        log.warn(`Configuration file already exists: ${configPath}`);
        
        // 简单的确认机制（在实际应用中可能需要更复杂的交互）
        if (!argv.force) {
            log.error('Use --force to overwrite existing configuration file.');
            process.exit(1);
        }
    }
    
    await Converter.createDefaultConfig(configPath);
    log.success(`Default configuration created: ${configPath}`);
}

// 显示配置
async function handleConfigShow() {
    const configPath = argv.path;
    
    if (!configPath) {
        // 显示默认配置
        log.info('Default configuration:');
        const defaultConfig = ExcelConfig.getDefaultConfig();
        console.log(JSON.stringify(defaultConfig, null, 2));
    } else {
        // 显示指定配置文件
        if (!await fs.pathExists(configPath)) {
            throw new Error(`Configuration file not found: ${configPath}`);
        }
        
        log.info(`Configuration from: ${configPath}`);
        const config = await ExcelConfig.loadFromFile(configPath);
        console.log(JSON.stringify(config, null, 2));
    }
}

// 显示信息
async function handleInfo() {
    const { getVersion, getFeatures } = require('../src/index');
    
    const version = getVersion();
    const features = getFeatures();
    
    console.log('\n📊 Markdown to Excel Converter\n');
    console.log(`Name: ${version.name}`);
    console.log(`Version: ${version.version}`);
    console.log(`Description: ${version.description}`);
    console.log(`Author: ${version.author}`);
    console.log(`License: ${version.license}\n`);
    
    console.log('📥 Input Formats:');
    features.inputFormats.forEach(format => console.log(`  • ${format}`));
    
    console.log('\n📤 Output Format:');
    console.log(`  • ${features.outputFormat}`);
    
    console.log('\n🚀 Features:');
    features.features.forEach(feature => console.log(`  • ${feature}`));
    
    console.log('\n📝 Supported Content Types:');
    features.contentTypes.forEach(type => console.log(`  • ${type}`));
    
    console.log('\n📊 Excel Features:');
    features.excelFeatures.forEach(feature => console.log(`  • ${feature}`));
    
    console.log('\n💡 Usage Examples:');
    console.log('  md-to-excel convert document.md -o output.xlsx');
    console.log('  md-to-excel batch "docs/*.md" -d ./excel-files');
    console.log('  md-to-excel config create');
    console.log('');
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
    log.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    if (argv.verbose) {
        console.error(reason);
    }
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    log.error(`Uncaught Exception: ${error.message}`);
    if (argv.verbose) {
        console.error(error.stack);
    }
    process.exit(1);
});

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = { main, handleConvert, handleBatch, handleConfig, handleInfo };