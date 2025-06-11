const ExcelJS = require('exceljs');

async function testMerge() {
    try {
        console.log('Creating workbook...');
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Test');
        
        console.log('Creating columns...');
        ws.columns = [
            {header: 'Type', key: 'type', width: 15},
            {header: 'Level', key: 'level', width: 10}
        ];
        console.log('Columns created, count:', ws.columns.length);
        
        console.log('Adding row...');
        const row = ws.addRow(['heading', '1']);
        console.log('Row added, number:', row.number);
        
        console.log('Attempting merge...');
        ws.mergeCells(row.number, 1, row.number, 2);
        console.log('Merge successful');
        
        console.log('Saving file...');
        await wb.xlsx.writeFile('debug_test.xlsx');
        console.log('File saved successfully');
        
    } catch(e) {
        console.log('Error:', e.message);
        console.log('Stack:', e.stack);
    }
}

testMerge();