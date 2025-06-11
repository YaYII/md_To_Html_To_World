const ExcelJS = require('exceljs');
const path = require('path');

async function verifyNoTableMerge() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, 'output', 'test_no_table_merge.xlsx');
    
    try {
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet(1);
        
        console.log('=== 验证表格内容不被合并 ===');
        console.log(`工作表总行数: ${worksheet.rowCount}`);
        console.log(`工作表总列数: ${worksheet.columnCount}`);
        
        // 检查所有行的内容，寻找表格相关内容
        let tableRelatedRows = [];
        let mergedRows = [];
        
        for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
            const row = worksheet.getRow(rowNum);
            let rowContent = [];
            let hasContent = false;
            
            // 检查前6列的内容
            for (let col = 1; col <= 6; col++) {
                const cell = row.getCell(col);
                const value = cell.value || '';
                rowContent.push(value.toString());
                if (value) hasContent = true;
            }
            
            if (hasContent) {
                const fullContent = rowContent.join(' ').trim();
                
                // 检查是否为表格相关内容
                if (fullContent.includes('Table') || 
                    fullContent.includes('状态') ||
                    fullContent.includes('需求分析') ||
                    fullContent.includes('设计阶段') ||
                    fullContent.includes('开发阶段') ||
                    fullContent.includes('测试阶段') ||
                    fullContent.includes('部署阶段')) {
                    tableRelatedRows.push({rowNum, content: fullContent});
                }
                
                // 检查是否有合并单元格（通过检查第一列是否有值而其他列为空）
                const firstCellValue = rowContent[0];
                const otherCellsEmpty = rowContent.slice(1).every(cell => cell === '');
                
                if (firstCellValue && otherCellsEmpty && fullContent.length > 10) {
                    mergedRows.push({rowNum, content: firstCellValue});
                }
                
                console.log(`行 ${rowNum}: [${rowContent.join(', ')}]`);
            }
        }
        
        console.log('\n=== 分析结果 ===');
        console.log(`发现表格相关行数: ${tableRelatedRows.length}`);
        console.log(`发现可能被合并的行数: ${mergedRows.length}`);
        
        // 检查表格相关内容是否被合并
        let tableContentMerged = false;
        tableRelatedRows.forEach(tableRow => {
            const isMerged = mergedRows.some(mergedRow => mergedRow.rowNum === tableRow.rowNum);
            if (isMerged) {
                console.log(`❌ 表格相关内容被合并 - 行 ${tableRow.rowNum}: "${tableRow.content}"`);
                tableContentMerged = true;
            } else {
                console.log(`✅ 表格相关内容未被合并 - 行 ${tableRow.rowNum}: "${tableRow.content}"`);
            }
        });
        
        if (!tableContentMerged && tableRelatedRows.length > 0) {
            console.log('\n✅ 成功：所有表格相关内容都没有被合并');
        } else if (tableRelatedRows.length === 0) {
            console.log('\n⚠️  警告：没有找到表格相关内容');
        }
        
        // 显示被合并的非表格内容
        const nonTableMerged = mergedRows.filter(mergedRow => 
            !tableRelatedRows.some(tableRow => tableRow.rowNum === mergedRow.rowNum)
        );
        
        if (nonTableMerged.length > 0) {
            console.log('\n✅ 非表格内容正常合并:');
            nonTableMerged.forEach(merge => {
                console.log(`  - 行 ${merge.rowNum}: "${merge.content}"`);
            });
        }
        
        // 检查表格区域的具体内容
        console.log('\n=== 检查表格区域内容 ===');
        
        // 查找表格开始位置（通常包含"状态"等表头）
        let tableStartRow = null;
        for (let row = 1; row <= worksheet.rowCount; row++) {
            for (let col = 1; col <= 6; col++) {
                const cell = worksheet.getCell(row, col);
                if (cell.value && cell.value.toString().includes('状态')) {
                    tableStartRow = row;
                    break;
                }
            }
            if (tableStartRow) break;
        }
        
        if (tableStartRow) {
            console.log(`找到表格开始行: ${tableStartRow}`);
            
            // 检查表格前几行的内容
            for (let row = Math.max(1, tableStartRow - 2); row <= Math.min(worksheet.rowCount, tableStartRow + 5); row++) {
                let rowContent = [];
                for (let col = 1; col <= 6; col++) {
                    const cell = worksheet.getCell(row, col);
                    rowContent.push(cell.value || '');
                }
                console.log(`行 ${row}: [${rowContent.join(', ')}]`);
            }
        }
        
    } catch (error) {
        console.error('验证过程中出错:', error.message);
    }
}

verifyNoTableMerge();