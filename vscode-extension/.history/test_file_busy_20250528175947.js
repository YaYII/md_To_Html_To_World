const Converter = require('./nodejs/src/converter');
const fs = require('fs');
const path = require('path');

async function testFileBusy() {
  console.log('🧪 开始测试文件被占用的处理...');
  
  const converter = new Converter();
  const inputFile = './test_file_handler.md';
  const outputFile = './test_busy_output.docx';
  
  // 创建一个文件句柄来模拟文件被占用
  let fileHandle = null;
  
  try {
    // 预先创建文件并保持打开状态来模拟被占用
    console.log('📝 创建并锁定目标文件...');
    fileHandle = fs.openSync(outputFile, 'w');
    fs.writeSync(fileHandle, 'dummy content');
    // 不关闭文件，保持占用状态
    
    console.log('🔒 文件已被占用，开始转换测试...');
    
    const result = await converter.convert_file(inputFile, outputFile, false);
    
    if (result.success) {
      console.log('✅ 测试成功! 文件处理器正确处理了占用情况');
      console.log('📄 实际输出文件:', result.outputFile);
      console.log('📝 消息:', result.message);
      
      // 检查是否使用了备用文件名
      if (result.outputFile !== outputFile) {
        console.log('🔄 成功使用了备用文件名!');
      }
      
      // 检查文件是否存在
      if (fs.existsSync(result.outputFile)) {
        const stats = fs.statSync(result.outputFile);
        console.log('📏 文件大小:', stats.size, '字节');
      }
    } else {
      console.log('❌ 测试结果显示失败:');
      console.log('📝 错误信息:', result.message);
      
      // 检查错误信息是否友好
      if (result.message.includes('其他程序使用') || result.message.includes('建议解决方案')) {
        console.log('✅ 错误提示是用户友好的!');
      }
    }
    
  } catch (error) {
    console.log('💥 测试异常:', error.message);
  } finally {
    // 清理：关闭文件句柄
    if (fileHandle !== null) {
      try {
        fs.closeSync(fileHandle);
        console.log('🧹 已关闭文件句柄');
      } catch (e) {
        console.log('⚠️ 关闭文件句柄时出错:', e.message);
      }
    }
    
    // 清理测试文件
    try {
      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
        console.log('🧹 已清理原始输出文件');
      }
      
      // 清理可能的备用文件
      for (let i = 1; i <= 3; i++) {
        const backupFile = outputFile.replace('.docx', `_${i}.docx`);
        if (fs.existsSync(backupFile)) {
          fs.unlinkSync(backupFile);
          console.log(`🧹 已清理备用文件: ${backupFile}`);
        }
      }
    } catch (e) {
      console.log('⚠️ 清理文件时出错:', e.message);
    }
  }
}

testFileBusy(); 