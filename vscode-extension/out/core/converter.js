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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownConverter = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const environmentManager_1 = require("../environmentManager");
const execUtils_1 = require("../utils/execUtils");
class MarkdownConverter {
    constructor() {
        this.envManager = environmentManager_1.EnvironmentManager.getInstance();
    }
    static getInstance() {
        if (!MarkdownConverter.instance) {
            MarkdownConverter.instance = new MarkdownConverter();
        }
        return MarkdownConverter.instance;
    }
    async convert(inputFile, options) {
        const envInfo = this.envManager.getEnvironmentInfo();
        const outputFile = options?.outputFile || inputFile.replace(/\.md$/i, '.docx');
        const pythonScript = path.join(envInfo.extensionPath, 'scripts', 'run.py');
        if (!fs.existsSync(pythonScript)) {
            throw new Error(`核心脚本丢失: ${pythonScript}`);
        }
        const command = `${envInfo.pythonCmd} "${pythonScript}" -i "${inputFile}" -o "${outputFile}"`;
        const result = await (0, execUtils_1.execWithDetails)(command);
        if (!result.success) {
            throw new Error(result.stderr || '转换失败');
        }
        if (!fs.existsSync(outputFile)) {
            throw new Error('转换似乎已成功完成，但在预期位置找不到生成的 Word 文件。');
        }
        return {
            success: true,
            outputFile,
            message: '转换成功'
        };
    }
}
exports.MarkdownConverter = MarkdownConverter;
//# sourceMappingURL=converter.js.map