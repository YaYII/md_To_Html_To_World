const ExcelJS = require('exceljs');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const HtmlToExcelConverter = require('./src/htmlToExcel/htmlToExcelConverter');

async function testTableOnly() {
    console.log('=== 纯表格转换测试 ===');
    
    // 创建简单的HTML表格
    const htmlContent = `
    <table>
        <thead>
            <tr>
                <th>列1</th>
                <th>列2</th>
                <th>列3</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>A</td>
                <td>B</td>
                <td>C</td>
            </tr>
            <tr>
                <td>1</td>
                <td>2</td>
                <td>3</td>
            </tr>
        </tbody>
    </table>
    `;
    
    console.log('HTML内容:');
    console.log(htmlContent);
    
    // 使用cheerio解析
    const $ = cheerio.load(htmlContent);
    
    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('测试表格');
    
    // 创建转换器
    const config = {
        styles: {
            table: {
                header: {
                    font: { bold: true },
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
                },
                cell: {
                    font: { size: 11 }
                },
                alternateRow: {
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
                }
            }
        }
    };
    const converter = new HtmlToExcelConverter(config);
    
    // 查找表格
    const table = $('table').first();
    console.log(`\n找到表格: ${table.length > 0 ? '是' : '否'}`);
    
    if (table.length > 0) {
        // 转换表格
        await converter.convertHtmlTableToExcel($, table, worksheet, 1);
        
        // 保存Excel文件
        const outputPath = path.join(__dirname, 'output', 'test_table_only.xlsx');
        await workbook.xlsx.writeFile(outputPath);
        console.log(`\nExcel文件已保存: ${outputPath}`);
        
        // 立即读取并验证内容
        console.log('\n=== 验证Excel内容 ===');
        const verifyWorkbook = new ExcelJS.Workbook();
        await verifyWorkbook.xlsx.readFile(outputPath);
        const verifyWorksheet = verifyWorkbook.getWorksheet(1);
        
        for (let rowNum = 1; rowNum <= 3; rowNum++) {
            const row = verifyWorksheet.getRow(rowNum);
            let rowContent = [];
            for (let colNum = 1; colNum <= 3; colNum++) {
                const cell = row.getCell(colNum);
                const value = cell.value ? cell.value.toString() : '';
                rowContent.push(`"${value}"`);
            }
            console.log(`第${rowNum}行: ${rowContent.join(' | ')}`);
        }
    }
}

testTableOnly().catch(console.error);