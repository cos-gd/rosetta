<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# Plugin Generator — Tech Specifications (Target State)

## Compliance Refactor (2026-06-10)

**Status:** Approved for implementation. **Requirements:** FR-ARCH-0005, DATA-CFG-0002, FR-ARCH-0004, FR-HOOK-0004.
**Companion plan:** `plugin-generator-PLAN.md` compliance refactor section (HOW).

### Overview
Three tasks to eliminate architecture violations found in requirements audit:
- **Task A** (SMALL): Delete dead `includeBootstrapRules` field
- **Task B** (SMALL): Delete `createHookFolderInR2` bespoke flag
- **Task C** (MEDIUM): Eliminate IDE-name switch dispatch — main architectural refactor per FR-ARCH-0005

### Task A — Delete `includeBootstrapRules` (FR-HOOK-0004 / dead field) — **APPROVED**

**What changes:**
- Remove `includeBootstrapRules: boolean` from `PluginSpec` in `src/types.ts` (~line 92)
- Remove 6 `includeBootstrapRules: true/false` assignments in `src/spec/targets.ts`
- No behavior change: field was never read by any processor (confirmed by grep — 0 read sites)

**Acceptance:** `tsc --noEmit` clean; no test references to field.

### Task B — Delete `createHookFolderInR2` (DATA-CFG-0002 / FR-ARCH-0004) — **APPROVED**

**What changes:**
- Remove `createHookFolderInR2?: boolean` from `PluginSpec` in `src/types.ts` (~line 124)
- Remove 6 assignments in `src/spec/targets.ts` (claude:true, cursor:true, copilot:true, codex:false, cursor-standalone:true, copilot-standalone:true)
- Remove `if (spec.createHookFolderInR2) { fs.mkdirSync(hookFolder, ...) }` branch in `src/plugin-processors/plugin-sync-bundles.ts` (~lines 84–98)

**Accepted consequence:** r2 `core-cursor-standalone/.cursor/hooks/` empty directory is no longer created. This is an accepted old-gen artifact (Session Context decision 2026-06-09: "empty folder has no functional value — nothing references the dir; empty = absent").

**Parity impact:** r2 diff count may decrease by 0 (empty dir is not tracked in file-diff). This is correct.

**Acceptance:** `tsc --noEmit` clean; parity diff counts unchanged (empty dirs not tracked).

### Task C — Eliminate IDE-name switch dispatch (FR-ARCH-0005) — **NOT APPROVED — DEFERRED**

> Owner decision (2026-06-10): Analysis marked as too shallow. Task C is deferred. No implementation. Return to this task in a future session with deeper analysis before re-submitting for approval.

**Two sub-problems:**

#### C1 — Replace `file-normalize-models.ts` switch

**Removed:**
- `file-normalize-models.ts`: the entire `switch (vocabulary.kind)` block; the file is refactored to export only shared types/helpers
- `ModelVocabulary` interface fields `kind` and `map` from `src/types.ts`
- `modelVocabulary` field from `PluginSpec` in `src/types.ts`
- `ModelVocabulary.kind` assignments from `*_VOCABULARY` constants in `src/file-processors/model-maps.ts`

**Added (4 per-vocabulary processor files in `src/file-processors/`):**

| File | Exports | Behavior |
|---|---|---|
| `file-normalize-models-claude.ts` | `fileNormalizeModelsClaude(): FileProcessor` | Scans for first claude-compatible token; maps to sonnet/opus/haiku/inherit via CLAUDE_MODEL_MAP |
| `file-normalize-models-cursor.ts` | `fileNormalizeModelsCursor(): FileProcessor` | Takes first token; maps via CURSOR_CLAUDE_MAP |
| `file-normalize-models-copilot.ts` | `fileNormalizeModelsCopilot(): FileProcessor` | Takes first token; maps to display names via COPILOT_MODEL_MAP |
| `file-normalize-models-codex.ts` | `fileNormalizeModelsCodex(): FileProcessor` | Scans for first gpt-* token; can strip line or split into two YAML fields |

Each is a factory function returning a `FileProcessor`. Each calls shared low-level helpers from `file-normalize-models.ts` (preserved — see below) and `model-maps.ts`. The `CLAUDE_MODEL_MAP`, `CURSOR_CLAUDE_MAP`, `COPILOT_MODEL_MAP`, `CODEX_MODEL_MAP` constants in `model-maps.ts` stay as P2 shared helpers.

**`file-normalize-models.ts` post-refactor — KEEP as shared helper module (do NOT delete):**
The file currently holds the switch + shared frontmatter-parsing setup + two codex-specific helpers. After refactor:
- `removeModelLine(content)` and `rewriteCodexModelFields(content, gptModel, effort)` — move to `file-normalize-models-codex.ts` (codex-specific logic)
- Export shared helpers for all 4 per-vocabulary processors:
  - `extractFrontmatterModelField(frame: FileProcessingFrame, content: string): string | null` — runs the common guard checks (isBinary, target_contents null, no frontmatter, no model field) and returns `modelField` string or null
  - `applyNormalizedModel(frame: FileProcessingFrame, content: string, normalized: string): FileProcessingFrame` — applies `rewriteModelLine` + updates `source[0].frontmatter.model` (the common update block used by claude, cursor, copilot)
- The main `fileNormalizeModels` export is REMOVED (replaced by the 4 per-vocabulary exports)
- File becomes a shared-helpers module (~30 lines), not dead/empty

**`targets.ts` wiring for C1:**
- core-claude pipeline: replace `fileNormalizeModels(claudeVocabulary)` → `fileNormalizeModelsClaude()`
- core-cursor pipeline: replace → `fileNormalizeModelsCursor()`
- core-copilot pipeline: replace → `fileNormalizeModelsCopilot()`
- core-codex pipeline: replace → `fileNormalizeModelsCodex()`
- core-cursor-standalone pipeline: replace → `fileNormalizeModelsCursor()`
- core-copilot-standalone pipeline: replace → `fileNormalizeModelsCopilot()`

#### C2 — Replace `bootstrap/payload.ts` + `plugin-assemble-bootstrap.ts` switch

**Removed:**
- `switch (shape)` in `buildEntryForIde()` and `buildPluginRootEntry()` in `bootstrap/payload.ts`
- `hookEntryShape` field read from `spec` in `bootstrap/payload.ts` and `plugin-assemble-bootstrap.ts`
- `hookEntryShape: HookEntryShape` from `PluginSpec` in `src/types.ts`
- Backtick interpolation `` `bootstrap_hooks_${shape}` `` in `plugin-assemble-bootstrap.ts`

**Refactored — `bootstrap/payload.ts`:**
```typescript
export type EntryBuilderFn = (jsonPayload: string, lockIndex: number, targetName: string, errors: GenError[], basename: string) => string | null;
// lockIndex deliberately excluded: none of the three root entry builders use it
export type RootEntryBuilderFn = (folderPairs: Array<[string, string]>) => string | null;

export function assembleBootstrapPayload(
  p: PluginProcessingFrame,
  buildEntry: EntryBuilderFn,
  buildRoot: RootEntryBuilderFn,
): { payload: string; errors: GenError[] }

// P2 shared low-level helpers (exported):
export function buildClaudeEntry(jsonPayload: string, lockIndex: number, targetName: string, errors: GenError[], basename: string): string | null
export function buildCodexEntry(jsonPayload: string, lockIndex: number, targetName: string, errors: GenError[], basename: string): string | null
export function buildCopilotEntry(jsonPayload: string, lockIndex: number, targetName: string, errors: GenError[], basename: string): string | null
// RootEntryBuilderFn uses only folderPairs (no lockIndex — none of the builders need it)
export function buildClaudeRootEntry(folderPairs: Array<[string, string]>): string | null
export function buildCodexRootEntry(folderPairs: Array<[string, string]>): string | null
export function buildCopilotRootEntry(folderPairs: Array<[string, string]>): string | null
```

**Refactored — `plugin-assemble-bootstrap.ts` (generic factory, P0):**
```typescript
export function pluginAssembleBootstrap(
  buildEntry: EntryBuilderFn,
  buildRoot: RootEntryBuilderFn,
  contextKey: string,
): PluginProcessor
```
No IDE name, no identity field read. The `contextKey` is the template context key to set (e.g. `'bootstrap_hooks_claude'`).

**Added — 3 thin P1 processor files in `src/plugin-processors/`:**

| File | Export | Value |
|---|---|---|
| `plugin-bootstrap-entry-claude.ts` | `pluginBootstrapEntryClaude` | `pluginAssembleBootstrap(buildClaudeEntry, buildClaudeRootEntry, 'bootstrap_hooks_claude')` |
| `plugin-bootstrap-entry-codex.ts` | `pluginBootstrapEntryCodex` | `pluginAssembleBootstrap(buildCodexEntry, buildCodexRootEntry, 'bootstrap_hooks_codex')` |
| `plugin-bootstrap-entry-copilot.ts` | `pluginBootstrapEntryCopilot` | `pluginAssembleBootstrap(buildCopilotEntry, buildCopilotRootEntry, 'bootstrap_hooks_copilot')` |

Cursor targets get NO bootstrap processor — cursor templates have no `{{{bootstrap_hooks_cursor}}}` placeholder.

**`targets.ts` wiring for C2:**
- core-claude pipeline: replace `pluginAssembleBootstrap` → `pluginBootstrapEntryClaude`
- core-cursor pipeline: REMOVE bootstrap processor entirely
- core-copilot pipeline: replace → `pluginBootstrapEntryCopilot`
- core-codex pipeline: replace → `pluginBootstrapEntryCodex`
- core-cursor-standalone pipeline: REMOVE bootstrap processor (cursor family)
- core-copilot-standalone pipeline: replace → `pluginBootstrapEntryCopilot` (copilot family)

### Types.ts net changes summary

| Field | Action | Reason |
|---|---|---|
| `PluginSpec.includeBootstrapRules` | DELETE | Dead field, never read |
| `PluginSpec.hookEntryShape` | DELETE | Identity-discriminant, forbidden by FR-ARCH-0005 |
| `PluginSpec.modelVocabulary` | DELETE | Replaced by per-vocabulary processors |
| `PluginSpec.createHookFolderInR2` | DELETE | Bespoke per-release flag, forbidden by DATA-CFG-0002 |
| `ModelVocabulary.kind` | DELETE | Identity field, never needed post-refactor |
| `ModelVocabulary.map` | DELETE | Never read at runtime (only set, never consumed) |
| `ModelVocabulary` interface | DELETE (if empty after above) | Nothing left |
| `EntryBuilderFn` | ADD | Builder function type for bootstrap assembly |
| `RootEntryBuilderFn` | ADD | Root entry builder function type |

### Parity guarantee
All behavioral logic is preserved — only dispatch mechanism changes from runtime switch to compile-time parameter binding. Byte output is identical. Expected: r2 diff count ≤ 12, r3 diff count ≤ 22, same accepted buckets.

### Test impact
- `plugin-assemble-bootstrap.test.ts` — update: `pluginAssembleBootstrap` now factory; pass builder functions in tests
- `file-normalize-models.test.ts` — split or update to test 4 per-vocabulary processors
- New tests for 3 `plugin-bootstrap-entry-*.ts` files (thin — mostly verify correct contextKey and builder wiring)
- All 304 existing tests must still pass

**Status:** Authoritative. **Date:** 2026-06-04. **Audience:** implementing engineers.
**Parity oracle:** empty recursive byte-diff vs `agents/TEMP/old-gen-r2/` and `agents/TEMP/old-gen-r3/` (domain=core) — NFR-0001.
**Companion plan:** `plugin-generator-PLAN.md` (HOW/sequencing). This file = WHAT (architecture, contracts, data, tests).
**Prohibited reads (NEVER):** `scripts/plugin_generator.py`, `specs/plugin-generator.allium`. Ground truth = `docs/requirements/plugin-generator/*` + baseline outputs (DATA).

## TLDR

- Re-implement the Rosetta plugin generator as a TypeScript ESM tool under `src/plugin-generator/`, run via `npx`, producing **byte-for-byte identical** output to the Python generator for r2 and r3.
- Architecture = FR-ARCH two-tier pure pipeline: immutable flat **VFS** → `FileProcessor`s over `FileProcessingFrame` (path-only renames), `PluginProcessor`s over `PluginProcessingFrame` (content-only ref rewrite, indexes, bootstrap, render, write). Structural sharing via `immer`.
- Six targets, one `PluginSpec` shape, all values in `spec/*.ts`. Every per-IDE adaptation is data + processor composition (no bespoke procedures).
- **#1 parity hazard:** byte-exact bootstrap-payload JSON + shell/PowerShell escaping inside Handlebars `{{{raw}}}`; **#2:** `{{#if}}` whitespace (r2 must render with no leftover blank lines); **#3:** generator-owned JSON/TOML/Markdown serialization.
- Contradiction resolutions (baseline wins): Claude scans for first **claude-compatible** model (not first overall); copilot has **3** hooks.json (plugin-form ×2 identical + standalone-form); codex hooks.json mirrored to `.codex/hooks.json`.
- Deliverables verified against baseline: claude/codex/copilot **r2=9 bootstrap entries / r3=8** = (present manifest docs) + **1 separate appended plugin-root entry** (FR-HOOK-0007 — NOT folded in; see GROUND-TRUTH.md GT-0/GT-3.4); cursor emits **no** bootstrap payload; standalone manifest `{name,version}` 2-space + trailing `\n`; TOML field order fixed; r3 ships 5 `.js` bundles per target. **Authoritative byte-level facts: `plans/plugin-generator/GROUND-TRUTH.md` (decoded from baseline; wins over this file on any conflict).**

## 1. Scope & Non-Functional Constraints

In scope (FR-CLI/COPY/GEN/HOOK/VAR, MODEL, NFR): resolve instruction source (release+domain), seed preserved files, generate all six targets uniformly, write to output dir. Out of scope (SCOPE.md): authoring instruction content, building hook bundles (consumed from `hooks/dist/bundles/`), pre-commit orchestration, publishing/installing.

| NFR | Constraint |
|---|---|
| NFR-0001 | Byte parity vs baseline for r2+r3, domain=core. Generator owns all serialization. |
| NFR-0002 | Deterministic: stable lexicographic sort (match Python `sorted()`), no timestamps/random. |
| NFR-0003 | Idempotent: wipe (`pluginCleanup`) + re-seed (`pluginCopy`) every run; clean-dir generation works. |
| NFR-0004 | Bootstrap entry > 10000 chars (after escaping) → soft error: report target+file, still emit, exit ≠ 0. |
| NFR-0005 | Valid JSON (hooks/manifests), TOML (codex). |
| NFR-0006 | Engine has no per-release/per-content branching; releases/domains are data. |
| NFR-0007 | Modular SRP: file-processors / plugin-processors / escaping / model-maps / orchestration separate. |
| NFR-0008 | Node ≥ 22 (repo runs v26), ESM, TS 6.x, no consumer build step (run via `npx`/`tsx`). |
| NFR-0009 | Copilot hooks carry both bash + PowerShell forms. |
| NFR-0010/0011 | Pinned, maintained libs matching rosettify (see §9). |
| Encoding | UTF-8, **LF only**. Always write with explicit `\n`; never let any lib emit CRLF (PARITY-6). |

## 2. Module Decomposition (`src/plugin-generator/`)

ESM, `"type":"module"`, run via `npx` (bin shim + `tsx`/compiled `dist`). Proposed layout (NFR-0007 SRP):

```
src/plugin-generator/
  package.json                 # bin: rosetta-plugin-gen; deps §9; "type":"module"
  tsconfig.json                # extends rosettify config (ES2024, NodeNext, strict)
  plugins/<target>/...         # PRESERVED SOURCE (committed; DATA-CFG-0005) — already present
  src/
    cli.ts                     # commander wiring, flag parsing, exit-status aggregation (FR-CLI-*)
    index.ts                   # exported generate() callable (FR-CLI-0002), bin entry
    generate.ts                # orchestration: resolve → build VFS → per-target pipeline run
    types.ts                   # all PascalCase domain types (FR-ARCH-0003)
    vfs/
      build-vfs.ts             # filesystem+directive → VirtualFile[] (FR-ARCH-0010/0011/0012)
      directives.ts            # FilenameDirective parse/validate (FR-ARCH-0020–0024)
      source-resolver.ts       # release+domain resolution & layer bundling (FR-CLI-0030/0031)
      sort.ts                  # stable lexicographic comparator (NFR-0002, PARITY-5)
    frames.ts                  # FileProcessingFrame / PluginProcessingFrame factories (immer)
    file-processors/
      file-read.ts             # fileRead (sole content ingress) (FR-ARCH-0040)
      file-apply-overrides.ts  # fileApplyOverrides (FR-ARCH-0041)
      file-bundle.ts           # fileBundle (concat, no markup) (FR-ARCH-0042)
      file-normalize-models.ts # fileNormalizeModels (FR-ARCH-0046, FR-COPY-0020–0022)
      file-rename.ts           # fileRename (path-only, full-anchored) (FR-ARCH-0043)
      file-codex-agent.ts      # fileCodexAgentFormat → TOML (FR-ARCH-0044, FR-VAR-0040)
    plugin-processors/
      plugin-cleanup.ts        # wipe+mkdir (FR-ARCH-0052)
      plugin-copy.ts           # seed preserved files (FR-ARCH-0053, FR-SEED-0001/0002)
      plugin-process-spec-entries.ts  # glob→frames→file pipeline (FR-ARCH-0054)
      plugin-rewrite-references.ts    # content-only ref rewrite via frame lookup (FR-ARCH-0049)
      plugin-generate-indexes.ts      # INDEX.md from final paths (FR-ARCH-0047, FR-GEN-*)
      plugin-inject-sections.ts       # standalone injection (FR-ARCH-0051, FR-VAR-0072)
      plugin-assemble-bootstrap.ts    # bootstrap payload assembly (FR-ARCH-0055, FR-HOOK-*)
      plugin-render-templates.ts      # handlebars render (FR-ARCH-0048, FR-GEN-0010/0011)
      plugin-sync-bundles.ts          # r3 .js bundle sync (FR-HOOK-0020–0022)
      plugin-write.ts          # sole egress + dry-run (FR-ARCH-0045, FR-CLI-0050)
    serialize/
      json.ts                  # byte-exact JSON emitter (key order/2-space/no trailing space)
      toml.ts                  # byte-exact codex TOML emitter (PARITY-3)
      markdown-index.ts        # byte-exact INDEX.md emitter (PARITY-2)
      frontmatter.ts           # gray-matter read + byte-exact re-emit of model line
    escaping/
      shell.ts                 # bash single-quote escaping ('\'') (PARITY-4)
      powershell.ts            # pwsh escaping (NFR-0009)
      json-string.ts           # JSON string escaping for additionalContext payload (PARITY-1)
    bootstrap/
      payload.ts               # build additionalContext object, prefix, plugin-root entry
      copilot-lock.ts          # per-entry bash/pwsh session-lock wrapper (FR-HOOK-0006, QF-3)
    spec/
      releases.ts              # DATA-CFG-0001 release descriptors (r2/r3 template vars)
      model-maps.ts            # DATA-CFG-0004 vocabularies + normalization fns
      targets.ts               # the six PluginSpec values (DATA-CFG-0002/0003)
      bootstrap-manifest.ts    # FR-HOOK-0009 ordered manifest + prefix text
    logging.ts                 # pino logger, no-content rule, verbose expansion (FR-ARCH-0050)
  tests/                       # vitest unit + e2e (see §8)
```

## 3. Core Type Contracts (`types.ts`)

PascalCase types; camelCase processor factories with `file`/`plugin` tier prefix (FR-ARCH-0003). No bare `item/data/spec/frame` identifiers as standalone names.

```ts
interface SourceFile { origin: string; frontmatter?: Frontmatter; order: string; conditions: Set<DirectiveToken>; }
interface VirtualFile { path: string; sourceFiles: SourceFile[]; }                 // FR-ARCH-0010
type Vfs = readonly VirtualFile[];                                                 // immutable, sorted (FR-ARCH-0012/0013)

interface FileProcessingFrame {                                                    // FR-ARCH-0030
  sourcePath: string; target: string; isBinary: boolean;
  target_contents: string | Buffer | null;   // null=drop, ''=empty file, else content (FR-ARCH-0036)
  source: SourceFile[];                       // structurally-shared working copy
}
interface PluginProcessingFrame {                                                  // FR-ARCH-0039
  spec: PluginSpec; vfs: Vfs;
  frames: FileProcessingFrame[];
  templateContext: Record<string, unknown>;   // release vars + bootstrap placeholders
  errors: GenError[];                          // accumulated for run-to-completion (FR-CLI-0041)
}
type FileProcessor   = (f: FileProcessingFrame, ctx: TargetContext) => FileProcessingFrame;     // pure
type PluginProcessor = (p: PluginProcessingFrame) => PluginProcessingFrame;                     // pure

interface SpecEntry { source: string; target: string; exclude: string[]; processors: FileProcessor[]; }  // FR-ARCH-0002
interface PluginSpec {                                                              // FR-ARCH-0001, DATA-CFG-0002
  name: string;                                // e.g. "core-claude"
  destination: string;                         // output folder name == name
  baseSubfolder: string;                       // "" | ".cursor" | ".github" | ".agents"-style root for standalones/codex
  preservedSource: string;                     // src/plugin-generator/plugins/<parent>/  (FR-SEED-0001/0002)
  modelVocabulary: ModelVocabulary;            // DATA-CFG-0004
  bootstrapManifest: BootstrapEntryRef[];      // FR-HOOK-0009 ordered
  includeBootstrapRules: boolean; includeIndexEntries: boolean;  // FR-HOOK-0004
  bootstrapStrategy: 'session-hooks' | 'native-rules' | 'auto-instructions';       // FR-VAR-0070
  hookEntryShape: 'claude' | 'copilot' | 'codex' | 'cursor';                       // FR-HOOK-0005 escaping family
  pluginRootPath: string;                      // reported to agent (FR-HOOK-0007)
  indexes: IndexDecl[];                        // folder, requiredTag?, heading rule (FR-GEN-*)
  injections: InjectionDecl[];                 // host frame path, anchor, sections (FR-ARCH-0051)
  specEntries: SpecEntry[];
  pluginProcessors: PluginProcessor[];         // declared pipeline order (§5)
  manifestOverride?: { name: string; version: 'parent' };  // standalones (FR-VAR-0060)
}
interface ModelVocabulary { kind: 'claude'|'cursor'|'copilot'|'codex'; map: Record<string,string>; }
```

**Immutability (FR-ARCH-0014/0031):** every processor returns input **unchanged** when nothing changes, else an `immer.produce` result sharing all unchanged sub-objects. VFS frozen after build (`Object.freeze` deep or immer-frozen).

## 4. CLI Contract (`cli.ts`, FR-CLI-*)

`npx rosetta-plugin-gen [flags]` via `commander`:

| Flag | Default | Req | Behavior |
|---|---|---|---|
| `--release <r>` | `r2` | FR-CLI-0010/0011 | Unknown → stderr lists known releases, exit 1, no output. |
| `--domain <list>` | `core` | FR-CLI-0030/0031 | Comma list, left→right **bundle** (concat same-path, FR-ARCH-0042). Missing folder → exit 1. |
| `--repo-root <dir>` | containing repo | FR-CLI-0020 | All paths relative to it. |
| `--output-dir <dir>` | `<repo-root>/plugins` | FR-CLI-0021 | Per-target folder created under it. |
| `--dry-run` | off | FR-CLI-0050 | Emit full path+contents per frame, write nothing. |
| `--verbose` | off | FR-CLI-0051 | Per-VirtualFile/per-processor detail (pino). |
| unknown arg | — | FR-CLI-0001 | Usage + exit 1. |
| `--help` | — | FR-CLI-0060 | Documents source structure, directive/bundling, processor catalog, spec model. |

- **Exported callable** `generate({repoRoot, release, domain, outputDir, dryRun}): Promise<number>` (FR-CLI-0002), returns exit code.
- **Run-to-completion (FR-CLI-0041):** recoverable errors accumulate on `PluginProcessingFrame.errors`; run all 6 targets regardless; exit 1 if any error/limit violation, else 0. Errors/warnings → stderr; progress → stdout (FR-CLI-0042).
- **stdout/log parity:** NOT a parity target — parity is FILES only (NFR-0001). Progress lines are free-form; do not gate parity on stdout. Keep them human-readable.

## 5. Pipeline (FR-ARCH-0032/0052–0055)

Targets processed independently, no ordering, no derive-from-another (FR-CLI-0040, AC-1). Per target, `pluginProcessors` run in declared order:

```
pluginCleanup → pluginCopy → pluginProcessSpecEntries → pluginRewriteReferences
  → pluginGenerateIndexes → pluginInjectSections → pluginAssembleBootstrap
  → pluginRenderTemplates → pluginSyncBundles → pluginWrite
```

`pluginProcessSpecEntries` (FR-ARCH-0054): for each `SpecEntry` in order → glob `source` over VFS → skip `exclude` paths (no frame) → frame `target = join(entry.target, fileName)` → run `entry.processors` in order → collect into `frames`. Within: entry-by-entry, file-by-file, processor-by-processor.

**FileProcessor catalog (signatures, §3):**
- `fileRead` (FR-ARCH-0040): sole ingress; text → gray-matter split (frontmatter/body), malformed FM → error naming file, no FM → log+proceed; binary → bytes + `isBinary`.
- `fileApplyOverrides` (FR-ARCH-0041): drop `SourceFile`s by `overwrite`/`<target>-only` mismatch.
- `fileBundle` (FR-ARCH-0042): concat bodies in order, **no delimiters/markup**; binary + >1 SourceFile → error (FR-ARCH-0034).
- `fileNormalizeModels` (FR-ARCH-0046): rewrite frontmatter `model:` per vocabulary (§7); no model → unchanged. Preserve line position/format (re-emit only the value).
- `fileRename(pattern, replacement)` (FR-ARCH-0043): full-anchored regex on plugin-relative path; path-only; non-match → unchanged; never touches `target_contents`.
- `fileCodexAgentFormat(meta)` (FR-ARCH-0044): agent FM+body → codex TOML (§7, serialize/toml).

**PluginProcessor catalog:**
- `pluginCleanup` (FR-ARCH-0052): empty + ensure output dir.
- `pluginCopy` (FR-ARCH-0053/FR-SEED): copy `preservedSource/**` to mirrored output paths; standalones use parent source + minimal manifest (FR-SEED-0002). Skip `.DS_Store`.
- `pluginProcessSpecEntries` (FR-ARCH-0054): above.
- `pluginRewriteReferences` (FR-ARCH-0049/FR-COPY-0032): build lookup from `frames` (sourcePath→targetPath, incl. dropped frames whose path changed) + SpecEntry folder pairs (`<from>/`→`<to>/`); replace only complete boundary-delimited path tokens (FR-ARCH-0037); content-only. Generated content untouched (FR-ARCH-0038). Also applied to bootstrap payload strings, never release vars (FR-HOOK-0008).
- `pluginGenerateIndexes` (FR-ARCH-0047/FR-GEN): per `IndexDecl`, build INDEX.md from final paths; membership/heading per §6; no qualifying members → no index.
- `pluginInjectSections` (FR-ARCH-0051/FR-VAR-0072): insert generated section at anchor in host frame; missing host/anchor → error.
- `pluginAssembleBootstrap` (FR-ARCH-0055/FR-HOOK): §6; writes `templateContext` placeholders.
- `pluginRenderTemplates` (FR-ARCH-0048/FR-GEN-0010): handlebars `.tmpl`→sibling; `{{{raw}}}`, `{{#if deterministic_hooks}}`; missing template → warn+continue.
- `pluginSyncBundles` (FR-HOOK-0020–0022): r3 → copy `hooks/dist/bundles/<target>/*.js` into target hook folder (claude→`hooks/`, codex→`.codex/hooks/`, copilot→`hooks/`, standalones→their hook folder); r2 → remove stale `.js`; preserve unmanaged files (rendered `hooks.json`). Missing bundles when required → error+exit1 (FR-HOOK-0021). Unknown bundle dirs (e.g. `core-windsurf`) ignored (PARITY-15).
- `pluginWrite` (FR-ARCH-0045): sole egress; `null`→no file, else write; dry-run → emit, write nothing.

## 6. Bootstrap Assembly & Index Generation (parity-critical)

### 6.1 Bootstrap manifest (FR-HOOK-0009, `spec/bootstrap-manifest.ts`)
**CORRECTED — see GROUND-TRUTH.md GT-0/GT-2/GT-3.4 (baseline-decoded; authoritative).** Explicit, filesystem-independent order. The payload = the present documents below (each its own entry) **PLUS one separate appended plugin-root entry**. Confirmed entry counts: **claude/codex/copilot r2 = 9, r3 = 8**.
1. `plugin-files-mode` — **designated lead**, gets the fixed bootstrap **prefix** prepended (FR-HOOK-0003).
2. `bootstrap-core-policy`
3. `bootstrap-execution-policy`
4. `bootstrap-hitl-questioning` (**r2 only**; r3 has a different bootstrap-* set — engine is content-agnostic NFR-0006, includes whatever `bootstrap-*`/`plugin-files-mode` docs are present)
5. `bootstrap-guardrails`
6. `bootstrap-rosetta-files`
7. rules INDEX (`# Rosetta Rules Index`)
8. workflows INDEX (`# Rosetta Workflows Index`)
9. **plugin-root entry (FR-HOOK-0007) — SEPARATE, always last, always exactly one.** Per-IDE fixed string (double-quoted printf with env/var expansion; probe path reference-rewritten per target). NOT folded into the lead. See GT-3.4 for the exact claude/codex/copilot strings.

Absent variants skipped (logged), not reordered (FR-HOOK-0001). Inclusion gated by `includeBootstrapRules`/`includeIndexEntries` (FR-HOOK-0004). Bodies only, frontmatter stripped (FR-HOOK-0002). Index entries 7/8 included only when target uses session-hooks strategy. **Cursor emits NO bootstrap payload** (no placeholder in its templates). **Exact prefix text + per-doc order + per-entry shapes = decode from baseline `core-claude/hooks/hooks.json` (authoritative).** Entries joined by `, `.

### 6.2 Per-IDE entry shape (FR-HOOK-0005, escaping)
The bootstrap entries inside `{{{bootstrap_hooks_<ide>}}}` are emitted as **compact** (single-line) JSON array elements (no pretty-print), joined by `, ` — distinct from the pretty-printed advisory blocks. Confirmed shapes:

- **Claude** (`hookEntryShape: claude`): each entry = `{"type": "command", "command": "printf '%s' '<JSON>'", "once": true}` (note `"once": true` on EVERY entry). `<JSON>` = JSON-escaped `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"<body>"}}`. `<body>` newlines→`\n`, quotes→`\"`. printf arg bash single-quoted; literal `'`→`'\''` (PARITY-1).
- **Codex** (`hookEntryShape: codex`): each entry = `{"type": "command", "command": "printf '%s' '<JSON>'", "statusMessage": "Loading Rosetta bootstrap", "timeout": 30}` (NO `once`; adds `statusMessage`+`timeout`). Matcher `startup|resume`.
- **Plugin-root entry (all three IDEs)**: a SEPARATE final entry using double-quoted printf for env expansion — see GROUND-TRUTH.md GT-3.4 for the exact per-IDE strings (claude `${CLAUDE_PLUGIN_ROOT}`; codex workspace-root probe → `.agents`; copilot `for base in … agentPlugins …` probe). Carries the same per-IDE extra fields (`once` / `statusMessage`+`timeout` / bash+powershell).
- **Copilot** (`hookEntryShape: copilot`): each entry wrapped in the **per-entry session lock** (PARITY-4, FR-HOOK-0006). Confirmed bash form (index `0..n`):
  `find /tmp -maxdepth 1 -name "rosetta-bs-*.lock" -mmin +1 -delete 2>/dev/null; INPUT=$(cat); SESSION_ID=$(printf '%s' "$INPUT" | sed -n 's/.*"session_id":"\([^"]*\)".*/\1/p'); LOCK="/tmp/rosetta-bs-${SESSION_ID:-$$}-<i>.lock"; if [ -f "$LOCK" ]; then exit 0; fi; touch "$LOCK"; printf '%s' '<JSON>'`
  plus a `powershell` form. Entry shape `{"type": "command", "bash": "...", "powershell": "..."}`. The `-<i>` lock index increments per bootstrap entry. **Reproduce the bash/sed/printf string byte-for-byte from baseline `core-copilot/.github/plugin/hooks.json` line 4.**
- **Cursor** (`hookEntryShape: cursor`): no bootstrap payload placeholder in template (uses native rules in standalone, and the marketplace cursor template carries no `{{{...}}}`). Confirm cursor marketplace bootstrap path from its `hooks/hooks.json.tmpl`.

`additionalContext` payload object is built once per doc, escaped by `escaping/json-string.ts`, then the IDE wrapper applied by `escaping/shell.ts` / `escaping/powershell.ts`. **Size check (NFR-0004):** if any single entry > 10000 chars after escaping → soft error.

### 6.3 Index generation (FR-GEN-*, PARITY-2)
Exact format (confirmed):
```
# Rosetta {Rules|Workflows} Index\n\nAll paths are relative to Rosetta Plugin Path.\n\n- `folder/file.ext`: description\n...\n
```
- Heading: `rules`→`# Rosetta Rules Index`; `workflows|commands|prompts`→`# Rosetta Workflows Index` (FR-GEN-0004, alias confirmed cursor `commands/INDEX.md`).
- Entry path = **final post-rename** path (FR-ARCH-0038): cursor lists `commands/x.md`, copilot-standalone lists `prompts/x.prompt.md`.
- Description = frontmatter `description:` else title-cased filename stem (FR-GEN-0002).
- Workflow index membership = exact set member `tags:["workflow"]` (FR-GEN-0003; confirmed claude r2 = 12 entries vs 43 files). Rules index = all non-excluded, non-bootstrap-policy? — **baseline rules/INDEX.md lists 11 entries including bootstrap-* and plugin-files-mode**; confirm exact membership = all rules-folder docs except INDEX itself and the two excluded files. Indexes only for declared folders (claude/codex: rules+workflows; cursor/copilot: rules+commands).

### 6.4 Standalone injection (FR-VAR-0072, confirmed markers)
Cursor-standalone `plugin-files-mode.mdc` and copilot-standalone `plugin-files-mode.instructions.md` get injected: marker `# ADDITIONAL SOURCES IN PLUGIN`, sources list, then `# PREP STEP 1:` block with `Rosetta plugin root: ".cursor"` / `".github"` and the workflow/commands(+rules) index. Anchor + exact text = baseline.

## 7. Model Normalization (`spec/model-maps.ts`, FR-COPY-0020–0022, MODEL.md)

Source frontmatter `model:` is a comma list of logical keys (e.g. `claude-4.8-opus-high, gpt-5.5-high, gemini-3.1-pro-high`). Per-IDE (all confirmed from baseline):

| IDE | Selection | Map / rule | Example (`architect`/`reviewer`) |
|---|---|---|---|
| **Claude** | scan for **first claude-compatible** token (`claude-*`/contains opus/sonnet/haiku) — **NOT first overall** (PARITY-9, CONTRADICTION-1) | substring opus→`opus`, sonnet→`sonnet`, haiku→`haiku`; none→`inherit` | architect→`opus`; reviewer(`gpt..,gemini..,claude-4.6-sonnet`)→`sonnet` |
| **Cursor** | first model overall | `CURSOR_MODEL_MAP`: claude→canonical (`claude-opus-4-6`…); gpt→strip `-<effort>` | architect→`claude-opus-4-6` |
| **Copilot** | first model overall | `COPILOT_MODEL_MAP`: claude→`Claude Opus 4.6`…; gpt→`GPT-5.4` | architect→`Claude Opus 4.6` |
| **Codex** | scan for **first gpt-\*** token | split trailing `-<effort>`→ `model` + `model_reasoning_effort`; none→no model | architect→`gpt-5.5`/`high`; reviewer→`gpt-5.4`/`medium`; executor(`...gpt-5.4-low...`)→`gpt-5.4`/`low` |

Exact map tables (versions are config, expected to drift — read from baseline at impl time): discovery-notes §5 + decode any agent not covered there from `agents/TEMP/old-gen-r2/<target>/agents/*`. Claude maps to short name; the frontmatter `model:` line is rewritten in place preserving surrounding lines.

## 8. Data Tables (per-target SpecEntry, `spec/targets.ts`)

All six share the `PluginSpec` shape; only data differs (DATA-CFG-0002/0003). Confirmed transforms:

| Target | baseSubfolder | folder/file renames | model | bootstrap | preserved (DATA-CFG-0005) |
|---|---|---|---|---|---|
| core-claude | `` | none | claude short | session-hooks (8/7 entries) | `.claude-plugin/plugin.json`, `hooks/hooks.json.tmpl` |
| core-cursor | `` | `workflows→commands`, `rules/*.md→*.mdc` | cursor | session-hooks | `.cursor-plugin/plugin.json`, `hooks/hooks.json.tmpl`, `hooks.json.tmpl`(root standalone-form) |
| core-copilot | `` | `workflows→commands`, `agents/*.md→*.agent.md` | copilot | session-hooks + per-entry lock (bash+pwsh) | `.github/plugin/{plugin.json,hooks.json.tmpl}`, `hooks/hooks.json.tmpl` |
| core-codex | `.agents`(instr.) | agents→`.codex/agents/*.toml`; instr folders→`.agents/`; hooks→`.codex/hooks.json` (mirror) + `.codex/hooks/*.js`(r3) | codex gpt+effort | session-hooks | `.codex-plugin/{plugin.json,hooks.json.tmpl}` |
| core-cursor-standalone | `.cursor` | as cursor, all under `.cursor/`; `.cursor/hooks.json` standalone-form | cursor | native-rules (inject) | parent `core-cursor` (FR-SEED-0002) |
| core-copilot-standalone | `.github` | bootstrap rules→`instructions/*.instructions.md`; `workflows→prompts/*.prompt.md`; `.github/hooks/hooks.json` | copilot | auto-instructions (inject) | parent `core-copilot` |

**Copilot 3× hooks.json (CONTRADICTION-2/3, confirmed MD5):** (a) `.github/plugin/hooks.json` = rendered plugin-form (93086 B); (b) **root `hooks.json` = identical copy** of (a) — model as an alternate-name copy `SpecEntry`/relocation, not a rename (both files exist, same MD5); (c) `hooks/hooks.json` = rendered **standalone-form** (`{"version":1,"hooks":{"sessionStart":[]}}` for r2, 60 B). **Codex (PARITY-13):** `.codex-plugin/hooks.json` and `.codex/hooks.json` identical (mirror copy SpecEntry).

**Excluded files (FR-COPY-0011, PARITY-11):** `rules/bootstrap.md` + `rules/local-files-mode.md` in every target's rules SpecEntry `exclude`; PLUS `templates/shell-schemas/**` (whole folder; agent/skill/workflow-shell.md) excluded from every target's templates SpecEntry (exclude supports folder globs); source unchanged. Baseline regenerated 2026-06-05 with shell-schemas removed to match. **Codex/windsurf bundle dirs:** consume only known-target bundles (PARITY-15).

**Version source (PARITY-10):** `plugin.json` version (`2.0.40`) read from **preserved source** `src/plugin-generator/plugins/<target>/...` (matches baseline). Standalone manifest = `{name, version}` from parent preserved (2-space indent, trailing `\n`, confirmed bytes). `scripts/bump_versions.sh` currently bumps `plugins/` (top-level, at 2.0.41) — see Open Decision OD-1. Generator does NOT invent version.

## 9. Dependencies (`package.json`, NFR-0010/0011)

Pinned to rosettify majors: `commander@^14`, `pino@^10`; dev `typescript@^6`, `vitest@^4.1`, `@vitest/coverage-v8@^4.1`, `@types/node@^25`. Added: `handlebars@^4` (raw `{{{}}}` + `{{#if}}`), `gray-matter@^4` (frontmatter — no hand-rolled regex), `immer@^10` (structural sharing FR-ARCH-0014), `fast-glob@^3` (SpecEntry globs). Re-verify maintenance/adoption at impl time (NFR-0011). **Handlebars whitespace (PARITY-7):** validate r2 `{{#if}}`-false renders identical bytes; add `~` whitespace-control or post-render normalization ONLY if a diff appears. Serialization libs are NOT trusted for byte-output — `serialize/*` owns JSON/TOML/Markdown emission (NFR-0001).

## 10. Error Handling

| Condition | Behavior | Req |
|---|---|---|
| Unknown release / missing domain / unknown CLI arg | stderr message, exit 1, no output | FR-CLI-0001/0011/0030 |
| Malformed frontmatter | error naming file (recoverable, accumulate) | FR-ARCH-0040 |
| Binary VirtualFile w/ >1 SourceFile | processor error | FR-ARCH-0034/0042 |
| Bootstrap entry > 10000 chars | soft error: report, still emit, exit 1 | NFR-0004 |
| Missing template | warn + continue | FR-GEN-0010 |
| Missing `.js` bundles when r3 | error, exit 1 | FR-HOOK-0021 |
| Missing inject host/anchor | error naming host+anchor | FR-ARCH-0051 |

Run-to-completion: per-target errors accumulate; all targets still generated; aggregated non-zero exit (FR-CLI-0041).

## 11. Test Architecture (vitest, §maps to PLAN Phase 9)

**Unit (per module, mock only filesystem boundary, NFR-0007):**
- `directives.test.ts` — FR-ARCH-0020–0024 (tilde grammar, order/target-only/overwrite, dup/unknown errors).
- `sort.test.ts` — PARITY-5 lexicographic == Python `sorted()` on representative paths (incl. `10a`<`2a`, case-sensitive).
- `file-*.test.ts` — each FileProcessor: read split/binary, overrides, bundle concat+binary error, normalize per IDE (incl. claude scan, codex effort split, gpt-first agent), rename anchored (no substring match), codex TOML.
- `plugin-*.test.ts` — cleanup, copy/seed (incl. standalone parent), spec-entries (exclude→no frame), rewrite-references (bare folder, dropped-frame ref, prose `agents` untouched), indexes (tag membership exact, heading alias, description fallback), inject, assemble-bootstrap (order, prefix on lead, absent variant skip, size limit), render (raw+if, r2 whitespace), sync-bundles (r3 add/r2 remove/preserve unmanaged), write (null/empty/dry-run).
- `serialize/*.test.ts` + `escaping/*.test.ts` — byte-exact JSON/TOML/index; bash `'\''`, pwsh, JSON-string escaping vs fixtures.
- `model-maps.test.ts` — all four vocabularies incl. fallbacks.

**E2E harness with self-defined SAMPLE data** (`tests/fixtures/sample-instructions/` + expected `tests/fixtures/sample-output/`): a tiny instruction tree the tests own, exercising every code path:
- `core/` + `acme/` domains for bundling/overrides (same-path file in both → concatenated; acme-only file; core-only file; an `overwrite`-directive file).
- frontmatter `model:` (multi-model incl. gpt-first agent for codex + claude-scan case), `tags:["workflow"]` workflow file + a phase file (no tag) + `workflow-helper` tag (must be excluded), `description:` present and absent.
- a `.tmpl` template, a binary file, a `.DS_Store` (must be skipped), an excluded `rules/bootstrap.md`.
- assert: full output tree path set + bytes vs committed expected fixtures; dry-run writes nothing; verbose adds lines; exit codes.

**Parity E2E** (`tests/parity.e2e.test.ts`): run generator against **real** `instructions/r2/core` and `instructions/r3/core` into temp dirs; recursive byte-diff vs `agents/TEMP/old-gen-r2/` and `agents/TEMP/old-gen-r3/`; assert empty diff (NFR-0001). Per-target sub-assertions for the parity-critical files (claude/copilot/codex hooks.json, a TOML, INDEX.md, standalone plugin.json). This is the primary acceptance gate.

## 12. Traceability (spec section → requirement IDs)

§1 NFR-*; §2 NFR-0007/0008; §3 FR-ARCH-0001/0002/0003/0010-0014/0030/0036/0039; §4 FR-CLI-*; §5 FR-ARCH-0032/0040-0055, FR-COPY-*, FR-HOOK-0020-0022; §6 FR-HOOK-0001-0009, FR-GEN-0001-0011, FR-VAR-0072, NFR-0004; §7 FR-COPY-0020-0022, DATA-CFG-0004, MODEL; §8 DATA-CFG-0002/0003/0005, FR-VAR-0010-0072, FR-SEED-0001/0002; §9 NFR-0010/0011; §10 FR-CLI-0041, FR-ARCH-0034, FR-HOOK-0021, NFR-0004; §11 all (verification).

</CRITICAL>
