# plugin-generator — Session Context Handoff (updated 2026-06-08)

Compact state to **fully restart** this session and continue the TS-rewrite parity/compliance effort without re-discovery. Read this + `report-left.md` first.

## Goal
`src/plugin-generator/` (TypeScript, ESM, run via npx) re-architects the old Python `scripts/plugin_generator.py`. Targets: (1) byte-for-byte parity (NFR-0001) with the Python output, AND (2) the clean FR-ARCH two-tier processor architecture (universal/reusable processors, data-driven specs). Both must hold. Rewrite is mid-refactor; partial compliance expected.

## HARD PROHIBITIONS
- NEVER read `scripts/plugin_generator.py` or `specs/plugin-generator.allium` (old architecture). Use as DATA only: the requirements, the baselines, and the preserved templates.
- NEVER modify `agents/TEMP/` (the parity baseline) except via the regen recipe below.

## Owner standing rules (LOCKED — this session)
- **Requirements are the source of truth and FROZEN.** Do NOT change ANY requirement without explicit owner instruction. The old generator is a *reference with bugs*; where it violates a requirement, the NEW gen is correct and SHOULD differ — do not reproduce old-gen bugs.
- **No autonomous design decisions.** ASK the owner first. "Auto/autonomous mode" now means tool/permission approvals ONLY — nothing else.
- **`exclude` (SpecEntry param) is THE mechanism** for omitting `bootstrap.md`/`local-files-mode.md`/`templates/shell-schemas/**` — not regex, not parity hacks.
- `target_contents === null` ⇒ file NOT written (FR-ARCH-0036), but the frame still exists and still carries its rename (so other files' references resolve).
- r3 oversize bootstrap is CORRECT (r3 `plugin-files-mode` ~11k > 10000 → NFR-0004 soft error, exit 1, output still emitted). Owner fixes the file later. Do NOT "fix" it.

## Verified current state (2026-06-08)
- `npx tsc --noEmit`: **clean**. `npx vitest run`: **304 pass / 31 files**.
- Parity: **r2 exit 0, 20 differing files · r3 exit 1, 19 differing files** — ALL are reference-rewriting content diffs, ZERO structural/Only-in diffs.
- `src/plugin-generator/` is committed; current refactor is **uncommitted** (10 modified files, see `git status`).
- Removed already: `bootstrapStrategy`, `extensionRewrites`, `cascadedFolderRewrites`, `ensureDirs`, `repoRoot`/`--repo-root` (CLI is now `--source` model). `__MD_TO_MDC__` sentinels gone.
- `exclude` reimplemented as **ghost frames** (`plugin-process-spec-entries.ts:48-84`): excluded file → null-content frame run through rename processors so its path-change enters the rewrite lookup.

## The 20/19 parity diffs — two buckets (root-caused)
1. **AGENT-REF (~6 files, e.g. `core-copilot/commands/self-help-flow.md`):** new gen rewrites body refs `agents/X.md`→`agents/X.agent.md` (the real emitted filename — CORRECT per FR-ARCH-0049). Old gen leaves `agents/X.md` → **old-gen BUG**. **Decision pending owner: accept new-gen (baseline "expected to differ" here).**
2. **EXCLUDED-REF (~14 files, e.g. `core-cursor/skills/init-workspace-rules/SKILL.md`):** refs to excluded `rules/bootstrap.md`/`local-files-mode.md`: old gen → `.mdc`, new gen → stays `.md`. Root cause: the **ghost frame does NOT carry the `.md→.mdc` rename**, so refs don't resolve. **Fix: make ghost frame run the rename** (then matches BOTH requirements and baseline). Hinges on FR-ARCH-0049 main-clause vs the parenthetical "no reference rewriting needed toward [excluded]" — RECONCILE wording with owner (audit #18).
- NOTE: only the sampled diffs are classified; **classify ALL 39** to be certain nothing else hides.

## Remaining compliance discrepancies (FR-ARCH-0004 / DATA-CFG-0002 / FR-VAR-0070)
- **`createHookFolderInR2`** — bespoke per-release flag. Present at `types.ts:124`, `spec/targets.ts:152,184,226,273,368,464`, branched at `plugin-sync-bundles.ts:86`. Finding: redundant (codex `.codex/hooks/` correctly absent in r2 because folders emerge from rendered files). Likely **delete**; if a forced-empty folder is ever needed use a generic `createFolder(path)`. **OWNER must confirm before removal (task #17).**
- **DEBUG cruft (remove):** `plugin-rewrite-references.ts:25-26` branches on concrete target `core-copilot-standalone`; stray DEBUG `stderr.write` at `:174`. Untracked scratch file **`src/debug-pairs-temp.ts` — delete.**
- **Cursor bootstrap not uniform:** `bootstrap/payload.ts:57-59` short-circuits cursor (`hookEntryShape === 'cursor'` → returns empty, skips assembly+size-check). Per FR-VAR-0070 assembly+size-check must be **uniform for ALL targets**; delivery is decided only by whether the preserved template injects the `{{{bootstrap_hooks_<ide>}}}` placeholder. Currently r3 reports **3** soft violations; **target 4** (cursor included). Files unaffected (cursor hooks.json stays empty).
- **Open (owner decision):** unused per-target `includeBootstrapRules` (`types.ts`); the `deterministicHooks` release branch in `plugin-sync-bundles.ts:46` (is a release-conditional acceptable as data, or must it be reshaped?).

## Suggested next steps (NOT started — ask owner before design choices)
1. Fix ghost-frame to carry rename → resolve EXCLUDED-REF bucket (after owner confirms FR-ARCH-0049 reading).
2. Owner confirm AGENT-REF bucket = accept new-gen; classify all 39 diffs.
3. Make `pluginAssembleBootstrap`/`payload.ts` uniform for cursor (assemble + size-check) → r3 = 4 violations.
4. Remove DEBUG branches + `debug-pairs-temp.ts`. Owner-confirm `createHookFolderInR2` removal (task #17).
5. Produce **`processor-audit.md`** (FR-ARCH-0004 reusability audit — currently MISSING).
6. Full requirements-deviation audit via reviewer subagent (task #18) — **ASK owner before spawning.**
7. Re-verify: r2/r3 byte-diff empty (modulo accepted AGENT-REF), tests green, r2 exit 0 / r3 exit 1 (4 violations), coverage ≥80%.

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
- What's left (concise): `plans/plugin-generator/report-left.md`. Prior compliance scan: `plans/plugin-generator/report.md`.
- Code: `src/plugin-generator/src/` (cli, generate, types, vfs/*, file-processors/*, plugin-processors/*, serialize/*, escaping/*, bootstrap/*, spec/*). Tests: `src/plugin-generator/tests/{unit,e2e,fixtures}`.

## Open task list (rosettify/todo IDs from this session)
- #16 Refactor to clean architecture (in progress).
- #17 Re-review/remove `createHookFolderInR2` (pending owner confirm).
- #18 Full requirements-deviation audit (ask owner before spawning).
