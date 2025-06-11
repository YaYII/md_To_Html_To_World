const ExcelJS = require('exceljs');
const path = require('path');

async function checkTableFix() {
    const filePath = path.join(__dirname, 'output', 'test_heading_merge.xlsx');
    
    console.log('=== 检查表格修复结果 ===');
    console.log(`文件路径: ${filePath}`);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.getWorksheet(1);
    console.log(`工作表行数: ${worksheet.rowCount}`);
    console.log(`工作表列数: ${worksheet.columnCount}`);
    
    console.log('\n=== 前10行内容 ===');
    for (let rowNum = 1; rowNum <= Math.min(10, worksheet.rowCount); rowNum++) {
        const row = worksheet.getRow(rowNum);
        let rowContent = [];
        
        for (let colNum = 1; colNum <= Math.min(5, worksheet.columnCount); colNum++) {
            const cell = row.getCell(colNum);
            const value = cell.value ? cell.value.toString() : '';
            rowContent.push(`"${value}"`);
        }
        
        console.log(`第${rowNum}行: ${rowContent.join(' | ')}`);
    }
    
    // 特别检查表格部分
    console.log('\n=== 查找表格内容 ===');
    let tableFound = false;
    
    // 查找包含"列"字符的行
    console.log('\n=== 查找包含"列"的行 ===');
    for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
        const row = worksheet.getRow(rowNum);
        let hasColumn = false;
        let rowContent = [];
        
        for (let colNum = 1; colNum <= 3; colNum++) {
            const cell = row.getCell(colNum);
            const value = (cell.value || '').toString().trim();
            rowContent.push(`"${value}"`);
            if (value.includes('列')) {
                hasColumn = true;
            }
        }
        
        if (hasColumn) {
            console.log(`第${rowNum}行包含"列": ${rowContent.join(' | ')}`);
        }
    }
    
    // 查找表头模式
    console.log('\n=== 查找表头模式 ===');
    for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
        const row = worksheet.getRow(rowNum);
        const firstCell = row.getCell(1).value;
        const secondCell = row.getCell(2).value;
        const thirdCell = row.getCell(3).value;
        
        // 检查是否是表头行 (去除空格并转换为字符串)
        const cell1Str = (firstCell || '').toString().trim();
        const cell2Str = (secondCell || '').toString().trim();
        const cell3Str = (thirdCell || '').toString().trim();
        
        // 检查多种可能的表头模式
        if ((cell1Str === '列1' && cell2Str === '列2' && cell3Str === '列3') ||
            (cell1Str.includes('列1') && cell2Str.includes('列2') && cell3Str.includes('列3'))) {
            console.log(`✅ 找到表头行在第${rowNum}行: "${cell1Str}" | "${cell2Str}" | "${cell3Str}"`);
            tableFound = true;
            
            // 检查后续几行
            for (let i = 1; i <= 3; i++) {
                const nextRow = worksheet.getRow(rowNum + i);
                if (nextRow) {
                    const c1 = nextRow.getCell(1).value || '';
                    const c2 = nextRow.getCell(2).value || '';
                    const c3 = nextRow.getCell(3).value || '';
                    console.log(`   第${rowNum + i}行: "${c1}" | "${c2}" | "${c3}"`);
                }
            }
            break;
        }
    }
    
    if (!tableFound) {
        console.log('❌ 未找到完整的表头行 (列1, 列2, 列3)');
        
        // 查找A, B, C行作为备选
        console.log('\n=== 查找A, B, C行 ===');
        for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
            const row = worksheet.getRow(rowNum);
            const cell1Str = (row.getCell(1).value || '').toString().trim();
            const cell2Str = (row.getCell(2).value || '').toString().trim();
            const cell3Str = (row.getCell(3).value || '').toString().trim();
            
            if (cell1Str === 'A' && cell2Str === 'B' && cell3Str === 'C') {
                console.log(`✅ 找到数据行在第${rowNum}行: "${cell1Str}" | "${cell2Str}" | "${cell3Str}"`);
                // 检查前一行是否是表头
                if (rowNum > 1) {
                    const prevRow = worksheet.getRow(rowNum - 1);
                    const p1 = (prevRow.getCell(1).value || '').toString().trim();
                    const p2 = (prevRow.getCell(2).value || '').toString().trim();
                    const p3 = (prevRow.getCell(3).value || '').toString().trim();
                    console.log(`   前一行第${rowNum - 1}行: "${p1}" | "${p2}" | "${p3}"`);
                }
                break;
            }
        }
    }
}

checkTableFix().catch(console.error);