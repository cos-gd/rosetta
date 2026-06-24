"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionId = exports.getCwd = exports.getFilePath = exports.lookupToolKind = exports.lookupEvent = void 0;
const EVENTS = {
    PostToolUse: 'PostToolUse',
    PreToolUse: 'PreToolUse',
    SessionStart: 'SessionStart',
    PreCompact: 'PreCompact',
    PostCompact: 'PostCompact',
    PrePromptSubmit: 'UserPromptSubmit',
};
// Matches "*** (Update|Add|Create) File: <path>" in apply_patch command strings
const PATCH_FILE_RE = /^\*\*\* (?:Update|Add|Create) File: (.+)$/m;
const TOOL_KINDS = {
    write: ['Write', 'apply_patch', 'functions.apply_patch'],
    edit: ['apply_patch', 'functions.apply_patch'],
    create: ['Write', 'apply_patch', 'functions.apply_patch'],
    replace: ['apply_patch', 'functions.apply_patch'],
    patch: ['apply_patch', 'functions.apply_patch'],
    bash: ['Bash', 'shell'],
    'mcp-call': ['__mcp_sentinel__'],
};
const lookupEvent = (raw) => {
    for (const [k, v] of Object.entries(EVENTS))
        if (v === raw)
            return k;
    return null;
};
exports.lookupEvent = lookupEvent;
const lookupToolKind = (raw) => {
    if (raw.startsWith('mcp__'))
        return 'mcp-call';
    for (const [k, v] of Object.entries(TOOL_KINDS))
        if (v.includes(raw))
            return k;
    return null;
};
exports.lookupToolKind = lookupToolKind;
const getFilePath = (raw) => {
    const tool = raw.tool_name ?? '';
    if (tool === 'apply_patch' || tool === 'functions.apply_patch') {
        const cmd = raw.tool_input?.command ?? '';
        const match = PATCH_FILE_RE.exec(cmd);
        return match?.[1]?.trim() ?? null;
    }
    if (tool.startsWith('mcp__')) {
        const ti = raw.tool_input ?? {};
        return ti.file_path ?? ti.filePath ?? ti.path ?? null;
    }
    return raw.tool_input?.file_path ?? null;
};
exports.getFilePath = getFilePath;
const getCwd = (raw) => raw.cwd ?? null;
exports.getCwd = getCwd;
const getSessionId = (raw) => raw.session_id ?? null;
exports.getSessionId = getSessionId;
