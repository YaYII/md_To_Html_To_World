const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const ExcelJS = require('exceljs');
const HtmlToExcelConverter = require('./src/htmlToExcel/htmlToExcelConverter.js');
const config = require('./src/config/excelConfig');

async function testFixedConverter() {
    console.log('=== 测试修复后的HTML到Excel转换器 ===\n');
    
    try {
        // 读取HTML文件
        const htmlPath = '/Users/yingyang/Documents/project/python/md_To_Html_To_World/vscode-extension/nodeexcel/test.html';
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        console.log('✓ HTML文件读取成功');
        
        // 解析HTML
        const $ = cheerio.load(htmlContent);
        console.log('✓ HTML解析成功');
        
        // 分析表格结构
        const tables = $('table');
        console.log(`\n发现 ${tables.length} 个表格`);
        
        if (tables.length > 0) {
            const firstTable = tables.first();
            const theadRows = firstTable.find('thead tr');
            const tbodyRows = firstTable.find('tbody tr');
            const directRows = firstTable.find('tr').not('thead tr, tbody tr');
            
            console.log(`第一个表格结构:`);
            console.log(`  - thead行数: ${theadRows.length}`);
            console.log(`  - tbody行数: ${tbodyRows.length}`);
            console.log(`  - 直接tr行数: ${directRows.length}`);
            
            if (theadRows.length > 0) {
                console.log(`\n表格标题行内容:`);
                theadRows.each((i, row) => {
                    const cells = $(row).find('th, td');
                    const cellTexts = [];
                    cells.each((j, cell) => {
                        cellTexts.push($(cell).text().trim());
                    });
                    console.log(`  第${i+1}行: [${cellTexts.join(', ')}]`);
                });
            }
        }
        
        // 创建转换器实例
        const converter = new HtmlToExcelConverter(config);
        console.log('\n✓ 转换器实例创建成功');
        
        // 执行转换
        console.log('\n开始转换...');
        const outputPath = '/Users/yingyang/Documents/project/python/md_To_Html_To_World/vscode-extension/nodeexcel/test_fixed_output.xlsx';
        await converter.convertHtmlToExcel(htmlContent, outputPath);
        console.log(`✓ 转换完成，输出文件: ${outputPath}`);
        
        // 验证生成的Excel文件
        console.log('\n=== 验证生成的Excel文件 ===');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(outputPath);
        
        const worksheet = workbook.getWorksheet(1);
        console.log(`工作表名称: ${worksheet.name}`);
        console.log(`实际行数: ${worksheet.actualRowCount}`);
        console.log(`实际列数: ${worksheet.actualColumnCount}`);
        
        // 显示前10行的内容
        console.log('\n前10行内容:');
        for (let i = 1; i <= Math.min(10, worksheet.actualRowCount); i++) {
            const row = worksheet.getRow(i);
            const values = [];
            for (let j = 1; j <= worksheet.actualColumnCount; j++) {
                const cell = row.getCell(j);
                values.push(cell.value || '');
            }
            console.log(`第${i}行: [${values.join(', ')}]`);
        }
        
        // 检查是否包含表格标题
        let foundTableHeader = false;
        for (let i = 1; i <= worksheet.actualRowCount; i++) {
            const row = worksheet.getRow(i);
            const firstCellValue = row.getCell(1).value;
            if (firstCellValue && firstCellValue.toString().includes('阶段')) {
                console.log(`\n✓ 在第${i}行找到表格标题行: ${firstCellValue}`);
                foundTableHeader = true;
                break;
            }
        }
        
        if (!foundTableHeader) {
            console.log('\n✗ 未找到表格标题行，问题仍然存在');
        }
        
    } catch (error) {
        console.error('转换过程中发生错误:', error);
        console.error('错误堆栈:', error.stack);
    }
}

testFixedConverter();