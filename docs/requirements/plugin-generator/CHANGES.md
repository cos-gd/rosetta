# plugin-generator — Requirements Change Log

## 2026-06-04 — Baseline reconciliation (three contradictions)

**Context:** Implementation planning for the TypeScript/npx re-implementation revealed three contradictions between the reverse-engineered requirements and the actual generator baseline output (`agents/TEMP/old-gen-r2/`, `agents/TEMP/old-gen-r3/`). Per project owner's instruction, requirements are corrected to match baseline; status set to Draft pending owner review.

---

### RECONCILIATION-1 — Claude model normalization algorithm (FR-COPY-0020, FR-COPY-0021)

**Files:** `FR-COPY.md`

**Original:** FR-COPY-0020 stated "selecting the first model from a comma-separated list" as universal across all IDEs. FR-COPY-0021 stated Claude "infers from substrings" without clarifying the scan strategy.

**Baseline reality:** Claude does NOT take the first model overall. It scans the comma-separated list for the first token containing a claude-compatible substring (`opus`, `sonnet`, or `haiku`) and maps it to the Claude short name, skipping any leading non-claude tokens (e.g. `gpt-*`, `gemini-*`). Falls back to `inherit` if no claude-compatible token is found. Cursor and Copilot do take the first model overall (confirmed — behavior unchanged). Codex scans for first `gpt-*` token (unchanged).

**Baseline evidence (r3):**
- `reviewer`: source `model: gpt-5.4-medium, gemini-3.1-pro-preview, claude-4.6-sonnet` → claude output `model: sonnet` (skips gpt- and gemini-, picks first claude-* = `claude-4.6-sonnet`, substring `sonnet`)
- `validator`: source `model: gpt-5.4-medium, gemini-3.1-pro-preview, claude-4.6-sonnet` → claude output `model: sonnet`
- `architect`: source `model: claude-4.8-opus-high, gpt-5.5-high, gemini-3.1-pro-high` → claude output `model: opus` (first token is claude-*, contains `opus`)
- Cursor `reviewer`: `model: gpt-5.4` (first-model-overall → `gpt-5.4-medium` → CURSOR_MODEL_MAP → `gpt-5.4`)
- Copilot `reviewer`: `model: GPT-5.4` (first-model-overall → COPILOT_MODEL_MAP)

**Changes:** FR-COPY-0020 statement updated to describe per-IDE selection strategy with cross-reference to FR-COPY-0021/0022. FR-COPY-0021 statement rewritten to describe the scan-for-first-claude algorithm with substring matching and `inherit` fallback; acceptance criteria expanded with concrete examples from the baseline. Both units set to status `Draft`.

---

### RECONCILIATION-2 — core-copilot hooks.json count and locations (FR-VAR-0030, STRUCTURES.md)

**Files:** `FR-VAR.md`, `STRUCTURES.md`, `ASSUMPTIONS.md`

**Original:** FR-VAR-0030 described runtime config at the plugin root as "a `SpecEntry`/`fileRename()` target." STRUCTURES.md showed only two hooks-related entries (`hooks.json` root and `hooks/hooks.json + hooks/*.js`) and omitted `.github/plugin/hooks.json` from the generated-file listing. No requirement described three distinct hooks.json files.

**Baseline reality:** `core-copilot` contains exactly three `hooks.json` files at distinct paths:
1. `.github/plugin/hooks.json` — plugin-form hooks, rendered from `.github/plugin/hooks.json.tmpl`
2. `hooks.json` (plugin root) — alternate-name copy of `.github/plugin/hooks.json`; byte-identical
3. `hooks/hooks.json` — standalone-form hooks, rendered from `hooks/hooks.json.tmpl`; distinct content (`"sessionStart": []`)

**Changes:** FR-VAR-0030 statement updated to enumerate all three files with their provenance and byte-identity constraint. New FR-VAR-0031 added to capture the alternate-name copy mechanism. STRUCTURES.md core-copilot section rewritten to show all three files with provenance annotations. AC-14 added to ASSUMPTIONS.md. FR-STRUCT-0010 depends updated to include FR-VAR-0031.

---

### RECONCILIATION-3 — Root copilot hooks.json is a copy, not a rename (FR-VAR-0030 area → FR-VAR-0031)

**Files:** `FR-VAR.md`

**Original:** FR-VAR-0030 implied the root `hooks.json` was produced by a `SpecEntry`/`fileRename()` operation, which would eliminate the source path from the output and result in only one file.

**Baseline reality:** Both `hooks.json` (root) and `.github/plugin/hooks.json` are present simultaneously with byte-identical content (r2 MD5: `b53bc4cfbc0c19eb6ceebd4717211b6c` for both). This is an alternate-name duplication (FR-COPY-0033 pattern), not a rename. A `fileRename()` would remove one of them.

**Changes:** FR-VAR-0031 (new unit) explicitly requires the alternate-name copy mechanism (`SpecEntry`, not `fileRename()`), the coexistence of both files, and their byte-identity. FR-VAR-0030 depends updated to include FR-COPY-0033 and FR-VAR-0031.

---

## 2026-06-04 — Orchestrator ground-truth pass (bootstrap payload, decoded from baseline)

**Context:** The orchestrator personally read all requirements + the tech specs/plan and byte-decoded the baseline bootstrap structures to pin parity ground truth before implementation (engineer-error prevention). Findings captured in the authoritative `plans/plugin-generator/GROUND-TRUTH.md` and reconciled into requirements below. A SPEC error (plugin-root "folded into lead", undercounted entries) was found and corrected in `plugin-generator-SPECS.md`; the *requirement* (FR-HOOK-0007) was already correct in intent and is now enriched with exact bytes.

### RECONCILIATION-4 — Plugin-root entry is a separate appended entry; exact counts (FR-HOOK-0007)

**Files:** `FR-HOOK.md`

**Baseline reality:** The plugin-root path entry is a distinct, final entry appended to each session-hook target's bootstrap payload — NOT folded into the lead document. Payload entry count = (present manifest docs) + 1. Confirmed: claude/codex/copilot emit **9 entries for r2, 8 for r3**. Exact per-IDE plugin-root command strings decoded (claude `${CLAUDE_PLUGIN_ROOT}`; codex workspace-root probe → `.agents`; copilot agentPlugins-base probe via `commands/coding-flow.md` → `$root`). Cursor emits no bootstrap payload at all (no template placeholder).

**Changes:** FR-HOOK-0007 statement + acceptance enriched with the separate-entry rule, the 9/8 counts, the exact claude/codex/copilot strings, and the cursor-no-payload fact; status → `Draft`.

### RECONCILIATION-5 — Exact per-IDE bootstrap entry field shapes (FR-HOOK-0005)

**Files:** `FR-HOOK.md`

**Baseline reality:** claude entries carry `"once": true` under `SessionStart[0]` (`matcher:"startup"`); codex entries carry `statusMessage:"Loading Rosetta bootstrap"`+`timeout:30` (no `once`, `matcher:"startup|resume"`); copilot entries carry `bash`+`powershell` under lowercase `sessionStart` (`version:1`, no matcher) with a per-entry 0-based lock index. Entries are joined by `, ` and injected raw into the preserved template's `{{{bootstrap_hooks_<ide>}}}` placeholder; the wrapper (matcher, advisory blocks, version) is template-literal.

**Changes:** FR-HOOK-0005 acceptance enriched with the exact per-IDE entry shapes, matchers, and join separator; status → `Draft`.

### RECONCILIATION-6 — Exclude templates/shell-schemas entirely (FR-COPY-0011)

**Files:** `FR-COPY.md`, `GROUND-TRUTH.md`, `plugin-generator-SPECS.md`

**Context:** Owner instruction 2026-06-05: `templates/shell-schemas/*` (agent-shell.md, skill-shell.md, workflow-shell.md) are authoring-only frontmatter schemas, not needed in any plugin. Exclude them.

**Changes:** FR-COPY-0011 statement/acceptance extended to exclude the whole `templates/shell-schemas/**` folder (exclude now supports folder globs); status → `Draft`. The parity baseline (`agents/TEMP/old-gen-r2|r3`) was regenerated and the 12 shell-schemas files per release removed so the baseline equals the new generator's intended output. New generator code MUST add `templates/shell-schemas/**` to the templates SpecEntry exclude for every target.
