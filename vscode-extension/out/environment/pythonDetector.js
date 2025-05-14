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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.PythonDetector = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const utils_1 = require("../utils");
const types_1 = require("./types");
class PythonDetector {
    static detect(workspaceRoot) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = vscode.workspace.getConfiguration('markdown-to-word');
            const pythonPathFromConfig = config.get('pythonPath', '');
            const useVirtualEnv = config.get('useVirtualEnv', true);
            const attempts = [
                () => __awaiter(this, void 0, void 0, function* () { return yield this.checkUserConfigPath(pythonPathFromConfig, workspaceRoot); }),
                () => __awaiter(this, void 0, void 0, function* () { return yield this.checkVSCodePythonExt(); }),
                () => __awaiter(this, void 0, void 0, function* () { return yield this.checkVirtualEnv(useVirtualEnv, workspaceRoot); }),
                () => __awaiter(this, void 0, void 0, function* () { return yield this.checkSystemPath(); })
            ];
            for (const attempt of attempts) {
                const result = yield attempt();
                if (result.success && result.version && result.path) {
                    return {
                        cmd: result.path,
                        version: result.version,
                        path: result.path
                    };
                }
            }
            throw new types_1.EnvironmentError('未找到可用的Python环境');
        });
    }
    static checkUserConfigPath(pythonPath, workspaceRoot) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!pythonPath) {
                return { success: false };
            }
            let expandedPath = this.expandEnvironmentVariables(pythonPath);
            if (!path.isAbsolute(expandedPath) && workspaceRoot) {
                expandedPath = path.join(workspaceRoot, expandedPath);
            }
            return yield this.checkPython(expandedPath);
        });
    }
    static checkVSCodePythonExt() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pythonExtConfig = vscode.workspace.getConfiguration('python');
                const pythonExtPath = pythonExtConfig.get('defaultInterpreterPath');
                if (pythonExtPath) {
                    return yield this.checkPython(pythonExtPath);
                }
            }
            catch (_a) {
            }
            return { success: false };
        });
    }
    static checkVirtualEnv(useVirtualEnv, workspaceRoot) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!useVirtualEnv || !workspaceRoot) {
                return { success: false };
            }
            const venvPaths = ['.venv', 'venv', 'env'];
            for (const venvPath of venvPaths) {
                const venvPython = process.platform === 'win32'
                    ? path.join(workspaceRoot, venvPath, 'Scripts', 'python.exe')
                    : path.join(workspaceRoot, venvPath, 'bin', 'python');
                if (fs.existsSync(venvPython)) {
                    const result = yield this.checkPython(venvPython);
                    if (result.success) {
                        return result;
                    }
                }
            }
            return { success: false };
        });
    }
    static checkSystemPath() {
        return __awaiter(this, void 0, void 0, function* () {
            const pythonCommands = process.platform === 'win32'
                ? ['python.exe', 'python3.exe']
                : ['python3', 'python'];
            for (const cmd of pythonCommands) {
                const result = yield this.checkPython(cmd);
                if (result.success) {
                    return result;
                }
            }
            return { success: false };
        });
    }
    static checkPython(cmd) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const quotedCmd = cmd.includes(' ') ? `"${cmd}"` : cmd;
                const versionResult = yield (0, utils_1.execWithDetails)(`${quotedCmd} --version`);
                if (!versionResult.success || !versionResult.stdout) {
                    return { success: false };
                }
                const pathResult = yield (0, utils_1.execWithDetails)(`${quotedCmd} -c "import sys; print(sys.executable)"`);
                if (!pathResult.success || !pathResult.stdout) {
                    return { success: false };
                }
                return {
                    success: true,
                    version: versionResult.stdout.trim(),
                    path: pathResult.stdout.trim()
                };
            }
            catch (_a) {
                return { success: false };
            }
        });
    }
    static expandEnvironmentVariables(value) {
        let expandedValue = value.replace(/%([^%]+)%/g, (_, key) => process.env[key] || '');
        expandedValue = expandedValue.replace(/\${([^}]+)}/g, (_, key) => process.env[key] || '');
        expandedValue = expandedValue.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key) => process.env[key] || '');
        return expandedValue;
    }
}
exports.PythonDetector = PythonDetector;
//# sourceMappingURL=pythonDetector.js.map