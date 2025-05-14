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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserHome = exports.ensureDirectoryExists = exports.sleep = exports.normalizePath = exports.getExecutableExtension = exports.fileExists = exports.expandEnvironmentVariables = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
function expandEnvironmentVariables(value) {
    return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        return process.env[varName] || match;
    });
}
exports.expandEnvironmentVariables = expandEnvironmentVariables;
function fileExists(filePath) {
    try {
        fs.accessSync(filePath);
        return true;
    }
    catch {
        return false;
    }
}
exports.fileExists = fileExists;
function getExecutableExtension() {
    return os.platform() === 'win32' ? '.exe' : '';
}
exports.getExecutableExtension = getExecutableExtension;
function normalizePath(inputPath) {
    return path.normalize(inputPath).replace(/\\/g, '/');
}
exports.normalizePath = normalizePath;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.sleep = sleep;
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
exports.ensureDirectoryExists = ensureDirectoryExists;
function getUserHome() {
    return os.homedir();
}
exports.getUserHome = getUserHome;
__exportStar(require("./execUtils"), exports);
//# sourceMappingURL=index.js.map