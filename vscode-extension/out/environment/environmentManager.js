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
exports.EnvironmentManager = void 0;
const vscode = __importStar(require("vscode"));
const os = __importStar(require("os"));
const pythonDetector_1 = require("./pythonDetector");
const packageManager_1 = require("./packageManager");
class EnvironmentManager {
    constructor() {
    }
    static getInstance() {
        if (!EnvironmentManager.instance) {
            EnvironmentManager.instance = new EnvironmentManager();
        }
        return EnvironmentManager.instance;
    }
    initialize(context) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const workspaceRoot = (_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.uri.fsPath;
            const pythonEnv = yield pythonDetector_1.PythonDetector.detect(workspaceRoot);
            const pipVersion = yield packageManager_1.PackageManager.getPipVersion(pythonEnv.cmd);
            const installedPackages = yield packageManager_1.PackageManager.getInstalledPackages(pythonEnv.cmd);
            const requirementsPath = yield packageManager_1.PackageManager.findRequirementsFile(context, workspaceRoot);
            this.environmentInfo = {
                platform: process.platform,
                architecture: process.arch,
                release: os.release(),
                userInfo: {
                    username: os.userInfo().username,
                    homedir: os.homedir()
                },
                pythonCmd: pythonEnv.cmd,
                pythonVersion: pythonEnv.version,
                pythonPath: pythonEnv.path,
                pipVersion,
                workspaceRoot,
                extensionPath: context.extensionPath,
                isVirtualEnv: this.isVirtualEnvironment(pythonEnv.path),
                virtualEnvPath: this.getVirtualEnvPath(pythonEnv.path),
                requirementsPath,
                installedPackages
            };
            yield this.validateEnvironment();
            return this.environmentInfo;
        });
    }
    isVirtualEnvironment(pythonPath) {
        return pythonPath.includes('venv') ||
            pythonPath.includes('virtualenv') ||
            process.env.VIRTUAL_ENV !== undefined;
    }
    getVirtualEnvPath(pythonPath) {
        if (process.env.VIRTUAL_ENV) {
            return process.env.VIRTUAL_ENV;
        }
        const parts = pythonPath.split(/[/\\]/);
        const venvIndex = parts.findIndex(p => p === 'venv' ||
            p === '.venv' ||
            p === 'virtualenv' ||
            p === 'env');
        if (venvIndex !== -1) {
            return parts.slice(0, venvIndex + 1).join('/');
        }
        return undefined;
    }
    validateEnvironment() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.environmentInfo) {
                throw new Error('环境信息未初始化');
            }
            const needsPipUpgrade = yield packageManager_1.PackageManager.checkPipUpgrade(this.environmentInfo.pythonCmd);
            if (needsPipUpgrade) {
                yield packageManager_1.PackageManager.upgradePip(this.environmentInfo.pythonCmd);
            }
            yield packageManager_1.PackageManager.installDependencies(this.environmentInfo.pythonCmd, this.environmentInfo.requirementsPath);
        });
    }
    getEnvironmentInfo() {
        if (!this.environmentInfo) {
            throw new Error('环境信息未初始化');
        }
        return this.environmentInfo;
    }
    getDiagnostics() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.environmentInfo) {
                return '环境信息未初始化';
            }
            return [
                '系统信息:',
                `- 平台: ${this.environmentInfo.platform}`,
                `- 架构: ${this.environmentInfo.architecture}`,
                `- 发行版: ${this.environmentInfo.release}`,
                '',
                'Python环境:',
                `- Python命令: ${this.environmentInfo.pythonCmd}`,
                `- Python版本: ${this.environmentInfo.pythonVersion}`,
                `- Python路径: ${this.environmentInfo.pythonPath}`,
                `- Pip版本: ${this.environmentInfo.pipVersion || '未知'}`,
                '',
                '虚拟环境:',
                `- 是否虚拟环境: ${this.environmentInfo.isVirtualEnv}`,
                `- 虚拟环境路径: ${this.environmentInfo.virtualEnvPath || '无'}`,
                '',
                '工作区信息:',
                `- 工作区根目录: ${this.environmentInfo.workspaceRoot || '无'}`,
                `- 扩展路径: ${this.environmentInfo.extensionPath}`,
                '',
                '依赖信息:',
                `- Requirements文件: ${this.environmentInfo.requirementsPath}`,
                `- 已安装包数量: ${this.environmentInfo.installedPackages.size}`
            ].join('\n');
        });
    }
}
exports.EnvironmentManager = EnvironmentManager;
//# sourceMappingURL=environmentManager.js.map