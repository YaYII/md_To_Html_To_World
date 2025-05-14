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
function execWithDetails(command, options) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { stdout, stderr } = yield exec(command, Object.assign(Object.assign({}, options), { encoding: 'utf8' }));
            return {
                success: true,
                stdout: (_a = bufferToString(stdout)) === null || _a === void 0 ? void 0 : _a.trim(),
                stderr: (_b = bufferToString(stderr)) === null || _b === void 0 ? void 0 : _b.trim()
            };
        }
        catch (error) {
            const execError = error;
            return {
                success: false,
                stdout: (_c = bufferToString(execError.stdout)) === null || _c === void 0 ? void 0 : _c.trim(),
                stderr: ((_d = bufferToString(execError.stderr)) === null || _d === void 0 ? void 0 : _d.trim()) || (execError.message || '未知错误')
            };
        }
    });
}
exports.execWithDetails = execWithDetails;
//# sourceMappingURL=execUtils.js.map