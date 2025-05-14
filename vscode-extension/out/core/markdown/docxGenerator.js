"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocxGenerator = void 0;
const docx = __importStar(require("docx"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const jsdom_1 = require("jsdom");
const markdownParser_1 = require("./markdownParser");
class DocxGenerator {
    constructor(options = {}) {
        this.options = Object.assign({ titleSize: 24, paragraphSize: 12, titleFont: 'Microsoft YaHei', paragraphFont: 'Microsoft YaHei', lineSpacing: 1.15, paragraphSpacing: 8, margins: {
                top: 1,
                right: 1,
                bottom: 1,
                left: 1
            }, keepHtml: false, downloadImages: true }, options);
        this.markdownParser = new markdownParser_1.MarkdownParser();
        this.imageCache = new Map();
    }
    createFromMarkdown(markdown) {
        const html = this.markdownParser.parse(markdown);
        return this.createFromHtml(html);
    }
    createFromHtml(html) {
        var _a, _b, _c, _d;
        const doc = new docx.Document({
            sections: [{
                    properties: {
                        page: {
                            margin: {
                                top: ((_a = this.options.margins) === null || _a === void 0 ? void 0 : _a.top) ? docx.convertInchesToTwip(this.options.margins.top) : docx.convertInchesToTwip(1),
                                right: ((_b = this.options.margins) === null || _b === void 0 ? void 0 : _b.right) ? docx.convertInchesToTwip(this.options.margins.right) : docx.convertInchesToTwip(1),
                                bottom: ((_c = this.options.margins) === null || _c === void 0 ? void 0 : _c.bottom) ? docx.convertInchesToTwip(this.options.margins.bottom) : docx.convertInchesToTwip(1),
                                left: ((_d = this.options.margins) === null || _d === void 0 ? void 0 : _d.left) ? docx.convertInchesToTwip(this.options.margins.left) : docx.convertInchesToTwip(1),
                            },
                        },
                    },
                    children: this.parseHtmlToDocxElements(html),
                }],
        });
        return doc;
    }
    parseHtmlToDocxElements(html) {
        const elements = [];
        console.log(`解析HTML，长度: ${html.length}字符`);
        try {
            const dom = new jsdom_1.JSDOM(html);
            const document = dom.window.document;
            const body = document.body;
            this.traverseNodes(body, elements);
            if (elements.length === 0) {
                elements.push(new docx.Paragraph({
                    text: "无内容或解析失败",
                    spacing: {
                        line: this.options.lineSpacing ? this.options.lineSpacing * 240 : 276,
                        after: this.options.paragraphSpacing ? this.options.paragraphSpacing * 20 : 160,
                    },
                }));
            }
        }
        catch (error) {
            console.error('HTML解析失败:', error);
            elements.push(new docx.Paragraph({
                text: `HTML解析错误: ${error instanceof Error ? error.message : String(error)}`,
                spacing: {
                    line: this.options.lineSpacing ? this.options.lineSpacing * 240 : 276,
                    after: this.options.paragraphSpacing ? this.options.paragraphSpacing * 20 : 160,
                },
            }));
        }
        return elements;
    }
    traverseNodes(node, elements, options = {}) {
        if (node.nodeType === 1) {
            const element = node;
            const tagName = element.tagName.toLowerCase();
            switch (tagName) {
                case 'h1':
                case 'h2':
                case 'h3':
                case 'h4':
                case 'h5':
                case 'h6':
                    elements.push(this.createHeading(element, parseInt(tagName.substring(1))));
                    break;
                case 'p':
                    elements.push(this.createParagraph(element));
                    break;
                case 'ul':
                    this.createList(element, elements, false, options.listLevel || 0);
                    break;
                case 'ol':
                    this.createList(element, elements, true, options.listLevel || 0);
                    break;
                case 'table':
                    const table = this.createTable(element);
                    if (table) {
                        elements.push(table);
                    }
                    break;
                case 'pre':
                    elements.push(this.createCodeBlock(element));
                    break;
                case 'blockquote':
                    this.createBlockquote(element, elements);
                    break;
                case 'hr':
                    elements.push(new docx.Paragraph({
                        children: [new docx.TextRun({
                                text: "",
                                break: 1
                            })],
                        thematicBreak: true,
                    }));
                    break;
                default:
                    for (let i = 0; i < node.childNodes.length; i++) {
                        this.traverseNodes(node.childNodes[i], elements, options);
                    }
                    break;
            }
        }
        else if (node.nodeType === 3) {
            const text = node.textContent || '';
            if (text.trim()) {
                elements.push(new docx.Paragraph({ text }));
            }
        }
    }
    createHeading(element, level) {
        const runs = [];
        this.processInlineElements(element, runs);
        return new docx.Paragraph({
            children: runs,
            heading: this.getHeadingLevel(level),
            spacing: {
                before: 240,
                after: 120,
            },
            style: `Heading${level}`,
        });
    }
    getHeadingLevel(level) {
        switch (level) {
            case 1: return docx.HeadingLevel.HEADING_1;
            case 2: return docx.HeadingLevel.HEADING_2;
            case 3: return docx.HeadingLevel.HEADING_3;
            case 4: return docx.HeadingLevel.HEADING_4;
            case 5: return docx.HeadingLevel.HEADING_5;
            case 6: return docx.HeadingLevel.HEADING_6;
            default: return docx.HeadingLevel.HEADING_1;
        }
    }
    createParagraph(element) {
        const runs = [];
        this.processInlineElements(element, runs);
        return new docx.Paragraph({
            children: runs,
            spacing: {
                line: this.options.lineSpacing ? this.options.lineSpacing * 240 : 276,
                after: this.options.paragraphSpacing ? this.options.paragraphSpacing * 20 : 160,
            },
        });
    }
    processInlineElements(element, runs) {
        for (let i = 0; i < element.childNodes.length; i++) {
            const node = element.childNodes[i];
            if (node.nodeType === 1) {
                const childElement = node;
                const tagName = childElement.tagName.toLowerCase();
                switch (tagName) {
                    case 'strong':
                    case 'b':
                        this.processTextWithFormat(childElement, runs, { bold: true });
                        break;
                    case 'em':
                    case 'i':
                        this.processTextWithFormat(childElement, runs, { italic: true });
                        break;
                    case 'code':
                        this.processTextWithFormat(childElement, runs, {
                            font: {
                                family: 'Courier New',
                                size: (this.options.paragraphSize || 12) - 2,
                            },
                        });
                        break;
                    case 'del':
                    case 's':
                        this.processTextWithFormat(childElement, runs, { strike: true });
                        break;
                    case 'a':
                        const href = childElement.getAttribute('href') || '';
                        runs.push(new docx.ExternalHyperlink({
                            children: [
                                new docx.TextRun({
                                    text: childElement.textContent || href,
                                    style: 'Hyperlink',
                                })
                            ],
                            link: href,
                        }));
                        break;
                    case 'img':
                        this.processImage(childElement, runs);
                        break;
                    case 'br':
                        runs.push(new docx.TextRun({ text: "", break: 1 }));
                        break;
                    default:
                        this.processInlineElements(childElement, runs);
                        break;
                }
            }
            else if (node.nodeType === 3) {
                const text = node.textContent || '';
                if (text) {
                    runs.push(new docx.TextRun({ text }));
                }
            }
        }
    }
    processTextWithFormat(element, runs, format) {
        if (element.childNodes.length === 0 ||
            (element.childNodes.length === 1 && element.childNodes[0].nodeType === 3)) {
            runs.push(new docx.TextRun(Object.assign({ text: element.textContent || '' }, format)));
        }
        else {
            for (let i = 0; i < element.childNodes.length; i++) {
                const node = element.childNodes[i];
                if (node.nodeType === 1) {
                    const childElement = node;
                    const tagName = childElement.tagName.toLowerCase();
                    let childFormat = Object.assign({}, format);
                    switch (tagName) {
                        case 'strong':
                        case 'b':
                            childFormat.bold = true;
                            break;
                        case 'em':
                        case 'i':
                            childFormat.italic = true;
                            break;
                        case 'code':
                            childFormat.font = Object.assign(Object.assign({}, childFormat.font), { family: 'Courier New', size: (this.options.paragraphSize || 12) - 2 });
                            break;
                        case 'del':
                        case 's':
                            childFormat.strike = true;
                            break;
                    }
                    this.processTextWithFormat(childElement, runs, childFormat);
                }
                else if (node.nodeType === 3) {
                    const text = node.textContent || '';
                    if (text) {
                        runs.push(new docx.TextRun(Object.assign({ text }, format)));
                    }
                }
            }
        }
    }
    processImage(element, runs) {
        const src = element.getAttribute('src') || '';
        const alt = element.getAttribute('alt') || 'Image';
        if (!src) {
            runs.push(new docx.TextRun({ text: `[${alt}]`, italics: true }));
            return;
        }
        if (src.startsWith('file://') || src.startsWith('/') || src.match(/^[a-zA-Z]:\\/)) {
            try {
                const filePath = src.startsWith('file://') ? src.substring(7) : src;
                if (fs.existsSync(filePath)) {
                    const imageBuffer = fs.readFileSync(filePath);
                    runs.push(new docx.ImageRun({
                        data: imageBuffer,
                        transformation: {
                            width: 400,
                            height: 300,
                        },
                        type: "png",
                    }));
                    return;
                }
            }
            catch (error) {
                console.error('读取本地图片失败:', error);
            }
        }
        if (src.startsWith('http://') || src.startsWith('https://')) {
            if (this.options.downloadImages) {
                if (this.imageCache.has(src)) {
                    const imageBuffer = this.imageCache.get(src);
                    if (imageBuffer) {
                        runs.push(new docx.ImageRun({
                            data: imageBuffer,
                            transformation: {
                                width: 400,
                                height: 300,
                            },
                            type: "png",
                        }));
                        return;
                    }
                }
                this.downloadImage(src).then(imageBuffer => {
                    if (imageBuffer) {
                        this.imageCache.set(src, imageBuffer);
                    }
                });
            }
        }
        runs.push(new docx.TextRun({ text: `[${alt}]`, italics: true }));
    }
    downloadImage(url) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                const protocol = url.startsWith('https:') ? https : http;
                protocol.get(url, (response) => {
                    if (response.statusCode !== 200) {
                        console.error(`图片下载失败: ${url}, 状态码: ${response.statusCode}`);
                        resolve(null);
                        return;
                    }
                    const data = [];
                    response.on('data', (chunk) => {
                        data.push(chunk);
                    });
                    response.on('end', () => {
                        const buffer = Buffer.concat(data);
                        resolve(buffer);
                    });
                }).on('error', (error) => {
                    console.error(`图片下载错误: ${url}`, error);
                    resolve(null);
                });
            });
        });
    }
    createList(element, elements, _isOrdered, level) {
        const items = element.children;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.tagName.toLowerCase() !== 'li')
                continue;
            const runs = [];
            let hasNestedList = false;
            let nestedListElement = null;
            for (const child of item.children) {
                if (child.tagName.toLowerCase() === 'ul' || child.tagName.toLowerCase() === 'ol') {
                    hasNestedList = true;
                    nestedListElement = child;
                    break;
                }
            }
            const textContent = hasNestedList ?
                item.innerHTML.substring(0, item.innerHTML.indexOf(`<${nestedListElement === null || nestedListElement === void 0 ? void 0 : nestedListElement.tagName.toLowerCase()}`)) :
                item.innerHTML;
            const tempElement = document.createElement('div');
            tempElement.innerHTML = textContent;
            this.processInlineElements(tempElement, runs);
            elements.push(new docx.Paragraph({
                children: runs,
                bullet: {
                    level: level
                },
                spacing: {
                    line: this.options.lineSpacing ? this.options.lineSpacing * 240 : 276,
                    after: hasNestedList ? 0 : (this.options.paragraphSpacing ? this.options.paragraphSpacing * 10 : 80),
                },
            }));
            if (hasNestedList && nestedListElement) {
                const isNestedOrdered = nestedListElement.tagName.toLowerCase() === 'ol';
                this.createList(nestedListElement, elements, isNestedOrdered, level + 1);
            }
        }
    }
    createBlockquote(element, elements) {
        for (let i = 0; i < element.childNodes.length; i++) {
            const blockquoteText = element.childNodes[i].textContent || '';
            if (blockquoteText.trim()) {
                elements.push(new docx.Paragraph({
                    children: [new docx.TextRun({ text: blockquoteText })],
                    border: {
                        left: {
                            color: "#AAAAAA",
                            space: 12,
                            style: docx.BorderStyle.SINGLE,
                            size: 4
                        }
                    },
                    indent: { left: 360 }
                }));
            }
        }
    }
    createTable(element) {
        try {
            const rows = element.querySelectorAll('tr');
            if (rows.length === 0) {
                return new docx.Paragraph({
                    children: [
                        new docx.TextRun({ text: "[空表格]", italics: true })
                    ]
                });
            }
            const firstRow = rows[0];
            const firstRowCells = firstRow.querySelectorAll('th, td');
            const columnCount = firstRowCells.length;
            if (columnCount === 0) {
                return new docx.Paragraph({
                    children: [
                        new docx.TextRun({ text: "[表格无列]", italics: true })
                    ]
                });
            }
            const tableRows = [];
            for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                const row = rows[rowIndex];
                const cells = row.querySelectorAll('th, td');
                const tableCells = [];
                for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
                    const cell = cells[cellIndex];
                    const isHeader = cell.tagName.toLowerCase() === 'th';
                    const cellElements = [];
                    this.traverseNodes(cell, cellElements);
                    if (cellElements.length === 0) {
                        cellElements.push(new docx.Paragraph({ text: "" }));
                    }
                    tableCells.push(new docx.TableCell({
                        children: cellElements,
                        shading: isHeader ? {
                            fill: "EEEEEE"
                        } : undefined,
                    }));
                }
                while (tableCells.length < columnCount) {
                    tableCells.push(new docx.TableCell({
                        children: [new docx.Paragraph({ text: "" })],
                    }));
                }
                tableRows.push(new docx.TableRow({ children: tableCells }));
            }
            const table = new docx.Table({
                rows: tableRows,
                width: {
                    size: 100,
                    type: docx.WidthType.PERCENTAGE,
                },
                borders: {
                    top: { style: docx.BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                    bottom: { style: docx.BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                    left: { style: docx.BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                    right: { style: docx.BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                    insideHorizontal: { style: docx.BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                    insideVertical: { style: docx.BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                },
            });
            return new docx.Paragraph({
                children: [table],
                spacing: {
                    before: 160,
                    after: 160,
                },
            });
        }
        catch (error) {
            console.error('表格创建失败:', error);
            return new docx.Paragraph({
                children: [
                    new docx.TextRun({ text: "[表格处理错误]", italics: true })
                ]
            });
        }
    }
    createCodeBlock(element) {
        const codeElement = element.querySelector('code');
        const code = (codeElement || element).textContent || '';
        let language = '';
        if (codeElement) {
            const classes = codeElement.className.split(' ');
            for (const cls of classes) {
                if (cls.startsWith('language-')) {
                    language = cls.substring(9);
                    break;
                }
            }
        }
        const textContent = language ? `[${language}]\n${code}` : code;
        return new docx.Paragraph({
            children: [
                new docx.TextRun({
                    text: textContent,
                    font: 'Courier New',
                    size: (this.options.paragraphSize || 12) - 2,
                })
            ],
            spacing: {
                before: 160,
                after: 160,
            },
            shading: {
                type: docx.ShadingType.SOLID,
                color: 'F5F5F5',
            },
        });
    }
    convertFile(inputFile, outputFile) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const markdown = fs.readFileSync(inputFile, 'utf8');
                const doc = this.createFromMarkdown(markdown);
                const outputDir = path.dirname(outputFile);
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }
                const buffer = yield docx.Packer.toBuffer(doc);
                fs.writeFileSync(outputFile, buffer);
                if (this.options.keepHtml) {
                    const htmlFile = outputFile.replace(/\.docx$/i, '.html');
                    const htmlContent = this.markdownParser.convertToHtml(markdown);
                    fs.writeFileSync(htmlFile, htmlContent);
                }
                return true;
            }
            catch (error) {
                console.error('转换文件时发生错误:', error);
                return false;
            }
        });
    }
    batchConvert(inputDir, outputDir) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = {};
            try {
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }
                const files = fs.readdirSync(inputDir)
                    .filter(file => file.toLowerCase().endsWith('.md'))
                    .map(file => path.join(inputDir, file));
                for (const file of files) {
                    const baseName = path.basename(file, '.md');
                    const outputFile = path.join(outputDir, `${baseName}.docx`);
                    try {
                        const success = yield this.convertFile(file, outputFile);
                        results[baseName] = success;
                        console.log(`处理文件 ${file} -> ${success ? '成功' : '失败'}`);
                    }
                    catch (error) {
                        results[baseName] = false;
                        console.error(`处理文件 ${file} 时出错:`, error);
                    }
                }
                return results;
            }
            catch (error) {
                console.error('批量转换时发生错误:', error);
                return results;
            }
        });
    }
}
exports.DocxGenerator = DocxGenerator;
//# sourceMappingURL=docxGenerator.js.map