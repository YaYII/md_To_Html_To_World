const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

async function debugTableHeaderIssue() {
    try {
        // 1. 检查HTML文件中的表格结构
        console.log('=== 1. 检查HTML文件中的表格结构 ===');
        const htmlPath = path.join(__dirname, '约旅项目进度表_v1.0_20250604.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        const $ = cheerio.load(htmlContent);
        
        const tables = $('table');
        console.log(`找到 ${tables.length} 个表格`);
        
        tables.each((tableIndex, tableElement) => {
            const $table = $(tableElement);
            console.log(`\n--- 表格 ${tableIndex + 1} ---`);
            
            // 检查thead结构
            const theadRows = $table.find('thead tr');
            console.log(`thead行数: ${theadRows.length}`);
            
            if (theadRows.length > 0) {
                theadRows.each((rowIndex, rowElement) => {
                    const $row = $(rowElement);
                    const cells = $row.find('th, td');
                    const cellTexts = [];
                    cells.each((cellIndex, cellElement) => {
                        cellTexts.push($(cellElement).text().trim());
                    });
                    console.log(`  thead第${rowIndex + 1}行:`, cellTexts.join(' | '));
                });
            }
            
            // 检查tbody结构
            const tbodyRows = $table.find('tbody tr');
            console.log(`tbody行数: ${tbodyRows.length}`);
            
            if (tbodyRows.length > 0) {
                console.log('  tbody前3行:');
                tbodyRows.slice(0, 3).each((rowIndex, rowElement) => {
                    const $row = $(rowElement);
                    const cells = $row.find('th, td');
                    const cellTexts = [];
                    cells.each((cellIndex, cellElement) => {
                        cellTexts.push($(cellElement).text().trim());
                    });
                    console.log(`    第${rowIndex + 1}行:`, cellTexts.join(' | '));
                });
            }
            
            // 检查直接的tr元素
            const directRows = $table.find('> tr');
            console.log(`直接tr行数: ${directRows.length}`);
        });
        
        // 2. 检查Excel文件中的对应内容
        console.log('\n=== 2. 检查Excel文件中的对应内容 ===');
        const excelPath = path.join(__dirname, 'output', 'test_title_check.xlsx');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(excelPath);
        
        const worksheet = workbook.getWorksheet(1);
        console.log(`Excel总行数: ${worksheet.rowCount}`);
        
        // 查找表格开始位置
        let tableStartRow = -1;
        for (let i = 1; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const values = [];
            for (let j = 1; j <= 6; j++) {
                const cell = row.getCell(j);
                values.push(cell.value ? cell.value.toString().trim() : '');
            }
            
            // 检查是否是表格数据行（包含"需求分析"等阶段名称）
            if (values.some(val => val.includes('需求分析') || val.includes('设计阶段') || val.includes('开发阶段'))) {
                if (tableStartRow === -1) {
                    tableStartRow = i;
                    console.log(`\n表格数据开始于第${i}行:`, values.join(' | '));
                }
            }
            
            // 检查是否包含表格标题关键词
            if (values.some(val => val.includes('阶段')) && values.some(val => val.includes('任务'))) {
                console.log(`\n可能的表格标题行在第${i}行:`, values.join(' | '));
            }
        }
        
        // 检查表格开始前的几行
        if (tableStartRow > 1) {
            console.log(`\n表格开始前的几行:`);
            for (let i = Math.max(1, tableStartRow - 3); i < tableStartRow; i++) {
                const row = worksheet.getRow(i);
                const values = [];
                for (let j = 1; j <= 6; j++) {
                    const cell = row.getCell(j);
                    values.push(cell.value ? cell.value.toString().trim() : '');
                }
                console.log(`  第${i}行:`, values.join(' | '));
            }
        }
        
    } catch (error) {
        console.error('调试过程中出错:', error);
    }
}

debugTableHeaderIssue();