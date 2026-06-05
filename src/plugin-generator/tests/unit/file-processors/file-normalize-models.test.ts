// FR-ARCH-0046 — fileNormalizeModels: Claude scan-for-first-claude; Codex gpt+effort; Cursor/Copilot first-overall
import { describe, it, expect } from 'vitest';
import { fileNormalizeModels } from '../../../src/file-processors/file-normalize-models.js';
import type { FileProcessingFrame, TargetContext, PluginSpec, Vfs } from '../../../src/types.js';

function makeCtx(kind: 'claude' | 'cursor' | 'copilot' | 'codex'): TargetContext {
  return {
    spec: {
      name: `core-${kind}`,
      modelVocabulary: { kind, map: {} },
    } as unknown as PluginSpec,
    vfs: [] as unknown as Vfs,
    release: { name: 'r2', deterministicHooks: false, displayName: 'R2' },
    repoRoot: '',
  };
}

function makeFrame(content: string): FileProcessingFrame {
  return {
    sourcePath: 'rules/test.md',
    target: 'rules/test.md',
    isBinary: false,
    target_contents: content,
    source: [],
  };
}

describe('fileNormalizeModels — claude', () => {
  it('scans for first claude-compatible token (not first overall)', () => {
    // gpt-5.5 is first, claude-4.8-opus-high is second — claude should pick second
    const content = '---\nname: test\nmodel: gpt-5.5-high, claude-4.8-opus-high\n---\n\n# Body\n';
    const result = fileNormalizeModels(makeFrame(content), makeCtx('claude'));
    expect(result.target_contents as string).toContain('model: opus');
  });

  it('maps claude-4.8-opus-high to opus', () => {
    const content = '---\nmodel: claude-4.8-opus-high, gpt-5.5-high\n---\n\n# Body\n';
    const result = fileNormalizeModels(makeFrame(content), makeCtx('claude'));
    expect(result.target_contents as string).toContain('model: opus');
  });

  it('maps token containing sonnet to sonnet', () => {
    const content = '---\nmodel: gpt-5.4-medium, claude-4.6-sonnet\n---\n\n# Body\n';
    const result = fileNormalizeModels(makeFrame(content), makeCtx('claude'));
    expect(result.target_contents as string).toContain('model: sonnet');
  });

  it('returns frame unchanged when no claude-compatible model', () => {
    const content = '---\nmodel: gpt-5.5-high\n---\n\n# Body\n';
    const frame = makeFrame(content);
    const result = fileNormalizeModels(frame, makeCtx('claude'));
    expect(result).toBe(frame);
  });

  it('returns frame unchanged when no model field', () => {
    const content = '---\nname: test\n---\n\n# Body\n';
    const frame = makeFrame(content);
    const result = fileNormalizeModels(frame, makeCtx('claude'));
    expect(result).toBe(frame);
  });
});

describe('fileNormalizeModels — codex', () => {
  it('extracts first gpt-* token with effort', () => {
    const content = '---\nmodel: claude-4.8-opus-high, gpt-5.5-high\n---\n\n# Body\n';
    const result = fileNormalizeModels(makeFrame(content), makeCtx('codex'));
    expect(result.target_contents as string).toContain('model: gpt-5.5');
    expect(result.target_contents as string).toContain('model_reasoning_effort: high');
  });

  it('strips model line when no gpt-* token', () => {
    const content = '---\nname: test\nmodel: claude-4.8-opus-high\n---\n\n# Body\n';
    const result = fileNormalizeModels(makeFrame(content), makeCtx('codex'));
    // model line should be stripped
    expect(result.target_contents as string).not.toContain('model: claude');
  });

  it('gpt-first agent: scans for gpt and splits effort', () => {
    const content = '---\nmodel: gpt-5.5-high, gemini-3.1\n---\n\n# Body\n';
    const result = fileNormalizeModels(makeFrame(content), makeCtx('codex'));
    expect(result.target_contents as string).toContain('model: gpt-5.5');
    expect(result.target_contents as string).toContain('model_reasoning_effort: high');
  });
});

describe('fileNormalizeModels — cursor', () => {
  it('uses first model overall', () => {
    const content = '---\nmodel: claude-4.8-opus-high, gpt-5.5-high\n---\n\n# Body\n';
    const result = fileNormalizeModels(makeFrame(content), makeCtx('cursor'));
    // First token is claude-4.8-opus-high → maps to claude-opus-4-6
    expect(result.target_contents as string).toContain('model: claude-opus-4-6');
  });
});

describe('fileNormalizeModels — copilot', () => {
  it('uses first model overall and maps to display name', () => {
    const content = '---\nmodel: claude-4.8-opus-high, gpt-5.5-high\n---\n\n# Body\n';
    const result = fileNormalizeModels(makeFrame(content), makeCtx('copilot'));
    // claude-4.8-opus-high → "Claude Opus 4.6"
    expect(result.target_contents as string).toContain('model: Claude Opus 4.6');
  });
});

describe('fileNormalizeModels — edge cases', () => {
  it('returns unchanged frame when content is binary', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'test.png',
      target: 'test.png',
      isBinary: true,
      target_contents: Buffer.from([0x01]) as unknown as string,
      source: [],
    };
    expect(fileNormalizeModels(frame, makeCtx('claude'))).toBe(frame);
  });

  it('returns unchanged frame when target_contents is null', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'test.md',
      target: 'test.md',
      isBinary: false,
      target_contents: null,
      source: [],
    };
    expect(fileNormalizeModels(frame, makeCtx('claude'))).toBe(frame);
  });

  it('does not rewrite model: in document body', () => {
    // model: in body should be untouched
    const content = '---\nname: test\n---\n\nSomebody model: gpt-5.5\n';
    const frame = makeFrame(content);
    const result = fileNormalizeModels(frame, makeCtx('claude'));
    expect(result).toBe(frame); // no change since no model in frontmatter
  });

  it('default branch: unknown vocabulary kind returns frame unchanged', () => {
    // Hits the `default: return frame` branch for unknown vocabulary kinds
    const content = '---\nmodel: gpt-5.5\n---\n\n# Body\n';
    const frame = makeFrame(content);
    const ctx: TargetContext = {
      spec: {
        name: 'core-unknown',
        modelVocabulary: { kind: 'unknown' as any, map: {} },
      } as unknown as PluginSpec,
      vfs: [] as unknown as Vfs,
      release: { name: 'r2', deterministicHooks: false, displayName: 'R2' },
      repoRoot: '',
    };
    const result = fileNormalizeModels(frame, ctx);
    expect(result).toBe(frame);
  });
});
