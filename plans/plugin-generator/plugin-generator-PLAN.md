<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# Plugin Generator — Implementation Plan (WBS)

**Companion specs:** `plugin-generator-SPECS.md` (WHAT). This file = HOW: dependency-ordered WBS, commands, parity loop, parallelization.
**Goal:** TS/npx generator under `src/plugin-generator/`, byte-for-byte parity with `agents/TEMP/old-gen-r2|r3` (domain=core), fully autonomous (no HITL), all tests passing.
**Prohibited reads:** `scripts/plugin_generator.py`, `specs/plugin-generator.allium`.

## Build / Test Commands
- Install: `npm install` (in `src/plugin-generator/`).
- Run: `npx tsx src/cli.ts --release r2 --output-dir <tmp>` (or compiled `node dist/cli.js`).
- Typecheck: `npx tsc --noEmit`. Test: `npx vitest run`. Coverage: `npx vitest run --coverage` (≥80%).
- **Parity loop (the inner gate):**
  `npx tsx src/cli.ts --release r2 --domain core --output-dir /tmp/gen-r2 && diff -r /tmp/gen-r2 agents/TEMP/old-gen-r2` (then r3). Iterate per-target until `diff -r` is empty. Use `diff -rq` first, then per-file `diff` / `xxd | diff` on the first mismatch.

## Sequencing Overview
Foundations (T1) → types/VFS/serialization (T2–T4, parallelizable) → file processors (T5) → plugin processors (T6) → bootstrap/escaping (T7, highest risk) → spec data + targets (T8) → orchestration/CLI (T9) → parity convergence per target (T10) → tests (T11) → bundles/version tooling (T12) → docs/git (T13).

## WBS

### T1 — Project scaffold  [agent: engineer] [pred: none]
- **What/Where:** `src/plugin-generator/package.json` (bin, ESM, deps §9), `tsconfig.json` (extends rosettify), `src/` skeleton, vitest config.
- **AC:** `npm install` ok; `npx tsc --noEmit` passes on empty skeleton; `npx vitest run` runs 0 tests green. `npx tsx src/cli.ts --help` prints (stub).
- **NFR:** NFR-0008/0010. **FR:** FR-CLI-0001. **Watch:** keep deps pinned to rosettify majors; do NOT add a build step for consumers.

### T2 — Domain types  [engineer] [pred: T1]
- **Where:** `src/types.ts`. All PascalCase types from SPECS §3 (frames, SpecEntry, PluginSpec, ModelVocabulary, processor fn types).
- **AC:** compiles; no bare generic identifiers (FR-ARCH-0003). **FR:** FR-ARCH-0001/0002/0003/0030/0036/0039.

### T3 — VFS + directives + source resolution  [engineer] [pred: T2]  (parallel with T4)
- **Where:** `vfs/build-vfs.ts`, `vfs/directives.ts`, `vfs/source-resolver.ts`, `vfs/sort.ts`, `frames.ts`.
- **What:** build flat sorted immutable VFS from FS+filenames only (no content reads); tilde-directive parse/validate; release+domain resolve & left-right bundle; stable comparator; immer-based frame factories.
- **AC:** unit tests T11a green; VFS frozen; sort matches Python `sorted()` on fixtures (PARITY-5). **FR:** FR-ARCH-0010-0014/0020-0024, FR-CLI-0030/0031, NFR-0002.
- **Watch:** no current source uses directives (PARITY-14) — implement but expect zero effect on parity.

### T4 — Serialization primitives  [engineer] [pred: T2]  (parallel with T3)  ★parity-critical
- **Where:** `serialize/json.ts`, `serialize/toml.ts`, `serialize/markdown-index.ts`, `serialize/frontmatter.ts`.
- **What:** byte-exact emitters (key order, 2-space indent, no trailing spaces, trailing `\n`, LF). TOML field order `name,description,developer_instructions(""" """),model,model_reasoning_effort,sandbox_mode`. INDEX format per SPECS §6.3. Frontmatter model-line rewrite preserving layout.
- **AC:** T11b fixtures byte-match samples extracted from baseline (standalone `plugin.json`, a TOML, a rules/workflows INDEX). **NFR:** NFR-0001/0005. **Watch:** never rely on `JSON.stringify` default for the parity-bearing files; hand-control spacing.

### T5 — File processors  [engineer] [pred: T3,T4]
- **Where:** `file-processors/*`, `escaping/json-string.ts` (for normalize? no — for bootstrap), `spec/model-maps.ts` (consumed here).
- **What:** fileRead (gray-matter split/binary), fileApplyOverrides, fileBundle (concat, binary-guard), fileNormalizeModels (4 vocabularies incl. claude-scan + codex effort split, SPECS §7), fileRename (full-anchored, path-only), fileCodexAgentFormat (→TOML via T4, sandbox from `readonly`).
- **AC:** T11c green incl. claude `reviewer→sonnet` scan, codex gpt-first, rename never matches prose `agents`. **FR:** FR-ARCH-0040-0046, FR-COPY-0020-0022, FR-VAR-0040.

### T6 — Plugin processors (non-bootstrap)  [engineer] [pred: T5]
- **Where:** `plugin-processors/{cleanup,copy,process-spec-entries,rewrite-references,generate-indexes,inject-sections,render-templates,write}.ts`.
- **What:** per SPECS §5. rewrite-references lookup from frames+folder pairs, complete-token only. indexes from final paths (tag membership exact, heading alias, description fallback). inject at anchor. render handlebars (raw + `{{#if}}`). write (null/empty/dry-run).
- **AC:** T11d green; render r2 `{{#if}}`-false produces no leftover blank lines (PARITY-7). **FR:** FR-ARCH-0047-0055, FR-GEN-*, FR-COPY-0030-0034, FR-VAR-0072, FR-CLI-0050.

### T7 — Bootstrap assembly + IDE escaping  [engineer] [pred: T6]  ★HIGHEST parity risk
- **Where:** `plugin-processors/plugin-assemble-bootstrap.ts`, `bootstrap/{payload,copilot-lock}.ts`, `escaping/{shell,powershell,json-string}.ts`, `spec/bootstrap-manifest.ts`.
- **What:** assemble per-target payload in manifest order (SPECS §6.1), strip frontmatter, prefix on lead, fold plugin-root into lead, compact per-entry JSON, claude/codex `printf '%s' '<json>'` wrapper, copilot per-entry bash+pwsh **session-lock** wrapper (byte-exact from baseline `core-copilot/.github/plugin/hooks.json`), JSON-string escaping of `additionalContext`, size-limit soft error (NFR-0004), apply pluginRewriteReferences to payload strings only (FR-HOOK-0008).
- **AC:** assembled `{{{bootstrap_hooks_claude}}}` for claude r2 reproduces baseline line 6 byte-for-byte; copilot lock string matches; r2=8/r3=7 entries. **FR:** FR-HOOK-0001-0009, NFR-0004/0009. **Watch:** PARITY-1/4 — extract the exact escaping by decoding baseline; build the payload object first, then escape, then wrap.

### T8 — Spec data: releases, model maps, six targets  [engineer] [pred: T5,T7]
- **Where:** `spec/{releases,model-maps,targets,bootstrap-manifest}.ts`.
- **What:** r2/r3 descriptors (`deterministic_hooks`), exact model maps (decode any agent not in discovery §5 from baseline), the six PluginSpec values incl. SpecEntry lists, copilot 3×hooks.json (2 plugin-form copies + 1 standalone-form), codex hooks mirror, excludes, standalone parent seeding + manifest, baseSubfolder roots.
- **AC:** all six specs typecheck and feed a full run. **FR:** DATA-CFG-0001-0005, FR-VAR-0010-0072, FR-SEED-0001/0002, FR-COPY-0011.

### T9 — Orchestration + CLI + logging  [engineer] [pred: T8]
- **Where:** `generate.ts`, `cli.ts`, `index.ts`, `logging.ts`, `plugin-processors/plugin-sync-bundles.ts`.
- **What:** commander flags (SPECS §4), exported `generate()`, per-target independent pipeline run, run-to-completion error aggregation + exit status, pino logging (no content, verbose), bundle sync wiring, comprehensive `--help`.
- **AC:** `npx tsx src/cli.ts --release r2 --output-dir /tmp/gen-r2` produces all 6 folders; unknown release/domain → exit 1; dry-run writes nothing. **FR:** FR-CLI-0001/0002/0010-0042, FR-ARCH-0050, FR-HOOK-0020-0022.

### T10 — Parity convergence (per target)  [engineer] [pred: T9]  ★acceptance core
- **What:** run parity loop; drive `diff -r` to empty for each target, r2 then r3. Order easiest→hardest: claude → codex → cursor → copilot → cursor-standalone → copilot-standalone.
- **Sub-tasks (one per target, can parallelize after claude proves the pipeline):**
  T10a claude, T10b codex (TOML+mirror), T10c cursor (renames+refs), T10d copilot (3×hooks+lock), T10e cursor-standalone (inject), T10f copilot-standalone (relocate+prompts+inject).
- **AC:** `diff -rq /tmp/gen-r2/<t> agents/TEMP/old-gen-r2/<t>` empty, same r3. **NFR:** NFR-0001. **Watch:** first mismatch is usually whitespace/escaping — fix in T4/T7, not by special-casing.

### T11 — Tests  [agent: engineer+reviewer] [pred: T3–T9, finalize after T10]
- T11a VFS/directives/sort; T11b serialize/escaping fixtures; T11c file-processors; T11d plugin-processors; T11e model-maps; **T11f e2e sample harness** (self-defined core+acme instructions/output, SPECS §11); **T11g parity e2e** vs baseline.
- **AC:** `npx vitest run` green; coverage ≥80%; parity e2e asserts empty diff. **NFR:** NFR-0001-0005.

### T12 — Bundle/version tooling note  [engineer] [pred: T9]
- **What:** confirm `pluginSyncBundles` consumes `hooks/dist/bundles/<target>/*.js`; ignore `core-windsurf`; document version-source (preserved `2.0.40`) and OD-1 resolution in a short README in `src/plugin-generator/`.
- **AC:** r3 places 5 `.js` per target at correct hook folder; r2 removes them. **FR:** FR-HOOK-0020-0022, PARITY-10/15.

### T13 — Docs + git  [engineer] [pred: all]
- Update requirement `implementation`/`implementationNotes` to `Implemented` with file lists (requirements-use). Branch off `main`, commit, open PR. **HITL:** none (autonomous) — but stop+escalate to orchestrator if parity cannot reach empty diff for any target after focused investigation.

## Parallelization
- **Wave 1:** T1. **Wave 2:** T2. **Wave 3:** T3 ∥ T4. **Wave 4:** T5 (needs T3,T4). **Wave 5:** T6, then T7. **Wave 6:** T8, T9. **Wave 7:** T10a (proves pipeline), then T10b–T10f ∥. **Wave 8:** T11f/g + T12. **Wave 9:** T13.
- Single engineer: strictly sequential T1→T13. Multiple engineers: split T10b–f and T11a–e across agents after T10a green.

## Critical Risks (carry into execution)
1. **Bootstrap escaping (PARITY-1/4)** — decode baseline, mirror exactly; build payload→escape→wrap. Highest effort in T7.
2. **Handlebars whitespace (PARITY-7)** — verify r2 `{{#if}}`-false byte parity early in T6; apply `~` controls or post-normalize only if needed.
3. **Generator-owned serialization (T4)** — do not trust lib defaults for parity files.
4. **Claude model scan (PARITY-9)** — not first-model; test reviewer=sonnet.
5. **Copilot 3×hooks.json / codex mirror** — model as copy SpecEntries (T8), confirm MD5 equality post-gen.

## Open Decisions (resolved here — autonomous)
- **OD-1 (version/bump_versions.sh, PARITY-10):** Generator reads version from preserved `src/plugin-generator/plugins/<target>/...` (`2.0.40`) to match baseline. **Decision:** keep preserved source as version authority; document that `scripts/bump_versions.sh` must be extended to also bump `src/plugin-generator/plugins/` before production use (note in T12 README, not implemented now — out of scope for parity). Rationale: parity is measured at `2.0.40`; unifying bump tooling is a separate operational change.
- **OD-2 (stdout parity):** stdout/log lines are NOT a parity target (NFR-0001 = files). Keep human-readable; do not reverse-engineer Python stdout. Rationale: requirements scope parity to output FILES.
- **OD-3 (runner):** ship both `tsx`-based `npx` entry and a compiled `dist` to satisfy "no consumer build step" while keeping fast local dev. Rationale: NFR-0008.

</CRITICAL>
