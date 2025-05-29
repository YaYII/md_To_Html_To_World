const Converter = require('./nodejs/src/converter');
const path = require('path');

async function test() {
  console.log('🧪 开始测试文件处理功能...');
  
  const converter = new Converter();
  const inputFile = './test_file_handler.md';
  const outputFile = './test_output.docx';
  
  try {
    const result = await converter.convert_file(inputFile, outputFile, false);
    
    if (result.success) {
      console.log('✅ 测试成功!');
      console.log('📄 输出文件:', result.outputFile);
      console.log('📝 消息:', result.message);
      
      // 测试文件是否存在
      const fs = require('fs');
      if (fs.existsSync(result.outputFile)) {
        const stats = fs.statSync(result.outputFile);
        console.log('📏 文件大小:', stats.size, '字节');
      }
    } else {
      console.log('❌ 测试失败:');
      console.log('📝 错误:', result.message);
    }
  } catch (error) {
    console.log('💥 测试异常:', error.message);
  }
}

test(); 