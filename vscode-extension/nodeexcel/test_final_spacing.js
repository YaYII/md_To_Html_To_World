const ExcelJS = require('exceljs');
const path = require('path');

async function checkFinalSpacing(filePath) {
    const workbook = new ExcelJS.Workbook();
    try {
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet(1);

        if (!worksheet) {
            console.log('Worksheet not found.');
            return;
        }

        console.log(`🔍 检查文件: ${filePath}`);
        console.log(`📊 工作表信息: ${worksheet.name} (${worksheet.rowCount}行 x ${worksheet.columnCount}列)`);

        console.log('\n📋 前30行详细信息:');
        
        let spacingRowCount = 0;
        let contentRowCount = 0;
        let otherEmptyRowCount = 0;
        
        // 检查前30行的详细信息
        for (let rowNumber = 1; rowNumber <= Math.min(30, worksheet.rowCount); rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            const firstCellValue = row.getCell(1).value || '';
            const rowHeight = row.height || '默认';
            
            // 检查背景色
            const cell = row.getCell(1);
            const hasFill = cell.style && cell.style.fill && cell.style.fill.fgColor;
            const fillColor = hasFill ? cell.style.fill.fgColor.argb : '无';
            
            const isEmpty = !firstCellValue || firstCellValue.toString().trim() === '';
            const isSpacingRow = isEmpty && rowHeight === 10 && fillColor === 'FFF8F8F8';
            
            if (isSpacingRow) {
                spacingRowCount++;
            } else if (isEmpty) {
                otherEmptyRowCount++;
            } else {
                contentRowCount++;
            }
            
            let rowType = '';
            if (isSpacingRow) {
                rowType = ' 🔸 间隔行';
            } else if (isEmpty) {
                rowType = ' ⚪ 空行';
            } else {
                rowType = ' 📝 内容行';
            }
            
            console.log(`第${rowNumber}行: "${firstCellValue}" (行高: ${rowHeight}, 背景: ${fillColor})${rowType}`);
        }
        
        // 统计整个文档的间隔行
        let totalSpacingRows = 0;
        let totalContentRows = 0;
        
        for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            const firstCellValue = row.getCell(1).value || '';
            const rowHeight = row.height;
            
            // 检查背景色
            const cell = row.getCell(1);
            const hasFill = cell.style && cell.style.fill && cell.style.fill.fgColor;
            const fillColor = hasFill ? cell.style.fill.fgColor.argb : null;
            
            const isEmpty = !firstCellValue || firstCellValue.toString().trim() === '';
            const isSpacingRow = isEmpty && (rowHeight === 10 || fillColor === 'FFF8F8F8');
            
            if (isSpacingRow) {
                totalSpacingRows++;
            } else if (!isEmpty) {
                totalContentRows++;
            }
        }
        
        console.log(`\n📊 最终统计:`);
        console.log(`  🔸 间隔行总数: ${totalSpacingRows}`);
        console.log(`  📝 内容行总数: ${totalContentRows}`);
        console.log(`  ⚪ 其他空行: ${worksheet.rowCount - totalSpacingRows - totalContentRows}`);
        console.log(`  📄 总行数: ${worksheet.rowCount}`);
        
        if (totalSpacingRows > 0) {
            console.log(`\n✅ 间隔行功能已成功实现！`);
            console.log(`   - 间隔行行高: 10`);
            console.log(`   - 间隔行背景: 浅灰色 (FFF8F8F8)`);
            console.log(`   - 提升了内容的可读性`);
        } else {
            console.log(`\n❌ 未检测到间隔行，可能需要检查实现逻辑`);
        }
        
    } catch (error) {
        console.error(`❌ 读取Excel文件时出错: ${error.message}`);
    }
}

const filePath = path.join(__dirname, 'output', 'test_simple.xlsx');
checkFinalSpacing(filePath);