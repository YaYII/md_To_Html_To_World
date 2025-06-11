/**
 * Excel转换配置接口
 * 定义Markdown转Excel的各种配置选项
 */

class ExcelConfig {
    constructor(config = {}) {
        // 基础配置
        this.outputPath = config.outputPath || './output';
        this.filename = config.filename || 'converted';
        this.overwrite = config.overwrite !== false;
        
        // 工作表配置
        this.worksheet = {
            name: config.worksheet?.name || 'Content',
            splitByHeaders: config.worksheet?.splitByHeaders || false,
            maxRowsPerSheet: config.worksheet?.maxRowsPerSheet || 1000000
        };
        
        // 样式配置
        this.styles = {
            // 标题样式 - 使用现代化的渐变色彩和更好的视觉层次
            headers: {
                h1: {
                    font: { bold: true, size: 20, color: { argb: 'FF1F4E79' }, name: 'Segoe UI' },
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7F3FF' } },
                    alignment: { horizontal: 'left', vertical: 'middle', wrapText: false },
                    border: this.getHeaderBorder()
                },
                h2: {
                    font: { bold: true, size: 18, color: { argb: 'FF2F5F8F' }, name: 'Segoe UI' },
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF7FF' } },
                    alignment: { horizontal: 'left', vertical: 'middle', wrapText: false },
                    border: this.getHeaderBorder()
                },
                h3: {
                    font: { bold: true, size: 16, color: { argb: 'FF3F6F9F' }, name: 'Segoe UI' },
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5FAFF' } },
                    alignment: { horizontal: 'left', vertical: 'middle', wrapText: false },
                    border: this.getHeaderBorder()
                },
                h4: {
                    font: { bold: true, size: 14, color: { argb: 'FF4F7FAF' }, name: 'Segoe UI' },
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCFDFF' } },
                    alignment: { horizontal: 'left', vertical: 'middle', wrapText: false },
                    border: this.getSubHeaderBorder()
                },
                h5: {
                    font: { bold: true, size: 13, color: { argb: 'FF5F8FBF' }, name: 'Segoe UI' },
                    alignment: { horizontal: 'left', vertical: 'middle', wrapText: false },
                    border: this.getSubHeaderBorder()
                },
                h6: {
                    font: { bold: true, size: 12, color: { argb: 'FF6F9FCF' }, name: 'Segoe UI' },
                    alignment: { horizontal: 'left', vertical: 'middle', wrapText: false },
                    border: this.getSubHeaderBorder()
                }
            },
            
            // 内容样式 - 现代化设计，提升可读性
            content: {
                paragraph: {
                    font: { size: 12, color: { argb: 'FF2D3748' }, name: 'Segoe UI' },
                    alignment: { horizontal: 'left', vertical: 'middle', wrapText: false, indent: 1 },
                    border: this.getContentBorder()
                },
                code: {
                    font: { name: 'Consolas', size: 11, color: { argb: 'FF1A202C' } },
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FAFC' } },
                    alignment: { horizontal: 'left', vertical: 'middle', wrapText: false, indent: 1 },
                    border: this.getCodeBorder()
                },
                blockquote: {
                    font: { italic: true, size: 12, color: { argb: 'FF4A5568' }, name: 'Segoe UI' },
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFEFE' } },
                    alignment: { horizontal: 'left', vertical: 'middle', wrapText: false, indent: 2 },
                    border: {
                        left: { style: 'thick', color: { argb: 'FF4299E1' } },
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    }
                },
                list: {
                    font: { size: 12, color: { argb: 'FF2D3748' }, name: 'Segoe UI' },
                    alignment: { horizontal: 'left', vertical: 'middle', wrapText: false, indent: 1 },
                    border: this.getContentBorder()
                }
            },
            
            // 表格样式 - 专业的商务风格，换行由表格内容自身决定
            table: {
                header: {
                    font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' },
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B6CB0' } },
                    alignment: { horizontal: 'center', vertical: 'middle' },
                    border: this.getTableBorder()
                },
                cell: {
                    font: { size: 11, color: { argb: 'FF2D3748' }, name: 'Segoe UI' },
                    alignment: { horizontal: 'left', vertical: 'middle' },
                    border: this.getTableBorder()
                },
                alternateRow: {
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
                }
            }
        };
        
        // 列宽配置
        this.columnWidths = {
            default: 20,
            content: config.columnWidths?.content || 50,
            type: config.columnWidths?.type || 25,  // 增加Type列宽度
            level: config.columnWidths?.level || 10
        };
        
        // 内容映射配置
        this.contentMapping = {
            includeType: config.contentMapping?.includeType === true,
            includeLevel: config.contentMapping?.includeLevel === true,
            includeContent: config.contentMapping?.includeContent !== false,
            preserveFormatting: config.contentMapping?.preserveFormatting !== false,
            maxCellLength: config.contentMapping?.maxCellLength || 32767
        };
        
        // 表格处理配置
        this.tableHandling = {
            preserveOriginalTables: config.tableHandling?.preserveOriginalTables !== false,
            separateTableSheets: config.tableHandling?.separateTableSheets || false,
            tableSheetPrefix: config.tableHandling?.tableSheetPrefix || 'Table_'
        };
        
        // 合并配置
        Object.assign(this, config);
    }
    
    getDefaultBorder() {
        return {
            top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };
    }

    getHeaderBorder() {
        return {
            top: { style: 'medium', color: { argb: 'FF1A365D' } },
            left: { style: 'medium', color: { argb: 'FF1A365D' } },
            bottom: { style: 'medium', color: { argb: 'FF1A365D' } },
            right: { style: 'medium', color: { argb: 'FF1A365D' } }
        };
    }

    getSubHeaderBorder() {
        return {
            top: { style: 'thin', color: { argb: 'FF2B6CB0' } },
            left: { style: 'thin', color: { argb: 'FF2B6CB0' } },
            bottom: { style: 'thin', color: { argb: 'FF2B6CB0' } },
            right: { style: 'thin', color: { argb: 'FF2B6CB0' } }
        };
    }

    getContentBorder() {
        return {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
    }

    getCodeBorder() {
        return {
            top: { style: 'thin', color: { argb: 'FFCBD5E0' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E0' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E0' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E0' } }
        };
    }

    getTableBorder() {
        return {
            top: { style: 'thin', color: { argb: 'FF718096' } },
            left: { style: 'thin', color: { argb: 'FF718096' } },
            bottom: { style: 'thin', color: { argb: 'FF718096' } },
            right: { style: 'thin', color: { argb: 'FF718096' } }
        };
    }
    
    /**
     * 获取默认配置
     */
    static getDefaultConfig() {
        return new ExcelConfig();
    }
    
    /**
     * 从文件加载配置
     */
    static async loadFromFile(configPath) {
        const fs = require('fs-extra');
        const yaml = require('js-yaml');
        const path = require('path');
        
        try {
            if (await fs.pathExists(configPath)) {
                const configContent = await fs.readFile(configPath, 'utf8');
                const ext = path.extname(configPath).toLowerCase();
                
                let configData;
                if (ext === '.yaml' || ext === '.yml') {
                    configData = yaml.load(configContent);
                } else if (ext === '.json') {
                    configData = JSON.parse(configContent);
                } else {
                    throw new Error(`Unsupported config file format: ${ext}`);
                }
                
                return new ExcelConfig(configData);
            }
        } catch (error) {
            console.warn(`Failed to load config from ${configPath}:`, error.message);
        }
        
        return new ExcelConfig();
    }
    
    /**
     * 保存配置到文件
     */
    async saveToFile(configPath) {
        const fs = require('fs-extra');
        const yaml = require('js-yaml');
        const path = require('path');
        
        await fs.ensureDir(path.dirname(configPath));
        
        const ext = path.extname(configPath).toLowerCase();
        let content;
        
        if (ext === '.yaml' || ext === '.yml') {
            content = yaml.dump(this, { indent: 2 });
        } else if (ext === '.json') {
            content = JSON.stringify(this, null, 2);
        } else {
            throw new Error(`Unsupported config file format: ${ext}`);
        }
        
        await fs.writeFile(configPath, content, 'utf8');
    }
}

module.exports = ExcelConfig;