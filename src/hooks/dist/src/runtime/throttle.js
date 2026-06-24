"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStampFresh = exports.makeDebounceStamp = exports.acquireOnce = void 0;
const os_1 = __importDefault(require("os"));
const file_coordination_1 = require("./file-coordination");
const DEFAULT_DIR = os_1.default.tmpdir();
const LOCK_TTL_MS = 5_000;
const acquireOnce = (key, dir = DEFAULT_DIR) => {
    const lockPath = (0, file_coordination_1.hashedFilePath)(dir, `rosetta-hooks:${key}`, '.lock', 16);
    return (0, file_coordination_1.tryAcquireTimedLock)(lockPath, { staleAfterMs: LOCK_TTL_MS });
};
exports.acquireOnce = acquireOnce;
const makeDebounceStamp = (repoKey, dir = DEFAULT_DIR, now = Date.now()) => {
    const stampFile = (0, file_coordination_1.hashedFilePath)(dir, `debounce:${repoKey}`, '.pending', 24);
    (0, file_coordination_1.writeTimestampFile)(stampFile, now);
    return stampFile;
};
exports.makeDebounceStamp = makeDebounceStamp;
const isStampFresh = (stampFile, debounceMs) => {
    const createdAt = (0, file_coordination_1.readTimestampFile)(stampFile);
    return createdAt != null ? Date.now() - createdAt < debounceMs : false;
};
exports.isStampFresh = isStampFresh;
