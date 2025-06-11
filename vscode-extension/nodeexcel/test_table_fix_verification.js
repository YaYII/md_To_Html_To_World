const ExcelJS = require('exceljs');
const path = require('path');

async function verifyTableFix() {
    const filePath = path.join(__dirname, 'output', 'test_table_fix.xlsx');
    
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        const worksheet = workbook.getWorksheet(1);
        console.log('=== 验证表格修复结果 ===');
        
        // 检查前50行，寻找表格内容
        let tableStartRow = null;
        let tableEndRow = null;
        
        for (let rowNum = 1; rowNum <= 50; rowNum++) {
            const row = worksheet.getRow(rowNum);
            const firstCell = row.getCell(1);
            
            if (firstCell.value) {
                const cellValue = firstCell.value.toString();
                
                // 检查是否是表格标题行（包含"状态"、"开始时间"等表格列名）
                if (cellValue.includes('状态') || cellValue.includes('开始时间') || cellValue.includes('结束时间')) {
                    console.log(`\n发现可能的表格标题行 ${rowNum}: "${cellValue}"`);
                    
                    // 检查这一行是否被合并了
                    let isMerged = false;
                    try {
                        // 检查第一列到第6列是否被合并
                        for (let col = 1; col <= 6; col++) {
                            const cell = row.getCell(col);
                            if (cell.isMerged) {
                                isMerged = true;
                                break;
                            }
                        }
                    } catch (error) {
                        // 忽略检查错误
                    }
                    
                    console.log(`  - 是否被合并: ${isMerged ? '是 ❌' : '否 ✅'}`);
                    
                    // 显示这一行的所有单元格内容
                    console.log('  - 行内容:');
                    for (let col = 1; col <= 6; col++) {
                        const cell = row.getCell(col);
                        const value = cell.value ? cell.value.toString() : '';
                        console.log(`    列${col}: "${value}"`);
                    }
                    
                    if (!tableStartRow) tableStartRow = rowNum;
                    tableEndRow = rowNum;
                }
                
                // 检查是否是表格数据行（包含具体的任务信息）
                if (cellValue.includes('需求分析') || cellValue.includes('设计阶段') || cellValue.includes('开发阶段')) {
                    console.log(`\n发现表格数据行 ${rowNum}: "${cellValue}"`);
                    
                    // 检查这一行是否被合并了
                    let isMerged = false;
                    try {
                        for (let col = 1; col <= 6; col++) {
                            const cell = row.getCell(col);
                            if (cell.isMerged) {
                                isMerged = true;
                                break;
                            }
                        }
                    } catch (error) {
                        // 忽略检查错误
                    }
                    
                    console.log(`  - 是否被合并: ${isMerged ? '是 ❌' : '否 ✅'}`);
                    
                    // 显示这一行的所有单元格内容
                    console.log('  - 行内容:');
                    for (let col = 1; col <= 6; col++) {
                        const cell = row.getCell(col);
                        const value = cell.value ? cell.value.toString() : '';
                        console.log(`    列${col}: "${value}"`);
                    }
                    
                    if (!tableStartRow) tableStartRow = rowNum;
                    tableEndRow = rowNum;
                }
            }
        }
        
        console.log(`\n=== 总结 ===`);
        if (tableStartRow && tableEndRow) {
            console.log(`表格范围: 第${tableStartRow}行 到 第${tableEndRow}行`);
            console.log('修复验证: 表格内容应该不再被错误合并单元格');
        } else {
            console.log('未找到表格内容');
        }
        
        // 检查非表格的标题是否正常合并
        console.log('\n=== 检查非表格标题的合并情况 ===');
        for (let rowNum = 1; rowNum <= 50; rowNum++) {
            const row = worksheet.getRow(rowNum);
            const firstCell = row.getCell(1);
            
            if (firstCell.value) {
                const cellValue = firstCell.value.toString();
                
                // 检查是否是非表格的标题（如"项目概述"、"里程碑"等）
                if (cellValue.includes('项目概述') || cellValue.includes('里程碑') || cellValue.includes('资源配置')) {
                    console.log(`\n发现非表格标题行 ${rowNum}: "${cellValue}"`);
                    
                    // 检查这一行是否被合并了
                    let isMerged = false;
                    try {
                        for (let col = 1; col <= 6; col++) {
                            const cell = row.getCell(col);
                            if (cell.isMerged) {
                                isMerged = true;
                                break;
                            }
                        }
                    } catch (error) {
                        // 忽略检查错误
                    }
                    
                    console.log(`  - 是否被合并: ${isMerged ? '是 ✅' : '否 ❌'}`);
                    console.log(`  - 说明: 非表格标题应该被合并以适应表格列宽`);
                }
            }
        }
        
    } catch (error) {
        console.error('验证过程中出错:', error.message);
    }
}

verifyTableFix();