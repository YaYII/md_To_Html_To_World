const Converter = require('./src/converter.js');
const path = require('path');

async function testConversion() {
    try {
        console.log('Starting test conversion...');
        
        const converter = new Converter();
        await converter.initialize();
        
        const inputFile = '约旅项目进度表_v1.0_20250604.md';
        const outputFile = 'output/converted.xlsx';
        
        console.log(`Input file: ${inputFile}`);
        console.log(`Output file: ${outputFile}`);
        
        const result = await converter.convertFile(inputFile, outputFile);
        console.log('Conversion result:', result);
        
    } catch (error) {
        console.error('Conversion error:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

testConversion();