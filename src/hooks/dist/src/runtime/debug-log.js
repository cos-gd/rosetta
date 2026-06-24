"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugLogBranch = exports.debugLogHookBranch = exports.debugLogHook = exports.debugLog = exports.collectEnvironment = exports.isDebugLoggingEnabled = exports.getDebugLogPath = exports.getDebugLogDir = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const LOG_DIR = path_1.default.join(os_1.default.homedir(), '.rosetta');
const LOG_PATH = path_1.default.join(LOG_DIR, 'rosetta.log');
const LOG_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const getDebugLogDir = () => LOG_DIR;
exports.getDebugLogDir = getDebugLogDir;
const getDebugLogPath = () => LOG_PATH;
exports.getDebugLogPath = getDebugLogPath;
const toSerializable = (value, seen = new WeakSet()) => {
    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack,
        };
    }
    if (typeof value === 'bigint')
        return value.toString();
    if (typeof value === 'function')
        return `[Function:${value.name || 'anonymous'}]`;
    if (typeof value === 'symbol')
        return value.toString();
    if (Buffer.isBuffer(value)) {
        return {
            type: 'Buffer',
            byteLength: value.length,
            utf8: value.toString('utf8'),
        };
    }
    if (Array.isArray(value)) {
        return value.map((item) => toSerializable(item, seen));
    }
    if (value && typeof value === 'object') {
        if (seen.has(value))
            return '[Circular]';
        seen.add(value);
        const entries = Object.entries(value).map(([key, entryValue]) => [
            key,
            toSerializable(entryValue, seen),
        ]);
        return Object.fromEntries(entries);
    }
    return value;
};
const isDebugLoggingEnabled = () => process.env.ROSETTA_DEBUG === '1';
exports.isDebugLoggingEnabled = isDebugLoggingEnabled;
const collectEnvironment = (names) => Object.fromEntries(names.map((name) => [name, process.env[name] ?? null]));
exports.collectEnvironment = collectEnvironment;
const ensureDir = () => {
    try {
        (0, fs_1.mkdirSync)(LOG_DIR, { recursive: true });
    }
    catch {
        // ignore — dir already exists or unwritable
    }
};
const rotateIfNeeded = () => {
    try {
        if ((0, fs_1.statSync)(LOG_PATH).size >= LOG_MAX_BYTES) {
            (0, fs_1.renameSync)(LOG_PATH, `${LOG_PATH.replace(/\.log$/, '')}.1.log`);
        }
    }
    catch {
        // file doesn't exist yet — no rotation needed
    }
};
const debugLog = (message, context) => {
    if (!(0, exports.isDebugLoggingEnabled)())
        return;
    ensureDir();
    rotateIfNeeded();
    const entry = JSON.stringify({
        ts: new Date().toISOString(),
        msg: message,
        pid: process.pid,
        ppid: process.ppid,
        ...toSerializable(context ?? {}),
    }) + '\n';
    try {
        (0, fs_1.appendFileSync)(LOG_PATH, entry);
    }
    catch {
        // silent — never let logging break the hook
    }
};
exports.debugLog = debugLog;
const debugLogHook = (hookName, phase, context) => {
    (0, exports.debugLog)(`hook:${hookName}:${phase}`, context);
};
exports.debugLogHook = debugLogHook;
const debugLogHookBranch = (hookName, branch, context) => {
    (0, exports.debugLog)(`hook:${hookName}:branch:${branch}`, context);
};
exports.debugLogHookBranch = debugLogHookBranch;
const debugLogBranch = (component, branch, context) => {
    (0, exports.debugLog)(`${component}:${branch}`, context);
};
exports.debugLogBranch = debugLogBranch;
