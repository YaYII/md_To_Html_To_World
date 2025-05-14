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
const cp = __importStar(require("child_process"));
const yaml = __importStar(require("js-yaml"));
const environmentManager_1 = require("../environmentManager");
const os = __importStar(require("os"));
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
    async convert(inputFile, options = {}) {
        try {
            const envInfo = this.envManager.getEnvironmentInfo();
            const outputDir = options.outputDirectory || path.dirname(inputFile);
            const inputBaseName = path.basename(inputFile, '.md');
            const outputFile = path.join(outputDir, `${inputBaseName}.docx`);
            const pythonCmd = envInfo.pythonCmd;
            const scriptPath = path.join(envInfo.extensionPath, 'scripts', 'run.py');
            let args = [
                scriptPath,
                '--input', inputFile,
                '--output', outputFile
            ];
            if (options.keepHtml === false) {
                args.push('--no-html');
            }
            if (options.useConfig) {
                const tempConfigFile = await this.createTempConfigFile(options.useConfig);
                if (tempConfigFile) {
                    args.push('--config', tempConfigFile);
                }
            }
            if (options.onProgress) {
                options.onProgress('正在执行转换...');
            }
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
            }
            else {
                throw new Error(result.stderr || '转换失败，未知错误');
            }
        }
        catch (error) {
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
    async createTempConfigFile(config) {
        try {
            const yamlConfig = this.generateYamlConfig(config);
            const tempDir = path.join(os.tmpdir(), 'markdown-to-word');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempFile = path.join(tempDir, `config-${Date.now()}.yaml`);
            fs.writeFileSync(tempFile, yamlConfig, 'utf8');
            return tempFile;
        }
        catch (error) {
            console.error('创建临时配置文件失败:', error);
            return null;
        }
    }
    generateYamlConfig(config) {
        return yaml.dump(config);
    }
    runPythonScript(pythonCmd, args) {
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
exports.MarkdownConverter = MarkdownConverter;
//# sourceMappingURL=converter.js.map