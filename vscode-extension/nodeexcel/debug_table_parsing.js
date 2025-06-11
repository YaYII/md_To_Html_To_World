const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// 读取HTML文件
const htmlPath = path.join(__dirname, 'debug_heading.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 使用cheerio解析HTML
const $ = cheerio.load(htmlContent);

console.log('=== HTML表格解析调试 ===');

// 查找表格
const tables = $('table');
console.log(`找到 ${tables.length} 个表格`);

tables.each((tableIndex, tableElement) => {
    const $table = $(tableElement);
    console.log(`\n--- 表格 ${tableIndex + 1} ---`);
    
    // 分别查找thead和tbody中的行
    const theadRows = $table.find('thead tr');
    const tbodyRows = $table.find('tbody tr');
    const directRows = $table.find('> tr');
    
    console.log(`thead行数: ${theadRows.length}`);
    console.log(`tbody行数: ${tbodyRows.length}`);
    console.log(`直接tr行数: ${directRows.length}`);
    
    // 处理thead行
    if (theadRows.length > 0) {
        console.log('\n=== THEAD 内容 ===');
        theadRows.each((rowIndex, rowElement) => {
            const $row = $(rowElement);
            const cells = $row.find('th, td');
            console.log(`第${rowIndex + 1}行 (${cells.length}个单元格):`);
            
            cells.each((cellIndex, cellElement) => {
                const $cell = $(cellElement);
                const text = $cell.text().trim();
                const tagName = $cell.prop('tagName').toLowerCase();
                console.log(`  单元格${cellIndex + 1} (${tagName}): "${text}"`);
            });
        });
    }
    
    // 处理tbody行
    if (tbodyRows.length > 0) {
        console.log('\n=== TBODY 内容 ===');
        tbodyRows.each((rowIndex, rowElement) => {
            const $row = $(rowElement);
            const cells = $row.find('th, td');
            console.log(`第${rowIndex + 1}行 (${cells.length}个单元格):`);
            
            cells.each((cellIndex, cellElement) => {
                const $cell = $(cellElement);
                const text = $cell.text().trim();
                const tagName = $cell.prop('tagName').toLowerCase();
                console.log(`  单元格${cellIndex + 1} (${tagName}): "${text}"`);
            });
        });
    }
    
    // 测试合并逻辑
    console.log('\n=== 合并后的行处理 ===');
    let allRows = $();
    if (theadRows.length > 0) {
        allRows = allRows.add(theadRows);
    }
    if (tbodyRows.length > 0) {
        allRows = allRows.add(tbodyRows);
    }
    if (directRows.length > 0 && theadRows.length === 0 && tbodyRows.length === 0) {
        allRows = allRows.add(directRows);
    }
    
    console.log(`合并后总行数: ${allRows.length}`);
    
    allRows.each((rowIndex, rowElement) => {
        const $row = $(rowElement);
        const cells = $row.find('th, td');
        console.log(`合并行${rowIndex + 1} (${cells.length}个单元格):`);
        
        cells.each((cellIndex, cellElement) => {
            const $cell = $(cellElement);
            const text = $cell.text().trim();
            const tagName = $cell.prop('tagName').toLowerCase();
            console.log(`  单元格${cellIndex + 1} (${tagName}): "${text}"`);
        });
    });
});