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
exports.execWithDetails = execWithDetails;
const child_process = __importStar(require("child_process"));
const util_1 = require("util");
const exec = (0, util_1.promisify)(child_process.exec);
function bufferToString(data) {
    if (data === undefined) {
        return undefined;
    }
    return data instanceof Buffer ? data.toString('utf8') : String(data);
}
function execWithDetails(command, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
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
//# sourceMappingURL=execUtils.js.map