const ExcelJS = require('exceljs');
const path = require('path');

async function checkSpacing(filePath) {
    const workbook = new ExcelJS.Workbook();
    try {
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet(1);

        if (!worksheet) {
            console.log('Worksheet not found.');
            return;
        }

        console.log(`检查文件: ${filePath}`);
        console.log(`工作表名称: ${worksheet.name}`);
        console.log(`总行数: ${worksheet.rowCount}`);
        console.log(`总列数: ${worksheet.columnCount}`);

        console.log('\n📋 行内容和行高检查:');
        
        // 检查前30行的内容和行高
        for (let rowNumber = 1; rowNumber <= Math.min(30, worksheet.rowCount); rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            const firstCellValue = row.getCell(1).value || '';
            const rowHeight = row.height || '默认';
            
            // 检查是否为空行（间隔行）
            const isEmpty = !firstCellValue || firstCellValue.toString().trim() === '';
            const isSpacingRow = isEmpty && (rowHeight === 15 || rowHeight === '默认');
            
            console.log(`第${rowNumber}行: "${firstCellValue}" (行高: ${rowHeight}${isEmpty ? ' - 可能是间隔行' : ''})`);
        }
        
        // 统计空行数量（作为间隔行的指标）
        let emptyRowCount = 0;
        let contentRowCount = 0;
        for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            const firstCellValue = row.getCell(1).value || '';
            
            const isEmpty = !firstCellValue || firstCellValue.toString().trim() === '';
            if (isEmpty) {
                emptyRowCount++;
            } else {
                contentRowCount++;
            }
        }
        
        console.log(`\n📊 统计信息:`);
        console.log(`  空行总数（间隔行）: ${emptyRowCount}`);
        console.log(`  内容行总数: ${contentRowCount}`);
        console.log(`  总行数: ${worksheet.rowCount}`);
        
    } catch (error) {
        console.error(`读取Excel文件时出错: ${error.message}`);
    }
}

const excelFilePath = path.join(__dirname, 'output', 'converted.xlsx');
checkSpacing(excelFilePath);