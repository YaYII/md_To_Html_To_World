"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentError = void 0;
class EnvironmentError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = 'EnvironmentError';
    }
}
exports.EnvironmentError = EnvironmentError;
//# sourceMappingURL=types.js.map