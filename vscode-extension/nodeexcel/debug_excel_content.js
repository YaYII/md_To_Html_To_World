const ExcelJS = require('exceljs');
const path = require('path');

async function analyzeExcelContent() {
    try {
        const workbook = new ExcelJS.Workbook();
        const filePath = path.join(__dirname, 'output', 'converted.xlsx');
        
        console.log('正在读取Excel文件:', filePath);
        await workbook.xlsx.readFile(filePath);
        
        const worksheet = workbook.getWorksheet(1);
        console.log('\n=== Excel内容分析 ===');
        
        let tableRowCount = 0;
        let nonTableRowCount = 0;
        
        worksheet.eachRow((row, rowNumber) => {
            if (row.hasValues) {
                console.log(`\n行 ${rowNumber} (高度: ${row.height || '默认'}):`);
                
                let isTableRow = false;
                let hasWrapTextInRow = false;
                
                row.eachCell((cell, colNumber) => {
                    const value = cell.value || '';
                    const valueStr = value.toString();
                    const hasLineBreaks = valueStr.includes('\n');
                    const lineCount = hasLineBreaks ? valueStr.split('\n').length : 1;
                    const hasWrapText = cell.alignment && cell.alignment.wrapText;
                    
                    if (hasWrapText) hasWrapTextInRow = true;
                    
                    // 判断是否为表格行（通常表格行有多列且内容较短）
                    if (row.cellCount > 1 && colNumber > 1) {
                        isTableRow = true;
                    }
                    
                    console.log(`  列 ${colNumber}: "${valueStr}"`);
                    console.log(`    长度: ${valueStr.length}, 换行符: ${hasLineBreaks ? '是' : '否'}, 行数: ${lineCount}, 自动换行: ${hasWrapText ? '是' : '否'}`);
                });
                
                if (isTableRow) {
                    tableRowCount++;
                    console.log(`  >>> 表格行`);
                } else {
                    nonTableRowCount++;
                    console.log(`  >>> 非表格行 (标题/段落等)`);
                    if (hasWrapTextInRow) {
                        console.log(`  ⚠️  警告: 非表格行启用了自动换行!`);
                    }
                }
            }
        });
        
        console.log('\n=== 统计结果 ===');
        console.log(`表格行数: ${tableRowCount}`);
        console.log(`非表格行数: ${nonTableRowCount}`);
        console.log('\n=== 分析完成 ===');
        
    } catch (error) {
        console.error('分析Excel文件时出错:', error);
    }
}

analyzeExcelContent();