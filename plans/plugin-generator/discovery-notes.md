# Plugin Generator — Discovery Notes

**Generated:** 2026-06-04
**Purpose:** Implementation-ready inventory for the TypeScript/npx re-implementation of the plugin generator.
**Baseline:** `agents/TEMP/old-gen-r2/` and `agents/TEMP/old-gen-r3/` (byte-parity targets).
**Prohibited reads:** `scripts/plugin_generator.py`, `specs/plugin-generator.allium` — never open.

---

## 1. Requirements Map

### DATA-CFG-* — Configuration Contract

**DATA-CFG-0001** (Release descriptor): Two releases defined. `r2` → `{deterministic_hooks: false}`. `r3` → `{deterministic_hooks: true}`. `template_vars` set is the only per-release configuration; no control-flow per-release in the engine.

**DATA-CFG-0002** (Plugin-target descriptor): Each of six targets is a `PluginSpec` with: identity, output location + base subfolder, preserved-file seed source, `ModelVocabulary`, bootstrap manifest + inclusion flags, hook configuration, index and injection declarations, an ordered `SpecEntry[]`, and an ordered `PluginProcessor[]`.

**DATA-CFG-0003** (Target inventory): Exactly six targets: `core-claude`, `core-cursor`, `core-copilot`, `core-codex`, `core-cursor-standalone`, `core-copilot-standalone`. Config folders: claude→`.claude-plugin`, cursor→`.cursor-plugin`, copilot→`.github`, codex→`.codex-plugin`.

**DATA-CFG-0004** (Model vocabularies): Per-IDE model maps. Claude: substring→short-name (opus/sonnet/haiku/inherit). Cursor: `CURSOR_MODEL_MAP`. Copilot: `COPILOT_MODEL_MAP`. Codex: first gpt-* model → `{model, effort}` split. See Section 5 for exact maps derived from baseline.

**DATA-CFG-0005** (Preserved-file source): `src/plugin-generator/plugins/<target>/` is the committed source. Contents: `core-claude` → `.claude-plugin/plugin.json`, `hooks/hooks.json.tmpl`. `core-cursor` → `.cursor-plugin/plugin.json`, `hooks/hooks.json.tmpl`, `hooks.json.tmpl` (root, standalone-form). `core-copilot` → `.github/plugin/plugin.json`, `.github/plugin/hooks.json.tmpl`, `hooks/hooks.json.tmpl`. `core-codex` → `.codex-plugin/plugin.json`, `.codex-plugin/hooks.json.tmpl`. No standalone preserved-file folders; standalones derive from parent (FR-SEED-0002).

---

### FR-ARCH-* — Target Architecture

**FR-ARCH-0001/0002** (Uniform spec / SpecEntry shape): One `PluginSpec` interface for all six targets. Values externalized to `plugin-specs.ts`. `SpecEntry = {source: glob, target: path, exclude: string[], processors: FileProcessor[]}`.

**FR-ARCH-0010–0014** (VFS model): Flat ordered list of `VirtualFile`s, each with `{path, sourceFiles: SourceFile[]}`. Built from filesystem structure + filename directives only (no content reads). Sorted stable order. Immutable after construction; processors operate on `FileProcessingFrame`s and `PluginProcessingFrame`s with structural sharing (copy-on-write via `immer`).

**FR-ARCH-0020–0024** (Filename directives): Tilde-fenced `~…~` segment in filenames: `name.~tokens~.ext` → VFS path `name.ext`. Tokens: `OrderToken` (sort key, lexicographic), `TargetOnlyToken` (`<target>-only`), `OverwriteToken` (`overwrite`). Currently NO directive-encoded files exist in r2/r3 source trees — this is forward-compatible architecture.

**FR-ARCH-0030** (FileProcessingFrame): `{sourcePath, target, isBinary, target_contents, source: SourceFile[]}`. Per-file mutable working object.

**FR-ARCH-0039** (PluginProcessingFrame): `{spec, vfs, frames: FileProcessingFrame[], templateContext}`. Whole-plugin working object. `templateContext` carries release vars + assembled bootstrap payload placeholders.

**FR-ARCH-0033** (I/O confinement): `fileRead()` is the sole content ingress. `pluginWrite()` is the sole content egress.

**FR-ARCH-0035** (Every step is a processor): `pluginCleanup()` and `pluginCopy()` head the `PluginProcessor` pipeline. No out-of-band passes.

**FR-ARCH-0037** (Exact matching): All regexes anchored to full string. Path references matched as complete boundary-delimited tokens. Tag membership is exact set membership.

**FR-ARCH-0038** (Generated content uses final paths): `pluginGenerateIndexes()` and `pluginInjectSections()` run after `pluginProcessSpecEntries()`, so they see post-rename paths. No reference rewriting needed on generated content.

**FR-ARCH-0043** (`fileRename()` path-only): Changes only the target path. Never reads or modifies `target_contents`.

**FR-ARCH-0049** (`pluginRewriteReferences()` content-only): Derives `{sourcePath→targetPath}` lookup from `frames` + `SpecEntry` folder pairs. Exact complete-token path replacement. Never touches target paths.

**FR-ARCH-0052–0055** (Plugin pipeline order): `pluginCleanup` → `pluginCopy` → `pluginProcessSpecEntries` → `pluginRewriteReferences` → `pluginGenerateIndexes` → `pluginInjectSections` → `pluginAssembleBootstrap` → `pluginRenderTemplates` → `pluginWrite`.

---

### FR-CLI-* — Invocation

**FR-CLI-0001** (CLI entry): `npx <tool> [--release r2|r3] [--domain core] [--repo-root DIR] [--output-dir DIR] [--dry-run] [--verbose]`. Unknown args → usage + exit 1.

**FR-CLI-0010/0011** (Release): Default `r2`. Unknown release → stderr lists known releases + exit 1.

**FR-CLI-0020/0021** (Paths): Repo root defaults to containing repo. Output dir defaults to `<repo-root>/plugins`.

**FR-CLI-0030/0031** (Domain bundling): Default `core`. `--domain core,acme` → left-to-right layer merge (same-path files bundled, not replaced). Missing domain folder → exit 1.

**FR-CLI-0040** (Uniform generation): All six targets generated the same way. No target derived from another. No required ordering.

**FR-CLI-0041** (Run-to-completion): Recoverable errors don't abort; aggregated exit status.

**FR-CLI-0050/0051** (Dry-run / verbose): `--dry-run` prints full path+content, writes nothing. `--verbose` expands per-VirtualFile, per-processor detail.

**FR-CLI-0060** (Comprehensive help): Help must document source structure, directive/bundling behavior, processor catalog, and spec model.

---

### FR-COPY-* — Seeding, Reset, Copy, Normalization

**FR-SEED-0001** (Seed before generation): `pluginCopy()` copies `src/plugin-generator/plugins/<target>/` into output before instruction-derived content is produced.

**FR-SEED-0002** (Standalone seeding): Standalones derive preserved files from parent target's source (not independent folder). Cursor-standalone from `core-cursor`; copilot-standalone from `core-copilot`. Standalone manifest = parent version only (`{name, version}`).

**FR-COPY-0001** (Reset): `pluginCleanup()` wipes output location, creates if absent.

**FR-COPY-0010** (Copy source): All non-artifact files via `fileRead→pluginWrite`. Skip `.DS_Store`.

**FR-COPY-0011** (Exclude): `rules/bootstrap.md` and `rules/local-files-mode.md` excluded via `SpecEntry.exclude` — source files unchanged (MCP still serves them).

**FR-COPY-0020–0022** (Model normalization):
- `fileNormalizeModels()` rewrites frontmatter `model:` field per target's `ModelVocabulary`.
- **Claude**: Scans comma-separated list for FIRST claude-compatible entry (claude-*/opus/sonnet/haiku pattern); maps via substring (opus/sonnet/haiku); falls back to `inherit`.
- **Cursor**: Takes FIRST model overall; maps via `CURSOR_MODEL_MAP` (both claude and gpt keys).
- **Copilot**: Takes FIRST model overall; maps via `COPILOT_MODEL_MAP`.
- **Codex**: Scans list for FIRST gpt-* entry; splits trailing `-<effort>` suffix into `model_reasoning_effort`; emits no model if none found.

**FR-COPY-0030–0032** (Renames + reference rewriting): Folder renames via `SpecEntry` `target`. Suffix renames via `fileRename()`. Reference updates via `pluginRewriteReferences()` (content-only, from frame lookup).

**FR-COPY-0033/0034** (Alternate-name duplication / relocation): Expressed as additional `SpecEntry` / `fileRename()` — no pre-pass.

---

### FR-GEN-* — Index Generation and Templates

**FR-GEN-0001–0004** (Folder indexes):
- Produces `INDEX.md` listing each document with description (frontmatter `description:` or title-cased filename stem).
- Workflow index: only files with `tags: ["workflow"]` (exact set membership, not substring).
- Heading: `# Rosetta Workflows Index` for `workflows`, `commands`, and `prompts` folders.
- `# Rosetta Rules Index` for `rules` folder.
- Format confirmed from baseline: `- \`folder/file.ext\`: description`
- Index header line: `All paths are relative to Rosetta Plugin Path.`

**FR-GEN-0010/0011** (Template rendering):
- `pluginRenderTemplates()` renders `.tmpl` files to sibling without `.tmpl` suffix.
- Uses Node `handlebars` engine.
- `{{{triple-stache}}}` for raw (unescaped) injection of bootstrap payload.
- `{{#if deterministic_hooks}}...{{/if}}` for release-conditional blocks.
- Context: release vars (`{release, deterministic_hooks}`) + assembled bootstrap payload placeholder keys.
- Missing template → warning + continue.

---

### FR-HOOK-* — Bootstrap Assembly and Hook Bundles

**FR-HOOK-0001** (Bootstrap assembly): `pluginAssembleBootstrap()` builds payload from present bootstrap frames in manifest order. Absent variants skipped (logged).

**FR-HOOK-0002** (Strip frontmatter): Only body embedded; frontmatter excluded.

**FR-HOOK-0003** (Bootstrap prefix): Fixed lead-in prepended to exactly one designated lead document — the first entry in the ordered bootstrap manifest (`plugin-files-mode` leads).

**FR-HOOK-0004** (Inclusion flags): Per-target flags for whether bootstrap-rule entries and index entries appear in payload.

**FR-HOOK-0005** (Per-IDE entry shape): Each IDE has its own hook schema (see Section 3 and template content). Interpreter-specific escaping required.

**FR-HOOK-0006** (Once-per-session): Claude: `"once": true` native dedup. Codex/Cursor: built-in dedup. Copilot: file-based lock per entry (workaround for IDE double-fire bug).

**FR-HOOK-0007** (Plugin-path entry): Each target's payload includes a plugin-root path entry.

**FR-HOOK-0008** (Reference rewriting in payloads): `pluginRewriteReferences()` semantics applied to bootstrap payload string values before template rendering.

**FR-HOOK-0009** (Explicit manifest order): `plugin-files-mode` first, then `bootstrap-*` rules, then indexes. Order is contractual, not filesystem-dependent.

**FR-HOOK-0020–0022** (Hook bundle sync): `deterministic_hooks=true` (r3) → sync `hooks/dist/bundles/<target>/*.js` into each target's hook folder. r2 → no `.js` bundles; stale bundles removed. Preserve unmanaged files (rendered `hooks.json` etc.) during sync.

---

### FR-VAR-* — Per-Target Structure

**FR-VAR-0010** (Claude): Unchanged folder names. Claude short-name models. Generated `rules/INDEX.md` + `workflows/INDEX.md`. Rendered `hooks/hooks.json`. Preserved `.claude-plugin`. Bootstrap via session-start hooks; native dedup (`"once": true`).

**FR-VAR-0020** (Cursor marketplace): `workflows→commands`. `rules/*.md→*.mdc`. Cursor model vocab. Generated `rules/INDEX.md` + `commands/INDEX.md`. Both plugin-form and standalone-form hook templates rendered. Preserved `.cursor-plugin`. Bootstrap via session-start hooks.

**FR-VAR-0030** (Copilot marketplace): `workflows→commands`. Agent files `*.md→*.agent.md`. Copilot model vocab. Generated `rules/INDEX.md` + `commands/INDEX.md`. Root `hooks.json` (runtime layout = copy of `.github/plugin/hooks.json`). Preserved `.github`. Bootstrap via session-start hooks + per-entry file-lock dedup (bash + PowerShell forms).

**FR-VAR-0040/0041** (Codex): Agents → TOML subagents at `.codex/agents/`. Instruction folders under `.agents/`. Hooks mirrored to `.codex/hooks/`. Generated `rules/INDEX.md` + `workflows/INDEX.md` at `.agents/rules/` + `.agents/workflows/`. Preserved `.codex-plugin`. Bootstrap via session-start hooks.

**FR-VAR-0050** (Cursor standalone): All content under `.cursor/`. `workflows→commands`. `rules/*.mdc`. Bootstrap via native rules (no session-start bootstrap hook). Commands index + plugin-root instructions injected into `.cursor/rules/plugin-files-mode.mdc` via `pluginInjectSections()`. Standalone-form hooks at `.cursor/hooks.json`.

**FR-VAR-0051** (Copilot standalone): All content under `.github/`. Bootstrap rules relocated to `instructions/*.instructions.md` (auto-loaded `applyTo: "**"`). Workflows → `prompts/*.prompt.md`. Bootstrap via auto-loaded instructions (no session-start bootstrap hook). Prompts/rules indexes + plugin-root instructions injected into `.github/instructions/plugin-files-mode.instructions.md`. Nested standalone hooks at `.github/hooks/hooks.json`.

**FR-VAR-0060** (Standalone manifests): Simple `{name, version}` JSON. Name = `"core-cursor-standalone"` or `"core-copilot-standalone"`. Version = parent target's preserved manifest version.

**FR-VAR-0070–0072** (Bootstrap delivery strategy table):

| Target | Strategy | Hook payload in template |
|---|---|---|
| core-claude | SessionStart hooks | `{{{bootstrap_hooks_claude}}}` |
| core-cursor | SessionStart hooks | (TBD from template) |
| core-copilot | SessionStart hooks | `{{{bootstrap_hooks_copilot}}}` |
| core-codex | SessionStart hooks | `{{{bootstrap_hooks_codex}}}` |
| core-cursor-standalone | Native rules (`.mdc`) | none |
| core-copilot-standalone | Auto-loaded instructions | none |

---

### NFR-* — Non-Functional

**NFR-0001** (Byte-for-byte parity): Empty recursive diff vs baseline for r2+r3 (domain=core). Generator controls own serialization for JSON (hooks/manifests), TOML (codex subagents), and Markdown (indexes). No library default formatting.

**NFR-0002** (Deterministic): Stable sorted order; no timestamps/random.

**NFR-0003** (Idempotent): Wipe+rebuild is safe. Clean-directory generation works.

**NFR-0004** (Bootstrap size limit): Entry > 10000 chars → soft error (report + continue + exit 1).

**NFR-0005** (Valid JSON/TOML).

**NFR-0007** (Modular SRP): File processors separate from plugin processors separate from escaping, model maps, orchestration.

**NFR-0008** (TS/npx): Node ≥ 22, ESM, TypeScript 6.x, no consumer build step.

**NFR-0009** (Cross-platform): Copilot hooks carry both bash and PowerShell forms.

**NFR-0010** (Libraries): `commander ^14`, `pino ^10`, `handlebars`, `gray-matter`, `immer`, `fast-glob`. Vitest for tests. Match rosettify versions.

---

## 2. Source-Tree Inventory

### `instructions/r2/core/` Top-Level Folders

```
agents/       — 9 .md files (one level deep: agents/<name>.md)
configure/    — 8 .md IDE guide files
rules/        — 13 .md files
skills/       — 20+ skill directories (SKILL.md + optional assets/, references/, scripts/)
templates/    — shell-schemas/ subdirectory with 3 .md templates
workflows/    — 43 .md files (12 tagged "workflow", 31 phase files)
```

No `.tmpl` files in the r2/r3 source trees. `.tmpl` files live ONLY in `src/plugin-generator/plugins/<target>/` preserved sources.

### `instructions/r3/core/` vs `instructions/r2/core/` Differences

r3 removes (vs r2):
- `rules/bootstrap-hitl-questioning.md` (removed)
- `skills/plan-manager/SKILL.md` + `assets/pm-schema.md` (removed)

r3 adds (vs r2):
- `rules/todo-tasks-fallback.md`
- `skills/gitnexus-cli/SKILL.md`
- `skills/gitnexus-setup/SKILL.md`
- `skills/gitnexus-tools/SKILL.md` + `assets/gn-examples.md`
- `skills/load-context-instructions/SKILL.md`
- `skills/load-workflow/SKILL.md`
- `skills/operation-manager/SKILL.md` + `assets/om-schema.md`

r3 has no `bootstrap-hitl-questioning` rule → r3 plugins have one fewer bootstrap entry vs r2.
r3 deterministic_hooks=true → r3 plugins carry `.js` hook bundles in `hooks/`.

### `src/plugin-generator/plugins/<target>/` Preserved Files

**core-claude** (2 files):
```
.claude-plugin/plugin.json          version 2.0.40
hooks/hooks.json.tmpl               claude plugin-form template
```

**core-cursor** (3 files):
```
.cursor-plugin/plugin.json          version 2.0.40
hooks/hooks.json.tmpl               cursor plugin-form template
hooks.json.tmpl                     cursor standalone-form template (root)
```

**core-copilot** (3 files):
```
.github/plugin/plugin.json          version 2.0.40
.github/plugin/hooks.json.tmpl      copilot plugin-form template
hooks/hooks.json.tmpl               copilot standalone-form template
```

**core-codex** (2 files):
```
.codex-plugin/plugin.json           version 2.0.40
.codex-plugin/hooks.json.tmpl       codex template
```

Note: `plugins/` (top-level output tree) contains version `2.0.41` — it was bumped after the baseline was generated. `src/plugin-generator/plugins/` contains `2.0.40` matching the baseline. The TS generator reads from `src/plugin-generator/plugins/` as its preserved source. The `scripts/bump_versions.sh` bumps `plugins/<target>/.../plugin.json` — the TS generator must also be wired to bump its own preserved source manifests.

### `hooks/dist/bundles/` Per-IDE Bundle Files

Five bundles per IDE target:
```
hooks/dist/bundles/core-claude/   dangerous-actions.js gitnexus-refresh.js lint-format-advisory.js loose-files.js md-file-advisory.js
hooks/dist/bundles/core-codex/    same 5 files
hooks/dist/bundles/core-copilot/  same 5 files
hooks/dist/bundles/core-cursor/   same 5 files
hooks/dist/bundles/core-windsurf/ same 5 files
```

No `hooks/dist/shell/` directory (currently empty or absent). Bundles are compiled from `hooks/src/` TypeScript — generator consumes them as external input.

---

## 3. Baseline Output Structure

### File Counts

| Target | r2 | r3 |
|---|---|---|
| core-claude | 149 | 160 |
| core-codex | 150 | 161 |
| core-copilot | 152 | 163 |
| core-copilot-standalone | 145 | 156 |
| core-cursor | 151 | 162 |
| core-cursor-standalone | 145 | 156 |

r3 adds 11 files per target vs r2: 5 `.js` hook bundles + ~6 new skill/rule files.

### core-claude Layout (r2, 149 files)

```
.claude-plugin/plugin.json          [P] version 2.0.40
agents/*.md                         [G] 9 agents; model normalized to short names
rules/bootstrap-core-policy.md      [G] excluded: bootstrap.md, local-files-mode.md
rules/bootstrap-execution-policy.md [G]
rules/bootstrap-guardrails.md       [G]
rules/bootstrap-hitl-questioning.md [G] (r2 only; absent in r3)
rules/bootstrap-rosetta-files.md    [G]
rules/coding-iac-best-practices.md  [G]
rules/INDEX.md                      [G] generated; 11 entries (all non-bootstrap non-excluded)
rules/plugin-files-mode.md          [G]
rules/prompt-best-practices.md      [G]
rules/requirements-best-practices.md [G]
rules/requirements-use-best-practices.md [G]
rules/speckit-integration-policy.md [G]
skills/<name>/SKILL.md              [G] 20+ skills with assets/references
configure/*.md                      [G] 8 IDE guides
templates/shell-schemas/*.md        [G] 3 templates
workflows/*.md                      [G] 43 workflow files
workflows/INDEX.md                  [G] generated; 12 entries (tag:workflow only)
hooks/hooks.json                    [G] rendered from hooks.json.tmpl; large bootstrap payload
hooks/hooks.json.tmpl               [P] preserved template
```

### core-cursor Layout (r2, 151 files)

Differences from claude:
- `commands/*.md` instead of `workflows/*.md` (43 files + INDEX.md)
- `rules/*.mdc` instead of `rules/*.md` (11 + INDEX.md)
- Both `.cursor-plugin/plugin.json` [P] and `hooks.json.tmpl` [P] at root (standalone-form) and `hooks/hooks.json.tmpl` [P]
- Agents: plain `.md` (not `.agent.md`)
- References in commands/ bodies read `commands/x.md` (rewritten from `workflows/x.md`)

### core-copilot Layout (r2, 152 files)

Differences from claude:
- `agents/*.agent.md` suffix
- `commands/*.md` + `commands/INDEX.md`
- `.github/plugin/{hooks.json.tmpl [P], hooks.json [G], plugin.json [P]}`
- `hooks.json` at plugin root = copy of `.github/plugin/hooks.json`
- `hooks/hooks.json.tmpl` [P] (standalone-form template)
- `hooks/hooks.json` [G] (rendered standalone-form hooks, sessionStart: [])
- Bootstrap payload uses bash+PowerShell forms + per-entry dedup lock

### core-codex Layout (r2, 150 files)

```
.codex-plugin/plugin.json           [P]
.codex-plugin/hooks.json.tmpl       [P]
.codex-plugin/hooks.json            [G] rendered
.agents/rules/*.md + INDEX.md       [G] all non-excluded rules
.agents/workflows/*.md + INDEX.md   [G] all workflows
.agents/skills/...                  [G] all skills
.agents/configure/*.md              [G]
.agents/templates/...               [G]
.codex/agents/*.toml                [G] TOML subagents (no plain agents/ folder)
.codex/hooks.json                   [G] mirrored from .codex-plugin/hooks.json
```

### core-cursor-standalone Layout (r2, 145 files)

```
plugin.json                         [G] {name:"core-cursor-standalone", version:"2.0.40"}
.cursor/
  rules/*.mdc + INDEX.md            [G] including bootstrap-* and plugin-files-mode.mdc
  commands/*.md + INDEX.md          [G] from workflows/
  agents/*.md                       [G]
  skills/...                        [G]
  configure/*.md                    [G]
  templates/...                     [G]
  hooks/hooks.json                  [G] rendered from root hooks.json.tmpl [P]
```

`plugin-files-mode.mdc` injected with commands/INDEX.md entries + plugin-root block:
`Rosetta plugin root: ".cursor"`. Marker: `# ADDITIONAL SOURCES IN PLUGIN` followed by sources list, then `# PREP STEP 1:` + injected content.

### core-copilot-standalone Layout (r2, 145 files)

```
plugin.json                         [G] {name:"core-copilot-standalone", version:"2.0.40"}
.github/
  instructions/bootstrap-core-policy.instructions.md    [G] ← relocated from rules/
  instructions/bootstrap-execution-policy.instructions.md [G]
  instructions/bootstrap-guardrails.instructions.md      [G]
  instructions/bootstrap-hitl-questioning.instructions.md [G] (r2 only)
  instructions/bootstrap-rosetta-files.instructions.md   [G]
  instructions/plugin-files-mode.instructions.md         [G] ← injected with prompts index
  prompts/*.prompt.md + INDEX.md    [G] ← from workflows/ → commands/ → prompts/ + suffix
  rules/*.md + INDEX.md             [G] remaining rules (bootstrap rules removed from rules/)
  agents/*.agent.md                 [G]
  skills/...                        [G]
  configure/*.md                    [G]
  templates/...                     [G]
  hooks/hooks.json                  [G] rendered from hooks/hooks.json.tmpl [P]
```

`plugin-files-mode.instructions.md` injected with prompts/INDEX.md entries + rules/INDEX.md entries + plugin-root block: `Rosetta plugin root: ".github"`.

### Example Concrete Transformations (r2 → r2 baseline)

**1. Workflow rename (cursor):**
- Source: `instructions/r2/core/workflows/coding-flow.md`
- Cursor output: `core-cursor/commands/coding-flow.md`
- Body reference `workflows/coding-flow.md` → `commands/coding-flow.md`
- Copilot: `commands/coding-flow.md` (same rename, different agent-file rule)
- Copilot-standalone: `prompts/coding-flow.prompt.md`

**2. Agent file extension (copilot):**
- Source: `instructions/r2/core/agents/architect.md` (`model: claude-4.8-opus-high, gpt-5.5-high, ...`)
- Claude output: `agents/architect.md` `model: opus`
- Cursor output: `agents/architect.md` `model: claude-opus-4-6`
- Copilot output: `agents/architect.agent.md` `model: Claude Opus 4.6`
- Codex output: `.codex/agents/architect.toml` `model = "gpt-5.5"`, `model_reasoning_effort = "high"`

**3. Rules rename (cursor):**
- Source: `instructions/r2/core/rules/plugin-files-mode.md`
- Cursor output: `rules/plugin-files-mode.mdc` (`.md`→`.mdc`)

**4. Codex instruction placement:**
- Source: `instructions/r2/core/rules/bootstrap-core-policy.md`
- Codex output: `.agents/rules/bootstrap-core-policy.md` (placed under `.agents/`)

---

## 4. Tooling / Runtime Notes

### Node/TS Environment

Node v26 (≥22 required). npm 11. TypeScript 6.x. ESM modules only. vitest for tests. Matches rosettify toolchain.

### rosettify `package.json` Versions (pinning reference)

```json
"dependencies": {
  "@modelcontextprotocol/sdk": "^1.29.0",
  "commander": "^14.0.3",
  "pino": "^10.3.1"
},
"devDependencies": {
  "@types/node": "^25.5.2",
  "@vitest/coverage-v8": "^4.1.5",
  "typescript": "^6.0.0",
  "vitest": "^4.1.5"
}
```

**Required additions for plugin-generator** (NFR-0010):
- `handlebars` — Handlebars template engine (triple-stache raw injection + `{{#if}}`)
- `gray-matter` — frontmatter parsing (not a hand-rolled regex)
- `immer` — structural sharing / immutable frame updates (FR-ARCH-0014)
- `fast-glob` — SpecEntry source glob expansion

### Template Variables (from preserved `.tmpl` files)

All templates use exactly these Handlebars variables:

| Variable | Type | Values | Source |
|---|---|---|---|
| `release` | string | `"r2"`, `"r3"` | Release descriptor |
| `deterministic_hooks` | boolean | `false` (r2), `true` (r3) | Release descriptor |
| `bootstrap_hooks_claude` | raw JSON fragment | session-start entries array | `pluginAssembleBootstrap()` |
| `bootstrap_hooks_copilot` | raw JSON fragment | session-start entries array | `pluginAssembleBootstrap()` |
| `bootstrap_hooks_codex` | raw JSON fragment | session-start entries array | `pluginAssembleBootstrap()` |

Note: Cursor template has NO bootstrap payload placeholder — cursor uses `{{#if deterministic_hooks}}` only for advisory hooks. Claude, Copilot, and Codex templates use `{{{triple-stache}}}` raw injection for bootstrap payloads.

### Template Locations (one template file = two forms where applicable)

| Target | Template file (preserved source) | Form | Output file |
|---|---|---|---|
| core-claude | `hooks/hooks.json.tmpl` | plugin-form | `hooks/hooks.json` |
| core-cursor | `hooks/hooks.json.tmpl` | plugin-form | `hooks/hooks.json` |
| core-cursor | `hooks.json.tmpl` (root) | standalone-form | consumed by cursor-standalone |
| core-copilot | `.github/plugin/hooks.json.tmpl` | plugin-form | `.github/plugin/hooks.json` |
| core-copilot | `hooks/hooks.json.tmpl` | standalone-form | consumed by copilot-standalone |
| core-codex | `.codex-plugin/hooks.json.tmpl` | plugin-form | `.codex-plugin/hooks.json` |

---

## 5. Model Normalization Maps (Exact, Derived from Baseline)

### CURSOR_MODEL_MAP (source key → cursor value)

| Source (first model token) | Cursor value |
|---|---|
| `claude-4.8-opus-high` | `claude-opus-4-6` |
| `claude-4.6-sonnet` | `claude-sonnet-4-6` |
| `claude-4.5-haiku` | `claude-haiku-4-5` |
| `claude-sonnet-4-6` | `claude-sonnet-4-6` (identity) |
| `gpt-5.4-medium` | `gpt-5.4` (strip effort suffix) |
| `gpt-5.4-low` | `gpt-5.4` |
| `gpt-5.5-high` | `gpt-5.5` |

General rule: for claude-* models, remap to canonical form (`claude-{family}-{version}`). For gpt-* models, strip the trailing `-<effort>` suffix.

### COPILOT_MODEL_MAP (source key → copilot value)

| Source (first model token) | Copilot value |
|---|---|
| `claude-4.8-opus-high` | `Claude Opus 4.6` |
| `claude-4.6-sonnet` | `Claude Sonnet 4.6` |
| `claude-4.5-haiku` | `Claude Haiku 4.5` |
| `claude-sonnet-4-6` | `Claude Sonnet 4.6` |
| `gpt-5.4-medium` | `GPT-5.4` |

### CLAUDE Normalization (scan for first claude-compatible model)

Claude does NOT take the first model in the list. It scans for the first model matching a claude-* pattern:

| Model containing | Claude short name |
|---|---|
| `opus` substring | `opus` |
| `sonnet` substring | `sonnet` |
| `haiku` substring | `haiku` |
| no claude model found | `inherit` |

Evidence: reviewer source `gpt-5.4-medium, gemini-3.1-pro-preview, claude-4.6-sonnet` → claude output `sonnet` (skips gpt- and gemini, picks first claude-* = `claude-4.6-sonnet`, substring `sonnet`).

### CODEX Normalization (scan for first gpt-* model + effort split)

Codex scans comma-separated list for first `gpt-*` entry. Splits trailing `-<effort>` suffix:

| gpt-* token | `model` | `model_reasoning_effort` |
|---|---|---|
| `gpt-5.5-high` | `gpt-5.5` | `high` |
| `gpt-5.4-medium` | `gpt-5.4` | `medium` |
| `gpt-5.4-low` | `gpt-5.4` | `low` |

If no gpt-* entry, no model field emitted.

---

## 6. Risks, Unknowns, and Parity Hazards

### PARITY-1 — Bootstrap payload byte-exact JSON serialization (CRITICAL)

The `hooks/hooks.json` files are large (43+ KB for r2 claude). The bootstrap payload is embedded as a raw JSON fragment inside `{{{bootstrap_hooks_*}}}`. The exact escaping of double-quotes (`\"`), single-quotes (`'\''` for bash), newlines (`\\n`), and backslashes in the embedded content must match the Python generator's output character-for-character. Any difference in JSON serialization of the bootstrap payload object will break parity. Handlebars raw injection (`{{{...}}}`) must be used to avoid HTML-escaping.

### PARITY-2 — Index format exact whitespace

Index files use a specific format: leading `# Rosetta Rules Index\n\nAll paths are relative to Rosetta Plugin Path.\n\n- \`folder/file.ext\`: description\n`. Trailing newline, spacing between items, exact quote style for descriptions — all must match the Python generator byte-for-byte.

### PARITY-3 — TOML serialization for Codex agents

The `.toml` subagent files have a specific format: `name = "..."`, `description = "..."`, `developer_instructions = """..."""`, `model = "..."`, `model_reasoning_effort = "..."`, `sandbox_mode = "..."`. The exact byte layout (spacing, triple-quoted multiline, field order, trailing newline) must match the baseline. Standard TOML libraries may emit different formatting. Generator must control its own TOML serialization.

### PARITY-4 — Copilot per-entry dedup lock (CRITICAL complexity)

Copilot fires session hooks twice. Each bootstrap entry wraps its payload in a bash script with a file-based lock keyed by session ID + entry index. The exact shell command escaping (single-quote escape `'\''` for embedded content) and lock mechanism must match the Python generator exactly. This is the most complex escaping in the entire codebase.

### PARITY-5 — File sort order

Files are processed in sorted order. The sort order must use the same locale/comparison as Python's `os.listdir()` + `sorted()` (lexicographic, case-sensitive, default locale). Node's `fast-glob` sorts lexicographically by default — verify this matches Python `sorted()` on all test paths.

### PARITY-6 — File encoding and line endings

All source files are UTF-8 with LF line endings. Output files must use LF only. Node writes LF on all platforms; verify `fs.writeFile` does not add CRLF on Windows (or use `\n` explicitly).

### PARITY-7 — Template rendering whitespace

Handlebars `{{#if}}...{{/if}}` blocks leave extra blank lines when the condition is false. The Python `pybars3` library may have different whitespace behavior than Node `handlebars`. Must verify that `r2` hooks.json output (where `deterministic_hooks=false` skips advisory blocks) matches byte-for-byte. Handlebars whitespace control characters (`~`) may be needed.

### PARITY-8 — plugin.json for standalones

Standalone manifest is exactly `{"name":"core-cursor-standalone","version":"2.0.40"}\n` — minimal two-field JSON. The Python generator's JSON serialization uses specific key ordering and spacing. Must emit identically.

### PARITY-9 — Claude model normalization is NOT "first model"

**The requirement text FR-COPY-0020 says "selecting the first model from a comma-separated list" — but this is ONLY true for Cursor, Copilot, and (first gpt-* entry for) Codex.** Claude scans for the first CLAUDE-compatible model. This is empirically confirmed by the baseline (reviewer agent: source `gpt-5.4-medium, gemini-..., claude-4.6-sonnet` → claude output `sonnet`). The implementation must implement this correctly or reviewer/validator model values will be wrong in the claude plugin.

### PARITY-10 — version source divergence

`plugins/` (top-level output tree, managed by `bump_versions.sh`) is at version `2.0.41`. `src/plugin-generator/plugins/` (the TS generator's preserved source) is at `2.0.40`. The baseline outputs in `agents/TEMP/` were produced at `2.0.40`. The TS generator reads version from `src/plugin-generator/plugins/<target>/...` — matching the `2.0.40` baseline. `bump_versions.sh` currently bumps `plugins/` not `src/plugin-generator/plugins/`. The architect must decide: (a) update `bump_versions.sh` to also bump `src/plugin-generator/`, or (b) unify them. This is a tooling question, not an implementation blocker, but must be resolved before production use.

### PARITY-11 — Excluded files: bootstrap.md and local-files-mode.md

Both `rules/bootstrap.md` and `rules/local-files-mode.md` exist in source but must not appear in any plugin output. Confirmed absent in all six baseline targets. These are in `SpecEntry.exclude` for all targets' rules `SpecEntry`. Source files must not be renamed.

### PARITY-12 — Copilot root hooks.json is identical to .github/plugin/hooks.json

Confirmed by MD5 match. The runtime layout places `hooks.json` at the plugin root. This is expressed as an additional `SpecEntry` with `target: "."` (or similar), not a bespoke post-copy step.

### PARITY-13 — Codex .codex/hooks.json = mirror of .codex-plugin/hooks.json

Both exist in the r2 baseline and are expected to be identical. This is expressed as a `SpecEntry` duplication (FR-COPY-0033 alternate-name pattern).

### PARITY-14 — No FilenameDirective files exist yet in source trees

The directive system (`~…~` tilde-fenced tokens) is architectural design; no source files currently use it. Implement the parsing correctly per FR-ARCH-0020–0024 but it will have zero effect on current r2/r3 parity (all directives are missing = default behavior).

### PARITY-15 — `hooks/dist/bundles/` has `core-windsurf` but no windsurf target

The bundles directory has a `core-windsurf` subfolder with 5 `.js` files. There is no windsurf plugin target in the six targets. The generator must not error on this — it should only consume bundles for the targets it knows about.

---

## 7. Contradictions Found Between Requirements and Baseline

**CONTRADICTION-1 (FR-COPY-0020 vs baseline, CRITICAL):** FR-COPY-0020 states "selecting the first model from a comma-separated list" as universal. The baseline proves Claude uses a different strategy: it scans for the first CLAUDE-compatible model, not the first model overall. The requirement text is ambiguous/incomplete on this point. FR-COPY-0021 says Claude "infers from substrings" but doesn't clarify the scan strategy. Ground truth = baseline behavior. Implementation must follow baseline, not the literal FR-COPY-0020 wording.

**CONTRADICTION-2 (Copilot hooks.json location):** `STRUCTURES.md` for core-copilot shows `hooks/hooks.json + hooks/*.js` as generated content, but the baseline actually has `hooks/hooks.json` at `core-copilot/hooks/hooks.json` AND a copy at `core-copilot/hooks.json` at the plugin root AND `core-copilot/.github/plugin/hooks.json`. Three separate hooks.json files at different paths. The `STRUCTURES.md` diagram is incomplete. Ground truth = baseline with three locations.

**CONTRADICTION-3 (FR-VAR-0030 runtime layout):** The requirement says Copilot places "runtime configuration at the plugin root (the root copy expressed as a `SpecEntry`/`fileRename()` target)". But the baseline shows the root `hooks.json` is identical to `.github/plugin/hooks.json` (same MD5). This suggests it is a copy/duplication, not a rename (the `.github/plugin/hooks.json` is also present). The implementation must emit both files with identical content.

**MINOR NOTE:** The STRUCTURES.md for `core-copilot` omits `hooks/hooks.json` (the standalone-form rendered output). Baseline confirms it exists at `core-copilot/hooks/hooks.json` as a rendered standalone-form with `"sessionStart": []`.

---

## 8. File Path Reference

| Artifact | Path |
|---|---|
| Requirements index | `/Users/isolomatov/Sources/GAIN/rosetta/docs/requirements/plugin-generator/INDEX.md` |
| All requirements docs | `/Users/isolomatov/Sources/GAIN/rosetta/docs/requirements/plugin-generator/` |
| Preserved source (all targets) | `/Users/isolomatov/Sources/GAIN/rosetta/src/plugin-generator/plugins/` |
| r2 instruction source | `/Users/isolomatov/Sources/GAIN/rosetta/instructions/r2/core/` |
| r3 instruction source | `/Users/isolomatov/Sources/GAIN/rosetta/instructions/r3/core/` |
| r2 baseline output | `/Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r2/` |
| r3 baseline output | `/Users/isolomatov/Sources/GAIN/rosetta/agents/TEMP/old-gen-r3/` |
| Hook bundle source | `/Users/isolomatov/Sources/GAIN/rosetta/hooks/dist/bundles/` |
| rosettify package (toolchain ref) | `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/package.json` |
| rosettify tsconfig (TS config ref) | `/Users/isolomatov/Sources/GAIN/rosetta/rosettify/tsconfig.json` |
| bump_versions.sh (version mgmt) | `/Users/isolomatov/Sources/GAIN/rosetta/scripts/bump_versions.sh` |
| IDE guide: Claude Code | `/Users/isolomatov/Sources/GAIN/rosetta/instructions/r3/core/configure/claude-code.md` |
| IDE guide: Cursor | `/Users/isolomatov/Sources/GAIN/rosetta/instructions/r3/core/configure/cursor.md` |
| IDE guide: GitHub Copilot | `/Users/isolomatov/Sources/GAIN/rosetta/instructions/r3/core/configure/github-copilot.md` |
| IDE guide: Codex | `/Users/isolomatov/Sources/GAIN/rosetta/instructions/r3/core/configure/codex.md` |
