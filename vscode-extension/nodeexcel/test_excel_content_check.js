const ExcelJS = require('exceljs');
const path = require('path');

async function checkExcelContent() {
    try {
        const workbook = new ExcelJS.Workbook();
        const filePath = path.join(__dirname, 'output', 'test_title_check.xlsx');
        
        console.log('Reading Excel file:', filePath);
        await workbook.xlsx.readFile(filePath);
        
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
            console.log('❌ No worksheet found');
            return;
        }
        
        console.log('\n=== Excel文件内容检查 ===');
        console.log(`总行数: ${worksheet.rowCount}`);
        
        // 检查前25行内容
        console.log('\n=== 前25行内容 ===');
        for (let i = 1; i <= Math.min(25, worksheet.rowCount); i++) {
            const row = worksheet.getRow(i);
            const values = [];
            for (let j = 1; j <= 6; j++) {
                const cell = row.getCell(j);
                values.push(cell.value || '');
            }
            console.log(`第${i}行:`, values.join(' | '));
        }
        
        // 查找主标题
        let mainTitleFound = false;
        let progressTableTitleFound = false;
        let tableHeaderFound = false;
        
        for (let i = 1; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const firstCell = row.getCell(1).value;
            
            if (firstCell && firstCell.toString().includes('约旅项目进度表')) {
                mainTitleFound = true;
                console.log(`\n✅ 找到主标题 "约旅项目进度表" 在第${i}行`);
            }
            
            if (firstCell && firstCell.toString().includes('进度表')) {
                progressTableTitleFound = true;
                console.log(`✅ 找到二级标题 "进度表" 在第${i}行`);
            }
            
            // 检查表格标题行
            const rowValues = [];
            for (let j = 1; j <= 6; j++) {
                const cell = row.getCell(j);
                rowValues.push(cell.value ? cell.value.toString() : '');
            }
            
            // 更灵活的表格标题行检测
            const hasStage = rowValues.some(val => val.includes('阶段'));
            const hasTask = rowValues.some(val => val.includes('任务'));
            const hasResponsible = rowValues.some(val => val.includes('负责人'));
            
            if (hasStage && hasTask && hasResponsible) {
                tableHeaderFound = true;
                console.log(`✅ 找到表格标题行在第${i}行:`, rowValues.join(' | '));
            }
            
            // 单独检查每个关键词
            if (rowValues.some(val => val.includes('阶段'))) {
                console.log(`🔍 第${i}行包含"阶段":`, rowValues.join(' | '));
            }
            if (rowValues.some(val => val.includes('任务'))) {
                console.log(`🔍 第${i}行包含"任务":`, rowValues.join(' | '));
            }
            if (rowValues.some(val => val.includes('负责人'))) {
                console.log(`🔍 第${i}行包含"负责人":`, rowValues.join(' | '));
            }
        }
        
        console.log('\n=== 检查结果汇总 ===');
        console.log(`主标题 "约旅项目进度表": ${mainTitleFound ? '✅ 存在' : '❌ 缺失'}`);
        console.log(`二级标题 "进度表": ${progressTableTitleFound ? '✅ 存在' : '❌ 缺失'}`);
        console.log(`表格标题行: ${tableHeaderFound ? '✅ 存在' : '❌ 缺失'}`);
        
        if (!mainTitleFound || !progressTableTitleFound || !tableHeaderFound) {
            console.log('\n❌ 发现缺失的标题或表格内容！');
        } else {
            console.log('\n✅ 所有标题和表格内容都正确存在！');
        }
        
    } catch (error) {
        console.error('Error reading Excel file:', error);
    }
}

checkExcelContent();