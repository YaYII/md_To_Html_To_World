/**
 * @description 列表处理器模块
 * 处理有序和无序列表
 */
const { Paragraph, TextRun } = require('docx');

/**
 * @class ListProcessor
 * @description 处理列表元素的类
 */
class ListProcessor {
  /**
   * @constructor
   * @param {Object} config - 配置对象
   * @param {Object} converter - 转换器实例
   */
  constructor(config, converter) {
    this.config = config;
    this.converter = converter;
  }

  /**
   * @method process
   * @description 处理列表元素
   * @param {Cheerio} $el - Cheerio元素
   * @param {CheerioAPI} $ - Cheerio实例
   * @param {boolean} isOrdered - 是否为有序列表
   */
  process($el, $, isOrdered) {
    const listItems = $el.find('> li').toArray();
    
    // 逐项处理列表项
    listItems.forEach((item, index) => {
      const $item = $(item);
      const paragraph = new Paragraph({
        indent: {
          left: 720, // 约60pt的缩进
          hanging: 360 // 悬挂缩进，使项目符号或编号突出
        }
      });
      
      // 添加列表序号或项目符号
      let prefix;
      if (isOrdered) {
        // 对于有序列表使用数字
        prefix = `${index + 1}. `;
      } else {
        // 对于无序列表使用项目符号
        prefix = '• ';
      }
      
      // 添加前缀
      paragraph.addChildElement(new TextRun({
        text: prefix,
        font: {
          name: this.config.fonts?.default || '微软雅黑'
        },
        size: (this.config.sizes?.default || 12) * 2
      }));
      
      // 处理列表项内容
      const $contents = $item.children();
      
      // 检查是否有子列表
      const nestedLists = $item.find('> ul, > ol').toArray();
      
      if ($contents.length === 0) {
        // 列表项中只有文本内容
        const text = $item.text().trim();
        if (text) {
          paragraph.addChildElement(new TextRun({
            text: text,
            font: {
              name: this.config.fonts?.default || '微软雅黑'
            },
            size: (this.config.sizes?.default || 12) * 2
          }));
        }
      } else {
        // 列表项中有其他元素，但我们需要过滤掉嵌套列表
        // 创建一个克隆的列表项，移除嵌套列表，然后处理内容
        const $clonedItem = $item.clone();
        $clonedItem.find('> ul, > ol').remove();
        
        // 处理过滤后的内容
        if ($clonedItem.contents().length > 0) {
          this.converter.textProcessor.processInlineElements($clonedItem, paragraph, $);
        }
      }
      
      // 添加到文档元素数组
      this.converter.addDocElement(paragraph);
      
      // 处理嵌套列表（如果有）
      if (nestedLists.length > 0) {
        for (const nestedList of nestedLists) {
          const $nestedList = $(nestedList);
          const isNestedOrdered = $nestedList.prop('tagName').toLowerCase() === 'ol';
          
          // 递归处理嵌套列表，增加缩进
          this.process($nestedList, $, isNestedOrdered);
        }
      }
    });
  }
}

module.exports = ListProcessor; 