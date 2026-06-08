# plugin-generator — Changed-Requirement Compliance Review (2026-06-05)

Scope: FR-ARCH-0004, DATA-CFG-0002, FR-CLI-0001/0020/0021/0030, FR-VAR-0070. Read-only review of `src/plugin-generator/`.

## Discrepancies

src/plugin-generator/src/types.ts:124 - DATA-CFG-0002 - forbidden createHookFolderInR2 flag still declared
src/plugin-generator/src/spec/targets.ts:152,184,226,273,368,464 - DATA-CFG-0002 - createHookFolderInR2 set per target
src/plugin-generator/src/plugin-processors/plugin-sync-bundles.ts:86 - FR-ARCH-0004 - processor branches on bespoke flag
src/plugin-generator/src/plugin-processors/plugin-rewrite-references.ts:26-31 - FR-ARCH-0004 - debug branch on concrete target
src/plugin-generator/src/bootstrap/payload.ts:57-60 - FR-VAR-0070 - cursor skips assembly and size-check

## Verified OK

FR-CLI-0001 - CLI entry with optional release/domain/source/output args and exit code (cli.ts).
FR-CLI-0020 - global --source default cwd, derived inputs, per-source overrides, no repo-root arg (cli.ts).
FR-CLI-0021 - --output defaults to `<source>/plugins` (cli.ts:68).
FR-CLI-0030 - --domain default `core`, resolves `<instructionsSource>/<release>/<domain>/` (source-resolver.ts:22).

## Open

src/plugin-generator/src/types.ts:92 - DATA-CFG-0002 - unused per-target includeBootstrapRules flag, needs human decision
src/plugin-generator/src/plugin-processors/plugin-sync-bundles.ts:46 - FR-ARCH-0004 - branch on release deterministicHooks, needs human decision

# Additional Left Overs

**As of 2026-06-08.** Verified state: `tsc` clean · 304 tests pass · r2 exit 0 · r3 exit 1.
Baseline: `agents/TEMP/old-gen-r{2,3}` (880/946 files), regenerated at preserved v2.0.42, `templates/` dropped.

## Current parity gap
- **r2: 20 differing files · r3: 19** — all content (reference rewriting), no structural/Only-in diffs.
- Two buckets (verified on a sample, NOT all 39 classified yet):
  - **AGENT-REF (~6):** new gen rewrites body refs `agents/X.md`→`agents/X.agent.md` (real filename, correct per FR-ARCH-0049). **Old gen leaves `agents/X.md` = old-gen BUG.** Decision: new gen wins, accept the diff. → **needs user confirm**, then baseline is "expected to differ" here.
  - **EXCLUDED-REF (~14):** refs to excluded `rules/bootstrap.md`/`local-files-mode.md` — old gen rewrites to `.mdc`, new gen keeps `.md`. Root cause: excluded files must become a **null-content, path-renamed "ghost" frame** (FR-ARCH-0036 + 0049) so the rename is in the lookup and refs resolve; the ghost frame currently does NOT carry the `.md→.mdc` rename. → **fix implementation** (then matches both requirements and baseline). Hinges on FR-ARCH-0049 main-clause vs parenthetical — confirm in audit (#18).

## Open work items

### A. Finish clean-architecture refactor (task #16, in progress)
1. **Ghost-frame rename** — excluded files must carry their rename (`.md→.mdc`) so references rewrite. Fixes the ~14 EXCLUDED-REF diffs. (FR-ARCH-0036/0049)
2. **Agent-ref diffs** — confirm with user these are old-gen bugs to accept; classify ALL 39 diffs into the two buckets to be certain nothing else hides.
3. **Uniform bootstrap size-check** — cursor is NOT size-checked yet → r3 reports **3** violations; target **4** (add cursor `bootstrapManifest`). (FR-VAR-0070, NFR-0004) Files unaffected.
4. **processor-audit.md** — MISSING; produce the FR-ARCH-0004 reusability audit (list every processor naming/branching on a concrete target/release/folder; note `createHookFolderInR2` as deferred).
5. Re-verify: r2/r3 empty `diff` (after accepting agent-ref bucket), tests green, r2 exit 0 / r3 exit 1 (4 violations).

### B. Re-review `createHookFolderInR2` (task #17, deferred)
- Bespoke per-release flag in `pluginSyncBundles` — forbidden by DATA-CFG-0002 / FR-ARCH-0004. Finding: redundant (codex `.codex/hooks/` correctly absent in r2 because folders emerge from rendered files). Resolution likely **delete it**; verify parity holds. Replace with generic `createFolder(path)` only if a forced-empty folder is ever genuinely needed (currently none). **User to confirm before removal.**

### C. Full requirements-deviation audit (task #18, do later — ASK user before spawning)
- Reviewer subagent: audit ALL `src/plugin-generator` vs EVERY requirement (FR-ARCH/COPY/GEN/HOOK/VAR/CLI, NFR, DATA-CFG); deviation list (file:line + req). No code changes.
- Known seeds: ghost-frame rename (A1), `createHookFolderInR2` (B), and confirm which baseline diffs are old-gen bugs (new gen correct) vs new-gen bugs.
- Reconcile FR-COPY-0011 ("no frame for excluded") vs FR-ARCH-0049 ("null-content path-changed frame") wording with user.

### D. Tests + docs (after A–C)
- Update/keep-green tests touched by refactor (source-model CLI, frame-derived rewrite, removed fields). Currently 304 green; re-confirm after A.
- Verify dry-run = 0 files, verbose adds detail, coverage ≥80% (was 86% branch).
- Update `IMPLEMENTATION.md` to source-model + clean-arch; `MEMORY.md` lessons.

### E. Requirements (Draft → review)
- All 2026-06-05/06-08 requirement edits are `Draft` pending owner review (FR-ARCH-0004, FR-VAR-0070, FR-CLI source model, FR-COPY-0011 shell-schemas, FR-HOOK enrichments, FR-COPY/FR-VAR baseline reconciliations). Owner to approve.

### F. Distribution (NFR-0008, not started)
- `npx` zero-build: ship compiled `dist` or document tsx. `bin` currently `src/cli.ts` (tsx).

## Standing rules (from owner, this session)
- **Requirements are source of truth and FROZEN** — do not change any requirement without explicit user instruction.
- **No autonomous design decisions** — ASK user first; "auto mode" = tool/permission approvals only.
- Old generator is a reference with bugs; where it violates a requirement, new gen is correct and SHOULD differ (don't reproduce old-gen bugs).
- Baseline regen recipe: copy `src/plugin-generator/plugins/.` into `agents/TEMP/old-gen-r{2,3}`, run old python gen, then `rm -rf` shell-schemas dirs + empty `templates/` dirs, rebuild manifests.
