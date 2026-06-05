// FR-HOOK-0020–0022 — pluginSyncBundles: r3 adds .js; r2 removes stale; preserve unmanaged
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pluginSyncBundles } from '../../../src/plugin-processors/plugin-sync-bundles.js';
import type { PluginProcessingFrame, PluginSpec } from '../../../src/types.js';

const BUNDLE_NAMES = [
  'dangerous-actions.js',
  'gitnexus-refresh.js',
  'lint-format-advisory.js',
  'loose-files.js',
  'md-file-advisory.js',
];

function makePluginFrame(spec: Partial<PluginSpec>): PluginProcessingFrame {
  return {
    spec: spec as PluginSpec,
    vfs: [] as any,
    frames: [],
    templateContext: {},
    errors: [],
  };
}

function makeTempRepo(targetName: string, bundles: string[]): {
  repoRoot: string;
  outputDir: string;
  cleanup: () => void;
} {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-bundles-'));
  const repoRoot = tmpDir;
  const outputDir = path.join(tmpDir, 'output');

  // Create bundle source files
  const bundleDir = path.join(repoRoot, 'hooks', 'dist', 'bundles', targetName);
  fs.mkdirSync(bundleDir, { recursive: true });
  for (const b of bundles) {
    fs.writeFileSync(path.join(bundleDir, b), `// ${b}`);
  }

  return {
    repoRoot,
    outputDir,
    cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }),
  };
}

describe('pluginSyncBundles', () => {
  it('r3: copies all bundle .js files to hook folder', () => {
    const { repoRoot, outputDir, cleanup } = makeTempRepo('core-claude', BUNDLE_NAMES);
    try {
      const spec: Partial<PluginSpec> = {
        name: 'core-claude',
        destination: 'core-claude',
        hookFolder: 'hooks',
        bundleSource: 'core-claude',
        createHookFolderInR2: true,
      };
      const targetDir = path.join(outputDir, 'core-claude');
      fs.mkdirSync(targetDir, { recursive: true });
      const p = makePluginFrame(spec);
      pluginSyncBundles(repoRoot, outputDir, true)(p);
      for (const b of BUNDLE_NAMES) {
        expect(fs.existsSync(path.join(targetDir, 'hooks', b))).toBe(true);
      }
    } finally {
      cleanup();
    }
  });

  it('r2: creates hook folder when createHookFolderInR2=true', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-r2-'));
    try {
      const outputDir = path.join(tmpDir, 'output');
      const targetDir = path.join(outputDir, 'core-claude');
      fs.mkdirSync(targetDir, { recursive: true });
      const spec: Partial<PluginSpec> = {
        name: 'core-claude',
        destination: 'core-claude',
        hookFolder: 'hooks',
        createHookFolderInR2: true,
      };
      pluginSyncBundles(tmpDir, outputDir, false)(makePluginFrame(spec));
      expect(fs.existsSync(path.join(targetDir, 'hooks'))).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('r2: removes stale .js files from hook folder', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-stale-'));
    try {
      const outputDir = path.join(tmpDir, 'output');
      const hookDir = path.join(outputDir, 'core-claude', 'hooks');
      fs.mkdirSync(hookDir, { recursive: true });
      fs.writeFileSync(path.join(hookDir, 'dangerous-actions.js'), '// stale');
      const spec: Partial<PluginSpec> = {
        name: 'core-claude',
        destination: 'core-claude',
        hookFolder: 'hooks',
        createHookFolderInR2: true,
      };
      pluginSyncBundles(tmpDir, outputDir, false)(makePluginFrame(spec));
      expect(fs.existsSync(path.join(hookDir, 'dangerous-actions.js'))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('r2: preserves unmanaged files in hook folder', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-preserve-'));
    try {
      const outputDir = path.join(tmpDir, 'output');
      const hookDir = path.join(outputDir, 'core-claude', 'hooks');
      fs.mkdirSync(hookDir, { recursive: true });
      fs.writeFileSync(path.join(hookDir, 'hooks.json'), '{"hooks":{}}'); // unmanaged
      const spec: Partial<PluginSpec> = {
        name: 'core-claude',
        destination: 'core-claude',
        hookFolder: 'hooks',
        createHookFolderInR2: true,
      };
      pluginSyncBundles(tmpDir, outputDir, false)(makePluginFrame(spec));
      // hooks.json must still exist
      expect(fs.existsSync(path.join(hookDir, 'hooks.json'))).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('r3: unknown bundle dir is ignored (PARITY-15)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-unknown-'));
    try {
      const outputDir = path.join(tmpDir, 'output');
      const targetDir = path.join(outputDir, 'core-windsurf');
      fs.mkdirSync(targetDir, { recursive: true });
      const spec: Partial<PluginSpec> = {
        name: 'core-windsurf',
        destination: 'core-windsurf',
        hookFolder: 'hooks',
        bundleSource: 'core-windsurf', // no bundle dir exists
        createHookFolderInR2: true,
      };
      // Should not throw
      const result = pluginSyncBundles(tmpDir, outputDir, true)(makePluginFrame(spec));
      expect(result.errors.length).toBe(0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('r3: adds hard error when some bundle files are missing', () => {
    // Only provide 3 of 5 expected bundles
    const partialBundles = ['dangerous-actions.js', 'gitnexus-refresh.js', 'lint-format-advisory.js'];
    const { repoRoot, outputDir, cleanup } = makeTempRepo('core-claude', partialBundles);
    try {
      const spec: Partial<PluginSpec> = {
        name: 'core-claude',
        destination: 'core-claude',
        hookFolder: 'hooks',
        bundleSource: 'core-claude',
        createHookFolderInR2: true,
      };
      const targetDir = path.join(outputDir, 'core-claude');
      fs.mkdirSync(targetDir, { recursive: true });
      const p = makePluginFrame(spec);
      const result = pluginSyncBundles(repoRoot, outputDir, true)(p);
      // 2 missing files → hard error
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].kind).toBe('hard');
      expect(result.errors[0].message).toContain('Missing');
    } finally {
      cleanup();
    }
  });

  it('r2: no-op when createHookFolderInR2 is false', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-r2-nodir-'));
    try {
      const outputDir = path.join(tmpDir, 'output');
      const targetDir = path.join(outputDir, 'core-codex');
      fs.mkdirSync(targetDir, { recursive: true });
      const spec: Partial<PluginSpec> = {
        name: 'core-codex',
        destination: 'core-codex',
        hookFolder: '.codex/hooks',
        createHookFolderInR2: false,
      };
      pluginSyncBundles(tmpDir, outputDir, false)(makePluginFrame(spec));
      // Hook folder must NOT be created
      expect(fs.existsSync(path.join(targetDir, '.codex', 'hooks'))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('dry-run: skips all disk operations (FR-CLI-0050)', () => {
    const { repoRoot, outputDir, cleanup } = makeTempRepo('core-claude', BUNDLE_NAMES);
    try {
      const spec: Partial<PluginSpec> = {
        name: 'core-claude',
        destination: 'core-claude',
        hookFolder: 'hooks',
        bundleSource: 'core-claude',
        createHookFolderInR2: true,
      };
      const p = makePluginFrame(spec);
      // dryRun=true → no-op
      const result = pluginSyncBundles(repoRoot, outputDir, true, true)(p);
      expect(result).toBe(p); // frame returned unchanged
      // No output dir created
      const targetHookDir = path.join(outputDir, 'core-claude', 'hooks');
      expect(fs.existsSync(targetHookDir)).toBe(false);
    } finally {
      cleanup();
    }
  });
});
