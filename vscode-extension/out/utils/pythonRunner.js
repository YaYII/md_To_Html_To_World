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
exports.PythonRunner = void 0;
const child_process = __importStar(require("child_process"));
class PythonRunner {
    constructor(envManager) {
        this.envManager = envManager;
    }
    runScript(scriptPath, args = [], options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const env = this.envManager.getEnvironmentInfo();
                const pythonPath = env.pythonCmd;
                const fullArgs = [scriptPath, ...args];
                const processEnv = Object.assign(Object.assign(Object.assign({}, process.env), options.env), { PYTHONUNBUFFERED: '1' });
                return yield new Promise((resolve, reject) => {
                    const process = child_process.spawn(pythonPath, fullArgs, {
                        cwd: options.cwd,
                        env: processEnv
                    });
                    let stdout = '';
                    let stderr = '';
                    process.stdout.on('data', (data) => {
                        stdout += data.toString();
                    });
                    process.stderr.on('data', (data) => {
                        stderr += data.toString();
                    });
                    let timeoutHandle;
                    if (options.timeout) {
                        timeoutHandle = setTimeout(() => {
                            process.kill();
                            reject(new Error(`执行超时 (${options.timeout}ms)`));
                        }, options.timeout);
                    }
                    process.on('close', (code) => {
                        if (timeoutHandle) {
                            clearTimeout(timeoutHandle);
                        }
                        resolve({
                            success: code === 0,
                            stdout,
                            stderr
                        });
                    });
                    process.on('error', (error) => {
                        if (timeoutHandle) {
                            clearTimeout(timeoutHandle);
                        }
                        resolve({
                            success: false,
                            stdout,
                            stderr,
                            error
                        });
                    });
                });
            }
            catch (error) {
                return {
                    success: false,
                    stdout: '',
                    stderr: '',
                    error: error
                };
            }
        });
    }
    validateEnvironment() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.runScript('-c', ['print("测试Python环境")']);
                return result.success;
            }
            catch (_a) {
                return false;
            }
        });
    }
}
exports.PythonRunner = PythonRunner;
//# sourceMappingURL=pythonRunner.js.map