/**
 * @description 中文简繁转换测试
 * 测试简体转繁体功能
 */
const fs = require('fs-extra');
const path = require('path');

// 导入转换模块
const Converter = require('../src/converter');
const MarkdownToHtml = require('../src/markdownToHtml');

// 简单的Markdown内容
const mdContent = `
# 简繁转换测试

这是一段简体中文文本，用于测试简繁转换功能。

## 中国人民

中华人民共和国成立于1949年。

## 计算机科学

计算机科学是研究计算机及其周围各种现象和规律的科学。
`;

async function testChineseConversion() {
  try {
    console.log('简繁转换测试开始...');
    
    // 创建临时目录
    const tempDir = path.resolve(__dirname, 'temp');
    await fs.ensureDir(tempDir);
    
    // 定义文件路径
    const wordFile1 = path.join(tempDir, 'test-chinese-simple.docx');
    const wordFile2 = path.join(tempDir, 'test-chinese-traditional.docx');
    
    // 显示测试内容
    console.log(`测试文本内容:\n${mdContent}`);
    
    // 测试1：不启用简繁转换
    console.log('\n测试1: 不启用简繁转换');
    const config1 = {
      chinese: {
        convert_to_traditional: false
      }
    };
    
    // 创建测试文件1
    const mdFile1 = path.join(tempDir, 'test-chinese-simple.md');
    const htmlFile1 = path.join(tempDir, 'test-chinese-simple.html');
    await fs.writeFile(mdFile1, mdContent, 'utf8');
    
    // 创建Markdown到HTML转换器
    const md2html1 = new MarkdownToHtml(config1);
    const html1 = await md2html1.convertFile(mdFile1, htmlFile1);
    console.log(`生成的HTML文件路径: ${htmlFile1}`);
    
    // 测试2：启用简繁转换
    console.log('\n测试2: 启用简繁转换');
    const config2 = {
      chinese: {
        convert_to_traditional: true
      }
    };
    
    // 创建测试文件2
    const mdFile2 = path.join(tempDir, 'test-chinese-trad.md');
    const htmlFile2 = path.join(tempDir, 'test-chinese-traditional.html');
    await fs.writeFile(mdFile2, mdContent, 'utf8');
    
    // 创建Markdown到HTML转换器
    const md2html2 = new MarkdownToHtml(config2);
    const html2 = await md2html2.convertFile(mdFile2, htmlFile2);
    console.log(`生成的繁体HTML文件路径: ${htmlFile2}`);
    
    // 测试3：使用转换器完整流程 (不启用简繁转换)
    console.log('\n测试3: 使用转换器完整流程（不启用简繁转换）');
    const converter1 = new Converter({
      chinese: {
        convert_to_traditional: false
      }
    });
    
    const result1 = await converter1.convert_file(mdFile1, wordFile1, true);
    console.log(`转换结果: ${result1.success ? '成功' : '失败'}`);
    console.log(`生成的Word文件路径: ${result1.outputFile}`);
    
    // 测试4：使用转换器完整流程 (启用简繁转换)
    console.log('\n测试4: 使用转换器完整流程（启用简繁转换）');
    const converter2 = new Converter({
      chinese: {
        convert_to_traditional: true
      }
    });
    
    const result2 = await converter2.convert_file(mdFile2, wordFile2, true);
    console.log(`转换结果: ${result2.success ? '成功' : '失败'}`);
    console.log(`生成的繁体Word文件路径: ${result2.outputFile}`);
    
    // 读取生成的HTML文件内容并比较
    const htmlContent = await fs.readFile(htmlFile1, 'utf8');
    const traditionalHtmlContent = await fs.readFile(htmlFile2, 'utf8');
    
    console.log('\n简体HTML内容片段:');
    console.log(htmlContent.substring(0, 500) + '...');
    
    console.log('\n繁体HTML内容片段:');
    console.log(traditionalHtmlContent.substring(0, 500) + '...');
    
    console.log('\n测试完成 - 请检查生成的文件以验证简繁转换效果');
    console.log(`简体HTML: ${htmlFile1}`);
    console.log(`繁体HTML: ${htmlFile2}`);
    console.log(`简体Word: ${wordFile1}`);
    console.log(`繁体Word: ${wordFile2}`);
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
testChineseConversion(); 