import path from 'path';
import { debugLog } from './debug-log';

export type TimestampedEntries = Record<string, number>;

export interface TimestampedSetOptions {
  ttlMs?: number;
  maxEntries?: number;
}

export const normalizeNamespaceKey = (...parts: readonly string[]): string =>
  parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(':');

export const normalizeSessionKey = (ide: string, sessionId: string | null | undefined): string =>
  normalizeNamespaceKey('session', ide, sessionId ?? 'no-session');

export const normalizeAgentSessionKey = (
  ide: string,
  sessionId: string | null | undefined,
  agentId: string | null | undefined,
): string => {
  const sessionKey = normalizeSessionKey(ide, sessionId);
  if (!agentId) {
    debugLog('[state-ops] agent-session-key-downgraded', {
      ide,
      sessionId: sessionId ?? 'no-session',
      reason: 'missing-agent-id',
    });
    return sessionKey;
  }
  return normalizeNamespaceKey('agent-session', ide, sessionId ?? 'no-session', agentId);
};

export const normalizeTurnKey = (turnId: string | null | undefined): string | null =>
  turnId ? normalizeNamespaceKey('turn', turnId) : null;

export const normalizeResourceKey = (cwd: string, filePath: string): string => {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(cwd || process.cwd(), filePath);
  return path.normalize(resolved);
};

export const pruneTimestampedEntries = (
  entries: TimestampedEntries,
  now: number,
  opts: TimestampedSetOptions = {},
): TimestampedEntries => {
  const ttlMs = opts.ttlMs ?? null;
  let next = Object.fromEntries(
    Object.entries(entries).filter(([, ts]) => ttlMs == null || now - ts < ttlMs),
  ) as TimestampedEntries;

  if (opts.maxEntries && Object.keys(next).length > opts.maxEntries) {
    const sorted = Object.entries(next).sort((a, b) => b[1] - a[1]).slice(0, opts.maxEntries);
    next = Object.fromEntries(sorted) as TimestampedEntries;
  }
  return next;
};

export const hasTimestampedEntry = (
  entries: TimestampedEntries,
  key: string,
  now: number,
  opts: TimestampedSetOptions = {},
): boolean => Object.prototype.hasOwnProperty.call(pruneTimestampedEntries(entries, now, opts), key);

export const setTimestampedEntry = (
  entries: TimestampedEntries,
  key: string,
  now: number,
  opts: TimestampedSetOptions = {},
): TimestampedEntries => {
  const pruned = pruneTimestampedEntries(entries, now, opts);
  return { ...pruned, [key]: now };
};

export const clearTimestampedEntries = (): TimestampedEntries => ({});
