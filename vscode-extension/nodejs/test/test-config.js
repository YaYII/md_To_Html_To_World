/**
 * @description 配置传递测试
 * 测试配置是否正确应用到Word文档
 */
const fs = require('fs-extra');
const path = require('path');

// 导入转换模块
const Converter = require('../src/converter');
const HtmlToWordConverter = require('../src/htmlToWord');

// 简单的HTML内容
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>配置测试</title>
</head>
<body>
  <h1>文档标题</h1>
  <p>这是一段普通文本，用于测试默认字体和大小。</p>
  <h2>二级标题</h2>
  <p>这是第二段文本。</p>
  <h3>三级标题</h3>
  <pre><code>// 这是代码块
function test() {
  console.log('测试代码');
}
</code></pre>
  <ul>
    <li>列表项1</li>
    <li>列表项2</li>
  </ul>
  <table>
    <tr>
      <th>表头1</th>
      <th>表头2</th>
    </tr>
    <tr>
      <td>单元格1</td>
      <td>单元格2</td>
    </tr>
  </table>
</body>
</html>
`;

// 测试配置
const testConfig = {
  document: {
    page_size: 'Letter',
    margin_top: 3,
    margin_bottom: 3,
    margin_left: 2,
    margin_right: 2,
    orientation: 'portrait',
    generate_toc: false
  },
  fonts: {
    default: '宋体',
    code: 'Consolas',
    headings: '黑体'
  },
  sizes: {
    default: 14,
    code: 12,
    heading1: 20,
    heading2: 18,
    heading3: 16,
    heading4: 14,
    heading5: 12,
    heading6: 10
  },
  colors: {
    default: '#000000',
    headings: '#333333',
    code: '#555555',
    link: '#0563C1'
  },
  paragraph: {
    line_spacing: 2,
    space_before: 10,
    space_after: 10,
    first_line_indent: 0
  },
  table_styles: {
    even_row_color: '#FFFFFF',
    odd_row_color: '#F2F2F2',
    header_bg_color: '#DDDDDD',
    border_color: '#000000',
    cell_height: 'auto',
    table_width: '100%'
  }
};

async function testDirectHtmlToWord() {
  try {
    console.log('测试1: 直接使用HtmlToWord转换器');
    console.log('配置:', JSON.stringify(testConfig, null, 2));
    
    // 创建临时HTML文件
    const tempDir = path.resolve(__dirname, 'temp');
    await fs.ensureDir(tempDir);
    
    const htmlFile = path.join(tempDir, 'test.html');
    const wordFile = path.join(tempDir, 'test-direct.docx');
    
    // 写入HTML内容
    await fs.writeFile(htmlFile, htmlContent, 'utf8');
    
    // 使用HTML到Word转换器
    const htmlToWord = new HtmlToWordConverter(testConfig);
    await htmlToWord.convertFile(htmlFile, wordFile);
    
    console.log(`文档已保存到: ${wordFile}`);
  } catch (error) {
    console.error('测试直接转换失败:', error);
  }
}

async function testConverterClass() {
  try {
    console.log('\n测试2: 使用Converter类');
    console.log('配置:', JSON.stringify(testConfig, null, 2));
    
    // 创建临时HTML文件
    const tempDir = path.resolve(__dirname, 'temp');
    await fs.ensureDir(tempDir);
    
    const htmlFile = path.join(tempDir, 'test.html');
    const mdFile = path.join(tempDir, 'test.md');
    const wordFile = path.join(tempDir, 'test-converter.docx');
    
    // 写入HTML内容
    await fs.writeFile(htmlFile, htmlContent, 'utf8');
    
    // 写入Markdown内容
    await fs.writeFile(mdFile, `
# 文档标题

这是一段普通文本，用于测试默认字体和大小。

## 二级标题

这是第二段文本。

### 三级标题

\`\`\`javascript
// 这是代码块
function test() {
  console.log('测试代码');
}
\`\`\`

- 列表项1
- 列表项2

| 表头1 | 表头2 |
|-------|-------|
| 单元格1 | 单元格2 |
`, 'utf8');
    
    // 使用转换器
    const converter = new Converter(testConfig);
    const result = await converter.convert_file(mdFile, wordFile, true);
    
    console.log(`转换结果:`, result);
    console.log(`文档已保存到: ${wordFile}`);
  } catch (error) {
    console.error('测试Converter类失败:', error);
  }
}

// 运行测试
async function runTests() {
  console.log('开始配置传递测试...');
  await testDirectHtmlToWord();
  await testConverterClass();
  console.log('测试完成');
}

runTests(); 