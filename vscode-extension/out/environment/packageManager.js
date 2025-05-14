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
exports.PackageManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const utils_1 = require("../utils");
const types_1 = require("./types");
class PackageManager {
    static getPipVersion(pythonCmd) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, utils_1.execWithDetails)(`${pythonCmd} -m pip --version`);
            if (result.success && result.stdout) {
                const match = result.stdout.match(/pip (\S+)/);
                return match ? match[1] : undefined;
            }
            return undefined;
        });
    }
    static getInstalledPackages(pythonCmd) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, utils_1.execWithDetails)(`${pythonCmd} -m pip list --format=json`);
            if (result.success && result.stdout) {
                try {
                    const packages = JSON.parse(result.stdout).map((pkg) => String(pkg.name).toLowerCase());
                    return new Set(packages);
                }
                catch (error) {
                    throw new types_1.EnvironmentError('解析已安装包列表失败', error);
                }
            }
            return new Set();
        });
    }
    static findRequirementsFile(context, workspaceRoot) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = vscode.workspace.getConfiguration('markdown-to-word');
            const customPath = config.get('requirementsPath', '');
            if (customPath) {
                const fullPath = path.isAbsolute(customPath)
                    ? customPath
                    : workspaceRoot
                        ? path.join(workspaceRoot, customPath)
                        : customPath;
                if (fs.existsSync(fullPath)) {
                    return fullPath;
                }
            }
            const searchPaths = [
                workspaceRoot && path.join(workspaceRoot, 'requirements.txt'),
                path.join(context.extensionPath, 'scripts', 'requirements.txt'),
                path.join(context.extensionPath, 'requirements.txt')
            ].filter(Boolean);
            for (const p of searchPaths) {
                if (fs.existsSync(p)) {
                    return p;
                }
            }
            throw new types_1.EnvironmentError('未找到requirements.txt文件');
        });
    }
    static installDependencies(pythonCmd, requirementsPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, utils_1.execWithDetails)(`${pythonCmd} -m pip install -r "${requirementsPath}"`);
            if (!result.success) {
                throw new types_1.EnvironmentError('安装依赖包失败', {
                    stdout: result.stdout,
                    stderr: result.stderr
                });
            }
        });
    }
    static checkPipUpgrade(pythonCmd) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, utils_1.execWithDetails)(`${pythonCmd} -m pip list --outdated`);
            return result.success && result.stdout ? result.stdout.toLowerCase().includes('pip') : false;
        });
    }
    static upgradePip(pythonCmd) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, utils_1.execWithDetails)(`${pythonCmd} -m pip install --upgrade pip`);
            if (!result.success) {
                throw new types_1.EnvironmentError('更新pip失败', {
                    stdout: result.stdout,
                    stderr: result.stderr
                });
            }
        });
    }
}
exports.PackageManager = PackageManager;
//# sourceMappingURL=packageManager.js.map