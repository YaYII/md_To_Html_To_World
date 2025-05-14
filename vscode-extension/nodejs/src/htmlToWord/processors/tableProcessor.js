/**
 * @description 表格处理器模块
 * 处理HTML表格元素
 */
const { Paragraph, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, VerticalAlign } = require('docx');

/**
 * @class TableProcessor
 * @description 处理表格元素的类
 */
class TableProcessor {
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
   * @description 处理表格元素
   * @param {Cheerio} $el - Cheerio元素
   * @param {CheerioAPI} $ - Cheerio实例
   */
  process($el, $) {
    const rows = $el.find('tr').toArray();
    const tableRows = [];
    
    // 获取表格样式配置
    const tableStyles = this.config.table_styles || {};
    const enhancedStyles = this.config.enhanced_table_styles || {};
    
    // 默认样式
    const headerBgColor = tableStyles.header_bg_color || enhancedStyles.header_bg_color || 'DDDDDD';
    const evenRowColor = tableStyles.even_row_color || enhancedStyles.even_row_color || 'FFFFFF';
    const oddRowColor = tableStyles.odd_row_color || 'F2F2F2';
    const borderColor = tableStyles.border_color || enhancedStyles.border_color || '000000';
    const borderSize = enhancedStyles.border_size || 1;
    const hasBorder = enhancedStyles.border !== false;
    
    // 处理表格行
    for (const [rowIndex, row] of rows.entries()) {
      const $row = $(row);
      const cells = $row.find('th, td').toArray();
      const tableCells = [];
      const isHeader = rowIndex === 0;
      
      // 确定行背景色
      const rowBgColor = isHeader ? 
        headerBgColor : 
        (rowIndex % 2 === 0 ? evenRowColor : oddRowColor);
      
      // 处理单元格
      for (const cell of cells) {
        const $cell = $(cell);
        const isHeaderCell = cell.tagName.toLowerCase() === 'th';
        
        // 创建单元格内的段落
        const paragraph = new Paragraph({
          alignment: enhancedStyles.text_align === 'center' ? 
            AlignmentType.CENTER : 
            (enhancedStyles.text_align === 'right' ? 
              AlignmentType.RIGHT : AlignmentType.LEFT)
        });
        this.converter.textProcessor.processInlineElements($cell, paragraph, $);
        
        // 创建表格单元格
        const tableCell = new TableCell({
          children: [paragraph],
          shading: {
            fill: isHeaderCell || isHeader ? headerBgColor : rowBgColor
          },
          verticalAlign: enhancedStyles.vertical_align === 'top' ? 
            VerticalAlign.TOP : 
            (enhancedStyles.vertical_align === 'bottom' ? 
              VerticalAlign.BOTTOM : VerticalAlign.CENTER),
          margins: {
            top: enhancedStyles.cell_padding ? enhancedStyles.cell_padding * 20 : 100,
            bottom: enhancedStyles.cell_padding ? enhancedStyles.cell_padding * 20 : 100,
            left: enhancedStyles.cell_padding ? enhancedStyles.cell_padding * 20 : 100,
            right: enhancedStyles.cell_padding ? enhancedStyles.cell_padding * 20 : 100
          }
        });
        
        tableCells.push(tableCell);
      }
      
      // 创建表格行
      const tableRow = new TableRow({
        children: tableCells,
        height: {
          value: isHeader && enhancedStyles.row_height?.header ? 
            enhancedStyles.row_height.header * 20 : 
            (enhancedStyles.row_height?.default ? enhancedStyles.row_height.default * 20 : 400),
          rule: enhancedStyles.row_height?.auto_adjust ? 'auto' : 'exact'
        }
      });
      
      tableRows.push(tableRow);
    }
    
    // 创建表格
    const table = new Table({
      rows: tableRows,
      width: {
        size: enhancedStyles.width || 100,
        type: WidthType.PERCENTAGE
      },
      borders: hasBorder ? {
        top: {
          style: BorderStyle.SINGLE,
          size: borderSize,
          color: borderColor
        },
        bottom: {
          style: BorderStyle.SINGLE,
          size: borderSize,
          color: borderColor
        },
        left: {
          style: BorderStyle.SINGLE,
          size: borderSize,
          color: borderColor
        },
        right: {
          style: BorderStyle.SINGLE,
          size: borderSize,
          color: borderColor
        },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: borderSize,
          color: borderColor
        },
        insideVertical: {
          style: BorderStyle.SINGLE,
          size: borderSize,
          color: borderColor
        }
      } : undefined
    });
    
    // 添加到文档元素数组
    this.converter.addDocElement(table);
  }
}

module.exports = TableProcessor; 