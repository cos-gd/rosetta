# Windsurf (Cascade) Hooks Contract

Target agent: **Windsurf / Cascade** (Devin Desktop app + JetBrains plugin)

Status: **DRAFT — doc-grounded hypothesis, NOT empirically verified.** Grounded only in the manufacturer reference (R1). No `Observed` columns until the live-hook test (step 3) is run and folded in.

---

## References

| ID | System | URL |
|---|---|---|
| R1 | Windsurf / Cascade Hooks reference (official) | https://docs.windsurf.com/windsurf/cascade/hooks (redirects to https://docs.devin.ai/desktop/cascade/hooks) |

> R1 is the single authoritative manufacturer source. Every field below cites R1. Anything not in R1 is marked `unknown / not documented` — never invented.

---

## Practical Conclusions (doc-grounded; pending empirical confirmation)

The few facts that genuinely surprise a reader of the tables or carry silent-failure consequences. Everything else is in the tables.

1. **(!) Output = EXIT CODE + STDERR — stdout is NEVER parsed as JSON (R1).** Cascade does not deserialize stdout. There is **no** `permissionDecision`/`additionalContext`/`continue`/`decision`/`hookSpecificOutput` contract — emitting such JSON has **zero effect**. To block, the process must **exit 2**, and the **stderr** it writes is delivered to the agent: *"The Cascade agent will see the error message from stderr."* (R1)
2. **(!) The ONLY hook→model text channel is stderr on a BLOCKING pre-hook (exit 2) (R1).** A deny reason reaches the model via stderr+exit-2 — the Windsurf analog of `permissionDecisionReason`. There is **no arbitrary context injection**: no SessionStart-style `additionalContext`, and **non-blocking hooks (exit 0) and all post-hooks pass NOTHING to the model**. `show_output: true` only renders hook stdout/stderr in the Cascade **UI** (user-facing/debugging; and it does NOT apply to `pre_user_prompt`, `post_cascade_response`, `post_cascade_response_with_transcript`) — it does not enter model context.
3. **(!) Only PRE-hooks can block; POST-hooks cannot block or redact (R1).** Exit 2 from a `post_*` hook does **not** stop or alter the action — post-hooks are observational only.
4. **(!) No session-level lifecycle events.** There is **no** `SessionStart`, `SessionEnd`, `Stop`, `AgentStop`, or `SubagentStop`. The closest documented analogs are `pre_user_prompt` (turn start) and `post_cascade_response` (turn end) — these are **not** session events; document and use them as their actual selves.
5. **(!) No generic tool events — tool hooks are split by operation.** There is **no** generic `PreToolUse`/`PostToolUse`. Tool interception is per-operation: read (`*_read_code`), write (`*_write_code`), shell (`*_run_command`), MCP (`*_mcp_tool_use`). A guard that must cover "any tool" must register on every relevant event.
6. **No matchers / no glob filtering (R1).** Hooks have no matcher field; each registered hook fires **unconditionally** on its event. All gating (which file, which command) must happen **inside the hook script**, off the stdin JSON.

### Mapping — Rosetta target events → Windsurf events

| Rosetta target event | Windsurf equivalent (R1) |
|---|---|
| `SessionStart` | **none documented** (closest: `pre_user_prompt`, per-turn not per-session) |
| `SessionStop` | **none documented** |
| `AgentStop` / `SubagentStop` | **none documented** (closest: `post_cascade_response` / `post_cascade_response_with_transcript`, per-turn) |
| `PreToolUse` | split: `pre_read_code`, `pre_write_code`, `pre_run_command`, `pre_mcp_tool_use` |
| `PostToolUse` | split: `post_read_code`, `post_write_code`, `post_run_command`, `post_mcp_tool_use` |

---

## Capability Matrix (verification status)

Legend: ✅ confirmed live · 📄 documented (R1), not yet run · ❌ documented-absent · ❓ unknown.

| Capability | Documented (R1) | Status |
|---|---|---|
| `pre_*` hook blocks the action via **exit 2** | yes (pre-hooks only) | ❓ pending live run |
| **deny reason reaches the agent via stderr** (on `pre_*` + exit 2) | yes — "agent will see the error message from stderr" | ❓ pending live run |
| `post_*` hook can block / redact | no | 📄 documented-absent |
| hook stdout JSON parsed (`permissionDecision`/`additionalContext`/`continue`/…) | no — exit code only | ❓ pending (confirm BUG 1) |
| arbitrary / non-blocking context injection (SessionStart-style `additionalContext`) | no mechanism | 📄 documented-absent |
| `show_output:true` surfaces stdout/stderr in Cascade UI (user-facing, not model) | yes | ❓ pending |
| session lifecycle events (`SessionStart`/`Stop`/`SubagentStop`) | none | 📄 documented-absent |
| generic `PreToolUse`/`PostToolUse` | none — split per operation | 📄 |
| per-operation tool events (read/write/command/mcp) | yes (12 events) | ❓ which fire pending live run |
| matcher / glob filtering in config | none — gate inside script | 📄 documented-absent |

---

## Hook Configuration (R1)

### Config file locations (merged across all levels)

| Scope | Path |
|---|---|
| System (macOS) | `/Library/Application Support/Windsurf/hooks.json` |
| System (Linux/WSL) | `/etc/windsurf/hooks.json` |
| System (Windows) | `C:\ProgramData\Windsurf\hooks.json` |
| User (Devin Desktop) | `~/.codeium/windsurf/hooks.json` |
| User (JetBrains plugin) | `~/.codeium/hooks.json` |
| Workspace | `.windsurf/hooks.json` (workspace root) |

### Config format

```json
{
  "hooks": {
    "<event_name>": [
      {
        "command": "shell command (macOS/Linux, via bash -c)",
        "powershell": "command (Windows, via powershell -Command) — optional",
        "show_output": false,
        "working_directory": "optional path; defaults to workspace root"
      }
    ]
  }
}
```

| Parameter | Type | Required | Ref | Notes |
|---|---|---|---|---|
| `command` | string | one of `command`/`powershell` required | R1 | macOS/Linux: run via `bash -c`. Windows: used as fallback via `powershell -Command` if `powershell` absent. |
| `powershell` | string | optional | R1 | Windows command, via `powershell -Command`. |
| `show_output` | boolean | optional | R1 | Render hook stdout/stderr in the Cascade **UI** (user-facing). Does NOT inject into model context. |
| `working_directory` | string | optional | R1 | Execution dir; defaults to workspace root. |

> **(!) No `matcher` field exists (R1).** Hooks cannot be scoped to a tool/file pattern via config — every registered hook fires on its event. Gate inside the script.

### Cross-platform `command` / `powershell` resolution (R1)

| Platform | `command` set | `powershell` set | Result |
|---|:--:|:--:|---|
| macOS/Linux | ✓ | (any) | runs `command` via `bash -c` |
| macOS/Linux | ✗ | ✓ | **hook silently skipped** |
| Windows | ✓ | ✗ | falls back to `command` via `powershell -Command` |
| Windows | ✗ | ✓ | runs `powershell` |
| Windows | ✓ | ✓ | runs `powershell` (takes precedence) |
| any | ✗ | ✗ | validation error |

---

## Hook Events (R1)

Exactly twelve events. Names are **snake_case**, verbatim from R1. `Blockable` = whether exit 2 stops the action.

| Event name (exact) | Phase | Trigger | Blockable (exit 2) | Ref |
|---|---|---|:--:|---|
| `pre_read_code` | pre | before Cascade reads a file | yes | R1 |
| `post_read_code` | post | after Cascade reads a file | no | R1 |
| `pre_write_code` | pre | before Cascade writes/edits a file | yes | R1 |
| `post_write_code` | post | after Cascade writes/edits a file | no | R1 |
| `pre_run_command` | pre | before Cascade runs a terminal command | yes | R1 |
| `post_run_command` | post | after a terminal command completes | no | R1 |
| `pre_mcp_tool_use` | pre | before an MCP tool is invoked | yes | R1 |
| `post_mcp_tool_use` | post | after an MCP tool returns | no | R1 |
| `pre_user_prompt` | pre | before a user prompt is processed | yes | R1 |
| `post_cascade_response` | post | after Cascade produces a response (turn end) | no | R1 |
| `post_cascade_response_with_transcript` | post | after a response; provides transcript file path | no | R1 |
| `post_setup_worktree` | post | after a worktree is set up | no | R1 |

---

## Input Model — stdin JSON (R1)

Every hook receives JSON on **stdin**.

### Common fields (all events)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `agent_action_name` | string | R1 | the action/event being performed |
| `trajectory_id` | string | R1 | conversation/trajectory identifier |
| `execution_id` | string | R1 | per-action execution identifier |
| `timestamp` | string (ISO 8601) | R1 | |
| `model_name` | string | R1 | active model |
| `tool_info` | object | R1 | event-specific payload — see below |

### Event-specific `tool_info` (R1)

| Event(s) | `tool_info` fields |
|---|---|
| `pre_read_code` / `post_read_code` | `file_path` (string) |
| `pre_write_code` / `post_write_code` | `file_path` (string), `edits` (array of `{old_string, new_string}`) |
| `pre_run_command` / `post_run_command` | `command_line` (string), `cwd` (string) |
| `pre_mcp_tool_use` | `mcp_server_name` (string), `mcp_tool_name` (string), `mcp_tool_arguments` (object) |
| `post_mcp_tool_use` | `mcp_server_name` (string), `mcp_tool_name` (string), `mcp_tool_arguments` (object), `mcp_result` (string) |
| `pre_user_prompt` | `user_prompt` (string) |
| `post_cascade_response` | `response` (string, markdown) |
| `post_cascade_response_with_transcript` | `transcript_path` (string — JSONL file path) |
| `post_setup_worktree` | `worktree_path` (string), `root_workspace_path` (string) |

### Environment provided to hook processes (R1)

| Variable | Ref | Notes |
|---|---|---|
| `ROOT_WORKSPACE_PATH` | R1 | original workspace root. Used by `post_setup_worktree` (which executes inside the new worktree dir) — e.g. `bash $ROOT_WORKSPACE_PATH/hooks/setup_worktree.sh`. |

---

## Output Model (R1)

**(!) No structured stdout contract.** stdout is **never** deserialized as JSON — there is no `permissionDecision`/`additionalContext`/`continue`/`decision`/`reason`/`hookSpecificOutput`/`modifiedArgs`/`modifiedResult`; none documented, none honored. A hook communicates through **two channels only**: the **exit code**, and **stderr on a blocking pre-hook**.

| Channel | Behavior | Ref |
|---|---|---|
| process exit code | primary result channel — `0` / `2` / other (see Exit Codes) | R1 |
| **stderr** (on `pre_*` + exit 2) | **(!) delivered to the model: *"The Cascade agent will see the error message from stderr."*** This is the ONLY documented hook→model text channel (the Windsurf analog of a deny reason). | R1 |
| stdout / stderr (UI) | shown in the Cascade UI iff `show_output: true` (user-facing/debugging). **Does NOT enter model context.** `show_output` does not apply to `pre_user_prompt`, `post_cascade_response`, `post_cascade_response_with_transcript`. | R1 |

**(!) No non-blocking agent channel.** Non-blocking hooks (exit 0) and ALL post-hooks pass nothing to the model — their stdout is UI-only. The agent-facing text channel is coupled to **blocking** (`pre_*` + exit 2 + stderr). There is no arbitrary/standalone context injection.

**Documented block pattern (R1):** a `pre_*` hook writes the reason to stderr and exits 2 — e.g. (Python) `print("Command blocked: …", file=sys.stderr); sys.exit(2)`. On `pre_user_prompt` block, R1 notes the **user** sees the error in the Cascade UI (the prompt never reaches the agent).

---

## Exit Codes (R1)

| Code | Meaning | Effect |
|---|---|---|
| `0` | success | action proceeds normally |
| `2` | blocking error | **pre-hooks only**: blocks the action; stderr surfaced. **post-hooks cannot block.** |
| other non-zero | error | non-blocking — action proceeds normally |

---

## Enterprise distribution (R1, informational)

- **Cloud dashboard:** admins set hooks in Team Settings (Enterprise plan + `TEAM_SETTINGS_UPDATE`); auto-distributed to members.
- **System-level deployment:** via MDM (Jamf, Intune, Workspace ONE) or config management (Ansible, Puppet, Chef, SaltStack); end users cannot disable without root.

---

## Appendix — Observed Wire Examples

**Pending the live-hook run (step 3).** To be filled from `~/.rosetta/hooks.log` via `docs/hooks/split-logs.js <session_id>`:
- Captured INPUT payloads per fired event (verbatim stdin JSON).
- Which events actually fire in Devin Desktop / JetBrains, and their real `tool_info` shapes.
- Whether **exit 2** from a `pre_*` hook actually blocks the action (confirms the only output channel).
- Whether emitted stdout JSON is confirmed ignored (BUG 1).
- Runtime env signature (full inherited shell env + Windsurf/Codeium detection vars) + UI-surfacing note (`show_output`).
- Link to the cleaned `docs/hooks/windsurf-logs.txt`.

---

**Open items / cross-references:** see `docs/hooks-verify.md` (Windsurf section, Bug 1).
