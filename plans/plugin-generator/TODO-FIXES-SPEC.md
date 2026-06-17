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
- **CODE-L1..L4 — dead code / correctness cleanup (implemented 2026-06-16)**:
  - L1: Deleted dead export `wrapInPrintfDoubleQuoted` from `escaping/shell.ts` + its test block. Double-quoted printf was embedded directly in `CLAUDE_PLUGIN_ROOT_ENTRY.command`; function was never called.
  - L2: Removed dead `once: true` field from `CLAUDE_PLUGIN_ROOT_ENTRY` in `spec/bootstrap-manifest.ts`. Field was never read; `once:true` behavior hardcoded in `buildClaudeBootstrapEntry`. Updated comment in `plugin-assemble-claude-bootstrap.ts` for consistency.
  - L3: Added soft `GenError` in `plugin-render-templates.ts` catch block. Render failures now surface via `kind:'soft'` → exit code ≠ 0 so callers know generation was not fully successful (FR-GEN-0010).
  - L4: Fixed stale "section 3" comment in `spec/targets.ts` line ~322. Cursor-standalone only has 2 injection sections.

---

## Open items

All open items resolved. See session decisions above for what was done.

---

## REQ-GAP-2 — FR-COPY-0021 defects — **Resolved 2026-06-16**

- Defect 1: Artifact AC rephrased — Python/TypeScript names replaced with observable behavioral statement (all vocabularies produce current authoritative model IDs for supported tokens).
- Defect 2: Statement updated to include `claude-` prefix as a claude-compatible token (maps to `inherit` when no tier substring).
- Defect 3: Stray Cursor AC removed from FR-COPY-0021 — already present in FR-COPY-0020.
- Bonus: `claude-opus-4-6` typo → `claude-opus-4-8` in FR-COPY-0020 AC; `CURSOR_MODEL_MAP` artifact ref removed.
- FR-COPY-0020: `Draft` → `Approved`, `ToBeModified` → `Implemented`, implementationNotes cleaned.
- FR-COPY-0021 implementationNotes: "Python authoritative maps" reference removed.

---

## REQ-GAP-3 — FR-COPY-0022 o3/o4 — **Resolved 2026-06-16**

- FR-COPY-0022 already existed and was Approved — no new requirement needed.
- o3/o4 code removed: deleted `lower.startsWith('o3') || lower.startsWith('o4')` from `normalizeCodex()` in `model-maps.ts:155`. FR-ARCH-0057 explicitly excludes these; no requirement backed them. 439 tests pass.
- Requirements were already clean — no dead gpt-4/o3/o4 entries in FR-COPY.md or FR-ARCH.md.
- FR-COPY-0022 correctly referenced in source: `file-normalize-codex-models.ts:1`, `model-maps.ts:1,141`.

---

## CODE-L5 — Dead `renameExt` parameter — **Resolved 2026-06-16**

Deleted `renameExt?: [string, string]` and its dead `if (renameExt)` branch from both `makeWorkflowsEntry` and `makeAgentsEntry` in `spec/targets.ts`. Copilot agents entry remains inline. 439 tests pass.

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
