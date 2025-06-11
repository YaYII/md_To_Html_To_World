const { Converter, ExcelConfig } = require('./src/index');

async function debugConfig() {
    try {
        // 创建配置
        const config = new ExcelConfig({
            contentMapping: {
                includeType: true,
                includeLevel: true,
                includeContent: true
            }
        });
        
        console.log('Config object:');
        console.log(JSON.stringify(config, null, 2));
        
        console.log('\nContentMapping:');
        console.log('includeType:', config.contentMapping.includeType);
        console.log('includeLevel:', config.contentMapping.includeLevel);
        console.log('includeContent:', config.contentMapping.includeContent);
        
        console.log('\nColumnWidths:');
        console.log('type:', config.columnWidths.type);
        console.log('level:', config.columnWidths.level);
        console.log('content:', config.columnWidths.content);
        
        // 模拟列设置逻辑
        const columns = [];
        
        if (config.contentMapping.includeType) {
            const col = { header: 'Type', key: 'type', width: config.columnWidths.type };
            console.log('\nAdding Type column:', col);
            columns.push(col);
        }
        
        if (config.contentMapping.includeLevel) {
            const col = { header: 'Level', key: 'level', width: config.columnWidths.level };
            console.log('Adding Level column:', col);
            columns.push(col);
        }
        
        if (config.contentMapping.includeContent) {
            const col = { header: 'Content', key: 'content', width: config.columnWidths.content };
            console.log('Adding Content column:', col);
            columns.push(col);
        }
        
        console.log('\nFinal columns array:');
        console.log(JSON.stringify(columns, null, 2));
        
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
    }
}

debugConfig();