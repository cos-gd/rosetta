# Plugin generator issues (open)

Snapshot before restart. Issues only first, then agreed solutions, then open decision.

## Issues

1. **copilot-standalone `plugin-files-mode.instructions.md` is internally inconsistent.** Body says `prompts/` (from `path_renames` rewriting `workflows/` → `prompts/`). Recent insert text + injected INDEX (commands/INDEX.md) say `commands/`. Two folder names co-exist inside the same file for the same logical artifact.

2. **copilot-standalone points AI at `commands/X.md` paths that don't exist on disk.** `commands/` is removed via `core-copilot-standalone.post_cleanup=("commands",)` after the injection step. Insert text + INDEX reference `commands/`, but only `prompts/X.prompt.md` survives in the workspace.

3. **`_PLUGIN_PATH_HOOKS["core-copilot"]` probe still checks `$root/instructions/bootstrap-rosetta-files.instructions.md`.** You asked for `$root/commands/coding-flow.md` (root-level, in `commands/`, stable even if `pre_move_files`/`instructions/` are removed later).

4. **`BOOTSTRAP_PREFIX` placement is order-dependent on `_BOOTSTRAP_FILES` tuple ordering.** `build_bootstrap_replacements` attaches `BOOTSTRAP_PREFIX` to the first bootstrap-classified entry it finds per plugin. Today the first three entries are `plugin-files-mode` variants, so the prefix lands on `plugin-files-mode` every time. If anyone reorders the tuple so `bootstrap-core-policy` comes first, the prefix silently moves. **Status: fixed via comment added at top of `_BOOTSTRAP_FILES`.**

5. **`_generate_cursor_instructions` and `_generate_copilot_instructions` duplicate boilerplate.** Two near-identical helpers; differ only by plugin root, target file, workflow folder, workflow extension. Drift risk on future edits (text already had one historical divergence that's since converged).

6. **`pre_cleanup` of `commands/` would break cursor-standalone.** Cursor-standalone *uses* `commands/` at runtime (cursor's `rename_folders=(("workflows","commands"),)` makes commands/ the canonical workflow location). Any generic mechanism that strips commands/ in a standalone must be **per-spec** (only copilot-standalone today), never a default. **Current state: `core-copilot-standalone` has `post_cleanup=("commands",)` — correct, but the rule is fragile if anyone adds a generic cleanup. Worth marking the constraint in the spec or docs.**

### Non-issues confirmed earlier (do NOT re-open)

- `rules/INDEX.md` not listing bootstrap files in standalone: fine — instructions are auto-loaded via `applyTo: "**"`.
- Cursor hook payload built but unused (template ignores `{{BOOTSTRAP_HOOKS_CURSOR}}`): intentional, documented in ARCHITECTURE.
- `workflows/INDEX.md` (claude/codex) vs `commands/INDEX.md` (cursor/copilot) being the same logical artifact under two names: noise, not a bug.

## Agreed solutions (apply on restart)

| Issue | Solution |
|---|---|
| #3 (probe) | Change `_PLUGIN_PATH_HOOKS["core-copilot"]` bash + powershell probes to check `$root/commands/coding-flow.md`. |
| #4 (BOOTSTRAP_PREFIX order) | **Done** — comment block at top of `_BOOTSTRAP_FILES` warns "plugin-files-mode variants MUST stay FIRST". |
| #5 (duplicated helpers) | Collapse `_generate_cursor_instructions` + `_generate_copilot_instructions` into one parameterized helper. Parameters: `target_rel`, `plugin_root`, `workflow_folder`, `workflow_ext`. Two call sites supply per-plugin values. |
| #6 (cursor-standalone safety) | Constraint is implicit. Either (a) add a spec-level comment near `core-copilot-standalone.post_cleanup=("commands",)` explicitly noting "do NOT add this to cursor-standalone — cursor uses commands/ at runtime", or (b) hoist into a `removes_commands_folder: bool = False` field with default False so it's opt-in per spec. |

## Agreed split (no ambiguity)

- **Main copilot plugin (marketplace install): `commands/`** — `plugin.json` declares `"commands": ["commands/"]`; AI-facing canonical workflow location is `commands/`; path probe checks `$root/commands/coding-flow.md`.
- **Standalone copilot (workspace `.github/`): `prompts/`** — Copilot's workspace runtime reads `.github/prompts/*.prompt.md`; `commands/` is stripped via `post_cleanup`. Insert text and injected INDEX must reference `prompts/`.

The "use commands/ based" guidance applied to the **main plugin** (where commands/ is load-bearing for the manifest). The standalone always uses prompts/. My recent edits incorrectly pushed commands/ paths into the standalone — that is the source of issues #1 and #2.

### Solutions for issues #1 and #2

| Issue | Solution |
|---|---|
| #1 | In the dedupe of helpers, the copilot call site supplies `workflow_folder="prompts"`, `workflow_ext=".prompt.md"` — insert text becomes `.github/prompts/<workflowtag>.prompt.md` / example `.github/prompts/coding-flow.prompt.md`. |
| #2 | Revert `core-copilot-standalone.inject_index_folder` to `"prompts"` so `prompts/INDEX.md` is injected, not `commands/INDEX.md`. |

## File state at time of writing

- `scripts/plugin_generator.py` has: per-plugin `build_bootstrap_replacements`, expanded `_BOOTSTRAP_FILES` with variants + BOOTSTRAP_PREFIX invariant comment, two-pass `sync_generated_plugins`, `pre_copy_folders` field on `PluginSyncSpec`, `commands/` added to copilot `generated_indexes`, copilot probe still on instructions/ (Issue #3), standalone uses `inject_index_folder="commands"` (Issue #2), `_generate_copilot_instructions` insert text says commands/ (Issue #1).
- Tests pass. Type-check passes.
- No commits made; everything is in working tree.
