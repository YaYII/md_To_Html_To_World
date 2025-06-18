/**
 * @file conversionService.ts
 * @description 转换服务 - 负责处理文件转换的业务逻辑
 */
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
// 本地类型定义，不需要从外部导入
import { IDocumentConfig } from '../ui/configPanel';
import { NodeMarkdownConverter } from '../core/nodeConverter';
import { ProgressUI } from '../ui/progressUI';
import { ConfigService } from './configService';

/**
 * 转换选项接口
 */
export interface ConversionOptions {
    showProgress?: boolean;
    useConfig?: IDocumentConfig;
    keepHtml?: boolean;
    outputDirectory?: string;
    onComplete?: (result: ConversionResult) => void;
}

/**
 * 转换结果接口
 */
export interface ConversionResult {
    success: boolean;
    outputFile?: string;
    message: string;
    error?: Error;
}

/**
 * 转换服务类
 */
export class ConversionService {
    private configService: ConfigService;
    private progressUI: ProgressUI;
    private converter: NodeMarkdownConverter;

    constructor(configService: ConfigService) {
        this.configService = configService;
        this.progressUI = ProgressUI.getInstance();
        this.converter = NodeMarkdownConverter.getInstance();
    }

    /**
     * 转换单个文件
     */
    async convertFile(filePath: string, options: ConversionOptions = {}): Promise<ConversionResult> {
        try {
            // 验证文件路径
            if (!filePath || !filePath.endsWith('.md')) {
                throw new Error('请选择一个有效的 Markdown 文件');
            }

            if (!await fs.pathExists(filePath)) {
                throw new Error(`文件不存在: ${filePath}`);
            }

            // 获取配置
            const config = options.useConfig || await this.configService.getUserConfig();
            
            // 确保输出目录存在
            const outputDir = options.outputDirectory || path.dirname(filePath);
            await fs.ensureDir(outputDir);

            console.log(`开始转换文件: ${filePath}`);
            console.log('使用配置:', JSON.stringify({
                fonts: config.fonts,
                document: config.document,
                chinese: config.chinese
            }, null, 2));

            // 执行转换
            const result = await this.converter.convert(filePath, {
                showProgress: options.showProgress || false,
                useConfig: config,
                keepHtml: options.keepHtml || false,
                onComplete: options.onComplete
            });

            return {
                success: true,
                outputFile: result.outputFile,
                message: 'Markdown 文件已成功转换为 Word 文档！'
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`转换文件 ${filePath} 失败:`, errorMessage);
            
            return {
                success: false,
                message: `转换失败: ${errorMessage}`,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * 带进度条的文件转换
     */
    async convertFileWithProgress(filePath: string, options: ConversionOptions = {}): Promise<ConversionResult> {
        return await this.progressUI.withProgress(
            `转换文件: ${path.basename(filePath)}`,
            async (progress) => {
                progress.report({ message: '准备转换...' });
                
                const result = await this.convertFile(filePath, {
                    ...options,
                    showProgress: true
                });
                
                if (result.success) {
                    progress.report({ message: '转换完成！' });
                    await this.progressUI.showSuccess(result.message, result.outputFile!);
                    
                    // 尝试打开生成的文件
                    await this.openGeneratedFile(result.outputFile!);
                } else {
                    await this.progressUI.showError(result.error!);
                }
                
                return result;
            }
        );
    }

    /**
     * 批量转换文件
     */
    async convertMultipleFiles(filePaths: string[], options: ConversionOptions = {}): Promise<ConversionResult[]> {
        const results: ConversionResult[] = [];
        
        for (let i = 0; i < filePaths.length; i++) {
            const filePath = filePaths[i];
            const fileName = path.basename(filePath);
            
            try {
                const result = await this.progressUI.withProgress(
                    `转换文件 ${i + 1}/${filePaths.length}: ${fileName}`,
                    async (progress) => {
                        progress.report({ 
                            message: '执行转换...', 
                            increment: (i / filePaths.length) * 100 
                        });
                        
                        return await this.convertFile(filePath, options);
                    }
                );
                
                results.push(result);
                
                if (result.success) {
                    console.log(`✅ 转换成功: ${fileName}`);
                } else {
                    console.error(`❌ 转换失败: ${fileName} - ${result.message}`);
                }
            } catch (error) {
                const errorResult: ConversionResult = {
                    success: false,
                    message: `转换失败: ${error instanceof Error ? error.message : String(error)}`,
                    error: error instanceof Error ? error : new Error(String(error))
                };
                results.push(errorResult);
            }
        }
        
        // 显示批量转换结果
        await this.showBatchConversionResults(results);
        
        return results;
    }

    /**
     * 处理命令行参数
     */
    async handleCommandLineArgs(): Promise<void> {
        try {
            // 获取命令行参数
            const args = process.argv;
            console.log('命令行参数:', args);
            
            // 查找 Markdown 文件参数
            const mdFileArg = args.find(arg => arg.endsWith('.md') && !arg.includes('node_modules'));
            
            if (mdFileArg) {
                console.log('检测到命令行 Markdown 文件:', mdFileArg);
                
                // 解析文件路径
                let mdFilePath = mdFileArg;
                if (!path.isAbsolute(mdFilePath)) {
                    mdFilePath = path.resolve(process.cwd(), mdFilePath);
                }
                
                console.log('解析后的文件路径:', mdFilePath);
                
                // 检查文件是否存在
                if (await fs.pathExists(mdFilePath)) {
                    console.log('文件存在，开始转换...');
                    
                    // 显示转换提示
                    const fileName = path.basename(mdFilePath);
                    const choice = await vscode.window.showInformationMessage(
                        `检测到要转换的 Markdown 文件: ${fileName}`,
                        '立即转换',
                        '取消'
                    );
                    
                    if (choice === '立即转换') {
                        await this.convertFileWithProgress(mdFilePath);
                    }
                } else {
                    console.log('文件不存在:', mdFilePath);
                }
            }
        } catch (error) {
            console.error('处理命令行参数时出错:', error);
        }
    }

    /**
     * 打开生成的文件
     */
    private async openGeneratedFile(outputFile: string): Promise<void> {
        try {
            if (outputFile && await fs.pathExists(outputFile)) {
                const uri = vscode.Uri.file(outputFile);
                await vscode.commands.executeCommand('vscode.open', uri);
            }
        } catch (error) {
            console.error('无法打开生成的文件:', error);
        }
    }

    /**
     * 显示批量转换结果
     */
    private async showBatchConversionResults(results: ConversionResult[]): Promise<void> {
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;
        
        let message = `批量转换完成: ${successCount} 个成功`;
        if (failureCount > 0) {
            message += `, ${failureCount} 个失败`;
        }
        
        if (failureCount === 0) {
            await vscode.window.showInformationMessage(message);
        } else {
            const choice = await vscode.window.showWarningMessage(
                message,
                '查看详情'
            );
            
            if (choice === '查看详情') {
                // 显示详细的转换结果
                const outputChannel = vscode.window.createOutputChannel('批量转换结果');
                outputChannel.clear();
                outputChannel.appendLine('批量转换结果详情:');
                outputChannel.appendLine('='.repeat(50));
                
                results.forEach((result, index) => {
                    const status = result.success ? '✅ 成功' : '❌ 失败';
                    outputChannel.appendLine(`${index + 1}. ${status} - ${result.message}`);
                    if (!result.success && result.error) {
                        outputChannel.appendLine(`   错误: ${result.error.message}`);
                    }
                });
                
                outputChannel.show();
            }
        }
    }

    /**
     * 获取支持的文件类型
     */
    getSupportedFileTypes(): string[] {
        return ['.md', '.markdown'];
    }

    /**
     * 验证文件是否为支持的类型
     */
    isSupportedFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return this.getSupportedFileTypes().includes(ext);
    }

    /**
     * 获取输出文件路径
     */
    getOutputFilePath(inputPath: string, outputDir?: string): string {
        const baseName = path.basename(inputPath, path.extname(inputPath));
        const outputDirectory = outputDir || path.dirname(inputPath);
        return path.join(outputDirectory, `${baseName}.docx`);
    }

    /**
     * 清理资源
     */
    dispose(): void {
        // 清理相关资源
    }
}