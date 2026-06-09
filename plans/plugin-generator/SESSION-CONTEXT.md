# plugin-generator — Session Context Handoff (updated 2026-06-08)

Compact state to **fully restart** this session and continue the TS-rewrite parity/compliance effort without re-discovery. Read this + `report.md` first.

## Goal
`src/plugin-generator/` (TypeScript, ESM, run via npx) re-architects the old Python `scripts/plugin_generator.py`. Targets: (1) byte-for-byte parity (NFR-0001) with the Python output, AND (2) the clean FR-ARCH two-tier processor architecture (universal/reusable processors, data-driven specs). Both must hold. Rewrite is mid-refactor; partial compliance expected.

## HARD PROHIBITIONS
- NEVER read `scripts/plugin_generator.py` or `specs/plugin-generator.allium` (old architecture). Use as DATA only: the requirements, the baselines, and the preserved templates.
- NEVER modify `agents/TEMP/` (the parity baseline) except via the regen recipe below.

## Owner standing rules (LOCKED — this session)
- **Requirements are the source of truth and FROZEN.** Do NOT change ANY requirement without explicit owner instruction. The old generator is a *reference with bugs*; where it violates a requirement, the NEW gen is correct and SHOULD differ — do not reproduce old-gen bugs.
- **No autonomous design decisions.** ASK the owner first. "Auto/autonomous mode" now means tool/permission approvals ONLY — nothing else.
- `target_contents === null` ⇒ file NOT written (FR-ARCH-0036), but the frame still exists and still carries its rename (so other files' references resolve).
- r3 oversize bootstrap is CORRECT (r3 `plugin-files-mode` ~11k > 10000 → NFR-0004 soft error, exit 1, output still emitted).

## Verified current state (2026-06-08)
- `npx tsc --noEmit`: **clean**. `npx vitest run`: **304 pass / 31 files**.
- Parity: **r2 exit 0, 12 differing files · r3 exit 1, 22 differing files** — ALL in accepted buckets, ZERO structural/Only-in diffs.
- Ghost frame fix complete: removed `processor.name === 'fileRenameProcessor'` check; run ALL processors on ghost frame. Added same-folder guard in `buildRenamePairs` for ghost frames (source.length===0 && target_contents===null).

## Accepted diff buckets (owner decisions locked)

### Bucket A — AGENT-REF (~6 r2 diffs, ~6 r3 diffs)
Files like `core-copilot/commands/self-help-flow.md`, `pa-knowledge-base.md`, `pa-rosetta.md`.
New gen rewrites `agents/X.md → agents/X.agent.md` (correct per FR-ARCH-0049). Old gen leaves `.md`. **Decision: accept new-gen (old-gen BUG).**

### Bucket D — OLD-GEN double-rewrite (~6 r2 diffs, ~5 r3 diffs)
Files like `core-copilot-standalone/.github/configure/*.md`, `pa-rosetta-intro-for-AI.md`.
Old gen over-aggressively applied `commands/ → prompts/` rename or double-rewrote folder names. **Decision: accept new-gen (old-gen BUG).**

### Decision 3 — plugin-files-mode content change cascade (~11 r3-only diffs)
`plugin-files-mode.md` source content changed after baseline was created (new `<phase-steps-json-string>` param in plan-manager command signatures). Cascades to hooks.json (bootstrap embeds its body).
Files: 6× plugin-files-mode.md/mdc/.instructions.md + 5× hooks.json (core-claude, core-codex×2, core-copilot×2). **Decision: accept as known differences (do not regenerate baseline).**

## Ghost frame design (FR-ARCH-0049)

**Ghost frames**: null-content `FileProcessingFrame` entries (`source: [], target_contents: null`) created for excluded files to populate the reference-rewrite lookup.

**`plugin-process-spec-entries.ts`** (fixed): for excluded files, run ALL processors on ghost frame. `fileRead` is a no-op on empty source (returns immediately). Only `fileRename` changes the target; content processors guard `target_contents === null`. Previously broken: `processor.name === 'fileRenameProcessor'` never matched anonymous arrow fns.

**`buildRenamePairs`** (fixed): ghost frames (detected by `source.length === 0 && target_contents === null`) only emit pairs for same-folder renames (e.g. `.md → .mdc`). Cross-folder ghost pairs (excluded from entry A → instructions/, processed by entry B → rules/) are filtered out to prevent wrong rewrites.

## Remaining compliance discrepancies (pending owner decisions)

- **`createHookFolderInR2`** — bespoke per-release flag. Present at `types.ts:124`, `spec/targets.ts:152,184,226,273,368,464`, branched at `plugin-sync-bundles.ts:86`. Likely redundant (codex `.codex/hooks/` correctly absent in r2 because folders emerge from rendered files). **OWNER must confirm before removal (task #17, deferred).**
- **Cursor bootstrap not uniform:** `bootstrap/payload.ts:57-59` short-circuits cursor (`hookEntryShape === 'cursor'` → returns empty, skips assembly+size-check). Per FR-VAR-0070 assembly+size-check must be uniform for ALL targets. Currently r3 reports **3** soft violations; **target 4** (cursor included). Files unaffected (cursor hooks.json stays empty). **Task #6 pending.**
- **Open (owner decision):** unused per-target `includeBootstrapRules` (`types.ts`); the `deterministicHooks` release branch in `plugin-sync-bundles.ts:46` (is a release-conditional acceptable as data, or must it be reshaped?).

## Open task list
- **#5** Fix ghost-frame rename → **COMPLETED** (2026-06-08)
- **#6** Make cursor bootstrap assembly+size-check uniform (FR-VAR-0070) → **pending** (requires owner decision on approach)
- **#7** Re-verify: parity, tests, exit codes, coverage → partially done; re-run after #6
- **#17** Re-review/remove `createHookFolderInR2` → **pending owner confirm**
- **#18** Full requirements-deviation audit → **ask owner before spawning**

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
Counts after: r2=880, r3=946. Preserved version currently **2.0.42**.

## Parity check recipe (run gen + diff as SEPARATE statements — r3 exits 1 by design)
```
cd /Users/isolomatov/Sources/GAIN/rosetta/src/plugin-generator
S=/Users/isolomatov/Sources/GAIN/rosetta
rm -rf /tmp/g2 /tmp/g3
npx tsx src/cli.ts --release r2 --domain core --source "$S" --output /tmp/g2; diff -rq /tmp/g2 "$S/agents/TEMP/old-gen-r2"
npx tsx src/cli.ts --release r3 --domain core --source "$S" --output /tmp/g3; diff -rq /tmp/g3 "$S/agents/TEMP/old-gen-r3"
```

## Key files / docs
- Requirements: `docs/requirements/plugin-generator/*` (FR-ARCH-0004, FR-VAR-0070, FR-CLI source model, FR-COPY-0011, DATA-CFG-0002; CHANGES.md logs RECONCILIATION-1..9; many units `Draft` pending owner approval).
- Ground truth (byte facts, decoded from baseline): `plans/plugin-generator/GROUND-TRUTH.md`.
- Specs/plan: `plans/plugin-generator/plugin-generator-SPECS.md`, `plugin-generator-PLAN.md`.
- Code: `src/plugin-generator/src/` (cli, generate, types, vfs/*, file-processors/*, plugin-processors/*, serialize/*, escaping/*, bootstrap/*, spec/*). Tests: `src/plugin-generator/tests/{unit,e2e,fixtures}`.
