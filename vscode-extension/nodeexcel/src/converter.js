/**
 * Markdown到Excel主转换器
 * 整合Markdown->HTML->Excel的完整转换流程
 */

const MarkdownToHtml = require('./markdownToHtml/markdownToHtml');
const HtmlToExcelConverter = require('./htmlToExcel/htmlToExcelConverter');
const ExcelConfig = require('./config/excelConfig');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class Converter {
    constructor(config = {}) {
        this.config = config instanceof ExcelConfig ? config : new ExcelConfig(config);
        this.markdownToHtml = new MarkdownToHtml(this.config);
        this.tempDir = path.join(os.tmpdir(), 'md-to-excel-converter');
    }
    
    /**
     * 初始化转换器
     */
    async initialize() {
        try {
            // 确保临时目录存在
            await fs.ensureDir(this.tempDir);
            console.log('Converter initialized successfully');
        } catch (error) {
            throw new Error(`Failed to initialize converter: ${error.message}`);
        }
    }
    
    /**
     * 转换单个Markdown文件为Excel
     */
    async convertFile(inputPath, outputPath = null) {
        try {
            console.log(`Starting conversion: ${inputPath}`);
            
            // 验证输入文件
            await this.validateInputFile(inputPath);
            
            // 确定输出路径
            if (!outputPath) {
                const basename = path.basename(inputPath, path.extname(inputPath));
                const outputDir = this.config.outputPath || path.dirname(inputPath);
                outputPath = path.join(outputDir, `${this.config.filename || basename}.xlsx`);
            }
            
            // 确保输出目录存在
            await fs.ensureDir(path.dirname(outputPath));
            
            // 检查文件是否被占用
            await this.checkFileAccess(outputPath);
            
            // 第一步：Markdown -> HTML
            console.log('Converting Markdown to HTML...');
            const tempHtmlPath = path.join(this.tempDir, `temp_${Date.now()}.html`);
            const htmlContent = await this.markdownToHtml.convertFile(inputPath, tempHtmlPath);
            
            // 第二步：HTML -> Excel
            console.log('Converting HTML to Excel...');
            const htmlToExcelConverter = new HtmlToExcelConverter(this.config);
            const finalOutputPath = await htmlToExcelConverter.convertFile(tempHtmlPath, outputPath);
            
            // 清理临时文件
            await this.cleanup([tempHtmlPath]);
            
            console.log(`Conversion completed successfully: ${finalOutputPath}`);
            return {
                success: true,
                inputPath,
                outputPath: finalOutputPath,
                message: 'Conversion completed successfully'
            };
            
        } catch (error) {
            console.error(`Conversion failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * 批量转换Markdown文件
     */
    async convertBatch(inputPattern, outputDir = null) {
        try {
            console.log(`Starting batch conversion: ${inputPattern}`);
            
            const glob = require('glob');
            const files = glob.sync(inputPattern);
            
            if (files.length === 0) {
                throw new Error(`No files found matching pattern: ${inputPattern}`);
            }
            
            // 确定输出目录
            if (!outputDir) {
                outputDir = this.config.outputPath || './output';
            }
            await fs.ensureDir(outputDir);
            
            console.log(`Found ${files.length} files to convert`);
            
            const results = [];
            const tempFiles = [];
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                console.log(`Converting file ${i + 1}/${files.length}: ${file}`);
                
                try {
                    const basename = path.basename(file, path.extname(file));
                    const outputPath = path.join(outputDir, `${basename}.xlsx`);
                    
                    // 检查文件是否被占用
                    await this.checkFileAccess(outputPath);
                    
                    // 转换文件
                    const result = await this.convertFile(file, outputPath);
                    results.push(result);
                    
                } catch (error) {
                    console.error(`Failed to convert ${file}: ${error.message}`);
                    results.push({
                        success: false,
                        inputPath: file,
                        error: error.message
                    });
                }
            }
            
            // 清理所有临时文件
            await this.cleanup(tempFiles);
            
            const successCount = results.filter(r => r.success).length;
            console.log(`Batch conversion completed: ${successCount}/${files.length} files converted successfully`);
            
            return {
                success: true,
                totalFiles: files.length,
                successCount,
                failureCount: files.length - successCount,
                results
            };
            
        } catch (error) {
            console.error(`Batch conversion failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * 转换Markdown字符串为Excel Buffer
     */
    async convertString(markdownContent, filename = 'converted') {
        try {
            console.log('Converting Markdown string to Excel...');
            
            // 第一步：Markdown -> HTML
            const htmlContent = this.markdownToHtml.convertString(markdownContent);
            
            // 第二步：HTML -> Excel
            const htmlToExcelConverter = new HtmlToExcelConverter(this.config);
            const workbook = await htmlToExcelConverter.convertString(htmlContent);
            
            // 生成Buffer
            const buffer = await workbook.xlsx.writeBuffer();
            
            console.log('String conversion completed successfully');
            return {
                success: true,
                buffer,
                filename: `${filename}.xlsx`,
                message: 'String conversion completed successfully'
            };
            
        } catch (error) {
            console.error(`String conversion failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * 验证输入文件
     */
    async validateInputFile(inputPath) {
        if (!inputPath) {
            throw new Error('Input file path is required');
        }
        
        if (!await fs.pathExists(inputPath)) {
            throw new Error(`Input file does not exist: ${inputPath}`);
        }
        
        const stats = await fs.stat(inputPath);
        if (!stats.isFile()) {
            throw new Error(`Input path is not a file: ${inputPath}`);
        }
        
        const ext = path.extname(inputPath).toLowerCase();
        if (!['.md', '.markdown'].includes(ext)) {
            throw new Error(`Unsupported file type: ${ext}. Only .md and .markdown files are supported.`);
        }
    }
    
    /**
     * 检查文件访问权限
     */
    async checkFileAccess(filePath) {
        try {
            if (await fs.pathExists(filePath)) {
                // 检查文件是否被占用
                const fd = await fs.open(filePath, 'r+');
                await fs.close(fd);
            }
        } catch (error) {
            if (error.code === 'EBUSY' || error.code === 'EACCES') {
                throw new Error(`File is currently in use or access denied: ${filePath}. Please close the file and try again.`);
            }
            // 其他错误可能是正常的（如文件不存在）
        }
    }
    
    /**
     * 清理临时文件
     */
    async cleanup(tempFiles = []) {
        try {
            for (const file of tempFiles) {
                if (await fs.pathExists(file)) {
                    await fs.remove(file);
                }
            }
            
            // 清理临时目录（如果为空）
            try {
                const files = await fs.readdir(this.tempDir);
                if (files.length === 0) {
                    await fs.remove(this.tempDir);
                }
            } catch (error) {
                // 忽略清理错误
            }
        } catch (error) {
            console.warn(`Cleanup warning: ${error.message}`);
        }
    }
    
    /**
     * 获取转换器信息
     */
    getInfo() {
        return {
            name: 'Markdown to Excel Converter',
            version: '1.0.0',
            description: 'Convert Markdown documents to Excel spreadsheets with intelligent content mapping',
            supportedInputFormats: ['.md', '.markdown'],
            outputFormat: '.xlsx',
            features: [
                'Intelligent content mapping',
                'Multiple worksheet support',
                'Customizable styling',
                'Table preservation',
                'Batch conversion',
                'Command line interface'
            ],
            config: {
                outputPath: this.config.outputPath,
                filename: this.config.filename,
                worksheetName: this.config.worksheet.name,
                includeType: this.config.contentMapping.includeType,
                includeLevel: this.config.contentMapping.includeLevel,
                includeContent: this.config.contentMapping.includeContent
            }
        };
    }
    
    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        this.config = new ExcelConfig({ ...this.config, ...newConfig });
        this.markdownToHtml = new MarkdownToHtml(this.config);
        console.log('Configuration updated successfully');
    }
    
    /**
     * 保存当前配置
     */
    async saveConfig(configPath) {
        await this.config.saveToFile(configPath);
        console.log(`Configuration saved to: ${configPath}`);
    }
    
    /**
     * 从文件加载配置
     */
    static async loadConfig(configPath) {
        const config = await ExcelConfig.loadFromFile(configPath);
        return new Converter(config);
    }
    
    /**
     * 创建默认配置文件
     */
    static async createDefaultConfig(configPath) {
        const defaultConfig = ExcelConfig.getDefaultConfig();
        await defaultConfig.saveToFile(configPath);
        console.log(`Default configuration created at: ${configPath}`);
        return configPath;
    }
}

module.exports = Converter;