/**
 * @description 表格处理器模块 - 美化版
 * 参考Excel转换器的表格美化样式，提供专业商务风格：
 * 1. 表头：深蓝底白字，居中加粗
 * 2. 数据行：交替行颜色（奇数行浅灰蓝，偶数行白色）
 * 3. 边框：统一灰蓝色细边框
 * 4. 单元格内边距适中，文字垂直居中
 * 5. 根据内容智能计算列宽：取每列最长内容的宽度
 * 6. 第一列保底最小宽度（约4个汉字），防止过窄
 * 7. 内容超出时整表统一缩小字号（最低9pt），不出现有大有小
 * 8. 列宽基于统一缩放后的字号重新计算，不浪费空间
 */
const { Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, BorderStyle, VerticalAlign } = require('docx');

const TABLE_CELL_PADDING_TOP = 60;
const TABLE_CELL_PADDING_BOTTOM = 60;
const TABLE_CELL_PADDING_LEFT = 80;
const TABLE_CELL_PADDING_RIGHT = 80;
const TABLE_HEADER_ROW_HEIGHT = 500;
const TABLE_DATA_ROW_HEIGHT = 360;

const MIN_COL_WIDTH_DXA = 900;
const FIRST_COL_MIN_DXA = 1500;
const MAX_COL_WIDTH_DXA = 12000;
const MIN_FONT_SIZE_PT = 9;
const DEFAULT_FONT_SIZE_PT = 12;
const CELL_PADDING_DXA = TABLE_CELL_PADDING_LEFT + TABLE_CELL_PADDING_RIGHT;

class TableProcessor {
  constructor(config, converter) {
    this.config = config;
    this.converter = converter;
  }

  estimateContentWidthDXA(text, fontSizePt) {
    if (!text) return 0;
    fontSizePt = fontSizePt || DEFAULT_FONT_SIZE_PT;
    const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishCharCount = text.length - chineseCharCount;
    const scaleFactor = fontSizePt / DEFAULT_FONT_SIZE_PT;
    const estimatedPt = (chineseCharCount * 12 + englishCharCount * 6) * scaleFactor;
    return Math.round(estimatedPt * 20);
  }

  getMaxContentPerColumn(rows, $) {
    const numCols = Math.max(...rows.map(row => {
      return $(row).find('th, td').toArray().length;
    }));
    if (numCols === 0) return { contentWidths: [], numCols: 0 };

    const contentWidths = new Array(numCols).fill(0);

    for (const row of rows) {
      const $row = $(row);
      const cells = $row.find('th, td').toArray();
      for (let colIdx = 0; colIdx < Math.min(cells.length, numCols); colIdx++) {
        const cellText = $(cells[colIdx]).text().trim();
        const w = this.estimateContentWidthDXA(cellText, DEFAULT_FONT_SIZE_PT);
        if (w > contentWidths[colIdx]) {
          contentWidths[colIdx] = w;
        }
      }
    }

    return { contentWidths, numCols };
  }

  calculateLayout(rows, $) {
    const { contentWidths, numCols } = this.getMaxContentPerColumn(rows, $);
    if (numCols === 0) return { columnWidths: [], tableFontSize: DEFAULT_FONT_SIZE_PT };

    const pageConfig = this.config.document;
    const pageSizes = { A4: { width: 21.0 }, A3: { width: 29.7 }, Letter: { width: 21.59 }, Legal: { width: 21.59 } };
    const pageSize = pageSizes[pageConfig.page_size] || pageSizes['A4'];
    const marginLeft = pageConfig.margin_left;
    const marginRight = pageConfig.margin_right;
    const contentWidthCm = pageSize.width - marginLeft - marginRight;
    const contentWidthDxa = Math.round(contentWidthCm * 567);

    // Natural column widths at default 12pt font
    const naturalWidths = contentWidths.map((w, i) => {
      const minW = i === 0 ? FIRST_COL_MIN_DXA : MIN_COL_WIDTH_DXA;
      return Math.max(minW, w + CELL_PADDING_DXA);
    });

    const totalNatural = naturalWidths.reduce((s, w) => s + w, 0);
    let tableFontSize = DEFAULT_FONT_SIZE_PT;
    let columnWidths;

    if (totalNatural <= contentWidthDxa * 0.85) {
      // Content much narrower than page: expand to fill
      const fillScale = contentWidthDxa / totalNatural;
      columnWidths = naturalWidths.map((w, i) => {
        const minW = i === 0 ? FIRST_COL_MIN_DXA : MIN_COL_WIDTH_DXA;
        return Math.max(minW, Math.round(w * fillScale));
      });
    } else if (totalNatural <= contentWidthDxa) {
      // Natural widths fit the page, use as-is
      columnWidths = [...naturalWidths];
    } else {
      // Content exceeds page: find a unified font size where everything fits
      // Binary search between MIN_FONT_SIZE_PT and DEFAULT_FONT_SIZE_PT
      let lo = MIN_FONT_SIZE_PT;
      let hi = DEFAULT_FONT_SIZE_PT;
      let bestFontSize = MIN_FONT_SIZE_PT;
      let bestWidths = null;

      while (lo <= hi) {
        const mid = Math.round(lo * 2) / 2; // try 0.5 increments
        const scaledWidths = contentWidths.map((contentW, i) => {
          const scaledContent = contentW * (mid / DEFAULT_FONT_SIZE_PT);
          const minW = i === 0 ? FIRST_COL_MIN_DXA : MIN_COL_WIDTH_DXA;
          return Math.max(minW, Math.round(scaledContent + CELL_PADDING_DXA));
        });
        const totalScaled = scaledWidths.reduce((s, w) => s + w, 0);

        if (totalScaled <= contentWidthDxa) {
          // This font size works, try larger
          bestFontSize = mid;
          bestWidths = scaledWidths;
          lo = mid + 0.5;
        } else {
          // Still too wide, try smaller
          hi = mid - 0.5;
        }
      }

      if (bestWidths) {
        tableFontSize = bestFontSize;
        columnWidths = bestWidths;

        // Scale up to fill page if there's room
        const totalBest = columnWidths.reduce((s, w) => s + w, 0);
        if (totalBest < contentWidthDxa * 0.85) {
          const fillScale = contentWidthDxa / totalBest;
          columnWidths = columnWidths.map(w => Math.round(w * fillScale));
        }
      } else {
        // Even at minimum font size it doesn't fit, use min size and clamp
        tableFontSize = MIN_FONT_SIZE_PT;
        columnWidths = contentWidths.map((contentW, i) => {
          const scaledContent = contentW * (MIN_FONT_SIZE_PT / DEFAULT_FONT_SIZE_PT);
          const minW = i === 0 ? FIRST_COL_MIN_DXA : MIN_COL_WIDTH_DXA;
          return Math.max(minW, Math.round(scaledContent + CELL_PADDING_DXA));
        });
        const totalFinal = columnWidths.reduce((s, w) => s + w, 0);
        if (totalFinal > contentWidthDxa) {
          const rescale = contentWidthDxa / totalFinal;
          columnWidths = columnWidths.map(w => Math.round(w * rescale));
        }
      }
    }

    // Final clamp
    for (let i = 0; i < numCols; i++) {
      const minW = i === 0 ? FIRST_COL_MIN_DXA : MIN_COL_WIDTH_DXA;
      columnWidths[i] = Math.max(minW, Math.min(MAX_COL_WIDTH_DXA, columnWidths[i]));
    }

    return { columnWidths, tableFontSize };
  }

  process($el, $) {
    const rows = $el.find('tr').toArray();
    if (rows.length === 0) return;

    const tableStyles = this.config.table_styles;
    const enhancedStyles = this.config.enhanced_table_styles;

    const headerBgColor = enhancedStyles.header_bg_color || tableStyles.header_bg_color;
    const evenRowColor = enhancedStyles.even_row_color || tableStyles.even_row_color;
    const oddRowColor = enhancedStyles.odd_row_color || tableStyles.odd_row_color;
    const borderColor = enhancedStyles.border_color || tableStyles.border_color;
    const borderSize = enhancedStyles.border_size;

    const borderDef = {
      top: { style: BorderStyle.SINGLE, size: borderSize, color: borderColor },
      bottom: { style: BorderStyle.SINGLE, size: borderSize, color: borderColor },
      left: { style: BorderStyle.SINGLE, size: borderSize, color: borderColor },
      right: { style: BorderStyle.SINGLE, size: borderSize, color: borderColor },
    };

    const theadRowIndices = new Set();
    $el.find('thead tr').each((_, tr) => {
      const allRows = $el.find('tr').toArray();
      const idxInAll = allRows.indexOf(tr);
      if (idxInAll >= 0) theadRowIndices.add(idxInAll);
    });

    const { columnWidths, tableFontSize } = this.calculateLayout(rows, $);

    const { fonts: fontConfig, sizes: sizeConfig } = this.config;
    const defaultFont = fontConfig.default;
    const defaultSize = sizeConfig.default;
    const useFontSize = tableFontSize < defaultSize ? tableFontSize : defaultSize;

    const tableRows = [];
    let dataRowIndex = 0;
    const rowHeightsPx = [];
    const cellPaddingPx = Math.round((TABLE_CELL_PADDING_TOP + TABLE_CELL_PADDING_BOTTOM) * 96 / 1440);

    for (const [rowIndex, row] of rows.entries()) {
      const $row = $(row);
      const cells = $row.find('th, td').toArray();
      if (cells.length === 0) continue;

      const isHeader = theadRowIndices.has(rowIndex) ||
                        $row.find('th').length > 0 ||
                        (theadRowIndices.size === 0 && rowIndex === 0);

      let rowBgColor;
      if (isHeader) {
        rowBgColor = headerBgColor;
      } else {
        rowBgColor = dataRowIndex % 2 === 0 ? evenRowColor : oddRowColor;
      }

      const tableCells = [];

      for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
        const $cell = $(cells[cellIndex]);
        const isHeaderCell = cells[cellIndex].tagName.toLowerCase() === 'th' || isHeader;
        const cellFill = isHeaderCell ? headerBgColor : rowBgColor;

        const cellChildren = [];
        const cellParagraphs = $cell.find('p').toArray();
        const paragraphSpacing = { before: 40, after: 40, line: useFontSize <= 9 ? 240 : 280 };

        if (cellParagraphs.length > 0) {
          for (const p of cellParagraphs) {
            const $p = $(p);
            const paragraph = new Paragraph({
              alignment: isHeaderCell ? AlignmentType.CENTER : AlignmentType.LEFT,
              spacing: paragraphSpacing
            });

            if (isHeaderCell) {
              const text = $p.text().trim();
              paragraph.addChildElement(new TextRun({
                text: text,
                bold: true,
                font: { name: defaultFont },
                size: useFontSize * 2,
                color: enhancedStyles.header_font_color
              }));
            } else {
              this._addCellContent($p, paragraph, $, useFontSize, defaultFont, defaultSize);
            }

            cellChildren.push(paragraph);
          }
        } else {
          const paragraph = new Paragraph({
            alignment: isHeaderCell ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: paragraphSpacing
          });

          if (isHeaderCell) {
            const text = $cell.text().trim();
            paragraph.addChildElement(new TextRun({
              text: text,
              bold: true,
              font: { name: defaultFont },
              size: useFontSize * 2,
              color: enhancedStyles.header_font_color
            }));
          } else {
            this._addCellContent($cell, paragraph, $, useFontSize, defaultFont, defaultSize);
          }

          cellChildren.push(paragraph);
        }

        const cellOptions = {
          children: cellChildren,
          shading: {
            fill: cellFill,
            type: 'clear'
          },
          verticalAlign: VerticalAlign.CENTER,
          margins: {
            top: TABLE_CELL_PADDING_TOP,
            bottom: TABLE_CELL_PADDING_BOTTOM,
            left: TABLE_CELL_PADDING_LEFT,
            right: TABLE_CELL_PADDING_RIGHT
          }
        };

        if (columnWidths.length > cellIndex) {
          cellOptions.width = {
            size: columnWidths[cellIndex],
            type: WidthType.DXA
          };
        }

        const tableCell = new TableCell(cellOptions);
        tableCells.push(tableCell);
      }

      const rowHeight = isHeader ?
        (enhancedStyles.row_height?.header ? enhancedStyles.row_height.header * 20 : TABLE_HEADER_ROW_HEIGHT) :
        (enhancedStyles.row_height?.default ? enhancedStyles.row_height.default * 20 : TABLE_DATA_ROW_HEIGHT);

      const tableRow = new TableRow({
        children: tableCells,
        height: {
          value: rowHeight,
          rule: 'atLeast'
        }
      });

      tableRows.push(tableRow);
      if (!isHeader) dataRowIndex++;

      // 基于单元格实际内容估算行高（取最高单元格，不是累加）
      let maxCellHeightPx = 0;
      for (const cell of cells) {
        const $cell = $(cell);
        let cellHeightPx = 0;
        const innerParagraphs = $cell.find('p').toArray();
        if (innerParagraphs.length > 0) {
          for (const p of innerParagraphs) {
            const pText = $(p).text().trim();
            if (pText) {
              cellHeightPx += this.converter.estimateParagraphHeight(pText, useFontSize);
            }
          }
        } else {
          const cellText = $cell.text().trim();
          if (cellText) {
            cellHeightPx += this.converter.estimateParagraphHeight(cellText, useFontSize);
          }
        }
        // 加上此单元格的内边距
        cellHeightPx += cellPaddingPx;
        maxCellHeightPx = Math.max(maxCellHeightPx, cellHeightPx);
      }
      // 取内容高度与最小行高的较大值
      const minRowHeightPx = Math.round((isHeader ? TABLE_HEADER_ROW_HEIGHT : TABLE_DATA_ROW_HEIGHT) * 96 / 1440);
      rowHeightsPx.push(Math.max(maxCellHeightPx, minRowHeightPx));
    }

    if (tableRows.length === 0) return;

    const hasBorder = enhancedStyles.border !== false;

    const tableOptions = {
      rows: tableRows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      },
      columnWidths: columnWidths
    };

    if (hasBorder) {
      tableOptions.borders = {
        top: borderDef.top,
        bottom: borderDef.bottom,
        left: borderDef.left,
        right: borderDef.right,
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
      };
    }

    const table = new Table(tableOptions);
    // 基于单元格实际内容行数估算表格高度，用于页面位置追踪
    const estimatedHeightPx = rowHeightsPx.reduce((sum, h) => sum + h, 0) + (hasBorder ? (borderSize || 1) * 2 : 0);
    this.converter.addDocElement(table, estimatedHeightPx);
  }

  _addCellContent($el, paragraph, $, fontSize, defaultFont, defaultSize) {
    if (fontSize < defaultSize) {
      const text = $el.text().trim();
      paragraph.addChildElement(new TextRun({
        text: text,
        font: { name: defaultFont },
        size: fontSize * 2
      }));
    } else {
      this.converter.textProcessor.processInlineElements($el, paragraph, $);
    }
  }
}

module.exports = TableProcessor;
