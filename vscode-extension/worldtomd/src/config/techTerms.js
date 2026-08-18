/**
 * 技术名词配置
 * 定义不应该被转换为代码格式的技术名词
 * 
 * 重要说明：
 * - 所有匹配都是大小写敏感的
 * - HTML 和 html 是不同的概念，需要分别定义
 * - HTML: 超文本标记语言本身
 * - html: 文件扩展名、标签名等技术术语
 */

module.exports = {
  // 精确匹配的技术名词（区分大小写）
  // 这些词汇在 <code> 标签中时不会被转换为 `代码格式`
  exactMatch: [
    'HTML',      // 超文本标记语言（专有名词）
    'Markdown',  // Markdown语言（专有名词）
    'VUE',  // Markdown语言（专有名词）
    'Vue',  // Markdown语言（专有名词）
    'vue',  // Markdown语言（专有名词）
    'VUE3',  // Markdown语言（专有名词）
    'Vue3',  // Markdown语言（专有名词）
    'vue3',  // Markdown语言（专有名词）
    'VUE2',  // Markdown语言（专有名词）
    'Vue2',  // Markdown语言（专有名词）
    'vue2',  // Markdown语言（专有名词）
    'JS',  // Markdown语言（专有名词）
    'js',  // Markdown语言（专有名词）
    'JSX',  // Markdown语言（专有名词）
    'jsx',  // Markdown语言（专有名词）
    'React',  // Markdown语言（专有名词）
    'react',  // Markdown语言（专有名词）
    'JSX',  // Markdown语言（专有名词）
    'jsx',  // Markdown语言（专有名词）
  ],
  
  // 使用说明
  usage: {
    convertElement: '在 convertElement 方法中用于 <code> 标签处理',
    postprocessMarkdown: '在 postprocessMarkdown 方法中用于 HTML 标签转义处理',
    caseSensitive: true,
    description: '精确匹配，区分大小写，保持原始格式'
  }
};