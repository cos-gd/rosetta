import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

export interface TimedLockOptions {
  staleAfterMs: number;
}

export const ensureDirectory = (dir: string): void => {
  fs.mkdirSync(dir, { recursive: true });
};

export const hashKey = (key: string, size = 24): string =>
  createHash('sha256').update(key).digest('hex').slice(0, size);

export const hashedFilePath = (
  dir: string,
  key: string,
  ext: string,
  size = 24,
): string => path.join(dir, `${hashKey(key, size)}${ext}`);

export const readTimestampFile = (filePath: string): number | null => {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    const value = parseInt(raw, 10);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

export const writeTimestampFile = (filePath: string, now = Date.now()): void => {
  fs.writeFileSync(filePath, String(now));
};

export const tryAcquireTimedLock = (
  lockPath: string,
  opts: TimedLockOptions,
  now = Date.now(),
): boolean => {
  const create = (): boolean => {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.writeSync(fd, String(now));
      fs.closeSync(fd);
      return true;
    } catch {
      return false;
    }
  };

  if (create()) return true;

  const createdAt = readTimestampFile(lockPath);
  if (createdAt != null && now - createdAt > opts.staleAfterMs) {
    try {
      fs.unlinkSync(lockPath);
    } catch {
      return false;
    }
    return create();
  }

  return false;
};

export const releaseLockFile = (lockPath: string): void => {
  try {
    fs.unlinkSync(lockPath);
  } catch {
    // already gone
  }
};
