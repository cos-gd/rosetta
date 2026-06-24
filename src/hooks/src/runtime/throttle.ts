import os from 'os';
import { hashedFilePath, readTimestampFile, tryAcquireTimedLock, writeTimestampFile } from './file-coordination';

const DEFAULT_DIR = os.tmpdir();
const LOCK_TTL_MS = 5_000;

export const acquireOnce = (key: string, dir = DEFAULT_DIR): boolean => {
  const lockPath = hashedFilePath(dir, `rosetta-hooks:${key}`, '.lock', 16);
  return tryAcquireTimedLock(lockPath, { staleAfterMs: LOCK_TTL_MS });
};

export const makeDebounceStamp = (
  repoKey: string,
  dir = DEFAULT_DIR,
  now = Date.now(),
): string => {
  const stampFile = hashedFilePath(dir, `debounce:${repoKey}`, '.pending', 24);
  writeTimestampFile(stampFile, now);
  return stampFile;
};

export const isStampFresh = (stampFile: string, debounceMs: number): boolean => {
  const createdAt = readTimestampFile(stampFile);
  return createdAt != null ? Date.now() - createdAt < debounceMs : false;
};
