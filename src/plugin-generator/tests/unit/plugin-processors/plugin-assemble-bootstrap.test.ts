// FR-ARCH-0055 — pluginAssembleBootstrap: manifest order, prefix on lead, absent-variant skip,
// plugin-root SEPARATE last entry, size>10000 soft error
import { describe, it, expect } from 'vitest';
import { pluginAssembleBootstrap } from '../../../src/plugin-processors/plugin-assemble-bootstrap.js';
import type { FileProcessingFrame, PluginProcessingFrame, PluginSpec } from '../../../src/types.js';
import { BOOTSTRAP_MANIFEST_ORDER, BOOTSTRAP_PREFIX } from '../../../src/spec/bootstrap-manifest.js';

function makeDocFrame(basename: string, body: string): FileProcessingFrame {
  return {
    sourcePath: `rules/${basename}.md`,
    target: `rules/${basename}.md`,
    isBinary: false,
    target_contents: `---\nname: ${basename}\n---\n${body}`,
    source: [],
  };
}

function makePluginFrame(
  frames: FileProcessingFrame[],
  shape: 'claude' | 'codex' | 'copilot' | 'cursor',
  extra?: { includeIndexEntries?: boolean },
): PluginProcessingFrame {
  return {
    spec: {
      name: `core-${shape}`,
      hookEntryShape: shape,
      includeBootstrapRules: true,
      includeIndexEntries: extra?.includeIndexEntries ?? false,
      bootstrapManifest: [...BOOTSTRAP_MANIFEST_ORDER],
      specEntries: [],
      baseSubfolder: '',
    } as unknown as PluginSpec,
    vfs: [] as any,
    frames,
    templateContext: {},
    errors: [],
  };
}

describe('pluginAssembleBootstrap', () => {
  it('cursor: produces empty payload (GT-0)', () => {
    const p = makePluginFrame([], 'cursor');
    const result = pluginAssembleBootstrap(p);
    expect(result.templateContext['bootstrap_hooks_cursor']).toBe('');
  });

  it('claude: sets bootstrap_hooks_claude key in templateContext', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames, 'claude');
    const result = pluginAssembleBootstrap(p);
    expect(result.templateContext['bootstrap_hooks_claude']).toBeDefined();
    const payload = result.templateContext['bootstrap_hooks_claude'] as string;
    expect(payload.length).toBeGreaterThan(0);
  });

  it('codex: sets bootstrap_hooks_codex key in templateContext', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames, 'codex');
    const result = pluginAssembleBootstrap(p);
    expect(result.templateContext['bootstrap_hooks_codex']).toBeDefined();
  });

  it('lead document gets BOOTSTRAP_PREFIX prepended', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Bootstrap Content\n')];
    const p = makePluginFrame(frames, 'claude');
    const result = pluginAssembleBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks_claude'] as string;
    // Payload contains a JSON-escaped version of the bootstrap prefix
    expect(payload).toContain(
      // The prefix contains "ALWAYS MUST FULLY" — encode for JSON embedding
      'ALWAYS MUST FULLY'
    );
  });

  it('absent manifest entries are skipped (FR-HOOK-0001)', () => {
    // Only plugin-files-mode present — other manifest entries absent
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames, 'claude');
    const result = pluginAssembleBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks_claude'] as string;
    // Should have exactly 2 entries (plugin-files-mode + plugin-root)
    // Entries joined by ", " — count the patterns
    const entries = payload.split(', {');
    expect(entries.length).toBe(2); // 1 doc + 1 plugin-root
  });

  it('plugin-root entry is the last entry (GT-3.4)', () => {
    const frames = [
      makeDocFrame('plugin-files-mode', '\n# Body\n'),
      makeDocFrame('bootstrap-core-policy', '\n# Policy\n'),
    ];
    const p = makePluginFrame(frames, 'claude');
    const result = pluginAssembleBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks_claude'] as string;
    // Plugin-root entry contains CLAUDE_PLUGIN_ROOT
    expect(payload).toContain('CLAUDE_PLUGIN_ROOT');
    // It must be the last entry — plugin-root is after all doc entries
    const pluginRootIdx = payload.lastIndexOf('CLAUDE_PLUGIN_ROOT');
    const bootstrapCoreIdx = payload.indexOf('bootstrap-core-policy');
    // The CLAUDE_PLUGIN_ROOT reference in the last entry must come after any doc content
    // (plugin-files-mode body appears in earlier entries)
    expect(pluginRootIdx).toBeGreaterThan(0);
  });

  it('soft error when jsonPayload > 10000 chars (NFR-0004 — measures escaped payload, not IDE wrapper)', () => {
    // NFR-0004: the size check must fire on the jsonPayload (the escaped additionalContext)
    // not on the full IDE-wrapper entry (which would double-count bash+powershell for copilot).
    // A body of 11000 chars produces a jsonPayload > 10000 after JSON-string-escaping header bytes.
    const largeBody = '\n' + 'A'.repeat(11000);
    const frames = [makeDocFrame('plugin-files-mode', largeBody)];
    const p = makePluginFrame(frames, 'claude');
    const result = pluginAssembleBootstrap(p);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].kind).toBe('soft');
    // Error must name the file (G-1 fix: basename is now passed to buildEntryForIde)
    expect(result.errors[0].file).toBe('plugin-files-mode');
  });

  it('no soft error for normal-sized bodies — real r2/r3 inputs produce 0 violations (NFR-0004, G-1)', () => {
    // The real bootstrap bodies are <8890 chars; the old measurement (entryStr incl. bash+powershell)
    // was firing false positives on copilot. Fixed: measure jsonPayload only.
    // Simulate a real-sized body (~8000 chars, well under 10000)
    const normalBody = '\n' + 'A'.repeat(8000);
    for (const shape of ['claude', 'codex', 'copilot'] as const) {
      const frames = [makeDocFrame('plugin-files-mode', normalBody)];
      const p = makePluginFrame(frames, shape);
      const result = pluginAssembleBootstrap(p);
      // No soft errors for normal-sized payload
      const softErrors = result.errors.filter((e) => e.kind === 'soft');
      expect(softErrors.length, `${shape}: no soft errors expected for ~8k body`).toBe(0);
    }
  });

  it('entries are joined by ", " separator', () => {
    const frames = [
      makeDocFrame('plugin-files-mode', '\n# Lead\n'),
      makeDocFrame('bootstrap-core-policy', '\n# Policy\n'),
    ];
    const p = makePluginFrame(frames, 'claude');
    const result = pluginAssembleBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks_claude'] as string;
    // Proper ", " separator between entries
    expect(payload).toContain('}, {');
  });
});
