const ExcelJS = require('exceljs');
const path = require('path');

async function checkExcelFile(filePath) {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        const worksheet = workbook.getWorksheet(1);
        
        console.log(`\n=== Checking file: ${path.basename(filePath)} ===`);
        console.log('Columns configuration:');
        worksheet.columns.forEach((col, index) => {
            console.log(`  Column ${index + 1}: header="${col.header}", key="${col.key}", width=${col.width}`);
        });
        
        console.log('\nFirst row values:');
        const firstRow = worksheet.getRow(1);
        firstRow.eachCell((cell, colNumber) => {
            console.log(`  Cell ${colNumber}: "${cell.value}"`);
        });
        
        console.log('\nSecond row values:');
        const secondRow = worksheet.getRow(2);
        secondRow.eachCell((cell, colNumber) => {
            console.log(`  Cell ${colNumber}: "${cell.value}"`);
        });
        
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
    }
}

async function main() {
    const files = [
        'output/converted.xlsx'
    ];
    
    for (const file of files) {
        await checkExcelFile(file);
    }
}

main().catch(console.error);