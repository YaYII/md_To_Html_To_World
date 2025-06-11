const ExcelJS = require('exceljs');
const cheerio = require('cheerio');
const fs = require('fs');

// 读取HTML文件
const htmlContent = fs.readFileSync('/Users/yingyang/Documents/project/python/md_To_Html_To_World/vscode-extension/nodeexcel/约旅项目进度表_v1.0_20250604.html', 'utf8');
const $ = cheerio.load(htmlContent);

console.log('=== HTML表格结构分析 ===');
const table = $('table').first();

if (table.length === 0) {
    console.log('未找到表格');
    process.exit(1);
}

console.log('表格HTML结构:');
console.log(table.html().substring(0, 800) + '...');

// 分析表格结构
const theadRows = table.find('thead tr');
const tbodyRows = table.find('tbody tr');
const directRows = table.find('> tr');

console.log('\n=== 表格行统计 ===');
console.log(`thead行数: ${theadRows.length}`);
console.log(`tbody行数: ${tbodyRows.length}`);
console.log(`直接tr行数: ${directRows.length}`);

// 分析thead内容
if (theadRows.length > 0) {
    console.log('\n=== THEAD内容详细分析 ===');
    theadRows.each((i, row) => {
        const $row = $(row);
        const cells = $row.find('th, td');
        console.log(`thead第${i+1}行: 包含${cells.length}个单元格`);
        
        const cellTexts = [];
        cells.each((j, cell) => {
            const $cell = $(cell);
            const text = $cell.text().trim();
            const tagName = $cell.prop('tagName').toLowerCase();
            cellTexts.push(`${tagName}:"${text}"`);
        });
        console.log(`  内容: [${cellTexts.join(', ')}]`);
    });
}

// 分析tbody前几行内容
if (tbodyRows.length > 0) {
    console.log('\n=== TBODY前3行内容 ===');
    tbodyRows.slice(0, 3).each((i, row) => {
        const $row = $(row);
        const cells = $row.find('th, td');
        console.log(`tbody第${i+1}行: 包含${cells.length}个单元格`);
        
        const cellTexts = [];
        cells.each((j, cell) => {
            const $cell = $(cell);
            const text = $cell.text().trim();
            const tagName = $cell.prop('tagName').toLowerCase();
            cellTexts.push(`${tagName}:"${text}"`);
        });
        console.log(`  内容: [${cellTexts.join(', ')}]`);
    });
}

// 模拟转换器的行合并逻辑
console.log('\n=== 模拟转换器行合并逻辑 ===');
let allRows = $();
if (theadRows.length > 0) {
    allRows = allRows.add(theadRows);
    console.log(`添加${theadRows.length}个thead行`);
}
if (tbodyRows.length > 0) {
    allRows = allRows.add(tbodyRows);
    console.log(`添加${tbodyRows.length}个tbody行`);
}
if (directRows.length > 0 && theadRows.length === 0 && tbodyRows.length === 0) {
    allRows = allRows.add(directRows);
    console.log(`添加${directRows.length}个直接tr行`);
}

console.log(`合并后总行数: ${allRows.length}`);

// 检查合并后的前几行
console.log('\n=== 合并后前5行内容 ===');
allRows.slice(0, 5).each((i, row) => {
    const $row = $(row);
    const cells = $row.find('th, td');
    const cellTexts = [];
    cells.each((j, cell) => {
        const $cell = $(cell);
        const text = $cell.text().trim();
        const tagName = $cell.prop('tagName').toLowerCase();
        cellTexts.push(`${tagName}:"${text}"`);
    });
    console.log(`第${i+1}行: [${cellTexts.join(', ')}]`);
});