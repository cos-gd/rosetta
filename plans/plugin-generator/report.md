# plugin-generator — Compliance Review (updated 2026-06-08)

Scope: FR-ARCH-0004, DATA-CFG-0002, FR-CLI-0001/0020/0021/0030, FR-VAR-0070, FR-ARCH-0049.

## Current state (2026-06-08)

`tsc` clean · **304 tests pass** · **r2 exit 0, 12 differing files** · **r3 exit 1, 22 differing files**.
All remaining diffs are in accepted buckets — no new-gen bugs outstanding.

## Remaining parity diffs (all accepted)

### Bucket A — AGENT-REF (~6 r2, ~6 r3) — accept new-gen
Files: `core-copilot/commands/self-help-flow.md`, `pa-knowledge-base.md`, `pa-rosetta.md`, copilot-standalone mirrors.
New gen correctly rewrites `agents/X.md → agents/X.agent.md` (per FR-ARCH-0049). Old gen leaves `.md` = old-gen BUG.

### Bucket D — OLD-GEN double-rewrite (~6 r2, ~5 r3) — accept new-gen
Files: `core-copilot-standalone/.github/configure/*.md`, `pa-rosetta-intro-for-AI.md`, `bootstrap-execution-policy.instructions.md`.
Old gen over-aggressively applied `commands/ → prompts/` rename or double-rewrote folder names = old-gen BUG.

### Decision 3 — plugin-files-mode content change cascade (~11 r3-only) — accept as known
`plugin-files-mode.md` source content changed after baseline was created (new `<phase-steps-json-string>` param). Cascades to 5× hooks.json (bootstrap embeds its body). Do NOT regenerate baseline.
Files: 6× plugin-files-mode.md/mdc/.instructions.md + 5× hooks.json.

## Discrepancies still open

| Location | Req | Issue | Status |
|---|---|---|---|
| `types.ts:124` + `spec/targets.ts:152,184,226,273,368,464` + `plugin-sync-bundles.ts:86` | DATA-CFG-0002 / FR-ARCH-0004 | `createHookFolderInR2` bespoke per-release flag | **task #17, deferred — owner must confirm removal** |
| `bootstrap/payload.ts:57-59` | FR-VAR-0070 | cursor skips assembly+size-check (3 violations now, target 4) | **task #6, pending** |
| `types.ts:92` | DATA-CFG-0002 | unused `includeBootstrapRules` per-target flag | **open, owner decision** |
| `plugin-sync-bundles.ts:46` | FR-ARCH-0004 | branch on `release.deterministicHooks` | **open, owner decision** |

## Fixed (this session)

| Fix | Location | What changed |
|---|---|---|
| Ghost frame ALL processors | `plugin-process-spec-entries.ts:56-79` | Removed `processor.name === 'fileRenameProcessor'` check; run ALL processors on null-content ghost frame (content processors no-op on empty source) |
| Ghost frame same-folder guard | `plugin-rewrite-references.ts:103-115` | Ghost frames (`source.length===0 && target_contents===null`) only emit pairs for same-folder renames; cross-folder pairs rejected |
| Debug cruft removed | `plugin-rewrite-references.ts` | Removed debug stderr.write block and `debugFile?` param |
| Scratch file deleted | `src/debug-pairs-temp.ts` | Untracked scratch file |

## Verified OK

FR-CLI-0001 — CLI entry with optional release/domain/source/output args and exit code (cli.ts).
FR-CLI-0020 — global --source default cwd, derived inputs, per-source overrides, no repo-root arg.
FR-CLI-0021 — --output defaults to `<source>/plugins`.
FR-CLI-0030 — --domain default `core`, resolves `<instructionsSource>/<release>/<domain>/`.

## Open work items

### A. Make cursor bootstrap uniform (task #6)
Remove short-circuit at `bootstrap/payload.ts:57-59`. Cursor assembly runs (produces empty payload per GT-0) but size-check also runs → r3 reports **4** violations (not 3). Files unaffected; cursor hooks.json stays empty (template doesn't inject the placeholder). **Pending implementation.**

### B. Re-review `createHookFolderInR2` (task #17, deferred)
Bespoke per-release flag — forbidden by DATA-CFG-0002 / FR-ARCH-0004. Finding: likely redundant (codex `.codex/hooks/` correctly absent in r2 because folders emerge from rendered files). Resolution likely delete it. **User must confirm before removal.**

### C. Full requirements-deviation audit (task #18, deferred — ASK user before spawning)
Reviewer subagent: audit all `src/plugin-generator` vs every requirement. Known seeds: `createHookFolderInR2`, `includeBootstrapRules`, `deterministicHooks` branch.

### D. Tests + docs
Coverage re-verify after task #6. Update `IMPLEMENTATION.md`. `processor-audit.md` (FR-ARCH-0004 reusability audit) still MISSING.

### E. Requirements (Draft → review)
All 2026-06-05/06-08 requirement edits are `Draft` pending owner review (FR-ARCH-0004, FR-VAR-0070, FR-CLI source model, FR-COPY-0011 shell-schemas, FR-HOOK enrichments). Owner to approve.

### F. Distribution (NFR-0008, not started)
`npx` zero-build: ship compiled `dist` or document tsx. `bin` currently `src/cli.ts` (tsx).

## Baseline regen recipe
```
cd /Users/isolomatov/Sources/GAIN/rosetta
rm -rf agents/TEMP/old-gen-r2 agents/TEMP/old-gen-r3
mkdir -p agents/TEMP/old-gen-r2 agents/TEMP/old-gen-r3
cp -R src/plugin-generator/plugins/. agents/TEMP/old-gen-r2/
cp -R src/plugin-generator/plugins/. agents/TEMP/old-gen-r3/
venv/bin/python scripts/plugin_generator.py --release r2 --output-dir agents/TEMP/old-gen-r2 >/dev/null 2>&1
venv/bin/python scripts/plugin_generator.py --release r3 --output-dir agents/TEMP/old-gen-r3 >/dev/null 2>&1
find agents/TEMP/old-gen-r2 agents/TEMP/old-gen-r3 -type d -name shell-schemas -prune -exec rm -rf {} +
find agents/TEMP/old-gen-r2 agents/TEMP/old-gen-r3 -type d -name templates -empty -delete
```
