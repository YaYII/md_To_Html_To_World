#!/usr/bin/env node

/**
 * Markdown to Excel Converter - 配置管理工具
 * 提供交互式配置管理功能
 */

const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { ExcelConfig } = require('../src/index');

// 配置选项定义
const CONFIG_QUESTIONS = [
    {
        type: 'input',
        name: 'outputPath',
        message: 'Default output directory:',
        default: './output'
    },
    {
        type: 'input',
        name: 'filename',
        message: 'Default output filename (without extension):',
        default: 'converted'
    },
    {
        type: 'input',
        name: 'worksheetName',
        message: 'Main worksheet name:',
        default: 'Content'
    },
    {
        type: 'confirm',
        name: 'includeType',
        message: 'Include content type column?',
        default: false
    },
    {
        type: 'confirm',
        name: 'includeLevel',
        message: 'Include heading level column?',
        default: false
    },
    {
        type: 'confirm',
        name: 'includeContent',
        message: 'Include content column?',
        default: true
    },
    {
        type: 'number',
        name: 'contentColumnWidth',
        message: 'Content column width:',
        default: 50,
        validate: (value) => value > 0 || 'Width must be greater than 0'
    },
    {
        type: 'number',
        name: 'typeColumnWidth',
        message: 'Type column width:',
        default: 15,
        validate: (value) => value > 0 || 'Width must be greater than 0'
    },
    {
        type: 'number',
        name: 'levelColumnWidth',
        message: 'Level column width:',
        default: 10,
        validate: (value) => value > 0 || 'Width must be greater than 0'
    },
    {
        type: 'confirm',
        name: 'splitByHeaders',
        message: 'Split content into separate worksheets by headers?',
        default: false
    },
    {
        type: 'confirm',
        name: 'separateTableSheets',
        message: 'Create separate worksheets for tables?',
        default: false
    },
    {
        type: 'input',
        name: 'tableSheetPrefix',
        message: 'Table worksheet prefix:',
        default: 'Table_',
        when: (answers) => answers.separateTableSheets
    },
    {
        type: 'number',
        name: 'maxCellLength',
        message: 'Maximum cell content length:',
        default: 32767,
        validate: (value) => value > 0 || 'Length must be greater than 0'
    },
    {
        type: 'confirm',
        name: 'preserveFormatting',
        message: 'Preserve text formatting in Excel?',
        default: true
    }
];

// 样式配置问题
const STYLE_QUESTIONS = [
    {
        type: 'list',
        name: 'headerStyle',
        message: 'Header style preset:',
        choices: [
            { name: 'Professional (Blue theme)', value: 'professional' },
            { name: 'Minimal (Gray theme)', value: 'minimal' },
            { name: 'Colorful (Multi-color theme)', value: 'colorful' },
            { name: 'Custom', value: 'custom' }
        ],
        default: 'professional'
    },
    {
        type: 'number',
        name: 'baseFontSize',
        message: 'Base font size:',
        default: 11,
        validate: (value) => value > 0 || 'Font size must be greater than 0'
    },
    {
        type: 'input',
        name: 'fontFamily',
        message: 'Font family:',
        default: 'Calibri'
    }
];

// 主菜单
const MAIN_MENU = [
    {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
            { name: '📝 Create new configuration', value: 'create' },
            { name: '✏️  Edit existing configuration', value: 'edit' },
            { name: '👀 View configuration', value: 'view' },
            { name: '📋 Copy configuration', value: 'copy' },
            { name: '🗑️  Delete configuration', value: 'delete' },
            { name: '📚 List all configurations', value: 'list' },
            { name: '🔄 Reset to defaults', value: 'reset' },
            { name: '❌ Exit', value: 'exit' }
        ]
    }
];

class ConfigManager {
    constructor() {
        this.configDir = path.join(process.cwd(), '.md-to-excel');
        this.defaultConfigPath = path.join(this.configDir, 'default.yaml');
    }
    
    async initialize() {
        await fs.ensureDir(this.configDir);
    }
    
    async run() {
        console.log('\n📊 Markdown to Excel Converter - Configuration Manager\n');
        
        await this.initialize();
        
        while (true) {
            const { action } = await inquirer.prompt(MAIN_MENU);
            
            try {
                switch (action) {
                    case 'create':
                        await this.createConfig();
                        break;
                    case 'edit':
                        await this.editConfig();
                        break;
                    case 'view':
                        await this.viewConfig();
                        break;
                    case 'copy':
                        await this.copyConfig();
                        break;
                    case 'delete':
                        await this.deleteConfig();
                        break;
                    case 'list':
                        await this.listConfigs();
                        break;
                    case 'reset':
                        await this.resetConfig();
                        break;
                    case 'exit':
                        console.log('\n👋 Goodbye!');
                        process.exit(0);
                }
            } catch (error) {
                console.error(`\n❌ Error: ${error.message}\n`);
            }
        }
    }
    
    async createConfig() {
        console.log('\n📝 Creating new configuration...\n');
        
        // 获取配置名称
        const { configName } = await inquirer.prompt([
            {
                type: 'input',
                name: 'configName',
                message: 'Configuration name:',
                default: 'my-config',
                validate: (value) => {
                    if (!value.trim()) return 'Name cannot be empty';
                    if (!/^[a-zA-Z0-9-_]+$/.test(value)) return 'Name can only contain letters, numbers, hyphens, and underscores';
                    return true;
                }
            }
        ]);
        
        const configPath = path.join(this.configDir, `${configName}.yaml`);
        
        if (await fs.pathExists(configPath)) {
            const { overwrite } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'overwrite',
                    message: 'Configuration already exists. Overwrite?',
                    default: false
                }
            ]);
            
            if (!overwrite) {
                console.log('\n⏭️  Configuration creation cancelled.\n');
                return;
            }
        }
        
        // 收集基本配置
        const basicConfig = await inquirer.prompt(CONFIG_QUESTIONS);
        
        // 收集样式配置
        const styleConfig = await inquirer.prompt(STYLE_QUESTIONS);
        
        // 构建完整配置
        const config = this.buildConfig(basicConfig, styleConfig);
        
        // 保存配置
        await this.saveConfig(configPath, config);
        
        console.log(`\n✅ Configuration saved: ${configPath}\n`);
    }
    
    async editConfig() {
        const configs = await this.getConfigList();
        
        if (configs.length === 0) {
            console.log('\n📭 No configurations found. Create one first.\n');
            return;
        }
        
        const { configName } = await inquirer.prompt([
            {
                type: 'list',
                name: 'configName',
                message: 'Select configuration to edit:',
                choices: configs
            }
        ]);
        
        const configPath = path.join(this.configDir, `${configName}.yaml`);
        const existingConfig = await this.loadConfig(configPath);
        
        console.log('\n✏️  Editing configuration (press Enter to keep current value)...\n');
        
        // 预填充现有值
        const questions = CONFIG_QUESTIONS.map(q => ({
            ...q,
            default: this.getNestedValue(existingConfig, q.name) ?? q.default
        }));
        
        const basicConfig = await inquirer.prompt(questions);
        const styleConfig = await inquirer.prompt(STYLE_QUESTIONS);
        
        const config = this.buildConfig(basicConfig, styleConfig);
        await this.saveConfig(configPath, config);
        
        console.log(`\n✅ Configuration updated: ${configPath}\n`);
    }
    
    async viewConfig() {
        const configs = await this.getConfigList();
        
        if (configs.length === 0) {
            console.log('\n📭 No configurations found.\n');
            return;
        }
        
        const { configName } = await inquirer.prompt([
            {
                type: 'list',
                name: 'configName',
                message: 'Select configuration to view:',
                choices: configs
            }
        ]);
        
        const configPath = path.join(this.configDir, `${configName}.yaml`);
        const config = await this.loadConfig(configPath);
        
        console.log(`\n👀 Configuration: ${configName}\n`);
        console.log(yaml.dump(config, { indent: 2 }));
    }
    
    async copyConfig() {
        const configs = await this.getConfigList();
        
        if (configs.length === 0) {
            console.log('\n📭 No configurations found.\n');
            return;
        }
        
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'sourceConfig',
                message: 'Select configuration to copy:',
                choices: configs
            },
            {
                type: 'input',
                name: 'targetName',
                message: 'New configuration name:',
                validate: (value) => {
                    if (!value.trim()) return 'Name cannot be empty';
                    if (!/^[a-zA-Z0-9-_]+$/.test(value)) return 'Name can only contain letters, numbers, hyphens, and underscores';
                    return true;
                }
            }
        ]);
        
        const sourcePath = path.join(this.configDir, `${answers.sourceConfig}.yaml`);
        const targetPath = path.join(this.configDir, `${answers.targetName}.yaml`);
        
        if (await fs.pathExists(targetPath)) {
            console.log('\n❌ Target configuration already exists.\n');
            return;
        }
        
        await fs.copy(sourcePath, targetPath);
        console.log(`\n✅ Configuration copied: ${answers.sourceConfig} -> ${answers.targetName}\n`);
    }
    
    async deleteConfig() {
        const configs = await this.getConfigList();
        
        if (configs.length === 0) {
            console.log('\n📭 No configurations found.\n');
            return;
        }
        
        const { configName } = await inquirer.prompt([
            {
                type: 'list',
                name: 'configName',
                message: 'Select configuration to delete:',
                choices: configs
            }
        ]);
        
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `Are you sure you want to delete "${configName}"?`,
                default: false
            }
        ]);
        
        if (confirm) {
            const configPath = path.join(this.configDir, `${configName}.yaml`);
            await fs.remove(configPath);
            console.log(`\n✅ Configuration deleted: ${configName}\n`);
        } else {
            console.log('\n⏭️  Deletion cancelled.\n');
        }
    }
    
    async listConfigs() {
        const configs = await this.getConfigList();
        
        if (configs.length === 0) {
            console.log('\n📭 No configurations found.\n');
            return;
        }
        
        console.log('\n📚 Available configurations:\n');
        
        for (const configName of configs) {
            const configPath = path.join(this.configDir, `${configName}.yaml`);
            const stats = await fs.stat(configPath);
            console.log(`  • ${configName} (modified: ${stats.mtime.toLocaleDateString()})`);
        }
        
        console.log('');
    }
    
    async resetConfig() {
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Reset to default configuration? This will overwrite the default config.',
                default: false
            }
        ]);
        
        if (confirm) {
            const defaultConfig = ExcelConfig.getDefaultConfig();
            await this.saveConfig(this.defaultConfigPath, defaultConfig);
            console.log('\n✅ Default configuration reset.\n');
        } else {
            console.log('\n⏭️  Reset cancelled.\n');
        }
    }
    
    async getConfigList() {
        try {
            const files = await fs.readdir(this.configDir);
            return files
                .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
                .map(file => path.basename(file, path.extname(file)));
        } catch (error) {
            return [];
        }
    }
    
    async loadConfig(configPath) {
        const content = await fs.readFile(configPath, 'utf8');
        return yaml.load(content);
    }
    
    async saveConfig(configPath, config) {
        const content = yaml.dump(config, { indent: 2 });
        await fs.writeFile(configPath, content, 'utf8');
    }
    
    buildConfig(basicConfig, styleConfig) {
        return {
            outputPath: basicConfig.outputPath,
            filename: basicConfig.filename,
            worksheet: {
                name: basicConfig.worksheetName,
                splitByHeaders: basicConfig.splitByHeaders
            },
            columnWidths: {
                content: basicConfig.contentColumnWidth,
                type: basicConfig.typeColumnWidth,
                level: basicConfig.levelColumnWidth
            },
            contentMapping: {
                includeType: basicConfig.includeType,
                includeLevel: basicConfig.includeLevel,
                includeContent: basicConfig.includeContent,
                preserveFormatting: basicConfig.preserveFormatting,
                maxCellLength: basicConfig.maxCellLength
            },
            tableHandling: {
                separateTableSheets: basicConfig.separateTableSheets,
                tableSheetPrefix: basicConfig.tableSheetPrefix || 'Table_'
            },
            styles: this.getStylePreset(styleConfig.headerStyle, styleConfig)
        };
    }
    
    getStylePreset(preset, styleConfig) {
        // 这里可以根据预设返回不同的样式配置
        // 为简化，返回默认样式
        return ExcelConfig.getDefaultConfig().styles;
    }
    
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
}

// 主函数
async function main() {
    const manager = new ConfigManager();
    await manager.run();
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
    console.error(`\n❌ Unhandled Rejection: ${reason}\n`);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error(`\n❌ Uncaught Exception: ${error.message}\n`);
    process.exit(1);
});

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = ConfigManager;