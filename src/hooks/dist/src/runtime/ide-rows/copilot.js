"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionId = exports.getCwd = exports.getFilePath = exports.lookupToolKind = exports.lookupEvent = void 0;
const EVENTS = {
    SessionStart: 'sessionStart',
    SessionEnd: 'sessionEnd',
    PreCompact: 'preCompact',
    PrePromptSubmit: 'userPromptSubmitted',
};
const TOOL_KINDS = {
    write: ['create_file', 'create', 'Write'],
    edit: ['replace_string_in_file', 'edit', 'Edit'],
    'multi-edit': ['multi_replace_string_in_file'],
    create: ['create_file', 'create', 'Write'],
    replace: ['replace_string_in_file', 'multi_replace_string_in_file', 'edit', 'Edit'],
    bash: ['bash', 'powershell'],
    read: ['view', 'Read'],
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
    const toolArgs = raw.toolArgs;
    if (!toolArgs)
        return null;
    try {
        const parsed = typeof toolArgs === 'string'
            ? JSON.parse(toolArgs)
            : toolArgs;
        return parsed?.filePath ?? parsed?.file_path ?? null;
    }
    catch {
        return null;
    }
};
exports.getFilePath = getFilePath;
const getCwd = (raw) => raw.cwd ?? null;
exports.getCwd = getCwd;
const getSessionId = (raw) => raw.sessionId ?? raw.session_id ?? null;
exports.getSessionId = getSessionId;
