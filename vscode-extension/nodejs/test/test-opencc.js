/**
 * @description OpenCC简繁转换测试
 */
const OpenCC = require('opencc-js');

// 测试文本
const simplifiedText = `
# 简繁转换测试

这是一段简体中文文本，用于测试简繁转换功能。

## 中国人民

中华人民共和国成立于1949年。

## 计算机科学

计算机科学是研究计算机及其周围各种现象和规律的科学。
`;

// 创建简转繁的转换器
console.log('创建简体到繁体的转换器...');
const s2t = OpenCC.Converter({ from: 'cn', to: 'tw' });

// 执行转换
console.log('执行转换...');
const traditionalText = s2t(simplifiedText);

// 输出结果
console.log('\n原始简体文本:');
console.log(simplifiedText);

console.log('\n转换后的繁体文本:');
console.log(traditionalText);

// 检查是否有差异
if (simplifiedText === traditionalText) {
  console.log('\n警告: 转换前后文本相同，转换可能未生效!');
} else {
  console.log('\n转换成功，文本已更改!');
} 