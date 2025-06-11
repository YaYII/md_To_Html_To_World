const ExcelJS = require('exceljs');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// 读取配置文件
const configPath = path.join(__dirname, 'src/config/excelConfig.js');
const config = require(configPath);

// 读取HTML文件
const htmlContent = fs.readFileSync('/Users/yingyang/Documents/project/python/md_To_Html_To_World/vscode-extension/nodeexcel/约旅项目进度表_v1.0_20250604.html', 'utf8');
const $ = cheerio.load(htmlContent);

console.log('=== 开始模拟转换过程 ===');

// 创建工作簿和工作表
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Test');

// 找到表格
const table = $('table').first();
if (table.length === 0) {
    console.log('未找到表格');
    process.exit(1);
}

console.log('\n=== 表格转换过程模拟 ===');

// 模拟convertHtmlTableToExcel方法的逻辑
const theadRows = table.find('thead tr');
const tbodyRows = table.find('tbody tr');
const directRows = table.find('> tr');

console.log(`找到 ${theadRows.length} 个thead行, ${tbodyRows.length} 个tbody行, ${directRows.length} 个直接tr行`);

// 合并所有行
let allRows = $();
if (theadRows.length > 0) {
    allRows = allRows.add(theadRows);
    console.log(`添加了${theadRows.length}个thead行到allRows`);
}
if (tbodyRows.length > 0) {
    allRows = allRows.add(tbodyRows);
    console.log(`添加了${tbodyRows.length}个tbody行到allRows`);
}
if (directRows.length > 0 && theadRows.length === 0 && tbodyRows.length === 0) {
    allRows = allRows.add(directRows);
    console.log(`添加了${directRows.length}个直接tr行到allRows`);
}

console.log(`合并后总行数: ${allRows.length}`);

// 模拟Excel行写入过程
let excelRowIndex = 1;
const startRow = 1;

console.log('\n=== Excel行写入过程 ===');

for (let i = 0; i < allRows.length; i++) {
    const row = allRows.eq(i);
    const cells = row.find('th, td');
    const excelRow = worksheet.getRow(excelRowIndex);
    
    console.log(`\n处理第${i+1}行 (Excel第${excelRowIndex}行):`);
    console.log(`  HTML行类型: ${row.closest('thead').length > 0 ? 'thead' : 'tbody'}`);
    console.log(`  单元格数量: ${cells.length}`);
    
    const cellValues = [];
    for (let j = 0; j < cells.length; j++) {
        const cell = cells.eq(j);
        const cellText = cell.text().trim();
        const excelCell = excelRow.getCell(j + 1);
        
        excelCell.value = cellText;
        cellValues.push(cellText);
        
        // 检查是否是表头单元格
        if (cell.is('th')) {
            console.log(`    单元格${j+1}: "${cellText}" (表头th)`);
        } else {
            console.log(`    单元格${j+1}: "${cellText}" (数据td)`);
        }
    }
    
    console.log(`  Excel行内容: [${cellValues.join(', ')}]`);
    
    excelRow.commit();
    excelRowIndex++;
}

console.log(`\n=== 转换完成 ===`);
console.log(`总共写入了${excelRowIndex - 1}行到Excel`);

// 保存Excel文件进行验证
const outputPath = '/Users/yingyang/Documents/project/python/md_To_Html_To_World/vscode-extension/nodeexcel/output/debug_conversion_test.xlsx';
workbook.xlsx.writeFile(outputPath).then(() => {
    console.log(`\n调试Excel文件已保存: ${outputPath}`);
    
    // 读取刚保存的Excel文件进行验证
    const testWorkbook = new ExcelJS.Workbook();
    return testWorkbook.xlsx.readFile(outputPath);
}).then((testWorkbook) => {
    console.log('\n=== 验证保存的Excel文件 ===');
    const testWorksheet = testWorkbook.getWorksheet(1);
    
    console.log('Excel文件前10行内容:');
    for (let i = 1; i <= Math.min(10, testWorksheet.rowCount); i++) {
        const row = testWorksheet.getRow(i);
        const values = [];
        for (let j = 1; j <= 6; j++) {
            const cell = row.getCell(j);
            values.push(cell.value || '');
        }
        console.log(`第${i}行: [${values.join(', ')}]`);
    }
}).catch((error) => {
    console.error('保存或读取Excel文件时出错:', error);
});