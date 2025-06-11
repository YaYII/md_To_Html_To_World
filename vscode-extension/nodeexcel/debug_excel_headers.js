const ExcelJS = require('exceljs');
const path = require('path');

async function checkExcelHeaders() {
    try {
        const workbook = new ExcelJS.Workbook();
        const filePath = path.join(__dirname, 'output', 'debug_test.xlsx');
        
        console.log('Reading Excel file:', filePath);
        await workbook.xlsx.readFile(filePath);
        
        const worksheet = workbook.getWorksheet(1);
        console.log('\n=== Excel Content Analysis ===');
        console.log('Total rows:', worksheet.rowCount);
        console.log('Total columns:', worksheet.columnCount);
        
        console.log('\n=== First 20 rows content ===');
        for (let i = 1; i <= Math.min(20, worksheet.rowCount); i++) {
            const row = worksheet.getRow(i);
            const values = [];
            
            // 检查前6列的内容
            for (let j = 1; j <= 6; j++) {
                const cell = row.getCell(j);
                const value = cell.value;
                if (value !== null && value !== undefined && value !== '') {
                    values.push(`Col${j}: "${value}"`);
                }
            }
            
            if (values.length > 0) {
                console.log(`Row ${i}: ${values.join(', ')}`);
            }
        }
        
        console.log('\n=== Looking for headers specifically ===');
        for (let i = 1; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const firstCell = row.getCell(1);
            const value = firstCell.value;
            
            if (value && typeof value === 'string') {
                const text = value.toString().trim();
                if (text.includes('项目概述') || text.includes('进度表') || text.includes('里程碑') || text.includes('风险评估') || text.includes('资源配置')) {
                    console.log(`Found header at row ${i}: "${text}"`);
                    
                    // 检查该行的样式
                    const font = firstCell.font;
                    const fill = firstCell.fill;
                    console.log(`  Font: bold=${font?.bold}, size=${font?.size}, color=${font?.color?.argb}`);
                    console.log(`  Fill: ${fill?.fgColor?.argb}`);
                }
            }
        }
        
    } catch (error) {
        console.error('Error reading Excel file:', error.message);
    }
}

checkExcelHeaders();