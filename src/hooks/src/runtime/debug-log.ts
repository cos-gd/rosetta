import { appendFileSync, renameSync, statSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';

const LOG_DIR = path.join(os.homedir(), '.rosetta');
const LOG_PATH = path.join(LOG_DIR, 'rosetta.log');
const LOG_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const getDebugLogDir = (): string => LOG_DIR;
export const getDebugLogPath = (): string => LOG_PATH;

const toSerializable = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function') return `[Function:${value.name || 'anonymous'}]`;
  if (typeof value === 'symbol') return value.toString();
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
    if (seen.has(value as object)) return '[Circular]';
    seen.add(value as object);
    const entries = Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
      key,
      toSerializable(entryValue, seen),
    ]);
    return Object.fromEntries(entries);
  }
  return value;
};

export const isDebugLoggingEnabled = (): boolean =>
  process.env.ROSETTA_DEBUG === '1';

export const collectEnvironment = (names: readonly string[]): Record<string, string | null> =>
  Object.fromEntries(names.map((name) => [name, process.env[name] ?? null]));

const ensureDir = (): void => {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    // ignore — dir already exists or unwritable
  }
};

const rotateIfNeeded = (): void => {
  try {
    if (statSync(LOG_PATH).size >= LOG_MAX_BYTES) {
      renameSync(LOG_PATH, `${LOG_PATH.replace(/\.log$/, '')}.1.log`);
    }
  } catch {
    // file doesn't exist yet — no rotation needed
  }
};

export const debugLog = (message: string, context?: unknown): void => {
  if (!isDebugLoggingEnabled()) return;
  ensureDir();
  rotateIfNeeded();
  const entry =
    JSON.stringify({
      ts: new Date().toISOString(),
      msg: message,
      pid: process.pid,
      ppid: process.ppid,
      ...(toSerializable(context ?? {}) as Record<string, unknown>),
    }) + '\n';
  try {
    appendFileSync(LOG_PATH, entry);
  } catch {
    // silent — never let logging break the hook
  }
};

export const debugLogHook = (
  hookName: string,
  phase: string,
  context?: unknown,
): void => {
  debugLog(`hook:${hookName}:${phase}`, context);
};

export const debugLogHookBranch = (
  hookName: string,
  branch: string,
  context?: unknown,
): void => {
  debugLog(`hook:${hookName}:branch:${branch}`, context);
};

export const debugLogBranch = (
  component: string,
  branch: string,
  context?: unknown,
): void => {
  debugLog(`${component}:${branch}`, context);
};
