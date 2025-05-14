/**
 * @description 核心转换器类，负责调用Python脚本进行Markdown到Word的转换
 */
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as yaml from 'js-yaml';
import { EnvironmentManager } from '../environmentManager';
import { IDocumentConfig } from '../ui/configPanel';
import * as os from 'os';

/**
 * @description 转换选项接口
 */
export interface IConversionOptions {
    showProgress?: boolean;
    outputDirectory?: string;
    useConfig?: IDocumentConfig; // 添加用户配置支持
    keepHtml?: boolean; // 是否保留HTML文件
    onProgress?: (message: string) => void;
    onComplete?: (result: IConversionResult) => void;
}

/**
 * @description 转换结果接口
 */
export interface IConversionResult {
    success: boolean;
    message: string;
    outputFile?: string;
    error?: Error;
}

/**
 * @description Markdown转换器类
 */
export class MarkdownConverter {
    private static instance: MarkdownConverter;
    private envManager: EnvironmentManager;
    
    private constructor() {
        this.envManager = EnvironmentManager.getInstance();
    }
    
    /**
     * @description 获取单例实例
     */
    static getInstance(): MarkdownConverter {
        if (!MarkdownConverter.instance) {
            MarkdownConverter.instance = new MarkdownConverter();
        }
        return MarkdownConverter.instance;
    }
    
    /**
     * @description 转换Markdown文件为Word文档
     * @param inputFile 输入文件路径
     * @param options 转换选项
     */
    async convert(inputFile: string, options: IConversionOptions = {}): Promise<IConversionResult> {
        try {
            // 获取环境信息
            const envInfo = this.envManager.getEnvironmentInfo();
            
            // 准备输出目录和文件
            const outputDir = options.outputDirectory || path.dirname(inputFile);
            const inputBaseName = path.basename(inputFile, '.md');
            const outputFile = path.join(outputDir, `${inputBaseName}.docx`);
            
            // 构建命令
            const pythonCmd = envInfo.pythonCmd;
            const scriptPath = path.join(envInfo.extensionPath, 'scripts', 'run.py');
            
            // 基本参数
            let args = [
                scriptPath,
                '--input', inputFile,
                '--output', outputFile
            ];
            
            // 如果明确指定不保留HTML文件，添加--no-html参数
            if (options.keepHtml === false) {
                args.push('--no-html');
            }
            
            // 是否传递配置选项
            if (options.useConfig) {
                const tempConfigFile = await this.createTempConfigFile(options.useConfig);
                if (tempConfigFile) {
                    args.push('--config', tempConfigFile);
                }
            }
            
            // 执行转换
            if (options.onProgress) {
                options.onProgress('正在执行转换...');
            }
            
            // 执行Python脚本
            const result = await this.runPythonScript(pythonCmd, args);
            
            if (result.success) {
                const message = `成功将 ${inputBaseName}.md 转换为 ${path.basename(outputFile)}`;
                
                if (options.onComplete) {
                    options.onComplete({
                        success: true,
                        message,
                        outputFile
                    });
                }
                
                return {
                    success: true,
                    message,
                    outputFile
                };
            } else {
                throw new Error(result.stderr || '转换失败，未知错误');
            }
        } catch (error) {
            console.error('转换失败:', error);
            
            const message = error instanceof Error ? error.message : String(error);
            
            if (options.onComplete) {
                options.onComplete({
                    success: false,
                    message: `转换失败: ${message}`,
                    error: error instanceof Error ? error : new Error(String(error))
                });
            }
            
            throw error;
        }
    }
    
    /**
     * @description 创建临时配置文件
     * @param config 用户配置
     * @returns 临时配置文件路径
     */
    private async createTempConfigFile(config: IDocumentConfig): Promise<string | null> {
        try {
            // 创建临时配置
            const yamlConfig = this.generateYamlConfig(config);
            
            // 写入临时文件
            const tempDir = path.join(os.tmpdir(), 'markdown-to-word');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const tempFile = path.join(tempDir, `config-${Date.now()}.yaml`);
            fs.writeFileSync(tempFile, yamlConfig, 'utf8');
            
            return tempFile;
        } catch (error) {
            console.error('创建临时配置文件失败:', error);
            return null;
        }
    }
    
    /**
     * @description 生成YAML配置
     * @param config 用户配置
     */
    private generateYamlConfig(config: IDocumentConfig): string {
        // 使用js-yaml库来正确转换对象到YAML格式
        return yaml.dump(config);
    }
    
    /**
     * @description 运行Python脚本
     * @param pythonCmd Python命令
     * @param args 命令行参数
     */
    private runPythonScript(pythonCmd: string, args: string[]): Promise<{success: boolean; stdout?: string; stderr?: string}> {
        return new Promise((resolve) => {
            const process = cp.spawn(pythonCmd, args);
            
            let stdout = '';
            let stderr = '';
            
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            process.on('close', (code) => {
                resolve({
                    success: code === 0,
                    stdout: stdout.trim(),
                    stderr: stderr.trim()
                });
            });
        });
    }
} 