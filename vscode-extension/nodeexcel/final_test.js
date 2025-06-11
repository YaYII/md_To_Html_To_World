const fs = require('fs');
const ExcelJS = require('exceljs');
const HtmlToExcelConverter = require('./src/htmlToExcel/htmlToExcelConverter.js');
const config = require('./src/config/excelConfig.js');

async function finalTest() {
    console.log('=== 最终测试：验证表格标题行修复效果 ===\n');
    
    try {
        // 读取HTML文件
        const htmlPath = '/Users/yingyang/Documents/project/python/md_To_Html_To_World/vscode-extension/nodeexcel/test.html';
        if (!fs.existsSync(htmlPath)) {
            console.log('✗ HTML测试文件不存在，创建一个简单的测试文件');
            const testHtml = `
<!DOCTYPE html>
<html>
<head><title>测试</title></head>
<body>
    <h2>项目进度表</h2>
    <table>
        <thead>
            <tr>
                <th>阶段</th>
                <th>任务</th>
                <th>负责人</th>
                <th>开始时间</th>
                <th>结束时间</th>
                <th>状态</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>需求分析</td>
                <td>用户需求调研</td>
                <td>张三</td>
                <td>2025-01-01</td>
                <td>2025-01-15</td>
                <td>已完成</td>
            </tr>
            <tr>
                <td>需求分析</td>
                <td>系统需求分析</td>
                <td>李四</td>
                <td>2025-01-10</td>
                <td>2025-01-25</td>
                <td>进行中</td>
            </tr>
        </tbody>
    </table>
</body>
</html>`;
            fs.writeFileSync(htmlPath, testHtml);
            console.log('✓ 测试HTML文件已创建');
        }
        
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        console.log('✓ HTML文件读取成功');
        
        // 创建转换器实例
        const converter = new HtmlToExcelConverter(config);
        console.log('✓ 转换器实例创建成功');
        
        // 执行转换
        const outputPath = '/Users/yingyang/Documents/project/python/md_To_Html_To_World/vscode-extension/nodeexcel/final_test_output.xlsx';
        console.log('\n开始转换...');
        await converter.convertHtmlToExcel(htmlContent, outputPath);
        console.log(`✓ 转换完成，输出文件: ${outputPath}`);
        
        // 验证生成的Excel文件
        console.log('\n=== 验证Excel文件内容 ===');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(outputPath);
        
        const worksheet = workbook.getWorksheet(1);
        console.log(`工作表名称: ${worksheet.name}`);
        console.log(`实际行数: ${worksheet.actualRowCount}`);
        console.log(`实际列数: ${worksheet.actualColumnCount}`);
        
        // 显示所有行的内容
        console.log('\nExcel文件内容:');
        let foundTableHeader = false;
        for (let i = 1; i <= worksheet.actualRowCount; i++) {
            const row = worksheet.getRow(i);
            const values = [];
            for (let j = 1; j <= worksheet.actualColumnCount; j++) {
                const cell = row.getCell(j);
                const value = cell.value || '';
                values.push(value.toString());
                
                // 检查是否是表格标题行
                if (value && (value.toString().includes('阶段') || value.toString().includes('任务'))) {
                    foundTableHeader = true;
                }
            }
            console.log(`第${i}行: [${values.join(', ')}]`);
        }
        
        // 最终结果
        console.log('\n=== 测试结果 ===');
        if (foundTableHeader) {
            console.log('✅ 成功！表格标题行已正确包含在Excel文件中');
            console.log('✅ 表格标题行丢失问题已修复');
        } else {
            console.log('❌ 失败！表格标题行仍然丢失');
            console.log('❌ 需要进一步调试');
        }
        
    } catch (error) {
        console.error('测试过程中发生错误:', error.message);
        console.error('错误堆栈:', error.stack);
    }
}

finalTest();