const ExcelJS = require('exceljs');
const path = require('path');

async function verifyTitleInExcel() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, 'output', 'test_no_table_merge.xlsx');
    
    try {
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet(1);
        
        console.log('=== 验证Excel文件中的标题 ===');
        console.log(`工作表总行数: ${worksheet.rowCount}`);
        
        // 查找主标题"约旅项目进度表"
        let titleFound = false;
        let titleRow = null;
        
        for (let rowNum = 1; rowNum <= Math.min(10, worksheet.rowCount); rowNum++) {
            const row = worksheet.getRow(rowNum);
            
            // 检查前6列的内容
            for (let col = 1; col <= 6; col++) {
                const cell = row.getCell(col);
                const value = cell.value;
                
                if (value && value.toString().includes('约旅项目进度表')) {
                    titleFound = true;
                    titleRow = rowNum;
                    console.log(`✅ 找到主标题 "约旅项目进度表" 在第 ${rowNum} 行，第 ${col} 列`);
                    console.log(`   完整内容: "${value}"`);
                    break;
                }
            }
            
            if (titleFound) break;
        }
        
        if (!titleFound) {
            console.log('❌ 未找到主标题 "约旅项目进度表"');
            console.log('\n前10行内容:');
            
            for (let rowNum = 1; rowNum <= Math.min(10, worksheet.rowCount); rowNum++) {
                const row = worksheet.getRow(rowNum);
                let rowContent = [];
                
                for (let col = 1; col <= 6; col++) {
                    const cell = row.getCell(col);
                    const value = cell.value || '';
                    rowContent.push(value.toString());
                }
                
                const hasContent = rowContent.some(content => content.trim() !== '');
                if (hasContent) {
                    console.log(`行 ${rowNum}: [${rowContent.join(', ')}]`);
                }
            }
        }
        
        // 检查表格标题行
        console.log('\n=== 检查表格标题行 ===');
        let tableHeaderFound = false;
        
        // 显示所有行的内容来帮助调试
        console.log('\n所有行内容:');
        for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
            const row = worksheet.getRow(rowNum);
            let rowContent = [];
            
            for (let col = 1; col <= 6; col++) {
                const cell = row.getCell(col);
                const value = cell.value || '';
                rowContent.push(value.toString());
            }
            
            const hasContent = rowContent.some(content => content.trim() !== '');
            if (hasContent) {
                console.log(`行 ${rowNum}: [${rowContent.join(', ')}]`);
                
                // 检查是否为表格标题行（包含"阶段"、"任务"等）
                const fullContent = rowContent.join(' ');
                if ((fullContent.includes('阶段') && fullContent.includes('任务')) || 
                    (fullContent.includes('状态') && rowContent.filter(c => c.trim() !== '').length > 3)) {
                    tableHeaderFound = true;
                    console.log(`✅ 找到表格标题行在第 ${rowNum} 行`);
                    console.log(`   内容: [${rowContent.join(', ')}]`);
                    
                    // 检查表格标题行是否被合并
                    const nonEmptyCells = rowContent.filter(content => content.trim() !== '').length;
                    if (nonEmptyCells >= 4) {
                        console.log('✅ 表格标题行未被合并，正确分布在各列中');
                    } else {
                        console.log('❌ 表格标题行可能被合并了');
                    }
                }
            }
        }
        
        if (!tableHeaderFound) {
            console.log('❌ 未找到表格标题行');
        }
        
        // 总结
        console.log('\n=== 总结 ===');
        if (titleFound && tableHeaderFound) {
            console.log('✅ 文档标题和表格标题都正确存在');
        } else {
            console.log('❌ 存在问题:');
            if (!titleFound) console.log('  - 缺少文档主标题');
            if (!tableHeaderFound) console.log('  - 缺少表格标题行');
        }
        
    } catch (error) {
        console.error('验证过程中出错:', error.message);
    }
}

verifyTitleInExcel();