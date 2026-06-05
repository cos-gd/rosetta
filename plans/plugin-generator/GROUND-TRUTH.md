<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# Plugin Generator — Parity Ground Truth (authoritative, baseline-decoded)

**Authority:** This file is the byte-level parity bible. It was decoded **directly from the baseline outputs** `agents/TEMP/old-gen-r2/` and `agents/TEMP/old-gen-r3/` and the **preserved templates** under `src/plugin-generator/plugins/<target>/` by the orchestrator. Where the SPECS (`plugin-generator-SPECS.md`) and this file disagree, **this file wins** (it is decoded from the actual bytes; the SPECS had two errors, fixed below). Where this file and the **requirements** (`docs/requirements/plugin-generator/*`) disagree, raise it — they currently agree once SPEC §6.1 is corrected.
**Prohibited reads (NEVER):** `scripts/plugin_generator.py`, `specs/plugin-generator.allium`.
**Parity oracle:** `diff -rq <generated> agents/TEMP/old-gen-r{2,3}` must be empty. Baseline sizes: r2 = 892 files, r3 = 958 files. Per-target file counts (r2 / r3): claude 149/160, codex 150/161, copilot 152/163, copilot-standalone 145/156, cursor 151/162, cursor-standalone 145/156.

---

## GT-0 — Two SPEC errors this file corrects (READ FIRST)

1. **SPEC §6.1 says the plugin-root path entry is "folded into the lead document's body (CLAUDE_PLUGIN_ROOT appears once here, not a separate entry)" and that claude has 8 entries (r2)/7 (r3). THIS IS WRONG.** The plugin-root path entry is a **separate, final, generated entry** appended to the `bootstrap_hooks_<ide>` payload (this matches the *requirement* FR-HOOK-0007 "append … a session-start entry", which is correct). **Actual entry counts:** claude **r2 = 9, r3 = 8**; codex **r2 = 9, r3 = 8**; copilot **r2 = 9, r3 = 8**. The count = (number of present bootstrap-manifest documents) + 1 (the appended plugin-root entry).
2. **SPEC implies cursor marketplace carries a bootstrap payload via session hooks.** Reality: **cursor emits NO bootstrap payload.** Cursor templates have no `{{{bootstrap_hooks_*}}}` placeholder; `core-cursor/hooks/hooks.json` for r2 renders to `{"version":1,"hooks":{}}` (37 bytes). The generator produces only `bootstrap_hooks_claude`, `bootstrap_hooks_codex`, `bootstrap_hooks_copilot`.

---

## GT-1 — Template variables (the ONLY render inputs)

`grep` over all preserved `.tmpl` shows exactly two kinds of placeholder:
- `{{#if deterministic_hooks}} … {{/if}}` — appears 10×. `deterministic_hooks` = **false for r2, true for r3** (DATA-CFG-0001).
- `{{{bootstrap_hooks_claude}}}`, `{{{bootstrap_hooks_codex}}}`, `{{{bootstrap_hooks_copilot}}}` — one each (triple-stache raw injection).

`release` (name) is **not referenced by any template** — provide it in the context (harmless) but it affects no output. **No cursor bootstrap placeholder exists.**

**Handlebars whitespace (PARITY-7):** `{{#if deterministic_hooks}}` and `{{/if}}` each sit alone on their own line. With Node `handlebars`' standalone-block stripping, a false `{{#if}}` removes those whole lines (incl. trailing newline). The r2 cursor template thus renders to exactly:
```
{
  "version": 1,
  "hooks": {
  }
}
```
(37 bytes, trailing `\n`). Verify this byte-for-byte EARLY. The inline `]{{#if deterministic_hooks}},{{/if}}` (claude/codex/copilot plugin-form) is **not** standalone (other tokens on the line) → for r2 it renders `]` (no comma); for r3 it renders `],`.

---

## GT-2 — Bootstrap payload assembly (`{{{bootstrap_hooks_<ide>}}}`)

The generator produces the **entire string** that fills the placeholder = the per-entry JSON objects **joined by `, ` (comma-space)**. The array brackets `[ … ]` come from the template, not the payload. Order = the bootstrap manifest (FR-HOOK-0009), present documents only, **plus one appended plugin-root entry**.

### GT-2.1 Manifest order (FR-HOOK-0009), decoded from claude r2 (9 entries) / r3 (8)
The manifest is a fixed ordered list of candidate documents; only those **present** in the target's `frames` are emitted (absent → skipped+logged, not reordered). Decoded present-set:
- **r2 (8 docs):** `plugin-files-mode` (LEAD, prefixed), `bootstrap-core-policy`, `bootstrap-execution-policy`, `bootstrap-hitl-questioning`, `bootstrap-guardrails`, `bootstrap-rosetta-files`, **rules INDEX**, **workflows INDEX**.
- **r3 (7 docs):** same minus the r2-only file(s) and plus r3's own bootstrap-* set — **do not hardcode the r3 doc list; it is whatever `bootstrap-*` + `plugin-files-mode` files exist in `instructions/r3/<domain>/rules/` plus the two indexes.** (r3 decoded as: `plugin-files-mode`, `bootstrap-core-policy`, a forbidden-sequence bootstrap doc, `bootstrap-guardrails`, `bootstrap-rosetta-files`, rules INDEX, workflows INDEX.) The engine MUST be content-agnostic (NFR-0006): iterate the manifest of candidate basenames, include those whose VFS doc is present.
- **Then append:** the **plugin-root entry** (GT-3.4) — always last, always exactly one.

Bodies only — frontmatter stripped (FR-HOOK-0002). The **bootstrap prefix** is prepended to the `additionalContext` of the **lead** doc only (`plugin-files-mode`, entry 0). Prefix text (decode verbatim from baseline entry 0): begins `ALWAYS MUST FULLY READ THIS ENTIRE CONTEXT BEFORE PROCEEDING FROM FILE PATH PROVIDED ESPECIALLY IF TRUNCATED/PREVIEWED. DO IT NOW! THEN PROCEED.` — **extract the exact bytes from baseline, do not retype.**

Index entries (rules INDEX, workflows INDEX) are included in the bootstrap payload **only for session-hook targets** and gated by `includeBootstrapRules`/`includeIndexEntries` (FR-HOOK-0004). The `additionalContext` of these two entries = the generated INDEX.md body (GT-5), built against final post-rename paths and **reference-rewritten per target** (FR-HOOK-0008: payload strings get `pluginRewriteReferences`, e.g. copilot's payload reads `commands/…`).

### GT-2.2 Per-entry escaping pipeline (per document)
1. Build the inner object: `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"<BODY>"}}` where `<BODY>` is the doc body (prefix-prepended for lead), JSON-string-escaped (`"`→`\"`, newline→`\n`, `\`→`\\`, etc.). Compact JSON, **no spaces** inside (keys/values as shown).
2. Wrap per IDE (GT-3). The wrapped command is bash-single-quoted; a literal `'` inside becomes `'\''` (PARITY-1/4).
3. **Size limit (NFR-0004):** if any single assembled entry > 10000 chars *after escaping* → soft error (report target+file, still emit, exit ≠ 0).

---

## GT-3 — Per-IDE entry shapes (EXACT, decoded)

### GT-3.1 Claude (`hookEntryShape: claude`) — wrapper template `core-claude/hooks/hooks.json.tmpl`
Template: `"SessionStart":[{"matcher":"startup","hooks":[{{{bootstrap_hooks_claude}}}]}]` (+ r3 advisory blocks gated by `{{#if}}`).
Each **document entry** (single-quoted printf):
```json
{"type": "command", "command": "printf '%s' '<COMPACT_JSON>'", "once": true}
```
- `<COMPACT_JSON>` = the GT-2.2 object; internal `'` → `'\''`.
- Every entry (including plugin-root) carries `"once": true`. Spacing: `{"type": "command", "command": "…", "once": true}` (one space after each `:` and `,` — **decode exact spacing from baseline**; it is the compact-with-space style, NOT `json.dumps` default for the outer template but IS for these inner entries — verify byte-for-byte).

### GT-3.2 Codex (`hookEntryShape: codex`) — wrapper `core-codex/.codex-plugin/hooks.json.tmpl`
Template: `"SessionStart":[{"matcher":"startup|resume","hooks":[{{{bootstrap_hooks_codex}}}]}]`.
Each **document entry** (NO `once`; adds `statusMessage`+`timeout`):
```json
{"type": "command", "command": "printf '%s' '<COMPACT_JSON>'", "statusMessage": "Loading Rosetta bootstrap", "timeout": 30}
```

### GT-3.3 Copilot (`hookEntryShape: copilot`) — wrapper `core-copilot/.github/plugin/hooks.json.tmpl`
Template top-level: `{"version":1,"hooks":{"sessionStart":[{{{bootstrap_hooks_copilot}}}]…}}` (lowercase `sessionStart`, no matcher, `version:1`).
Each entry carries `bash` + `powershell`, each wrapped in a **per-entry session lock** keyed by `session_id` + a **0-based entry index** (`-<i>.lock`). Decoded bash form (index `0`):
```
find /tmp -maxdepth 1 -name "rosetta-bs-*.lock" -mmin +1 -delete 2>/dev/null; INPUT=$(cat); SESSION_ID=$(printf '%s' "$INPUT" | sed -n 's/.*"session_id":"\([^"]*\)".*/\1/p'); LOCK="/tmp/rosetta-bs-${SESSION_ID:-$$}-0.lock"; if [ -f "$LOCK" ]; then exit 0; fi; touch "$LOCK"; printf '%s' '<COMPACT_JSON>'
```
PowerShell form (index `0`): `Get-ChildItem "$env:TEMP\rosetta-bs-*-0.lock" … ; $Inp = [Console]::In.ReadToEnd(); $Sid = if ($Inp -match '"session_id":"([^"]*)"') { $Matches[1] } else { … }; $Lk = "$env:TEMP\rosetta-bs-$Sid-0.lock"; if (Test-Path $Lk) { exit 0 }; New-Item … ; Write-Output '<…>'`. Entry object: `{"type": "command", "bash": "…", "powershell": "…"}`. **Decode both strings byte-for-byte from baseline `core-copilot/.github/plugin/hooks.json`; the lock index increments per entry (0,1,2,…,8).**

### GT-3.4 The appended plugin-root entry (per IDE) — FR-HOOK-0007, **separate final entry**
Uses **double-quoted** printf (for env/var expansion) with JSON quotes escaped as `\"`; the probe path is **reference-rewritten per target** (so copilot reads `commands/…`):
- **claude:** `printf '%s' "{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"Rosetta Plugin Path: ${CLAUDE_PLUGIN_ROOT}\"}}"` ; entry adds `"once": true`.
- **codex:** command =
  `workspace_root="$PWD"; while [ "$workspace_root" != "/" ] && [ ! -f "$workspace_root/.agents/rules/bootstrap-rosetta-files.md" ]; do workspace_root="$(dirname "$workspace_root")"; done; if [ -f "$workspace_root/.agents/rules/bootstrap-rosetta-files.md" ]; then printf '%s' "{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"Rosetta Plugin Path: $workspace_root/.agents\"}}"; fi`
  ; entry adds `"statusMessage": "Loading Rosetta bootstrap", "timeout": 30`. Note `.agents/...` is the codex-renamed location.
- **copilot:** bash = a `for base in "$HOME/Library/Application Support/Code/agentPlugins" "$HOME/.local/share/Code/agentPlugins"; do root="$base/github.com/griddynamics/rosetta/plugins/core-copilot"; if [ -f "$root/commands/coding-flow.md" ]; then printf '%s' "{…additionalContext:\"Rosetta Plugin Path: $root\"}}"; break; fi; done` (+ powershell form). Note `commands/coding-flow.md` (workflows→commands renamed) — proves payload strings are reference-rewritten.

**These per-IDE plugin-root strings are effectively fixed per target** (only the probe path is target-dependent). Decode each verbatim from baseline; treat as a per-target constant assembled after the document entries.

---

## GT-4 — hooks.json multiplicity & mirrors (exact file set)

- **claude:** `hooks/hooks.json` (rendered). r3 also: `hooks/*.js` (5 bundles).
- **cursor (marketplace):** `hooks/hooks.json` (rendered plugin-form, empty bootstrap). Preserved templates kept: `hooks/hooks.json.tmpl`, **root `hooks.json.tmpl`** (standalone-form, consumed by cursor-standalone). r3: `hooks/*.js`.
- **copilot (marketplace):** THREE hooks.json — (a) `.github/plugin/hooks.json` rendered plugin-form; (b) **root `hooks.json`** = **byte-identical copy** of (a) (alternate-name copy SpecEntry, NOT a rename — both exist; confirmed `diff -q` IDENTICAL); (c) `hooks/hooks.json` rendered **standalone-form** with hardcoded `"sessionStart": []`. r3: `hooks/*.js`.
- **codex:** `.codex-plugin/hooks.json` rendered; **`.codex/hooks.json`** = **byte-identical mirror copy** (confirmed `diff -q` IDENTICAL). r3: `.codex/hooks/*.js`.
- **cursor-standalone:** `.cursor/hooks.json` (standalone-form, `.cursor/...` paths). r3: `.cursor/hooks/*.js`.
- **copilot-standalone:** `.github/hooks/hooks.json` (standalone-form, `.github/...` paths). r3: `.github/hooks/*.js`.

**Hook bundles (FR-HOOK-0020):** r3 only. Source `hooks/dist/bundles/<target>/*.js` (5 bundles: dangerous-actions, loose-files, md-file-advisory, lint-format-advisory, gitnexus-refresh). Per-target dest: claude→`hooks/`, cursor→`hooks/`, copilot→`hooks/`, codex→`.codex/hooks/`, cursor-standalone→`.cursor/hooks/`, copilot-standalone→`.github/hooks/`. Ignore unknown bundle dirs (e.g. `core-windsurf`). r2: ensure no stale `.js` (none in baseline).

---

## GT-5 — INDEX.md format (rules + workflows), `serialize/markdown-index.ts`
Exact format (decoded from `core-claude/rules/INDEX.md`):
```
# Rosetta {Rules|Workflows} Index\n
\n
All paths are relative to Rosetta Plugin Path.\n
\n
- `<folder>/<file.ext>`: <description>\n
… (one per entry, sorted by final path) …\n
```
- Heading: `rules`→`# Rosetta Rules Index`; `workflows|commands|prompts`→`# Rosetta Workflows Index` (FR-GEN-0004 alias).
- Entry separator is `` : `` (backtick-path, colon, space, description). Path = **final post-rename** plugin-relative path (cursor `commands/x.md`; copilot-standalone `prompts/x.prompt.md`).
- Description = frontmatter `description:` (single line; multi-line descriptions are flattened — decode behavior from baseline workflows/INDEX whose descriptions are long) else title-cased filename stem (FR-GEN-0002).
- **rules INDEX membership:** all `rules/` docs present in output (i.e. excluding `bootstrap.md`/`local-files-mode.md` which are in `exclude`, and excluding `INDEX.md` itself). Confirmed it **includes** `bootstrap-*` and `plugin-files-mode`. **workflows INDEX membership:** only docs with exact tag `workflow` (FR-GEN-0003) — claude r2 = 12 of 43 workflow files. Decode the exact entry sets and ordering from baseline.
- No index file when zero qualifying members (FR-GEN-0001).

---

## GT-6 — Codex TOML (`serialize/toml.ts`, `fileCodexAgentFormat`)
Field order is fixed (decoded from `core-codex/.codex/agents/architect.toml`):
```
name = "<name>"
description = "<one-line>"
developer_instructions = """
<body, verbatim, starts on the line after the opening """>
"""
model = "<gpt model>"
model_reasoning_effort = "<effort>"
sandbox_mode = "<workspace-write|read-only>"
```
- `model` + `model_reasoning_effort` present only when a gpt model resolves (FR-COPY-0022); omitted otherwise.
- `sandbox_mode` = `read-only` when agent frontmatter `readonly: true` else `workspace-write` (FR-VAR-0040).
- `description` = agent frontmatter description, one line, TOML-string-escaped.
- `developer_instructions` = the FULL agent body (post model-normalization is irrelevant — codex uses gpt; but body is the markdown after frontmatter) inside `"""` … `"""`; opening `"""` followed by newline, body, newline, closing `"""`. **Decode exact escaping of any `"""`/backslash in bodies from baseline.** Agents live at `.codex/agents/<name>.toml`; NO plain `agents/` folder in codex output.

---

## GT-7 — Manifests & versions
- `plugin.json` for main targets is **preserved** (copied from `src/plugin-generator/plugins/<target>/.../plugin.json`), version **`2.0.40`**. The generator does NOT synthesize it.
- **Standalone `plugin.json` is generated**: exactly `{\n  "name": "<core-X-standalone>",\n  "version": "2.0.40"\n}\n` — 2-space indent, key order name→version, trailing `\n`, version copied from the **parent** target's preserved manifest (FR-VAR-0060, FR-SEED-0002).
- `scripts/bump_versions.sh` currently bumps only top-level `plugins/` (at 2.0.41); the preserved source `src/plugin-generator/plugins/` is at 2.0.40 (= baseline). Parity is measured at 2.0.40. Unifying bump tooling is OUT OF SCOPE (OD-1) — do not change it for parity; note it in the generator README.

---

## GT-8 — Other parity facts
- **Excludes (FR-COPY-0011):** `rules/bootstrap.md`, `rules/local-files-mode.md`, AND the whole `templates/shell-schemas/**` folder (agent-shell.md, skill-shell.md, workflow-shell.md) excluded in every target (source files unchanged). Verify they are absent from every target output. NOTE: the parity baseline was regenerated 2026-06-05 with these shell-schemas files **removed** so the baseline matches the new generator's exclusion — do not expect them in `agents/TEMP/old-gen-r*`.
- **`.DS_Store`** skipped on copy (FR-COPY-0010).
- **Sorting (NFR-0002, PARITY-5):** stable lexicographic, matching Python `sorted()` (case-sensitive, byte order). Apply to VFS file order, SpecEntry glob expansion, index entries, and directory walks.
- **Encoding:** UTF-8, **LF only**, trailing `\n` where the baseline has one (most generated text files). Never emit CRLF.
- **Codex instruction folders** are placed under `.agents/` (rules, skills, workflows, configure, templates + their INDEX.md); agents under `.codex/agents/*.toml`; hooks under `.codex/hooks.json` (+ `.codex-plugin/hooks.json` mirror).
- **Copilot-standalone** relocates bootstrap rules → `.github/instructions/*.instructions.md` (rename), workflows → `.github/prompts/*.prompt.md`, agents → `*.agent.md`; injects prompts/INDEX + rules/INDEX + plugin-root block into `plugin-files-mode.instructions.md`.
- **Cursor-standalone** injects commands/INDEX + plugin-root block into `plugin-files-mode.mdc`; rules are `.mdc`.

## GT-9 — Recommended implementation strategy for parity (engineer)
1. Get the WRAPPER right from the preserved `.tmpl` (render with `deterministic_hooks`). The generator owns ONLY the three `bootstrap_hooks_*` strings + all instruction-derived files.
2. For each `bootstrap_hooks_<ide>`: build a unit test that asserts the assembled string equals the value decoded from the baseline `hooks.json` (extract via the same printf/lock unwrapping shown above). Build this oracle FIRST, then implement assembly to match.
3. Drive `diff -rq` to empty per target in this order: claude → codex → cursor → copilot → cursor-standalone → copilot-standalone. First mismatches are almost always escaping/whitespace — fix in `serialize/*`, `escaping/*`, or render, never by special-casing one file.

</CRITICAL>
