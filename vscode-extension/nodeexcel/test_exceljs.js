const ExcelJS = require('exceljs');
const path = require('path');

async function testExcelJS() {
    try {
        // 创建工作簿
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Test');
        
        // 设置列
        const columns = [
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Level', key: 'level', width: 10 },
            { header: 'Content', key: 'content', width: 50 }
        ];
        
        console.log('Setting columns:', JSON.stringify(columns, null, 2));
        worksheet.columns = columns;
        
        // 检查设置后的列
        console.log('\nColumns after setting:');
        worksheet.columns.forEach((col, index) => {
            console.log(`  Column ${index + 1}: header="${col.header}", key="${col.key}", width=${col.width}`);
        });
        
        // 添加一些数据
        worksheet.addRow({ type: 'heading', level: 1, content: '测试标题' });
        worksheet.addRow({ type: 'paragraph', level: 0, content: '测试段落' });
        
        // 保存文件
        const outputPath = 'output/test_exceljs_direct.xlsx';
        await workbook.xlsx.writeFile(outputPath);
        console.log(`\nFile saved to: ${outputPath}`);
        
        // 重新读取文件验证
        const readWorkbook = new ExcelJS.Workbook();
        await readWorkbook.xlsx.readFile(outputPath);
        const readWorksheet = readWorkbook.getWorksheet(1);
        
        console.log('\nColumns after reading from file:');
        readWorksheet.columns.forEach((col, index) => {
            console.log(`  Column ${index + 1}: header="${col.header}", key="${col.key}", width=${col.width}`);
        });
        
        console.log('\nFirst row values:');
        const firstRow = readWorksheet.getRow(1);
        firstRow.eachCell((cell, colNumber) => {
            console.log(`  Cell ${colNumber}: "${cell.value}"`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
    }
}

testExcelJS();