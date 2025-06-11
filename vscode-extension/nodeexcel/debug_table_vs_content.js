const ExcelJS = require('exceljs');
const path = require('path');

async function analyzeTableVsContent() {
    try {
        const workbook = new ExcelJS.Workbook();
        const filePath = path.join(__dirname, 'output', 'converted.xlsx');
        
        console.log('正在读取Excel文件:', filePath);
        await workbook.xlsx.readFile(filePath);
        
        const worksheet = workbook.getWorksheet(1);
        console.log('\n=== 表格 vs 非表格内容样式对比 ===');
        
        let tableRows = [];
        let contentRows = [];
        
        worksheet.eachRow((row, rowNumber) => {
            if (row.hasValues) {
                // 判断是否为表格行（有多列且内容相对较短）
                let isTableRow = false;
                let cellCount = 0;
                let totalLength = 0;
                let hasMultipleCells = false;
                
                row.eachCell((cell) => {
                    cellCount++;
                    const value = cell.value || '';
                    totalLength += value.toString().length;
                });
                
                // 检查是否真的有多列有内容
                let nonEmptyCells = 0;
                row.eachCell((cell) => {
                    const value = cell.value || '';
                    if (value.toString().trim().length > 0) {
                        nonEmptyCells++;
                    }
                });
                
                // 如果有多列有内容，认为是表格行
                if (nonEmptyCells > 1) {
                    isTableRow = true;
                } else {
                    // 单列内容，检查是否为表格单元格（通过边框样式判断）
                    const firstCell = row.getCell(1);
                    if (firstCell.border && firstCell.border.top && firstCell.border.top.style === 'thin' && 
                        firstCell.border.top.color && firstCell.border.top.color.argb === 'FF718096') {
                        isTableRow = true;
                    }
                }
                
                const rowInfo = {
                    rowNumber,
                    cellCount,
                    totalLength,
                    avgLength: totalLength / cellCount,
                    cells: []
                };
                
                row.eachCell((cell, colNumber) => {
                    const value = cell.value || '';
                    const cellInfo = {
                        colNumber,
                        value: value.toString().substring(0, 20),
                        font: cell.font,
                        fill: cell.fill,
                        alignment: cell.alignment,
                        border: cell.border
                    };
                    rowInfo.cells.push(cellInfo);
                });
                
                if (isTableRow) {
                    tableRows.push(rowInfo);
                } else {
                    contentRows.push(rowInfo);
                }
            }
        });
        
        console.log('\n=== 表格行样式分析 ===');
        console.log(`表格行数量: ${tableRows.length}`);
        if (tableRows.length > 0) {
            const sampleRow = tableRows[0];
            console.log(`\n示例表格行 ${sampleRow.rowNumber}:`);
            sampleRow.cells.forEach(cell => {
                console.log(`  列 ${cell.colNumber}: "${cell.value}"`);
                console.log(`    字体: ${cell.font ? JSON.stringify(cell.font) : '无'}`);
                console.log(`    填充: ${cell.fill && cell.fill.type !== 'none' ? JSON.stringify(cell.fill) : '无'}`);
                console.log(`    边框: ${cell.border ? '有' : '无'}`);
            });
        }
        
        console.log('\n=== 非表格内容样式分析 ===');
        console.log(`非表格行数量: ${contentRows.length}`);
        if (contentRows.length > 0) {
            const sampleRow = contentRows[0];
            console.log(`\n示例内容行 ${sampleRow.rowNumber}:`);
            sampleRow.cells.forEach(cell => {
                console.log(`  列 ${cell.colNumber}: "${cell.value}"`);
                console.log(`    字体: ${cell.font ? JSON.stringify(cell.font) : '无'}`);
                console.log(`    填充: ${cell.fill && cell.fill.type !== 'none' ? JSON.stringify(cell.fill) : '无'}`);
                console.log(`    边框: ${cell.border ? '有' : '无'}`);
            });
        }
        
        // 检查样式差异
        console.log('\n=== 样式差异分析 ===');
        if (tableRows.length > 0 && contentRows.length > 0) {
            const tableFont = tableRows[0].cells[0].font;
            const contentFont = contentRows[0].cells[0].font;
            
            console.log('表格字体:', tableFont);
            console.log('内容字体:', contentFont);
            
            if (JSON.stringify(tableFont) === JSON.stringify(contentFont)) {
                console.log('⚠️  表格和内容使用了相同的字体样式');
            } else {
                console.log('✅ 表格和内容使用了不同的字体样式');
            }
        }
        
    } catch (error) {
        console.error('分析失败:', error.message);
    }
}

analyzeTableVsContent();