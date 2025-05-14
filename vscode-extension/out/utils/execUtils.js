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
exports.execWithDetails = void 0;
const child_process = __importStar(require("child_process"));
const util_1 = require("util");
const exec = (0, util_1.promisify)(child_process.exec);
function bufferToString(data) {
    if (data === undefined) {
        return undefined;
    }
    return data instanceof Buffer ? data.toString('utf8') : data;
}
async function execWithDetails(command, options) {
    try {
        const { stdout, stderr } = await exec(command, {
            ...options,
            encoding: 'utf8'
        });
        return {
            success: true,
            stdout: bufferToString(stdout)?.trim(),
            stderr: bufferToString(stderr)?.trim()
        };
    }
    catch (error) {
        const execError = error;
        return {
            success: false,
            stdout: bufferToString(execError.stdout)?.trim(),
            stderr: bufferToString(execError.stderr)?.trim() || (execError.message || '未知错误')
        };
    }
}
exports.execWithDetails = execWithDetails;
//# sourceMappingURL=execUtils.js.map