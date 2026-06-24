import fs from 'fs';
import path from 'path';
import { advise, deny, sideEffect } from '../runtime/result-helpers';
import { debugLog } from '../runtime/debug-log';
import { mutateNamespacedState, readNamespacedState } from '../runtime/state-store';
import { normalizeAgentSessionKey, normalizeResourceKey } from '../runtime/state-ops';
import type { HookContext, HookResult } from '../runtime/types';

// Original reference:
// https://github.com/Bande-a-Bonnot/Boucle-framework/tree/main/tools/read-once
export const READ_ONCE_NAMESPACE = 'hook:read-once';
const DEFAULT_TTL_MS = 20 * 60 * 1000;

export interface ReadOnceEntry {
  seenAt: number;
  mtimeMs: number;
  size: number;
  tokens: number;
}

export interface ReadOnceGlobalEntry extends ReadOnceEntry {
  agentSessionKey: string;
}

export interface ReadOnceStats {
  totalReads: number;
  firstReads: number;
  sameSessionHits: number;
  crossSessionAdvisories: number;
  changedFiles: number;
  ttlExpired: number;
  tokensSaved: number;
}

export interface ReadOnceState {
  sessions: Record<string, Record<string, ReadOnceEntry>>;
  global: Record<string, ReadOnceGlobalEntry>;
  stats: ReadOnceStats;
}

const defaultState = (): ReadOnceState => ({
  sessions: {},
  global:  {},
  stats: {
    totalReads: 0,
    firstReads: 0,
    sameSessionHits: 0,
    crossSessionAdvisories: 0,
    changedFiles: 0,
    ttlExpired: 0,
    tokensSaved: 0,
  },
});

export interface ReadOnceConfig {
  mode: 'warn' | 'deny';
  ttlMs: number;
  disabled: boolean;
}

export const getReadOnceConfig = (): ReadOnceConfig => ({
  mode: process.env.READ_ONCE_MODE === 'deny' ? 'deny' : 'warn',
  ttlMs: Math.max(1, parseInt(process.env.READ_ONCE_TTL ?? '', 10) || DEFAULT_TTL_MS / 1000) * 1000,
  disabled: process.env.READ_ONCE_DISABLED === '1',
});

export const isFullRead = (ctx: HookContext): boolean =>
  !('offset' in ctx.toolInput) && !('limit' in ctx.toolInput);

const SHELL_SPLIT_RE = /[|;&><()`]/;
const SIMPLE_SHELL_READ_RE = /^(cat|sed|awk|head|tail)$/i;

const unquote = (value: string): string =>
  value.replace(/^['"]|['"]$/g, '');

const tokenizeCommand = (command: string): string[] | null => {
  if (!command.trim() || SHELL_SPLIT_RE.test(command)) return null;
  const tokens = command.match(/"[^"]*"|'[^']*'|\S+/g);
  return tokens?.map(unquote) ?? null;
};

const extractSimpleShellReadPath = (command: string): string | null => {
  const tokens = tokenizeCommand(command);
  if (!tokens || tokens.length < 2) return null;

  const [program, ...rest] = tokens;
  if (!SIMPLE_SHELL_READ_RE.test(program)) return null;

  const fileTokens = rest.filter((token) => !token.startsWith('-'));
  if (fileTokens.length !== 1) return null;
  return fileTokens[0];
};

const classifyReadPath = (ctx: HookContext): string | null => {
  if (ctx.event === 'PreRead') {
    if (!ctx.filePath) return null;
    if (!isFullRead(ctx)) return null;
    return ctx.filePath;
  }

  if (ctx.event !== 'PreToolUse') return null;

  if (ctx.toolKind === 'read' && ctx.filePath) {
    if (!isFullRead(ctx)) return null;
    return ctx.filePath;
  }

  if (ctx.toolKind !== 'bash') return null;

  const command = (ctx.toolInput.command as string) ?? '';
  return extractSimpleShellReadPath(command);
};

const estimateTokens = (size: number): number => Math.max(1, Math.ceil(size / 4));

const statFile = (resourceKey: string): { mtimeMs: number; size: number } | null => {
  try {
    const stat = fs.statSync(resourceKey);
    return { mtimeMs: stat.mtimeMs, size: stat.size };
  } catch {
    return null;
  }
};

const pruneSession = (
  sessionEntries: Record<string, ReadOnceEntry>,
  now: number,
  ttlMs: number,
): Record<string, ReadOnceEntry> =>
  Object.fromEntries(
    Object.entries(sessionEntries).filter(([, entry]) => now - entry.seenAt < ttlMs),
  );

const pruneState = (state: ReadOnceState, now: number, ttlMs: number): ReadOnceState => {
  const sessions = Object.fromEntries(
    Object.entries(state.sessions)
      .map(([sessionKey, entries]) => [sessionKey, pruneSession(entries, now, ttlMs)] as const)
      .filter(([, entries]) => Object.keys(entries).length > 0),
  );

  const global = Object.fromEntries(
    Object.entries(state.global).filter(([, entry]) => now - entry.seenAt < ttlMs),
  );

  return { ...state, sessions, global };
};

const describeSameSessionHit = (
  resourceKey: string,
  entry: ReadOnceEntry,
  ttlMs: number,
  tokensSaved: number,
): string => {
  const ageMinutes = Math.max(0, Math.floor((Date.now() - entry.seenAt) / 60000));
  return [
    `read-once: ${path.basename(resourceKey)} (~${entry.tokens} tokens) already in context`,
    `(read ${ageMinutes}m ago, unchanged).`,
    `Re-read allowed after ${Math.floor(ttlMs / 60000)}m.`,
    `Session savings: ~${tokensSaved} tokens.`,
  ].join(' ');
};

const describeCrossSessionAdvisory = (resourceKey: string, entry: ReadOnceGlobalEntry): string =>
  [
    `read-once: ${path.basename(resourceKey)} was already seen in another context`,
    `(${entry.agentSessionKey}) and is unchanged.`,
    `Allowing the first read in this context; future same-context re-reads can be deduplicated.`,
  ].join(' ');

const mutateReadOnceState = async (
  fallback: ReadOnceState,
  mutate: (current: ReadOnceState) => ReadOnceState,
): Promise<ReadOnceState | null> => {
  try {
    return await mutateNamespacedState(READ_ONCE_NAMESPACE, fallback, mutate);
  } catch (err) {
    debugLog('[read-once] state-mutate-failed', { error: (err as Error).message });
    return null;
  }
};

export const handleReadOnce = async (ctx: HookContext): Promise<HookResult> => {
  const config = getReadOnceConfig();
  if (config.disabled) return null;

  const readPath = classifyReadPath(ctx);
  if (!readPath) return null;

  const agentSessionKey = normalizeAgentSessionKey(ctx.ide, ctx.sessionId, ctx.agentId);
  const resourceKey = normalizeResourceKey(ctx.cwd, readPath);
  const fileStat = statFile(resourceKey);
  if (!fileStat) return null;

  const now = Date.now();
  const next = await mutateReadOnceState(
    defaultState(),
    (current) => pruneState(current, now, config.ttlMs),
  );
  if (!next) return null;

  const sessionEntries = next.sessions[agentSessionKey] ?? {};
  const sessionEntry = sessionEntries[resourceKey];
  const globalEntry = next.global[resourceKey];

  if (sessionEntry && sessionEntry.mtimeMs === fileStat.mtimeMs) {
    const message = describeSameSessionHit(
      resourceKey,
      sessionEntry,
      config.ttlMs,
      next.stats.tokensSaved + sessionEntry.tokens,
    );
    await mutateReadOnceState(next, (current) => ({
      ...current,
      stats: {
        ...current.stats,
        totalReads: current.stats.totalReads + 1,
        sameSessionHits: current.stats.sameSessionHits + 1,
        tokensSaved: current.stats.tokensSaved + sessionEntry.tokens,
      },
    }));
    debugLog('[read-once] same-session-hit', { agentSessionKey, resourceKey, mode: config.mode });
    return config.mode === 'deny' ? deny(message) : advise(message);
  }

  const entry: ReadOnceEntry = {
    seenAt: now,
    mtimeMs: fileStat.mtimeMs,
    size: fileStat.size,
    tokens: estimateTokens(fileStat.size),
  };

  await mutateReadOnceState(next, (current) => {
    const pruned = pruneState(current, now, config.ttlMs);
    const hadGlobal = Boolean(
      pruned.global[resourceKey] && pruned.global[resourceKey].agentSessionKey !== agentSessionKey,
    );
    const wasChanged = Boolean(sessionEntry && sessionEntry.mtimeMs !== fileStat.mtimeMs);
    return {
      sessions: {
        ...pruned.sessions,
        [agentSessionKey]: {
          ...(pruned.sessions[agentSessionKey] ?? {}),
          [resourceKey]: entry,
        },
      },
      global: {
        ...pruned.global,
        [resourceKey]: {
          ...entry,
          agentSessionKey,
        },
      },
      stats: {
        ...pruned.stats,
        totalReads: pruned.stats.totalReads + 1,
        firstReads: pruned.stats.firstReads + (sessionEntry ? 0 : 1),
        crossSessionAdvisories: pruned.stats.crossSessionAdvisories + (hadGlobal ? 1 : 0),
        changedFiles: pruned.stats.changedFiles + (wasChanged ? 1 : 0),
      },
    };
  });

  if (
    globalEntry &&
    globalEntry.agentSessionKey !== agentSessionKey &&
    globalEntry.mtimeMs === fileStat.mtimeMs
  ) {
    debugLog('[read-once] cross-session-advisory', { agentSessionKey, resourceKey });
    return advise(describeCrossSessionAdvisory(resourceKey, globalEntry));
  }

  return null;
};

export const resetReadOnceSession = async (ctx: HookContext): Promise<HookResult> => {
  if (!ctx.sessionId) return sideEffect();
  const agentSessionKey = normalizeAgentSessionKey(ctx.ide, ctx.sessionId, ctx.agentId);
  await mutateReadOnceState(
    defaultState(),
    (current) => {
      const next = { ...current, sessions: { ...current.sessions } };
      delete next.sessions[agentSessionKey];
      return next;
    },
  );
  debugLog('[read-once] reset-session', {
    agentSessionKey,
    ide: ctx.ide,
    event: ctx.event,
    agentId: ctx.agentId,
    source: ctx.source,
    reason: ctx.reason,
    trigger: ctx.trigger,
  });
  return sideEffect();
};

export const readReadOnceState = (): ReadOnceState =>
  readNamespacedState(READ_ONCE_NAMESPACE, defaultState());
