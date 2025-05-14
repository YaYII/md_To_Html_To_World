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
exports.PythonDetector = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const utils_1 = require("../utils");
const types_1 = require("./types");
class PythonDetector {
    static async detect(workspaceRoot) {
        const config = vscode.workspace.getConfiguration('markdown-to-word');
        const pythonPathFromConfig = config.get('pythonPath', '');
        const useVirtualEnv = config.get('useVirtualEnv', true);
        const attempts = [
            async () => await this.checkUserConfigPath(pythonPathFromConfig, workspaceRoot),
            async () => await this.checkVSCodePythonExt(),
            async () => await this.checkVirtualEnv(useVirtualEnv, workspaceRoot),
            async () => await this.checkSystemPath()
        ];
        for (const attempt of attempts) {
            const result = await attempt();
            if (result.success && result.version && result.path) {
                return {
                    cmd: result.path,
                    version: result.version,
                    path: result.path
                };
            }
        }
        throw new types_1.EnvironmentError('未找到可用的Python环境');
    }
    static async checkUserConfigPath(pythonPath, workspaceRoot) {
        if (!pythonPath) {
            return { success: false };
        }
        let expandedPath = this.expandEnvironmentVariables(pythonPath);
        if (!path.isAbsolute(expandedPath) && workspaceRoot) {
            expandedPath = path.join(workspaceRoot, expandedPath);
        }
        return await this.checkPython(expandedPath);
    }
    static async checkVSCodePythonExt() {
        try {
            const pythonExtConfig = vscode.workspace.getConfiguration('python');
            const pythonExtPath = pythonExtConfig.get('defaultInterpreterPath');
            if (pythonExtPath) {
                return await this.checkPython(pythonExtPath);
            }
        }
        catch {
        }
        return { success: false };
    }
    static async checkVirtualEnv(useVirtualEnv, workspaceRoot) {
        if (!useVirtualEnv || !workspaceRoot) {
            return { success: false };
        }
        const venvPaths = ['.venv', 'venv', 'env'];
        for (const venvPath of venvPaths) {
            const venvPython = process.platform === 'win32'
                ? path.join(workspaceRoot, venvPath, 'Scripts', 'python.exe')
                : path.join(workspaceRoot, venvPath, 'bin', 'python');
            if (fs.existsSync(venvPython)) {
                const result = await this.checkPython(venvPython);
                if (result.success) {
                    return result;
                }
            }
        }
        return { success: false };
    }
    static async checkSystemPath() {
        const pythonCommands = process.platform === 'win32'
            ? ['python.exe', 'python3.exe']
            : ['python3', 'python'];
        for (const cmd of pythonCommands) {
            const result = await this.checkPython(cmd);
            if (result.success) {
                return result;
            }
        }
        return { success: false };
    }
    static async checkPython(cmd) {
        try {
            const quotedCmd = cmd.includes(' ') ? `"${cmd}"` : cmd;
            const versionResult = await (0, utils_1.execWithDetails)(`${quotedCmd} --version`);
            if (!versionResult.success || !versionResult.stdout) {
                return { success: false };
            }
            const pathResult = await (0, utils_1.execWithDetails)(`${quotedCmd} -c "import sys; print(sys.executable)"`);
            if (!pathResult.success || !pathResult.stdout) {
                return { success: false };
            }
            return {
                success: true,
                version: versionResult.stdout.trim(),
                path: pathResult.stdout.trim()
            };
        }
        catch {
            return { success: false };
        }
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