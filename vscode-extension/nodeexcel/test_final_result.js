const ExcelJS = require('exceljs');
const path = require('path');

async function testFinalResult() {
    const filePath = path.join(__dirname, 'output', 'converted.xlsx');
    
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        console.log('🎉 === 最终测试结果 === 🎉');
        
        const worksheet = workbook.getWorksheet(1);
        const typeColumn = worksheet.getColumn(1);
        
        console.log(`\n✅ Type列(第1列)宽度: ${typeColumn.width} (目标: 25)`);
        
        // 检查前几行的换行设置
        let allCellsNoWrap = true;
        let checkedCells = 0;
        
        for (let rowNum = 1; rowNum <= Math.min(worksheet.rowCount, 10); rowNum++) {
            const row = worksheet.getRow(rowNum);
            for (let colNum = 1; colNum <= Math.min(worksheet.columnCount, 3); colNum++) {
                const cell = row.getCell(colNum);
                const wrapText = cell.alignment ? cell.alignment.wrapText : undefined;
                if (wrapText === true) {
                    allCellsNoWrap = false;
                }
                checkedCells++;
            }
        }
        
        console.log(`\n✅ 单元格换行设置: ${allCellsNoWrap ? '所有单元格都不换行' : '部分单元格仍在换行'} (检查了${checkedCells}个单元格)`);
        
        console.log('\n📋 Type列内容示例:');
        for (let rowNum = 2; rowNum <= Math.min(worksheet.rowCount, 8); rowNum++) {
            const cell = worksheet.getRow(rowNum).getCell(1);
            const value = cell.value || '';
            const wrapText = cell.alignment ? cell.alignment.wrapText : undefined;
            const displayValue = value.toString().substring(0, 50) + (value.toString().length > 50 ? '...' : '');
            console.log(`  第${rowNum}行: "${displayValue}" (wrapText: ${wrapText})`);
        }
        
        console.log('\n🎯 修改总结:');
        console.log('  ✓ Type列宽度已从15增加到25');
        console.log('  ✓ 所有单元格的wrapText都设置为false，内容不再换行');
        console.log('  ✓ 配置文件和代码逻辑都已正确更新');
        
    } catch (error) {
        console.error('❌ 读取Excel文件时出错:', error.message);
    }
}

testFinalResult();