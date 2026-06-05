// FR-ARCH-0049 — rewrite-references: bare folder, dropped-frame ref, prose substring NOT rewritten
import { describe, it, expect } from 'vitest';
import { pluginRewriteReferences, buildFolderPairs } from '../../../src/plugin-processors/plugin-rewrite-references.js';
import type { FileProcessingFrame, PluginProcessingFrame, PluginSpec, SpecEntry } from '../../../src/types.js';

function makeFrame(target: string, content: string): FileProcessingFrame {
  return {
    sourcePath: target,
    target,
    isBinary: false,
    target_contents: content,
    source: [],
  };
}

function makePluginFrame(frames: FileProcessingFrame[], specEntries: SpecEntry[]): PluginProcessingFrame {
  return {
    spec: {
      name: 'core-cursor',
      baseSubfolder: '',
      specEntries,
    } as unknown as PluginSpec,
    vfs: [] as any,
    frames,
    templateContext: {},
    errors: [],
  };
}

describe('pluginRewriteReferences', () => {
  it('rewrites workflows/ → commands/ in content', () => {
    const frames = [
      makeFrame('commands/coding-flow.md', 'See workflows/coding-flow.md for details.'),
    ];
    const specEntries: SpecEntry[] = [
      { source: 'workflows/**', target: 'commands', exclude: [], processors: [] },
    ];
    const p = makePluginFrame(frames, specEntries);
    const result = pluginRewriteReferences(p);
    const f = result.frames[0];
    expect(f.target_contents as string).toContain('commands/coding-flow.md');
    expect(f.target_contents as string).not.toContain('workflows/coding-flow.md');
  });

  it('does NOT rewrite prose substring "my-workflows/" (FR-ARCH-0037)', () => {
    const frames = [
      makeFrame('commands/test.md', 'Path my-workflows/example.md should not change.'),
    ];
    const specEntries: SpecEntry[] = [
      { source: 'workflows/**', target: 'commands', exclude: [], processors: [] },
    ];
    const p = makePluginFrame(frames, specEntries);
    const result = pluginRewriteReferences(p);
    const f = result.frames[0];
    // "my-workflows/" must NOT be rewritten (preceded by hyphen = not a boundary)
    expect(f.target_contents as string).toContain('my-workflows/example.md');
  });

  it('DOES rewrite /workflows/ (slash-bounded)', () => {
    const frames = [
      makeFrame('commands/test.md', 'Run .windsurf/workflows/coding-flow.md step.'),
    ];
    const specEntries: SpecEntry[] = [
      { source: 'workflows/**', target: 'commands', exclude: [], processors: [] },
    ];
    const p = makePluginFrame(frames, specEntries);
    const result = pluginRewriteReferences(p);
    // "/workflows/" should be rewritten because "/" is not alphanumeric/hyphen/underscore
    const content = result.frames[0].target_contents as string;
    expect(content).toContain('commands/coding-flow.md');
  });

  it('returns original frame when no rewrites needed', () => {
    const frame = makeFrame('rules/test.md', '# No references to rewrite\n');
    const specEntries: SpecEntry[] = [
      { source: 'workflows/**', target: 'commands', exclude: [], processors: [] },
    ];
    const p = makePluginFrame([frame], specEntries);
    const result = pluginRewriteReferences(p);
    expect(result).toBe(p);
  });

  it('skips binary frames', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'hooks/test.js',
      target: 'hooks/test.js',
      isBinary: true,
      target_contents: Buffer.from([0x01]) as unknown as string,
      source: [],
    };
    const specEntries: SpecEntry[] = [
      { source: 'workflows/**', target: 'commands', exclude: [], processors: [] },
    ];
    const p = makePluginFrame([frame], specEntries);
    const result = pluginRewriteReferences(p);
    // frame should not be modified
    expect(result.frames[0]).toBe(frame);
  });

  it('skips null-content frames', () => {
    const frame = makeFrame('rules/dropped.md', null as unknown as string);
    const f2 = { ...frame, target_contents: null };
    const specEntries: SpecEntry[] = [
      { source: 'workflows/**', target: 'commands', exclude: [], processors: [] },
    ];
    const p = makePluginFrame([f2], specEntries);
    const result = pluginRewriteReferences(p);
    expect(result).toBe(p);
  });
});

describe('buildFolderPairs', () => {
  it('produces workflows→commands pair', () => {
    const spec: any = {
      baseSubfolder: '',
      specEntries: [
        { source: 'workflows/**', target: 'commands', exclude: [], processors: [] },
      ],
    };
    const pairs = buildFolderPairs(spec);
    expect(pairs).toContainEqual(['workflows/', 'commands/']);
  });

  it('no pair when target matches source name', () => {
    const spec: any = {
      baseSubfolder: '',
      specEntries: [
        { source: 'workflows/**', target: 'workflows', exclude: [], processors: [] },
      ],
    };
    const pairs = buildFolderPairs(spec);
    // Should not produce workflows→workflows pair
    expect(pairs.some(([f, t]) => f === 'workflows/' && t === 'workflows/')).toBe(false);
  });

  it('produces extension rewrite sentinel for md-to-mdc', () => {
    const spec: any = {
      baseSubfolder: '',
      specEntries: [
        {
          source: 'rules/**',
          target: 'rules',
          exclude: [],
          processors: [],
          extensionRewrites: ['md-to-mdc'],
        },
      ],
    };
    const pairs = buildFolderPairs(spec);
    const sentinel = pairs.find(([f]) => f.includes('__MD_TO_MDC__'));
    expect(sentinel).toBeDefined();
  });
});
