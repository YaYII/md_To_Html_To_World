#!/usr/bin/env node

const ExcelJS = require('exceljs');
const path = require('path');

async function testExcelFile() {
    try {
        const workbook = new ExcelJS.Workbook();
        const filePath = path.join(__dirname, 'output', 'converted.xlsx');
        
        console.log('Reading Excel file:', filePath);
        await workbook.xlsx.readFile(filePath);
        
        const worksheet = workbook.getWorksheet(1);
        console.log('\n=== 工作表信息 ===');
        console.log('工作表名称:', worksheet.name);
        console.log('总行数:', worksheet.rowCount);
        console.log('总列数:', worksheet.columnCount);
        
        console.log('\n=== 列宽信息 ===');
        for (let i = 1; i <= worksheet.columnCount; i++) {
            const column = worksheet.getColumn(i);
            console.log(`第${i}列宽度:`, column.width || '未设置');
        }
        
        console.log('\n=== 前5行内容 ===');
        for (let rowNum = 1; rowNum <= Math.min(5, worksheet.rowCount); rowNum++) {
            const row = worksheet.getRow(rowNum);
            console.log(`第${rowNum}行:`);
            
            for (let colNum = 1; colNum <= worksheet.columnCount; colNum++) {
                const cell = row.getCell(colNum);
                const value = cell.value || '';
                const alignment = cell.alignment || {};
                console.log(`  列${colNum}: "${value}" (wrapText: ${alignment.wrapText})`);
            }
            console.log('');
        }
        
        console.log('\n=== 检查Type列内容长度 ===');
        let typeColumnIndex = 1;
        const typeColumn = worksheet.getColumn(typeColumnIndex);
        console.log(`Type列(第${typeColumnIndex}列)宽度:`, typeColumn.width);
        
        // 检查Type列的内容
        for (let rowNum = 2; rowNum <= Math.min(10, worksheet.rowCount); rowNum++) {
            const cell = worksheet.getCell(rowNum, typeColumnIndex);
            const value = cell.value || '';
            if (value.toString().length > 0) {
                console.log(`第${rowNum}行Type列: "${value}" (长度: ${value.toString().length})`);
            }
        }
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

testExcelFile();