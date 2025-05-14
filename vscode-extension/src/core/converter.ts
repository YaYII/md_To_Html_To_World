/**
 * @description Markdown转Word转换器核心类
 */
import * as path from 'path';
import * as fs from 'fs';
import { EnvironmentManager } from '../environmentManager';
import { execWithDetails } from '../utils/execUtils';
import { IConversionResult, IConversionOptions } from './types';

export class MarkdownConverter {
    private static instance: MarkdownConverter;
    private envManager: EnvironmentManager;

    private constructor() {
        this.envManager = EnvironmentManager.getInstance();
    }

    /**
     * @description 获取转换器实例
     */
    public static getInstance(): MarkdownConverter {
        if (!MarkdownConverter.instance) {
            MarkdownConverter.instance = new MarkdownConverter();
        }
        return MarkdownConverter.instance;
    }

    /**
     * @description 执行Markdown到Word的转换
     * @param inputFile 输入文件路径
     * @param options 转换选项
     */
    public async convert(inputFile: string, options?: IConversionOptions): Promise<IConversionResult> {
        const envInfo = this.envManager.getEnvironmentInfo();
        const outputFile = options?.outputFile || inputFile.replace(/\.md$/i, '.docx');
        const pythonScript = path.join(envInfo.extensionPath, 'scripts', 'run.py');

        if (!fs.existsSync(pythonScript)) {
            throw new Error(`核心脚本丢失: ${pythonScript}`);
        }

        const command = `${envInfo.pythonCmd} "${pythonScript}" -i "${inputFile}" -o "${outputFile}"`;
        const result = await execWithDetails(command);

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