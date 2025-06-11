const Converter = require('./src/converter');
const fs = require('fs');

async function debugHeadingProcessing() {
    try {
        console.log('=== 调试标题处理过程 ===');
        
        const converter = new Converter();
        await converter.initialize();
        
        // 读取markdown文件
        const mdContent = fs.readFileSync('test_heading_merge.md', 'utf8');
        console.log('\n=== Markdown内容 ===');
        console.log(mdContent);
        
        // 转换为HTML
        const htmlContent = converter.markdownToHtml.convertString(mdContent);
        console.log('\n=== HTML内容 ===');
        console.log(htmlContent);
        
        // 保存HTML用于检查
        fs.writeFileSync('debug_heading.html', htmlContent);
        console.log('\n✅ HTML已保存到 debug_heading.html');
        
    } catch (error) {
        console.error('调试失败:', error);
    }
}

debugHeadingProcessing();