const ExcelJS = require('exceljs');
const path = require('path');

async function analyzeExcelStyles() {
    try {
        const workbook = new ExcelJS.Workbook();
        const filePath = path.join(__dirname, 'output', 'converted.xlsx');
        
        console.log('正在读取Excel文件:', filePath);
        await workbook.xlsx.readFile(filePath);
        
        const worksheet = workbook.getWorksheet(1);
        console.log('\n=== Excel样式分析 ===');
        
        let styledCells = 0;
        let unstyledCells = 0;
        
        worksheet.eachRow((row, rowNumber) => {
            if (row.hasValues) {
                console.log(`\n行 ${rowNumber}:`);
                
                row.eachCell((cell, colNumber) => {
                    const value = cell.value || '';
                    const valueStr = value.toString().substring(0, 30); // 只显示前30个字符
                    
                    console.log(`  列 ${colNumber}: "${valueStr}${valueStr.length > 30 ? '...' : ''}"`);;
                    
                    // 检查字体样式
                    if (cell.font) {
                        console.log(`    字体: ${JSON.stringify(cell.font)}`);
                        styledCells++;
                    } else {
                        console.log(`    字体: 无样式`);
                        unstyledCells++;
                    }
                    
                    // 检查填充样式
                    if (cell.fill && cell.fill.type !== 'none') {
                        console.log(`    填充: ${JSON.stringify(cell.fill)}`);
                    } else {
                        console.log(`    填充: 无`);
                    }
                    
                    // 检查对齐样式
                    if (cell.alignment) {
                        console.log(`    对齐: ${JSON.stringify(cell.alignment)}`);
                    } else {
                        console.log(`    对齐: 无`);
                    }
                    
                    // 检查边框样式
                    if (cell.border) {
                        console.log(`    边框: ${JSON.stringify(cell.border)}`);
                    } else {
                        console.log(`    边框: 无`);
                    }
                    
                    console.log('');
                });
            }
        });
        
        console.log('\n=== 统计结果 ===');
        console.log(`有样式的单元格: ${styledCells}`);
        console.log(`无样式的单元格: ${unstyledCells}`);
        console.log(`样式应用率: ${(styledCells / (styledCells + unstyledCells) * 100).toFixed(2)}%`);
        
    } catch (error) {
        console.error('分析失败:', error.message);
    }
}

analyzeExcelStyles();