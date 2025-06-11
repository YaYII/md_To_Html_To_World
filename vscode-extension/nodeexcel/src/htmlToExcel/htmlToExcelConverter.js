/**
 * HTML到Excel转换器
 * 使用ExcelJS实现智能内容映射和样式应用
 */

const ExcelJS = require('exceljs');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

class HtmlToExcelConverter {
    constructor(config) {
        this.config = config;
        this.workbook = new ExcelJS.Workbook();
        this.currentRow = 1;
        this.tableCounter = 0;
        this.maxTableColumns = 0; // 跟踪表格的最大列数
    }
    
    /**
     * 转换HTML文件为Excel
     */
    async convertFile(inputPath, outputPath = null) {
        try {
            // 读取HTML文件
            const htmlContent = await fs.readFile(inputPath, 'utf8');
            
            // 转换为Excel
            await this.convertString(htmlContent);
            
            // 确定输出路径
            if (!outputPath) {
                const basename = path.basename(inputPath, path.extname(inputPath));
                outputPath = path.join(path.dirname(inputPath), `${basename}.xlsx`);
            }
            
            // 保存Excel文件
            await this.saveWorkbook(outputPath);
            
            return outputPath;
        } catch (error) {
            throw new Error(`Failed to convert HTML file: ${error.message}`);
        }
    }
    
    /**
     * 转换HTML字符串为Excel
     */
    async convertString(htmlContent) {
        try {
            // 解析HTML
            const $ = cheerio.load(htmlContent);
            
            // 创建主工作表
            const worksheet = this.workbook.addWorksheet(this.config.worksheet.name);
            
            // 设置列宽
            this.setupColumnWidths(worksheet);
            
            // 添加表头
            this.addHeaders(worksheet);
            
            // 处理HTML内容
            await this.processHtmlContent($, worksheet);
            
            // 应用样式
            this.applyStyles(worksheet);
            
            // 重新设置间隔行的行高（因为applyStyles会设置默认行高）
            this.fixSpacingRowHeights(worksheet);
            
            return this.workbook;
        } catch (error) {
            throw new Error(`Failed to convert HTML string: ${error.message}`);
        }
    }
    
    /**
     * 设置列宽
     */
    setupColumnWidths(worksheet) {
        const columns = [];
        
        // 防御性检查
        if (!this.config || !this.config.contentMapping || !this.config.columnWidths) {
            console.error('Config is missing required properties:', {
                config: !!this.config,
                contentMapping: !!(this.config && this.config.contentMapping),
                columnWidths: !!(this.config && this.config.columnWidths)
            });
            throw new Error('Configuration is incomplete');
        }
        
        if (this.config.contentMapping.includeType) {
            columns.push({ header: 'Type', key: 'type' });
        }
        
        if (this.config.contentMapping.includeLevel) {
            columns.push({ header: 'Level', key: 'level' });
        }
        
        worksheet.columns = columns;
    }
    
    /**
     * 添加表头
     */
    addHeaders(worksheet) {
        // 表头已通过columns设置，这里应用样式
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell) => {
            this.applyCellStyle(cell, this.config.styles.table.header);
        });
        headerRow.commit();
        this.currentRow = 2;
    }
    
    /**
     * 处理HTML内容
     */
    async processHtmlContent($, worksheet) {
        const body = $('body');
        
        // 第一步：扫描所有表格，确定最大列数
        await this.scanTablesForMaxColumns($, body);
        console.log(`扫描完成，表格最大列数: ${this.maxTableColumns}`);
        
        // 第二步：处理所有内容
        await this.processElement($, body, worksheet);
    }
    
    /**
     * 扫描所有表格，确定最大列数
     */
    async scanTablesForMaxColumns($, element) {
        // 查找所有表格元素
        const tables = element.find('table');
        
        for (let i = 0; i < tables.length; i++) {
            const table = tables.eq(i);
            const rows = table.find('tr');
            
            // 计算当前表格的最大列数
            let tableMaxColumns = 0;
            for (let j = 0; j < rows.length; j++) {
                const row = rows.eq(j);
                const cells = row.find('th, td');
                tableMaxColumns = Math.max(tableMaxColumns, cells.length);
            }
            
            // 更新全局最大列数
            this.maxTableColumns = Math.max(this.maxTableColumns, tableMaxColumns);
            console.log(`表格 ${i + 1}: ${tableMaxColumns} 列，当前最大列数: ${this.maxTableColumns}`);
        }
    }
    
    /**
     * 递归处理HTML元素
     */
    async processElement($, element, worksheet, parentLevel = 0) {
        const children = element.children();
        
        for (let i = 0; i < children.length; i++) {
            const child = children.eq(i);
            const tagName = child.get(0).tagName;
            
            if (!tagName) continue;
            
            await this.processElementByType($, child, worksheet, tagName, parentLevel);
        }
    }
    
    /**
     * 根据元素类型处理
     */
    async processElementByType($, element, worksheet, tagName, parentLevel) {
        switch (tagName.toLowerCase()) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                await this.processHeading($, element, worksheet, tagName);
                break;
                
            case 'p':
                await this.processParagraph($, element, worksheet);
                break;
                
            case 'ul':
            case 'ol':
                await this.processList($, element, worksheet, tagName, parentLevel + 1);
                break;
                
            case 'li':
                await this.processListItem($, element, worksheet, parentLevel);
                break;
                
            case 'pre':
                await this.processCodeBlock($, element, worksheet);
                break;
                
            case 'blockquote':
                await this.processBlockquote($, element, worksheet);
                break;
                
            case 'table':
                await this.processTable($, element, worksheet);
                break;
                
            case 'div':
                // 递归处理div内容
                await this.processElement($, element, worksheet, parentLevel);
                break;
                
            default:
                // 对于其他元素，检查是否有文本内容
                const text = this.extractTextWithLineBreaks($, element);
                if (text) {
                    await this.addContentRow(worksheet, 'text', 0, text);
                }
                break;
        }
    }
    
    /**
     * 处理标题
     */
    async processHeading($, element, worksheet, tagName) {
        const level = parseInt(tagName.slice(1)); // h1 -> 1, h2 -> 2, etc.
        const text = this.extractTextWithLineBreaks($, element);
        
        if (text) {
            // 在标题前添加间隔行（除了第一个标题）
            // if (this.currentRow > 2) { // 跳过表头行和第一个标题
            //     this.addSpacingRow(worksheet);
            // }
            
            const row = await this.addContentRow(worksheet, 'heading', level, text);
            
            // 对于标题行，样式应用到第一列（合并后的单元格）
            const targetCell = row.getCell(1);
            this.applyCellStyle(targetCell, this.config.styles.headers[tagName]);
            
            // 确保标题不自动换行（非表格内容不启用换行）
            if (targetCell.alignment) {
                targetCell.alignment = {
                    ...targetCell.alignment,
                    wrapText: false
                };
            }
        }
    }
    
    /**
     * 提取HTML元素的文本内容，正确处理换行标签
     */
    extractTextWithLineBreaks($, element) {
        // 将<br>、<br/>、<br />标签替换为换行符
        let html = element.html() || '';
        html = html.replace(/<br\s*\/?>/gi, '\n');
        
        // 创建临时元素来提取纯文本
        const tempElement = $('<div>').html(html);
        return tempElement.text().trim();
    }

    /**
     * 处理段落
     */
    async processParagraph($, element, worksheet) {
        const text = this.extractTextWithLineBreaks($, element);
        
        if (text) {
            const row = await this.addContentRow(worksheet, 'paragraph', 0, text);
            // 计算content列的索引
            let contentColIndex = 1;
            if (this.config.contentMapping.includeType) contentColIndex++;
            if (this.config.contentMapping.includeLevel) contentColIndex++;
            
            // 非表格内容不启用自动换行
            const contentCell = row.getCell(contentColIndex);
            contentCell.alignment = {
                horizontal: 'left',
                vertical: 'middle',
                wrapText: false  // 非表格内容不启用自动换行
            };
            
            this.applyCellStyle(contentCell, this.config.styles.content.paragraph);
        }
    }
    
    /**
     * 处理列表
     */
    async processList($, element, worksheet, tagName, level) {
        const items = element.children('li');
        
        for (let i = 0; i < items.length; i++) {
            const item = items.eq(i);
            await this.processListItem($, item, worksheet, level);
        }
    }
    
    /**
     * 处理列表项
     */
    async processListItem($, element, worksheet, level) {
        const text = this.extractTextWithLineBreaks($, element);
        
        if (text) {
            const prefix = '  '.repeat(level - 1) + '• ';
            const row = await this.addContentRow(worksheet, 'list-item', level, prefix + text);
            // 计算content列的索引
            let contentColIndex = 1;
            if (this.config.contentMapping.includeType) contentColIndex++;
            if (this.config.contentMapping.includeLevel) contentColIndex++;
            this.applyCellStyle(row.getCell(contentColIndex), this.config.styles.content.list);
        }
    }
    
    /**
     * 处理代码块
     */
    async processCodeBlock($, element, worksheet) {
        const code = element.find('code');
        const text = code.length > 0 ? code.text() : element.text();
        const language = code.attr('class')?.replace('language-', '') || 'text';
        
        if (text.trim()) {
            const content = `[${language}]\n${text}`;
            const row = await this.addContentRow(worksheet, 'code-block', 0, content);
            // 计算content列的索引
            let contentColIndex = 1;
            if (this.config.contentMapping.includeType) contentColIndex++;
            if (this.config.contentMapping.includeLevel) contentColIndex++;
            this.applyCellStyle(row.getCell(contentColIndex), this.config.styles.content.code);
        }
    }
    
    /**
     * 处理引用块
     */
    async processBlockquote($, element, worksheet) {
        const text = this.extractTextWithLineBreaks($, element);
        if (text) {
            const row = await this.addContentRow(worksheet, 'blockquote', 0, `> ${text}`);
            // 计算content列的索引
            let contentColIndex = 1;
            if (this.config.contentMapping.includeType) contentColIndex++;
            if (this.config.contentMapping.includeLevel) contentColIndex++;
            this.applyCellStyle(row.getCell(contentColIndex), this.config.styles.content.blockquote);
        }
    }
    
    /**
     * 处理表格
     */
    async processTable($, element, worksheet) {
        this.tableCounter++;
        
        if (this.config.tableHandling.separateTableSheets) {
            // 创建单独的工作表处理表格
            const tableWorksheet = this.workbook.addWorksheet(
                `${this.config.tableHandling.tableSheetPrefix}${this.tableCounter}`
            );
            await this.convertHtmlTableToExcel($, element, tableWorksheet, 1);
            
            if (this.config.tableHandling.preserveOriginalTables) {
                // 在主工作表中添加表格引用
                const tableInfo = `[Table ${this.tableCounter}] - See separate sheet`;
                await this.addContentRow(worksheet, 'table-reference', 0, tableInfo);
            }
        } else {
            // 直接在主工作表中显示表格内容
            await this.convertHtmlTableToExcel($, element, worksheet, this.currentRow);
        }
    }
    
    /**
     * 将HTML表格转换为Excel表格
     */
    async convertHtmlTableToExcel($, tableElement, worksheet, startRow = 1) {
        const rows = tableElement.find('tr');
        let excelRowIndex = startRow;
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows.eq(i);
            const cells = row.find('th, td');
            const excelRow = worksheet.getRow(excelRowIndex);
            let maxRowHeight = 20; // 默认行高
            
            for (let j = 0; j < cells.length; j++) {
                const cell = cells.eq(j);
                const cellText = this.extractTextWithLineBreaks($, cell);
                const excelCell = excelRow.getCell(j + 1);
                
                excelCell.value = cellText;
                
                // 先应用样式
                if (cell.is('th')) {
                    this.applyCellStyle(excelCell, this.config.styles.table.header);
                } else {
                    this.applyCellStyle(excelCell, this.config.styles.table.cell);
                    
                    // 交替行样式
                    if (i % 2 === 0) {
                        if (!excelCell.fill) {
                            excelCell.fill = {};
                        }
                        Object.assign(excelCell.fill, this.config.styles.table.alternateRow.fill);
                    }
                }
                
                // 表格内容的换行逻辑：检查换行符或字符长度
                const hasLineBreaks = cellText.includes('\n');
                const isLongText = cellText.length > 30;
                
                if (hasLineBreaks || isLongText) {
                    // 包含换行符或文字超过30字符时启用自动换行
                    excelCell.alignment = {
                        ...excelCell.alignment,
                        wrapText: true,
                        vertical: 'top'
                    };
                    
                    let estimatedRows;
                    if (hasLineBreaks) {
                        // 基于换行符计算行数
                        estimatedRows = cellText.split('\n').length;
                    } else {
                        // 基于字符长度估算行数（每行约30字符）
                        estimatedRows = Math.ceil(cellText.length / 30);
                    }
                    
                    // 计算行高（每行25像素，最小25，最大150）
                    const calculatedHeight = Math.max(25, Math.min(150, estimatedRows * 25));
                    maxRowHeight = Math.max(maxRowHeight, calculatedHeight);
                } else {
                    // 短文本且无换行符时，不启用换行
                    excelCell.alignment = {
                        ...excelCell.alignment,
                        wrapText: false,
                        vertical: 'middle'
                    };
                }
            }
            
            // 设置行高
            excelRow.height = maxRowHeight;
            
            excelRow.commit();
            excelRowIndex++;
        }
        
        // 如果是在主工作表中插入表格，更新当前行位置
        if (startRow === this.currentRow) {
            this.currentRow = excelRowIndex;
        }
        
        // 根据表格标题内容智能调整列宽
        const headerRow = tableElement.find('tr').first();
        const headerCells = headerRow.find('th, td');
        
        // 将列索引转换为Excel列名 (0->A, 1->B, 2->C, ...)
        const getColumnName = (index) => {
            let result = '';
            let colIndex = index + 1; // 转换为1-based索引
            while (colIndex > 0) {
                colIndex--;
                result = String.fromCharCode(65 + (colIndex % 26)) + result;
                colIndex = Math.floor(colIndex / 26);
            }
            return result;
        };
        
        worksheet.columns.forEach((column, index) => {
            const columnName = getColumnName(index);
            let columnWidth = 14; // 默认列宽14px
            let needsWidthCalculation = false;
            let headerEstimatedWidth = 0;
            
            // 检查表头内容是否超出默认宽度
            if (headerCells.length > index) {
                const headerCell = headerCells.eq(index);
                const headerText = this.extractTextWithLineBreaks($, headerCell);
                
                if (headerText) {
                    // 计算中英文字符长度
                    const chineseCharCount = (headerText.match(/[\u4e00-\u9fa5]/g) || []).length;
                    const englishCharCount = headerText.length - chineseCharCount;
                    headerEstimatedWidth = (chineseCharCount * 2 + englishCharCount) * 1.2;
                    
                    console.log(`表格列${columnName}: 表头内容="${headerText}", 估算宽度=${headerEstimatedWidth.toFixed(1)}px`);
                    
                    // 如果内容超出默认宽度14px，才需要重新计算
                    if (headerEstimatedWidth > 14) {
                        needsWidthCalculation = true;
                        columnWidth = Math.max(14, Math.min(60, headerEstimatedWidth));
                        console.log(`表格列${columnName}: 表头超出默认宽度，设置为${columnWidth.toFixed(1)}px`);
                    }
                }
            }
            
            // 检查列内容，确保列宽足够显示内容（只检查当前表格范围的行）
            let maxContentLength = 14; // 默认最小宽度
            let maxContentText = '';
            // 只遍历当前表格的行范围，避免包含其他内容
            for (let rowIndex = startRow; rowIndex < excelRowIndex; rowIndex++) {
                const row = worksheet.getRow(rowIndex);
                const cell = row.getCell(index + 1);
                if (cell.value) {
                    const cellText = cell.value.toString();
                    const chineseCharCount = (cellText.match(/[\u4e00-\u9fa5]/g) || []).length;
                    const englishCharCount = cellText.length - chineseCharCount;
                    const contentWidth = (chineseCharCount * 2 + englishCharCount) * 1.2;
                    
                    // 如果内容超出默认宽度，标记需要重新计算
                    if (contentWidth > 14) {
                        needsWidthCalculation = true;
                        if (contentWidth > maxContentLength) {
                            maxContentLength = contentWidth;
                            maxContentText = cellText;
                        }
                    }
                }
            }
            
            if (maxContentText) {
                console.log(`表格列${columnName}: 最长内容="${maxContentText}", 估算宽度=${maxContentLength.toFixed(1)}px`);
            }
            
            // 只有当内容超出默认宽度时才重新计算列宽
            if (needsWidthCalculation) {
                // 计算基础宽度，然后增加2个字符宽度避免挤压
                const baseWidth = Math.max(columnWidth, Math.min(maxContentLength, 60));
                const finalWidth = baseWidth + 2.4; // 增加2个字符宽度 (1.2 * 2)
                column.width = finalWidth;
                console.log(`表格列${columnName}: 基础宽度=${baseWidth.toFixed(1)}px, 最终设置宽度=${finalWidth.toFixed(1)}px (增加2字符宽度)`);
            } else {
                // 默认宽度也增加2个字符宽度
                const finalWidth = 14 + 2.4;
                column.width = finalWidth;
                console.log(`表格列${columnName}: 默认宽度增加2字符后=${finalWidth.toFixed(1)}px`);
            }
        });
    }
    
    /**
     * 根据内容长度自动调整列宽
     * @param {Object} worksheet - 工作表对象
     * @param {string} content - 内容文本
     * @param {number} totalColumns - 总列数（用于合并单元格时的宽度分配）
     */
    adjustColumnWidth(worksheet, content, totalColumns) {
        // 计算中英文字符长度
        const chineseCharCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishCharCount = content.length - chineseCharCount;
        const estimatedWidth = (chineseCharCount * 2 + englishCharCount) * 1.2; // 1.2是字符宽度系数
        
        // 默认宽度14px，只有内容超出时才重新计算
        const defaultWidth = 14;
        const maxWidth = 100;
        
        // 如果是合并单元格（totalColumns > 1），需要智能分配宽度
        if (totalColumns > 1) {
            // 根据列的实际用途设置合理宽度
            for (let i = 1; i <= totalColumns; i++) {
                const column = worksheet.getColumn(i);
                let targetWidth = defaultWidth; // 默认14px
                
                // 只有内容超出默认宽度时才重新计算
                if (estimatedWidth > defaultWidth) {
                    if (i === 1 && this.config.contentMapping.includeType) {
                        // Type列保持合理宽度
                        targetWidth = Math.max(25, Math.min(maxWidth, estimatedWidth));
                    } else if ((i === 1 && !this.config.contentMapping.includeType) || 
                              (i === 2 && this.config.contentMapping.includeType)) {
                        // Level列保持合理宽度
                        targetWidth = Math.max(15, Math.min(maxWidth, estimatedWidth));
                    } else {
                        // Content列可以更宽一些
                        targetWidth = Math.max(30, Math.min(maxWidth, estimatedWidth));
                    }
                }
                
                // 每列独立计算，确保不受其他列影响
                if (!column.width) {
                     column.width = targetWidth;
                 } else {
                     // 只有当新计算的宽度确实更大时才更新
                     column.width = Math.max(column.width, targetWidth);
                 }
            }
        } else {
            // 单列情况，只有内容超出默认宽度时才重新计算
            const column = worksheet.getColumn(1);
            let targetWidth = defaultWidth;
            
            if (estimatedWidth > defaultWidth) {
                targetWidth = Math.max(defaultWidth, Math.min(maxWidth, estimatedWidth));
            }
            
            // 每列独立计算，确保不受其他列影响
            if (!column.width) {
                 column.width = targetWidth;
             } else {
                 // 只有当新计算的宽度确实更大时才更新
                 column.width = Math.max(column.width, targetWidth);
             }
        }
    }
    
    /**
     * 根据内容长度调整指定列的宽度
     * @param {Object} worksheet - 工作表对象
     * @param {string} content - 内容文本
     * @param {number} columnIndex - 列索引（从1开始）
     */
    adjustColumnWidthForColumn(worksheet, content, columnIndex) {
        if (!content) return;
        
        // 计算中英文字符长度
        const chineseCharCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishCharCount = content.length - chineseCharCount;
        const estimatedWidth = (chineseCharCount * 2 + englishCharCount) * 1.2; // 1.2是字符宽度系数
        
        // 默认宽度14px，只有内容超出时才重新计算
        const defaultWidth = 14;
        let targetWidth = defaultWidth;
        
        // 只有内容超出默认宽度时才重新计算
        if (estimatedWidth > defaultWidth) {
            const minWidth = defaultWidth; // 统一使用默认宽度作为最小宽度
            const maxWidth = 80;
            targetWidth = Math.max(minWidth, Math.min(maxWidth, estimatedWidth));
        }
        
        // 设置指定列的宽度 - 每列独立计算，不受其他列影响
        const column = worksheet.getColumn(columnIndex);
        
        // 将列索引转换为Excel列名 (1->A, 2->B, 3->C, ...)
        const getColumnName = (index) => {
            let result = '';
            while (index > 0) {
                index--;
                result = String.fromCharCode(65 + (index % 26)) + result;
                index = Math.floor(index / 26);
            }
            return result;
        };
        
        const columnName = getColumnName(columnIndex);
        const originalWidth = column.width || '未设置';
        console.log(`列${columnName}: 原始宽度=${originalWidth}, 估算宽度=${estimatedWidth.toFixed(1)}px, 目标宽度=${targetWidth}px`);
        
        // 只有当内容超出默认宽度时才设置新宽度
        if (targetWidth > defaultWidth) {
            if (!column.width) {
                column.width = targetWidth;
            } else {
                // 只有当新计算的宽度确实更大时才更新，避免列间相互影响
                column.width = Math.max(column.width, targetWidth);
            }
            console.log(`列${columnName}: 最终设置宽度=${column.width}px (超出默认宽度)`);
        } else {
            console.log(`列${columnName}: 保持默认宽度=${defaultWidth}px (内容未超出)`);
        }
        // 如果内容没有超出默认宽度，保持默认宽度（不设置column.width，让Excel使用默认值）
    }
    
    // /**
    //  * 添加间隔行
    //  */
    // addSpacingRow(worksheet) {
    //     // 先递增行号，然后获取新行
    //     this.currentRow++;
    //     const row = worksheet.getRow(this.currentRow);
        
    //     // 创建一个空行作为间隔
    //     row.height = 10; // 设置较小的行高作为间隔
        
    //     // 在第一列添加空内容并设置样式
    //     const cell = row.getCell(1);
    //     cell.value = ''; // 空内容
    //     cell.fill = {
    //         type: 'pattern',
    //         pattern: 'solid',
    //         fgColor: { argb: 'FFFFFFFF' } // 纯白色背景
    //     };
        
    //     row.commit();
    //     return row;
    // }

    /**
     * 修复间隔行的行高（在applyStyles之后调用）
     */
    fixSpacingRowHeights(worksheet) {
        for (let i = 1; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const cell = row.getCell(1);
            
            // 检查是否为间隔行（空内容且有纯白色背景）
            const isEmpty = !cell.value || cell.value.toString().trim() === '';
            const hasWhiteBackground = cell.fill && 
                cell.fill.fgColor && 
                cell.fill.fgColor.argb === 'FFFFFFFF';
            
            if (isEmpty && hasWhiteBackground) {
                row.height = 10; // 重新设置间隔行的行高
            }
        }
    }
    
    /**
     * 添加内容行
     */
    async addContentRow(worksheet, type, level, content) {
        // 限制内容长度
        if (content.length > this.config.contentMapping.maxCellLength) {
            content = content.substring(0, this.config.contentMapping.maxCellLength - 3) + '...';
        }
        
        // 先递增行号，再获取行
        this.currentRow++;
        const row = worksheet.getRow(this.currentRow);
        const isHeading = type === 'heading';
        
        // 使用表格的最大列数来确定合并范围
        const totalColumns = Math.max(this.maxTableColumns, 1); // 至少1列
        
        // 处理标题和内容行
        
        if (isHeading && totalColumns > 1) {
            // 标题行：合并所有列，内容放在第一列
            const startCol = 1;
            const endCol = Math.min(totalColumns, 16384); // Excel最大列数限制
            
            // 设置第一列的值
            row.getCell(startCol).value = content;
            
            // 安全检查：确保列数在有效范围内
            if (endCol >= startCol && endCol <= 16384) {
                try {
                    // 使用数字参数方式：mergeCells(startRow, startCol, endRow, endCol)
                    console.log(`Merging cells: row ${this.currentRow}, cols ${startCol}-${endCol} (基于表格最大列数${this.maxTableColumns})`);
                    worksheet.mergeCells(this.currentRow, startCol, this.currentRow, endCol);
                    
                    // 为合并后的单元格设置样式，根据内容长度决定是否换行
                    const mergedCell = row.getCell(startCol);
                    const contentLength = content.length;
                    const needsWrapping = contentLength > 30;
                    
                    mergedCell.alignment = {
                        horizontal: 'left',
                        vertical: 'middle',
                        wrapText: false  // 非表格内容不启用自动换行
                    };
                    
                    // 非表格内容使用默认行高
                    
                    // 非表格内容不需要计算列宽，保持默认宽度
                } catch (error) {
                    console.warn(`Failed to merge cells for heading: ${error.message}`);
                    console.warn(`Debug info: currentRow=${this.currentRow}, startCol=${startCol}, endCol=${endCol}, totalColumns=${totalColumns}`);
                    // 如果合并失败，至少设置第一列的样式
                    const cell = row.getCell(startCol);
                    const contentLength = content.length;
                    const needsWrapping = contentLength > 30;
                    
                    cell.alignment = {
                        horizontal: 'left',
                        vertical: 'middle',
                        wrapText: false  // 非表格内容不启用自动换行
                    };
                    
                    // 非表格内容使用默认行高
                    
                    // 非表格内容不需要计算列宽，保持默认宽度
                }
            }
            
        } else {
            // 非标题行：对于非表格内容，实现列合并优化
            if (type !== 'table' && totalColumns > 1) {
                // 非表格内容：合并多列后再计算宽度，避免表格内容出现问题
                const startRow = this.currentRow;
                const endRow = this.currentRow; // 单行
                const startCol = 1;
                const endCol = Math.min(totalColumns, 16384); // 合并所有列
                
                // 设置第一列的值
                row.getCell(startCol).value = content;
                
                try {
                    // 合并当前行的所有列
                    console.log(`Merging non-table content columns: row ${startRow}, cols ${startCol}-${endCol} (基于表格最大列数${this.maxTableColumns})`);
                    worksheet.mergeCells(startRow, startCol, endRow, endCol);
                    
                    // 为合并后的单元格设置样式
                    const mergedCell = row.getCell(startCol);
                    mergedCell.alignment = {
                        horizontal: 'left',
                        vertical: 'middle',
                        wrapText: true  // 列合并的内容启用自动换行
                    };
                    
                    // 非表格内容不需要计算列宽，保持默认宽度即可
                    
                } catch (error) {
                    console.warn(`Failed to merge columns for non-table content: ${error.message}`);
                    // 如果合并失败，回退到原有逻辑
                    this.addContentRowFallback(worksheet, row, type, level, content);
                }
            } else {
                // 表格内容或单列情况：按原有逻辑填充各列
                this.addContentRowFallback(worksheet, row, type, level, content);
            }
        }
        
        row.commit();
        
        // 添加间隔行
        //this.addSpacingRow(worksheet);
        
        return row;
    }
    
    /**
     * 回退方案：按原有逻辑添加内容行
     */
    addContentRowFallback(worksheet, row, type, level, content) {
        let colIndex = 1;
        
        if (this.config.contentMapping.includeType) {
            const typeCell = row.getCell(colIndex);
            typeCell.value = type;
            // 设置Type单元格不换行
            typeCell.alignment = {
                horizontal: 'left',
                vertical: 'middle',
                wrapText: false
            };
            // 非表格内容不需要计算列宽
            colIndex++;
        }
        
        if (this.config.contentMapping.includeLevel) {
            const levelCell = row.getCell(colIndex);
            const levelValue = level || '';
            levelCell.value = levelValue;
            // 设置Level单元格不换行
            levelCell.alignment = {
                horizontal: 'left',
                vertical: 'middle',
                wrapText: false
            };
            // 非表格内容不需要计算列宽
            colIndex++;
        }
        
        if (this.config.contentMapping.includeContent) {
            const contentCell = row.getCell(colIndex);
            contentCell.value = content;
            
            // 非表格内容不启用自动换行
            contentCell.alignment = {
                horizontal: 'left',
                vertical: 'middle',
                wrapText: false  // 非表格内容不启用自动换行
            };
            
            // 非表格内容使用默认行高，不进行多行高度计算
            // 非表格内容不需要计算列宽
            colIndex++;
        }
        
        row.commit();
        
        return row;
    }
    
    /**
     * 为合并内容调整列宽
     * @param {Object} worksheet - 工作表对象
     * @param {string} content - 内容文本
     * @param {number} totalColumns - 总列数
     */
    adjustColumnWidthForMergedContent(worksheet, content, totalColumns) {
        // 计算中英文字符长度
        const chineseCharCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishCharCount = content.length - chineseCharCount;
        const estimatedWidth = (chineseCharCount * 2 + englishCharCount) * 1.2;
        
        // 默认宽度14px，最大宽度120px（因为是合并单元格，可以更宽）
        const defaultWidth = 14;
        const maxWidth = 120;
        
        // 只有内容超出默认宽度时才重新计算
        if (estimatedWidth > defaultWidth) {
            // 将宽度平均分配到所有列，但确保每列至少有最小宽度
            const averageWidth = Math.min(maxWidth, estimatedWidth / totalColumns);
            const targetWidth = Math.max(defaultWidth, averageWidth);
            
            console.log(`合并内容列宽计算: 内容长度=${content.length}, 估算宽度=${estimatedWidth.toFixed(1)}px, 目标宽度=${targetWidth.toFixed(1)}px`);
            
            // 为所有列设置合理的宽度
            for (let i = 1; i <= totalColumns; i++) {
                const column = worksheet.getColumn(i);
                if (!column.width || column.width < targetWidth) {
                    column.width = targetWidth;
                }
            }
        }
    }
    
    /**
     * 应用单元格样式
     */
    applyCellStyle(cell, style) {
        if (!style) {
            console.warn('Style is undefined or null');
            return;
        }
        
        if (style.font) {
            cell.font = { ...cell.font, ...style.font };
        }
        if (style.fill) {
            cell.fill = style.fill;
        }
        if (style.alignment) {
            cell.alignment = { ...cell.alignment, ...style.alignment };
        }
        if (style.border) {
            cell.border = style.border;
        }
    }
    
    /**
     * 应用工作表样式
     */
    applyStyles(worksheet) {
        // 冻结首行
        //worksheet.views = [{ state: 'frozen', ySplit: 1 }];
        
        // 设置默认行高和列宽
        worksheet.properties.defaultRowHeight = 25;
        worksheet.properties.defaultColWidth = 20;
        
        // 不再应用配置中的特定列宽度设置，完全依赖表格处理中计算出的列宽
        
        // 应用默认样式到所有单元格
        worksheet.eachRow((row, rowNumber) => {
            // 设置行高（只对没有设置行高的行设置默认值）
            if (rowNumber === 1) {
                if (!row.height || row.height <= 20) {
                    row.height = 30; // 表头行高
                }
            } else {
                if (!row.height || row.height <= 20) {
                    row.height = 25; // 内容行高
                }
            }
            
            row.eachCell((cell) => {
                if (rowNumber === 1) {
                    // 表头样式已在其他地方设置
                    return;
                }
                
                if (!cell.style || Object.keys(cell.style).length === 0) {
                    this.applyCellStyle(cell, this.config.styles.content.paragraph);
                }
                
                // 确保非表格单元格都不换行（保留表格单元格的自动换行设置）
                if (!cell.alignment) {
                    cell.alignment = {};
                }
                // 只对没有设置自动换行的单元格设置不换行
                if (cell.alignment.wrapText === undefined) {
                    cell.alignment.wrapText = false;
                }
            });
        });
    }
    
    /**
     * 保存工作簿
     */
    async saveWorkbook(outputPath) {
        try {
            await fs.ensureDir(path.dirname(outputPath));
            await this.workbook.xlsx.writeFile(outputPath);
            console.log(`Excel file saved to: ${outputPath}`);
            return outputPath;
        } catch (error) {
            throw new Error(`Failed to save Excel file: ${error.message}`);
        }
    }
    
    /**
     * 批量转换HTML文件
     */
    async convertBatch(inputPattern, outputDir) {
        const glob = require('glob');
        const files = glob.sync(inputPattern);
        
        if (files.length === 0) {
            throw new Error(`No files found matching pattern: ${inputPattern}`);
        }
        
        const results = [];
        
        for (const file of files) {
            try {
                const basename = path.basename(file, path.extname(file));
                const outputPath = path.join(outputDir, `${basename}.xlsx`);
                
                // 为每个文件创建新的转换器实例
                const converter = new HtmlToExcelConverter(this.config);
                await converter.convertFile(file, outputPath);
                
                results.push({ input: file, output: outputPath, success: true });
            } catch (error) {
                results.push({ input: file, error: error.message, success: false });
            }
        }
        
        return results;
    }
}

module.exports = HtmlToExcelConverter;