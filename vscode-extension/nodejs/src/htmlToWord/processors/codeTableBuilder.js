/**
 * @fileoverview 代码表格构建器模块
 * @module htmlToWord/processors/codeTableBuilder
 * @description 该模块负责构建用于在Word文档中显示带行号代码块的表格。
 */
const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, BorderStyle, AlignmentType } = require('docx');

/**
 * @function buildCodeTable
 * @description 构建一个带有行号的代码表格。
 * @param {Array<string>} codeLines - 分割后的代码行数组。
 * @param {string} codeFont - 代码块使用的字体名称。
 * @param {number} codeSize - 代码块的字体大小 (单位: points)。
 * @param {string} baseCodeColor - 代码文本的基础颜色 (十六进制, 例如 "333333")。
 * @param {Object} codeBlockSettings - 代码块的特定配置对象，包含颜色、边框等设置。
 * @param {Object} generalParagraphConfig - 通用的段落配置，例如行距。
 * @param {function(string): string} preserveIndentationFn - 用于处理和保留代码缩进的函数。
 * @returns {Table} 一个 docx.Table 对象，表示格式化后的代码块。
 */
function buildCodeTable(codeLines, codeFont, codeSize, baseCodeColor, codeBlockSettings, generalParagraphConfig, preserveIndentationFn) {
  const tableRows = [];

  // 从配置中获取样式，提供默认值
  const codeBackgroundColor = codeBlockSettings.background_color || 'F8F8F8';
  const tableBorderColor = codeBlockSettings.border_color || 'DDDDDD'; // 用于表格内部分隔线

  const lineNumberSettings = codeBlockSettings.lineNumber || {};
  const lineNumberBackgroundColor = lineNumberSettings.background_color || 'F0F0F0';
  const lineNumberColor = lineNumberSettings.text_color || '666666';
  
  const paragraphLineSpacing = (generalParagraphConfig?.line_spacing || 1.0) * 240; // 默认为单倍行距 (240 DXA / 20 = 12 points)

  // 计算行号列的宽度 (单位 DXA, 1 point = 20 DXA)
  // 基于最大行号的字符数动态调整，最小宽度为30points (600 DXA)
  // 假设每个数字宽度约为字体大小的60% (一个经验值，可调整)
  const maxLineNumberChars = String(codeLines.length).length;
  const estimatedCharWidthPoints = codeSize * 0.6; // 估算单个数字字符宽度 (points)
  const lineNumberColumnWidthPoints = Math.max(maxLineNumberChars * estimatedCharWidthPoints + 10, 30); // 额外增加10 points 作为 padding, 最小30 points
  const lineNumberWidthDXA = lineNumberColumnWidthPoints * 20;


  for (let i = 0; i < codeLines.length; i++) {
    const line = codeLines[i];
    const lineNumber = i + 1;
    // 调用传入的缩进处理函数
    const processedLine = preserveIndentationFn(line);

    // 创建行号单元格
    const lineNumberCell = new TableCell({
      shading: {
        fill: lineNumberBackgroundColor, // 行号单元格背景色
      },
      verticalAlign: "center", // 垂直居中
      width: {
        size: lineNumberWidthDXA, // 行号列宽度
        type: WidthType.DXA,
      },
      margins: { // 单元格内边距 (单位DXA, 1 point = 20 DXA)
        top: 20, // 1 point
        bottom: 20, // 1 point
        left: 40,  // 2 points
        right: 80, // 4 points (行号与代码之间的间距)
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT, // 行号右对齐
          spacing: { line: paragraphLineSpacing }, // 与代码行行距保持一致
          children: [
            new TextRun({
              text: String(lineNumber),
              font: { name: codeFont }, // 行号也使用代码字体
              size: codeSize * 2,        // docx的size单位是half-points
              color: lineNumberColor.replace('#', ''), // 行号文本颜色
            }),
          ],
        }),
      ],
    });

    // 创建代码单元格
    const codeCell = new TableCell({
      shading: {
        fill: codeBackgroundColor, // 代码单元格背景色
      },
      verticalAlign: "center", // 垂直居中
      margins: { // 单元格内边距
        top: 20, 
        bottom: 20,
        left: 80, // 4 points (代码与行号分隔线的间距)
        right: 40, // 2 points
      },
      children: [
        new Paragraph({
          spacing: { line: paragraphLineSpacing }, // 与行号行距保持一致
          children: [
            new TextRun({
              text: processedLine,
              font: { name: codeFont },
              size: codeSize * 2,
              color: baseCodeColor.replace('#', ''),
            }),
          ],
        }),
      ],
    });

    // 创建表格行
    const tableRow = new TableRow({
      children: [lineNumberCell, codeCell],
      // cantBreakAcrossPage: true, // 可选：尝试阻止代码行在分页时被拆分，但需测试其在不同Word版本中的兼容性和效果
    });

    tableRows.push(tableRow);
  }

  // 创建代码表格
  const codeTable = new Table({
    width: {
      size: 100, // 表格宽度占页面可用宽度的百分比
      type: WidthType.PERCENTAGE,
    },
    // 表格外边框由 codeProcessor.js 中的容器段落控制，这里只定义内部分隔线
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "auto" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" }, // 行之间无分隔线
      insideVertical: { // 列之间 (即行号和代码之间) 的分隔线
        style: BorderStyle.SINGLE,
        size: 1, // 边框大小 (单位: eighths of a point, 1 = 1/8 pt)
        color: tableBorderColor, // 使用配置的边框颜色
      },
    },
    rows: tableRows,
  });

  return codeTable;
}

module.exports = {
  buildCodeTable,
};
