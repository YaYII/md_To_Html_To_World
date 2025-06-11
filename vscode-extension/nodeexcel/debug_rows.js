const ExcelJS = require('exceljs');
const path = require('path');

async function debugExcelRows() {
    try {
        const filePath = path.join(__dirname, 'output', 'test_simple.xlsx');
        console.log('🔍 调试文件:', filePath);
if (!require('fs').existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`);
    process.exit(1);
}
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        const worksheet = workbook.getWorksheet('Content');
        console.log(`📊 工作表信息: ${worksheet.name} (${worksheet.rowCount}行 x ${worksheet.columnCount}列)`);
        
        console.log('\n📋 所有行的详细信息:');
        
        for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            const firstCellValue = row.getCell(1).value || '';
            const rowHeight = row.height || '默认';
            
            // 检查背景色
            const cell = row.getCell(1);
            const hasFill = cell.style && cell.style.fill && cell.style.fill.fgColor;
            const fillColor = hasFill ? cell.style.fill.fgColor.argb : '无';
            
            const isEmpty = !firstCellValue || firstCellValue.toString().trim() === '';
            const isSpacingRow = isEmpty && rowHeight === 10 && fillColor === 'FFFFFFFF';
            
            let rowType = '📝 内容行';
            if (isSpacingRow) {
                rowType = '🔸 间隔行';
            } else if (isEmpty) {
                rowType = '⚪ 空行';
            }
            
            console.log(`第${rowNumber}行: "${firstCellValue}" (行高: ${rowHeight}, 背景: ${fillColor}) ${rowType}`);
            
            if (isSpacingRow) {
                console.log('  ✅ 检测到间隔行!');
            }
        }
        
    } catch (error) {
        console.error('❌ 调试Excel文件时出错:', error.message);
    }
}

debugExcelRows();