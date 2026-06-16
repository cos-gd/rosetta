# TODO-FIXES-SPEC — Plugin Generator Open Issues

Last updated: 2026-06-16

---

## Session decisions (agreed, implemented)

- **Model scope — GPT**: Cursor and Copilot maps cover GPT 5.3+ only. GPT 4.x, o3, o4-mini and older are out of scope and must not be added speculatively.
- **Model upgrades**: opus 4.6/4.7 → 4.8; gpt-5.3 and gpt-5.3-codex → gpt-5.4; do NOT upgrade 5.4 → 5.5 (different cost tier, 5.5 is premium-class); Gemini 3-flash → 3.5 Flash; Gemini 3.1 Pro stays (latest Pro).
- **Codex no-effort**: bare gpt token with no effort suffix → write only `model: <id>`, no `model_reasoning_effort` line. No default value.
- **Configure verbatim**: configure/*.md files contain IDE-native documentation, not Rosetta instruction cross-references. They must be emitted verbatim. Fix: `verbatim: true` on configure SpecEntries; `pluginRewriteReferences` skips verbatim frames.
- **Model maps exhaustive**: each vendor map (CURSOR_CLAUDE_MAP, CURSOR_GPT_MAP, CURSOR_GEMINI_MAP, COPILOT_CLAUDE_MAP, COPILOT_GPT_MAP, COPILOT_GEMINI_MAP) must enumerate all supported variants including effort suffixes. No inline effort-stripping logic in normalizer functions.
- **CODE-H1 — target conflict detection**: Agreement: write the requirement first, then implement. Decision: Path A chosen (detect early in `pluginProcessSpecEntries`, rich error naming both conflicting VFS sourcePaths and SpecEntry source/target). Rationale over Path B (pluginWrite check): Path A fires in dry-run, carries full attribution (which two SpecEntries conflict), and eliminates the dead Map in the same change. FR-ARCH-0056 authored first, then implementation followed. **Implemented.**
- **TODO-2 — configure frame scoping**: Two-layer fix implemented. (1) `verbatim: true` capability flag on `SpecEntry`/`FileProcessingFrame`; `makeConfigureEntry` sets it; `pluginRewriteReferences` skips verbatim frames (belt-and-suspenders). (2) Option 1 regex: `rewritePathToken` extended with a second lookbehind `(?<!\.[A-Za-z][A-Za-z0-9_-]*/)` that blocks matches preceded by any dot-directory segment (`.windsurf/`, `.cursor/`, `.github/`) — these are IDE-native paths, not Rosetta instruction cross-references. Root cause boundary: bare `workflows/coding-flow.md` (plugin-internal, must rewrite) vs `.windsurf/workflows/` (dot-directory-prefixed IDE documentation, must not). **Implemented.**
- **FR-ARCH-0051 behavior**: missing anchor in `pluginInjectSections` → graceful skip (correct for r3 compatibility). Missing host frame → hard error. The requirement text was wrong; it has been fixed (see requirements).
- **Parity**: TypeScript generator is now more correct than Python in several areas (configure verbatim, TOML escaping, model maps). These are new accepted buckets, not regressions.

---

## Open items

| # | ID | Severity | Title |
|---|---|---|---|
| 1 | CODE-L1 | LOW | Dead export `wrapInPrintfDoubleQuoted` in `escaping/shell.ts` |
| 2 | CODE-L2 | LOW | Dead `once: true` field on `CLAUDE_PLUGIN_ROOT_ENTRY` |
| 3 | CODE-L3 | LOW | Render failures silently swallowed (`plugin-render-templates.ts`) |
| 4 | CODE-L4 | LOW | Stale "section 3" comment in `targets.ts` |
| 5 | REQ-GAP-2 | LOW | FR-COPY-0021 parity contract unclear |
| 6 | REQ-GAP-3 | LOW | Codex no-effort behavior: requirement needed to match MODEL-TODO-4 fix |

---

## CODE-L1 — Dead export `wrapInPrintfDoubleQuoted`

**When:** Any developer reads `escaping/shell.ts` and sees an exported function.
**What:** Exported, zero callers.
**Why:** Creates false API surface.
**How:** Delete or unexport. `grep -rn "wrapInPrintfDoubleQuoted" src/plugin-generator/src/` confirms no callers.

---

## CODE-L2 — Dead `once: true` on `CLAUDE_PLUGIN_ROOT_ENTRY`

**When:** Developer reads `bootstrap-manifest.ts` and assumes `once` controls behavior.
**What:** `CLAUDE_PLUGIN_ROOT_ENTRY.once: true` is never read — only `.command` is accessed. The `once` flag is hardcoded inside `buildClaudeBootstrapEntry`.
**Why:** Misleads: changing it has no effect.
**How:** Remove `once: true` from the constant.

---

## CODE-L3 — Render errors silently swallowed

**When:** A `.tmpl` file fails to render (Handlebars syntax error, missing helper).
**What:** Catch block in `plugin-render-templates.ts` continues with no warning. FR-GEN-0010 says "warn+continue."
**Why:** Silent failure — plugin ships without the file the template was supposed to produce.
**How:** Add `console.warn` or push a soft `GenError` in the catch block.

---

## CODE-L4 — Stale "section 3" comment

**When:** Developer reads `cursorStandaloneInjectionText` in `targets.ts`.
**What:** Comment references "section 3" but cursor-standalone only has 2 injection sections.
**Why:** Confuses future maintenance.
**How:** Update comment to match actual section count.

---

## REQ-GAP-2 — FR-COPY-0021 parity contract

**What:** Comment in `model-maps.ts` line 11 references `FR-COPY-0021` as governing Claude Code model IDs. The requirement should specify that TypeScript maps must stay in sync with the Python generator's authoritative maps. Verify the requirement exists and covers this; update if not.

---

## REQ-GAP-3 — Codex no-effort behavior needs a requirement

**What:** MODEL-TODO-4 fix (no effort suffix → no `model_reasoning_effort` line) was implemented at the code level. No requirement currently specifies this behavior. FR-COPY-0022 or equivalent should state: when a gpt token appears without a trailing effort suffix in Codex normalization, the `model_reasoning_effort` field is omitted entirely.

---

## Parity baseline — accepted buckets

Both generators freshly run against current source. All output differences fall into these buckets:

| Bucket | Files | Why |
|---|---|---|
| **A — agent renames** | ~6 r2, ~6 r3 | `agents/X.md` → `agents/X.agent.md`. New-gen correct; old-gen bug. |
| **D — commands→prompts double-rename** | ~11 r2, ~10 r3 | Old-gen double-applies the rename for copilot-standalone. New-gen reads source directly and applies once. New-gen correct; old-gen bug. |
| **Decision 3 — plugin-files-mode cascade** | ~3 each | `plugin-files-mode.md` content changed after baseline; cascades to hooks.json template key rename (`bootstrap_hooks_X` → `bootstrap_hooks`). Do not regenerate Python baseline to absorb this — it would erase the Task C diff signal. |
| **Task B — cursor-standalone hooks dir** | 1 r2 | Empty `.cursor/hooks/` dir absent in new-gen. Accepted. |
| **E5 — templates/shell-schemas absent** | 4 dirs each | New-gen correctly excludes per FR-COPY-0011. Python includes them (Python bug). |
| **E7 — configure verbatim** | ~18 each | New-gen emits configure files verbatim (correct). Python over-matches folder rename pairs and rewrites `.windsurf/workflows/` → `.windsurf/commands/` (Python bug). This is a consequence of the `verbatim` flag fix. |
| **E8 — TOML description escaping** | ~10 each | New-gen produces correct TOML `description = "text"`. Python over-escapes to `description = "\"text\""`. Python bug. |
| **Sync content** | varies | Instruction source content updated since old-gen baseline was captured (version bumps, skill/workflow text). Both generators are correct for their respective snapshot. |
| **Orchestrator skill** | varies | User actively working on orchestrator skill; any diffs in those files are in-progress changes, ignored for parity purposes. |
