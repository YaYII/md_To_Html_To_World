const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function verifyExcelOutput() {
    console.log('=== 验证Excel输出文件 ===\n');
    
    const excelPath = path.join(__dirname, 'simple_test_output.xlsx');
    
    if (!fs.existsSync(excelPath)) {
        console.log('✗ Excel文件不存在:', excelPath);
        return;
    }
    
    console.log('✓ Excel文件存在:', excelPath);
    
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(excelPath);
        
        const worksheet = workbook.getWorksheet(1);
        console.log('\n=== 工作表内容 ===');
        console.log('总行数:', worksheet.rowCount);
        console.log('总列数:', worksheet.columnCount);
        
        console.log('\n=== 前10行内容 ===');
        for (let i = 1; i <= Math.min(10, worksheet.rowCount); i++) {
            const row = worksheet.getRow(i);
            const values = [];
            for (let j = 1; j <= worksheet.columnCount; j++) {
                const cell = row.getCell(j);
                values.push(cell.value || '');
            }
            console.log(`第${i}行:`, values.join(' | '));
        }
        
        // 查找表格标题行
        console.log('\n=== 查找表格标题行 ===');
        let foundTableHeader = false;
        for (let i = 1; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const firstCell = row.getCell(1).value;
            const secondCell = row.getCell(2).value;
            const thirdCell = row.getCell(3).value;
            const fourthCell = row.getCell(4).value;
            
            if (firstCell === '阶段' && secondCell === '任务' && thirdCell === '负责人' && fourthCell === '状态') {
                console.log(`✓ 找到表格标题行在第${i}行:`, [firstCell, secondCell, thirdCell, fourthCell].join(' | '));
                foundTableHeader = true;
                
                // 检查标题行的样式
                const firstCellObj = row.getCell(1);
                console.log('标题行样式信息:');
                console.log('- 字体:', firstCellObj.font);
                console.log('- 填充:', firstCellObj.fill);
                console.log('- 边框:', firstCellObj.border);
                break;
            }
        }
        
        if (!foundTableHeader) {
            console.log('✗ 未找到表格标题行');
        }
        
        // 查找数据行
        console.log('\n=== 查找数据行 ===');
        let dataRowCount = 0;
        for (let i = 1; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const firstCell = row.getCell(1).value;
            
            if (firstCell === '需求分析' || firstCell === '设计阶段' || firstCell === '开发阶段' || firstCell === '测试阶段') {
                const values = [];
                for (let j = 1; j <= 4; j++) {
                    values.push(row.getCell(j).value || '');
                }
                console.log(`✓ 找到数据行在第${i}行:`, values.join(' | '));
                dataRowCount++;
            }
        }
        
        console.log(`\n=== 总结 ===`);
        console.log(`表格标题行: ${foundTableHeader ? '✓ 正确显示' : '✗ 缺失'}`);
        console.log(`数据行数量: ${dataRowCount}/4`);
        
        if (foundTableHeader && dataRowCount === 4) {
            console.log('\n🎉 表格标题行修复成功！');
        } else {
            console.log('\n❌ 表格标题行仍有问题');
        }
        
    } catch (error) {
        console.error('读取Excel文件失败:', error);
    }
}

verifyExcelOutput();