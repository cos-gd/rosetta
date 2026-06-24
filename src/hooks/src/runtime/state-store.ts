import fs from 'fs';
import os from 'os';
import path from 'path';
import { debugLog } from './debug-log';
import {
  ensureDirectory,
  hashedFilePath,
  releaseLockFile,
  tryAcquireTimedLock,
} from './file-coordination';

const STATE_ROOT = path.join(os.homedir(), '.rosetta', 'state');
const LOCK_TTL_MS = 30_000;
const LOCK_RETRY_MS = 25;
const LOCK_RETRY_LIMIT = 20;

const ensureStateRoot = (): void => {
  ensureDirectory(STATE_ROOT);
};

const statePathFor = (namespace: string): string =>
  hashedFilePath(STATE_ROOT, `state:${namespace}`, '.json');

const lockPathFor = (namespace: string): string =>
  hashedFilePath(STATE_ROOT, `state-lock:${namespace}`, '.lock');

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const readNamespacedState = <T>(namespace: string, fallback: T): T => {
  ensureStateRoot();
  const file = statePathFor(namespace);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
};

export const writeNamespacedState = <T>(namespace: string, value: T): void => {
  ensureStateRoot();
  const file = statePathFor(namespace);
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2));
  fs.renameSync(temp, file);
};

export const mutateNamespacedState = async <T>(
  namespace: string,
  fallback: T,
  mutate: (current: T) => T,
): Promise<T> => {
  ensureStateRoot();
  const lockPath = lockPathFor(namespace);
  let acquired = false;
  for (let i = 0; i < LOCK_RETRY_LIMIT; i++) {
    if (tryAcquireTimedLock(lockPath, { staleAfterMs: LOCK_TTL_MS })) {
      acquired = true;
      break;
    }
    await sleep(LOCK_RETRY_MS);
  }

  if (!acquired) {
    debugLog('[state-store] lock-timeout', { namespace });
    throw new Error(`state_lock_timeout:${namespace}`);
  }

  try {
    const current = readNamespacedState(namespace, fallback);
    const next = mutate(current);
    writeNamespacedState(namespace, next);
    return next;
  } finally {
    releaseLockFile(lockPath);
  }
};
