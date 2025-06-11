const fs = require('fs');
const path = require('path');

// 读取原始文件
const filePath = '/Users/yingyang/Documents/project/python/md_To_Html_To_World/vscode-extension/nodeexcel/src/htmlToExcel/htmlToExcelConverter.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('开始修复表格标题行问题...');

// 修复1: 在processTable方法中，确保表格从正确的位置开始
// 找到processTable方法中的问题代码
const processTableFix = `    /**
     * 处理表格
     */
    async processTable($, element, worksheet) {
        this.tableCounter++;
        
        if (this.config.tableHandling.separateTableSheets) {
            // 创建单独的工作表处理表格
            const tableWorksheet = this.workbook.addWorksheet(
                \`\${this.config.tableHandling.tableSheetPrefix}\${this.tableCounter}\`
            );
            await this.convertHtmlTableToExcel($, element, tableWorksheet, 1);
            
            if (this.config.tableHandling.preserveOriginalTables) {
                // 在主工作表中添加表格引用
                const tableInfo = \`[Table \${this.tableCounter}] - See separate sheet\`;
                await this.addContentRow(worksheet, 'table-reference', 0, tableInfo);
            }
        } else {
            // 直接在主工作表中显示表格内容
            // 修复：在表格前添加一个空行作为分隔
            if (this.currentRow > 2) {
                this.addSpacingRow(worksheet);
            }
            await this.convertHtmlTableToExcel($, element, worksheet, this.currentRow);
        }
    }`;

// 替换processTable方法
const processTableRegex = /\/\*\*\s*\*\s*处理表格[\s\S]*?async processTable[\s\S]*?^\s*}/m;
if (processTableRegex.test(content)) {
    content = content.replace(processTableRegex, processTableFix);
    console.log('✓ 修复了processTable方法');
} else {
    console.log('✗ 未找到processTable方法');
}

// 修复2: 确保convertHtmlTableToExcel方法正确处理thead行
// 在convertHtmlTableToExcel方法中添加调试信息和确保thead行被正确处理
const convertTableFix = `        console.log(\`表格转换: 找到 \${theadRows.length} 个thead行, \${tbodyRows.length} 个tbody行, \${directRows.length} 个直接tr行, 总计 \${rows.length} 行\`);
        
        // 确保thead行被正确包含
        if (theadRows.length > 0) {
            console.log('✓ 检测到thead行，将作为表格标题行处理');
        } else {
            console.log('⚠ 未检测到thead行，将第一行作为标题行处理');
        }
        
        for (let i = 0; i < rows.length; i++) {`;

// 替换表格转换的调试信息
const convertTableRegex = /console\.log\(\`表格转换: 找到[\s\S]*?for \(let i = 0; i < rows\.length; i\+\+\) \{/;
if (convertTableRegex.test(content)) {
    content = content.replace(convertTableRegex, convertTableFix);
    console.log('✓ 增强了表格转换的调试信息');
} else {
    console.log('✗ 未找到表格转换的调试信息');
}

// 修复3: 确保表格行处理逻辑正确识别thead行
const cellProcessingFix = `                // 先应用样式 - 修复：正确识别thead中的单元格
                const isInThead = row.closest('thead').length > 0;
                const isHeaderCell = cell.is('th') || isInThead;
                
                if (isHeaderCell) {
                    this.applyCellStyle(excelCell, this.config.styles.table.header);
                    console.log(\`  表头单元格 [\${i+1},\${j+1}]: "\${cellText}"\`);
                } else {
                    this.applyCellStyle(excelCell, this.config.styles.table.cell);
                    
                    // 交替行样式 - 修复：只对数据行应用交替样式
                    const dataRowIndex = i - theadRows.length; // 计算在数据行中的索引
                    if (dataRowIndex >= 0 && dataRowIndex % 2 === 0) {
                        if (!excelCell.fill) {
                            excelCell.fill = {};
                        }
                        Object.assign(excelCell.fill, this.config.styles.table.alternateRow.fill);
                    }
                }`;

// 替换单元格处理逻辑
const cellProcessingRegex = /\/\/ 先应用样式[\s\S]*?if \(cell\.is\('th'\)\) \{[\s\S]*?\}\s*\}/;
if (cellProcessingRegex.test(content)) {
    content = content.replace(cellProcessingRegex, cellProcessingFix);
    console.log('✓ 修复了单元格样式应用逻辑');
} else {
    console.log('✗ 未找到单元格处理逻辑');
}

// 保存修复后的文件
const backupPath = filePath + '.backup';
fs.writeFileSync(backupPath, fs.readFileSync(filePath, 'utf8'));
console.log(`✓ 原文件已备份到: ${backupPath}`);

fs.writeFileSync(filePath, content);
console.log(`✓ 修复完成，文件已保存: ${filePath}`);

console.log('\n修复内容总结:');
console.log('1. 修复了processTable方法，在表格前添加适当的间隔');
console.log('2. 增强了表格转换的调试信息，确保thead行被正确识别');
console.log('3. 修复了单元格样式应用逻辑，正确处理thead中的单元格');
console.log('4. 修复了交替行样式，只对数据行应用');