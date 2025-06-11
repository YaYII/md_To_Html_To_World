const ExcelJS = require('exceljs');
const path = require('path');

/**
 * 检查Excel文件中的合并单元格信息
 */
async function debugMergedCells() {
    const excelPath = path.join(__dirname, 'output/converted.xlsx');
    
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(excelPath);
        
        const worksheet = workbook.getWorksheet(1);
        console.log('=== Excel文件合并单元格分析 ===');
        console.log(`工作表名称: ${worksheet.name}`);
        console.log(`总行数: ${worksheet.rowCount}`);
        console.log(`总列数: ${worksheet.columnCount}`);
        console.log('');
        
        // 获取所有合并单元格 - 使用不同的方式访问
        let mergedCells = [];
        
        // 尝试不同的方式获取合并单元格信息
        if (worksheet._merges && Array.isArray(worksheet._merges)) {
            mergedCells = worksheet._merges;
        } else if (worksheet.model && worksheet.model.merges && Array.isArray(worksheet.model.merges)) {
            mergedCells = worksheet.model.merges;
        }
        
        // 确保mergedCells是数组
        if (!Array.isArray(mergedCells)) {
            mergedCells = [];
        }
        
        console.log(`=== 合并单元格信息 (共${mergedCells.length}个) ===`);
        console.log('调试信息:');
        console.log('  worksheet._merges:', typeof worksheet._merges, Array.isArray(worksheet._merges));
        console.log('  worksheet.model.merges:', typeof worksheet.model?.merges, Array.isArray(worksheet.model?.merges));
        console.log('');
        
        if (mergedCells.length === 0) {
            console.log('❌ 没有发现任何合并单元格');
            
            // 尝试手动检查是否有合并单元格
            console.log('\n=== 手动检查合并单元格 ===');
            let foundMerged = false;
            
            for (let row = 1; row <= Math.min(50, worksheet.rowCount); row++) {
                for (let col = 1; col <= worksheet.columnCount; col++) {
                    const cell = worksheet.getCell(row, col);
                    if (cell.isMerged) {
                        console.log(`发现合并单元格: 行${row}, 列${col}`);
                        foundMerged = true;
                    }
                }
            }
            
            if (!foundMerged) {
                console.log('手动检查也未发现合并单元格');
            }
            
            return;
        }
        
        // 分析合并单元格
        let threeRowMerges = 0;
        let singleRowMerges = 0;
        let otherMerges = 0;
        
        mergedCells.forEach((merge, index) => {
            // 处理不同格式的合并单元格信息
            let top, left, bottom, right;
            
            if (merge.top !== undefined) {
                // 格式1: {top, left, bottom, right}
                ({ top, left, bottom, right } = merge);
            } else if (merge.tl && merge.br) {
                // 格式2: {tl: {row, col}, br: {row, col}}
                top = merge.tl.row;
                left = merge.tl.col;
                bottom = merge.br.row;
                right = merge.br.col;
            } else if (typeof merge === 'string') {
                // 格式3: 字符串格式如 "A1:C3"
                console.log(`合并区域 ${index + 1}: ${merge}`);
                
                // 解析字符串格式的合并单元格
                const match = merge.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
                if (match) {
                    const [, startCol, startRow, endCol, endRow] = match;
                    
                    // 将列字母转换为数字
                    const colToNum = (col) => {
                        let result = 0;
                        for (let i = 0; i < col.length; i++) {
                            result = result * 26 + (col.charCodeAt(i) - 64);
                        }
                        return result;
                    };
                    
                    top = parseInt(startRow);
                    left = colToNum(startCol);
                    bottom = parseInt(endRow);
                    right = colToNum(endCol);
                } else {
                    console.log(`  ❌ 无法解析合并区域格式: ${merge}`);
                    return;
                }
            } else {
                console.log(`合并区域 ${index + 1}: 未知格式`, merge);
                return;
            }
            
            const rowSpan = bottom - top + 1;
            const colSpan = right - left + 1;
            
            console.log(`合并区域 ${index + 1}: 行${top}-${bottom} (${rowSpan}行), 列${left}-${right} (${colSpan}列)`);
            
            // 获取合并单元格的内容
            const cell = worksheet.getCell(top, left);
            const content = cell.value || '';
            const contentPreview = content.toString().substring(0, 30) + (content.toString().length > 30 ? '...' : '');
            console.log(`  内容: "${contentPreview}"`);
            
            // 检查样式
            if (cell.alignment) {
                console.log(`  对齐: 水平=${cell.alignment.horizontal}, 垂直=${cell.alignment.vertical}, 换行=${cell.alignment.wrapText}`);
            }
            
            if (cell.font) {
                console.log(`  字体: 大小=${cell.font.size}, 加粗=${cell.font.bold}, 颜色=${cell.font.color?.argb}`);
            }
            
            // 统计合并类型
            if (rowSpan === 1 && colSpan > 1) {
                singleRowMerges++;
                console.log(`  📝 这是一个列合并单元格 (${colSpan}列)`);
            } else if (rowSpan > 1) {
                threeRowMerges++;
                console.log(`  ✅ 这是一个行合并单元格 (${rowSpan}行)`);
            } else {
                otherMerges++;
                console.log(`  ❓ 这是一个${rowSpan}行${colSpan}列合并单元格`);
            }
            
            console.log('');
        });
        
        console.log('=== 合并统计 ===');
        console.log(`列合并单元格: ${singleRowMerges}个`);
        console.log(`行合并单元格: ${threeRowMerges}个`);
        console.log(`其他合并单元格: ${otherMerges}个`);
        console.log(`总计: ${threeRowMerges + singleRowMerges + otherMerges}个`);
        
        if (singleRowMerges > 0) {
            console.log('✅ 列合并功能已正确实现！');
        } else {
            console.log('❌ 未发现列合并单元格');
        }
        
    } catch (error) {
        console.error('读取Excel文件时出错:', error.message);
    }
}

// 运行调试
debugMergedCells().catch(console.error);