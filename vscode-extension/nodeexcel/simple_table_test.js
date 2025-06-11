const fs = require('fs');
const path = require('path');

// 简单的测试脚本，直接运行转换器的核心功能
async function simpleTableTest() {
    console.log('=== 简单表格测试 ===\n');
    
    try {
        // 创建测试HTML内容
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
                <th>状态</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>需求分析</td>
                <td>收集用户需求</td>
                <td>张三</td>
                <td>已完成</td>
            </tr>
            <tr>
                <td>设计阶段</td>
                <td>UI/UX设计</td>
                <td>李四</td>
                <td>进行中</td>
            </tr>
        </tbody>
    </table>
</body>
</html>`;
        
        // 写入测试HTML文件
        const htmlPath = path.join(__dirname, 'simple_test.html');
        fs.writeFileSync(htmlPath, testHtml, 'utf8');
        console.log('✓ 创建测试HTML文件:', htmlPath);
        
        // 直接使用命令行工具进行转换
        const { exec } = require('child_process');
        const outputPath = path.join(__dirname, 'simple_test_output.xlsx');
        
        const command = `node bin/cli.js "${htmlPath}" "${outputPath}"`;
        console.log('执行命令:', command);
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('转换失败:', error);
                return;
            }
            
            console.log('转换输出:', stdout);
            if (stderr) {
                console.log('错误信息:', stderr);
            }
            
            // 检查输出文件是否存在
            if (fs.existsSync(outputPath)) {
                console.log('✓ Excel文件已生成:', outputPath);
                console.log('\n=== 测试完成 ===');
                console.log('请手动打开Excel文件检查表格标题行是否正确显示');
            } else {
                console.log('✗ Excel文件未生成');
            }
        });
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

simpleTableTest();