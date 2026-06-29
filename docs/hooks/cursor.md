# Cursor Hooks Contract

Target agent: **Cursor** (Agent / Cmd-K chat + Tab inline completions; shared `hooks.json`).

Exact input/output contract for Cursor lifecycle hooks. Facts only, sourced from Cursor's hooks reference.

**Status: VERIFIED (live-hook Runs 1–2, Cursor 3.9.16, 2026-06-29).** Grounded in Cursor's hooks reference (R1) AND empirically confirmed against `~/.rosetta/hooks.log` (`docs/hooks/cursor/hooks.json` + `tester.js`; cleaned excerpt `docs/hooks/cursor-logs.txt`). Run 2 (fresh conversation) added `sessionStart`. The hook protocol is **model-independent** — one run verifies the contract; the model does not change it. **NOT exercised (remain 📄, non-blocking):** `sessionStart` *`env`* output (only `additional_context` confirmed), `beforeReadFile` (did not fire — the Read deny went through `preToolUse`), `beforeShellExecution` *deny* (only passthrough seen — the `cat` was denied at `preToolUse` first), `beforeMCPExecution`/`afterMCPExecution`, `subagentStart`/`subagentStop`, `afterFileEdit`, `sessionEnd`, `permission:"ask"`, `updated_mcp_tool_output`, `failClosed`.

---

## Practical Conclusions (Cursor)

Findings NOT obvious from the per-event tables below — and where Cursor genuinely diverges from Claude / Codex / Copilot:

1. **(!) Output is FLAT snake_case — NO `hookSpecificOutput` wrapper.** Unlike Claude / Codex / Copilot-VS-Code (nested `hookSpecificOutput.*`), Cursor reads fields at the TOP LEVEL: `permission`, `additional_context`, `user_message`, `agent_message`, `updated_input`, `continue`, `env`, `followup_message`. Emitting a `hookSpecificOutput` wrapper does NOT work on Cursor.
2. **(!) Two layers of tool hooks — generic AND granular.** Cursor exposes BOTH a generic `preToolUse`/`postToolUse` pair (fires for every tool) AND granular per-tool-class hooks (`beforeShellExecution`/`afterShellExecution`, `beforeMCPExecution`/`afterMCPExecution`, `beforeReadFile`, `afterFileEdit`). A tool call can fire both the generic and the granular hook. Choose the layer deliberately — wiring a Bash guard on `beforeShellExecution` AND `preToolUse` double-fires it.
3. **(!) Fail-OPEN by default.** A hook crash / timeout / invalid-JSON lets the action through (the opposite of Copilot's fail-closed `preToolUse`). To make a deny-hook block on failure, set `"failClosed": true` on that hook entry in `hooks.json`. A deny guard wired without `failClosed` silently degrades to allow on any error.
4. **(!) Deny reason — OBSERVED behavior CONTRADICTS the doc's audience split (Run 1).** R1 documents `user_message` = "shown to the user", `agent_message` = "fed to the agent". Empirically, on a `preToolUse` deny carrying BOTH fields, **the model received the `user_message` text, NOT `agent_message`.** The mechanism: a denied tool produces a follow-up **`postToolUseFailure`** event whose **`error_message` = the deny's `user_message`** (verbatim, confirmed in the log) — that is the channel the model reads. The `agent_message` was emitted but was **not observed reaching the model** (its marker was recalled as absent). **Implication for Rosetta:** the adapter's existing mapping (deny reason → `user_message`) DOES reach the model — it is not the silent-failure that the doc framing implied. `agent_message`'s actual delivery path is **unverified** (single run; deny exercised only via `preToolUse`, not via `beforeShellExecution`/`beforeMCPExecution`).
   - Cursor also **appends its own line** to a blocked tool's message: *"Agent note: Do not suggest workarounds to the blocked tool."* (not emitted by the hook).
5. **(!) `permission: "ask"` is NOT universal.** Accepted (and enforced) on `beforeShellExecution` / `beforeMCPExecution`. On `preToolUse` it is *"accepted by the schema but not enforced today"* — only `allow`/`deny` act. `beforeReadFile` is `allow`/`deny` only.
6. **Tool names are Cursor-specific.** Matchers/`tool_name` use `Shell`, `Read`, `Write`, `Task`, `MCP:<toolName>` (and Tab variants `TabRead`/`TabWrite`) — NOT Claude/Codex names (`Bash`, `apply_patch`). Wiring that assumes `Bash` will never match.

---

## Capability Matrix (Cursor)

Verification status per hook capability. ✅ = confirmed by live-hook run (Run 1); 📄 = documented (R1), not yet exercised.

| Capability | Status |
|---|---|
| Flat snake_case output (no `hookSpecificOutput` wrapper), parsed at exit 0 | ✅ deny/rewrite/`additional_context`/`followup_message` all honored flat |
| Two-layer tool hooks — generic `preToolUse` AND granular `beforeShellExecution` both fire for one Shell call | ✅ both fired per `echo` |
| `preToolUse` — `permission:"deny"` blocks the tool (exit 0 + JSON) | ✅ blocked `Read` and Shell `cat` |
| `preToolUse` — deny reason reaches model via `user_message` (as `postToolUseFailure.error_message`); `agent_message` NOT observed reaching model | ✅ user_message reached; agent_message absent |
| `preToolUse` — `updated_input` rewrite (args replaced before exec) | ✅ `echo` rewritten before exec |
| `preToolUse` — `permission:"ask"` (schema-accepted, NOT enforced) | 📄 |
| `postToolUse` — inject `additional_context` (reaches model) | ✅ recalled (CURSOR-PTU-9f2a / CPT2) |
| `postToolUse` — `updated_mcp_tool_output` (MCP only) | 📄 |
| `postToolUseFailure` — fires on deny (`failure_type:"permission_denied"`, `error_message`) | ✅ fired for both denied tools |
| `stop` — `followup_message` auto-submits as next turn (once-guarded) | ✅ model replied STOP-FOLLOWUP-RECEIVED |
| `beforeShellExecution` — fires (input `command`/`cwd`/`sandbox`); deny path | ✅ fires / 📄 deny (cat denied at `preToolUse` first) |
| `beforeSubmitPrompt` — fires (input `prompt`/`attachments`); `continue` block | ✅ fires / 📄 block |
| `afterShellExecution` / `afterAgentResponse` / `afterAgentThought` — fire (fire-and-forget) | ✅ fired |
| `preCompact` — fires (`trigger:"manual"` + context stats) | ✅ fired (Cursor "summarize") |
| `sessionStart` — inject `additional_context` (reaches model) | ✅ recalled (CURSOR-SS-3c4d / CSS1), Run 2 fresh conversation |
| `sessionStart` — set session `env` vars | 📄 not exercised |
| `beforeReadFile` — `permission` allow/deny | 📄 did NOT fire (Read deny went via `preToolUse`) |
| `beforeMCPExecution` / `afterMCPExecution` — `permission` + messages | 📄 |
| `subagentStart` / `subagentStop` (`followup_message`) | 📄 |
| `afterFileEdit` / `sessionEnd` | 📄 |
| Exit code 2 ≡ `permission:"deny"` | 📄 (Run 1 used exit-0 + JSON) |
| `failClosed:true` blocks on hook failure (else fail-open) | 📄 |

---

## Events of Interest (Rosetta)

Rosetta's 5 target lifecycle events, mapped to Cursor's event model. The remaining Cursor events are documented below for completeness.

| Rosetta purpose | Cursor event(s) |
|---|---|
| Session context injection | `sessionStart` |
| Pre-tool guard (deny / rewrite / advise) | `preToolUse` (generic) — and granular `beforeShellExecution` / `beforeReadFile` / `beforeMCPExecution` |
| Post-tool advisory | `postToolUse` (generic) — and granular `afterShellExecution` / `afterFileEdit` / `afterMCPExecution` |
| Subagent end | `subagentStop` |
| Turn / session stop | `stop` (turn end) · `sessionEnd` (session end) |

> **(!) Pre/PostToolUse layering (R1):** Cursor fires BOTH a generic `preToolUse`/`postToolUse` and a granular per-tool hook. The generic hook sees every tool (`Shell`/`Read`/`Write`/`Task`/`MCP:*`); the granular hooks see one tool class with richer input (e.g. `beforeShellExecution` gets the raw `command` + `sandbox`). Pick ONE layer per guard to avoid double-fire.

---

## References

| ID | System | URL |
|---|---|---|
| R1 | Cursor — Hooks reference | https://cursor.com/docs/reference/hooks |

All fields cite **R1** unless a row is marked otherwise.

---

## Hook Configuration & Locations

| Item | Value | Ref |
|---|---|---|
| Project hooks file | `<project-root>/.cursor/hooks.json` | R1 |
| User hooks file | `~/.cursor/hooks.json` | R1 |
| Enterprise (macOS) | `/Library/Application Support/Cursor/hooks.json` | R1 |
| Enterprise (Linux/WSL) | `/etc/cursor/hooks.json` | R1 |
| Enterprise (Windows) | `C:\ProgramData\Cursor\hooks.json` | R1 |

### `hooks.json` registration format (R1)

```json
{
  "version": 1,
  "hooks": {
    "<hookName>": [
      {
        "command": "path/to/script",
        "type": "command",
        "timeout": 60,
        "loop_limit": null,
        "failClosed": false,
        "matcher": "Shell"
      }
    ]
  }
}
```

| Handler field | Type | Ref | Notes |
|---|---|---|---|
| `command` | string | R1 | **required**; the hook command to run |
| `type` | `"command"` \| `"prompt"` | R1 | default `"command"` |
| `timeout` | number | R1 | optional |
| `loop_limit` | number \| null | R1 | optional |
| `failClosed` | boolean | R1 | default `false`; `true` → hook failure BLOCKS the action (else fail-open) |
| `matcher` | string | R1 | optional; pattern matched per-hook (see Matcher Rules) |

### Matcher rules per hook (R1)

| Hook | Matcher matches against |
|---|---|
| `preToolUse` / `postToolUse` / `postToolUseFailure` | tool type — `Shell`, `Read`, `Write`, `Task`, `MCP:<toolName>` |
| `subagentStart` / `subagentStop` | subagent type (e.g. `explore|shell`) |
| `beforeShellExecution` / `afterShellExecution` | the command text |
| `beforeMCPExecution` / `afterMCPExecution` | MCP tool name |
| `beforeReadFile` | tool type — `Read`, `TabRead` |
| `afterFileEdit` | tool type — `Write`, `TabWrite` |
| `beforeSubmitPrompt` | `UserPromptSubmit` |
| `stop` | `Stop` |
| `afterAgentResponse` | `AgentResponse` |
| `afterAgentThought` | `AgentThought` |

### Environment variables available to hooks (R1)

`CURSOR_PROJECT_DIR` (always), `CURSOR_VERSION` (always), `CURSOR_USER_EMAIL` (if logged in), `CURSOR_TRANSCRIPT_PATH` (if transcripts enabled), `CURSOR_CODE_REMOTE` (`"true"` for remote workspaces), `CLAUDE_PROJECT_DIR` (alias, always). Plus session-scoped vars set via `sessionStart` `env`.

---

## Hook Events (complete list)

Agent hooks: `sessionStart`, `sessionEnd`, `preToolUse`, `postToolUse`, `postToolUseFailure`, `subagentStart`, `subagentStop`, `beforeShellExecution`, `afterShellExecution`, `beforeMCPExecution`, `afterMCPExecution`, `beforeReadFile`, `afterFileEdit`, `beforeSubmitPrompt`, `preCompact`, `stop`, `afterAgentResponse`, `afterAgentThought`.
Tab hooks: `beforeTabFileRead`, `afterTabFileEdit`.
App lifecycle: `workspaceOpen`.

> All event names are **camelCase** (R1). No PascalCase aliases documented.

---

## Common Input Fields (ALL agent hooks)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `conversation_id` | string | R1 | conversation identifier |
| `generation_id` | string | R1 | generation identifier |
| `model` | string | R1 | active model |
| `model_id` | string | R1 | optional |
| `model_params` | `[{id, value}]` | R1 | optional |
| `hook_event_name` | string | R1 | the firing event name (camelCase) |
| `cursor_version` | string | R1 | Cursor version |
| `workspace_roots` | string[] | R1 | workspace root paths |
| `user_email` | string \| null | R1 | logged-in user email |
| `transcript_path` | string \| null | R1 | session transcript path |

Input is delivered as snake_case JSON on stdin. `tool_input` (where present) is an object.

> **Observed (Run 1):** `session_id` is present on every event and **equals `conversation_id`**. `model` **varies by phase** — `"composer-2.5-fast"` (+ `model_id:"composer-2.5"`, `model_params:[{id:"fast",value:"true"}]`) on `beforeSubmitPrompt`/`stop`; `"default"` on tool events; `"gpt-4.1-mini"` on `preCompact`. `transcript_path` is a `…/agent-transcripts/<id>.jsonl` path (but `null` on `beforeSubmitPrompt`).

---

## sessionStart

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | **Observed (Run 2): `generation_id:""` (empty at session start); `transcript_path:null`; `model`/`model_id` `"default"`.** |
| `session_id` | string | R1 | session id. **Observed = `conversation_id` (Run 2).** |
| `is_background_agent` | boolean | R1 | background-agent session. **Observed `false` (Run 2).** |
| `composer_mode` | string | R1 | optional — `"agent"` \| `"ask"` \| `"edit"`. **Observed `"agent"` (Run 2).** |

> **Observed (Run 2):** no `source` field (unlike Claude/Codex `SessionStart`). `sessionStart` fires only at conversation start — it did NOT fire in Run 1 because hooks were registered mid-session.

### Output (R1)

```json
{ "env": { "<key>": "<value>" }, "additional_context": "context text" }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `additional_context` | string | R1 | optional; injected into the conversation. **✅ Observed (Run 2): reaches the model (recalled CURSOR-SS-3c4d / CSS1); emit exit 0, textLen 71.** |
| `env` | object | R1 | optional; session-scoped environment variables. **Not exercised.** |

---

## preToolUse (generic)

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `tool_name` | string | R1 | `Shell`, `Read`, `Write`, `Task`, `MCP:<toolName>`. **Observed `Shell`, `Read` (Run 1).** |
| `tool_input` | object | R1 | tool-specific parameters. **Observed: Shell → `{command, cwd, timeout}`; Read → `{file_path}` (Run 1).** |
| `tool_use_id` | string | R1 | tool-call id. **Observed (Run 1).** |
| `cwd` | string | R1 | working directory. **Observed empty `""` (Run 1).** |
| `agent_message` | string | R1 | agent's message preceding the tool call. **Observed ABSENT from preToolUse input (Run 1).** |
| `model` | string | R1 | **Observed `"default"` on preToolUse (Run 1); varies per phase — see Common note.** |

### Output (R1)

```json
{ "permission": "deny", "user_message": "shown to user", "agent_message": "fed to agent", "updated_input": { } }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `permission` | `"allow"` \| `"deny"` | R1 | **(!) `"ask"` is accepted by the schema but NOT enforced for `preToolUse` today** |
| `user_message` | string | R1 | optional; **(!) shown to the USER when denied — NOT seen by the model** |
| `agent_message` | string | R1 | optional; **(!) fed to the AGENT/model when denied — use this for a model-facing reason** |
| `updated_input` | object | R1 | optional; replaces the tool input before execution |

---

## postToolUse (generic)

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `tool_name` | string | R1 | tool type |
| `tool_input` | object | R1 | tool parameters |
| `tool_output` | string | R1 | JSON-stringified tool result. **Observed (Run 1): Shell → `"{\"output\":\"…\\n\",\"exitCode\":0}"` (a JSON STRING wrapping `output` + `exitCode`).** |
| `tool_use_id` | string | R1 | tool-call id. **Observed (Run 1).** |
| `cwd` | string | R1 | working directory. **Observed `""` (Run 1).** |
| `duration` | number | R1 | milliseconds. **Observed float (e.g. `728.221`) (Run 1).** |

### Output (R1)

```json
{ "additional_context": "context text", "updated_mcp_tool_output": { } }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `additional_context` | string | R1 | optional; injected into the conversation AFTER the tool result |
| `updated_mcp_tool_output` | object | R1 | optional; **MCP tools only** — replaces the tool output the model sees |

---

## beforeShellExecution

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `command` | string | R1 | the shell command |
| `cwd` | string | R1 | working directory |
| `sandbox` | boolean | R1 | sandboxed execution |

### Output (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `permission` | `"allow"` \| `"deny"` \| `"ask"` | R1 | `"ask"` IS enforced here |
| `user_message` | string | R1 | optional; shown to the user on deny |
| `agent_message` | string | R1 | optional; fed to the agent on deny |

---

## afterShellExecution

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `command` | string | R1 | the shell command |
| `output` | string | R1 | command output |
| `duration` | number | R1 | milliseconds |
| `sandbox` | boolean | R1 | sandboxed execution |

### Output (R1)

Fire-and-forget — responses are logged but not enforced. No output fields.

---

## beforeMCPExecution

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `tool_name` | string | R1 | MCP tool name |
| `tool_input` | string | R1 | JSON params |
| `url` | string | R1 | optional — URL-based servers |
| `command` | string | R1 | optional — command-based servers |

### Output (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `permission` | `"allow"` \| `"deny"` \| `"ask"` | R1 | `"ask"` IS enforced here |
| `user_message` | string | R1 | optional; shown to the user on deny |
| `agent_message` | string | R1 | optional; fed to the agent on deny |

---

## afterMCPExecution

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `tool_name` | string | R1 | MCP tool name |
| `tool_input` | string | R1 | JSON params |
| `result_json` | string | R1 | MCP result |
| `duration` | number | R1 | milliseconds |

### Output (R1)

Fire-and-forget. No output fields.

---

## beforeReadFile

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `file_path` | string | R1 | file being read |
| `content` | string | R1 | file content |
| `attachments` | `[{type:"file"\|"rule", file_path}]` | R1 | attached files/rules |

### Output (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `permission` | `"allow"` \| `"deny"` | R1 | allow/deny only (no `ask`) |
| `user_message` | string | R1 | optional; shown to the user on deny |

---

## afterFileEdit

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `file_path` | string | R1 | edited file |
| `edits` | `[{old_string, new_string}]` | R1 | applied edits |

### Output (R1)

No output fields.

---

## subagentStart

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `subagent_id` | string | R1 | subagent id |
| `subagent_type` | string | R1 | e.g. `generalPurpose`, `explore`, `shell` |
| `task` | string | R1 | assigned task |
| `parent_conversation_id` | string | R1 | parent conversation |
| `tool_call_id` | string | R1 | tool-call id |
| `subagent_model` | string | R1 | subagent model |
| `is_parallel_worker` | boolean | R1 | parallel-worker subagent |
| `git_branch` | string | R1 | optional |

### Output (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `permission` | `"allow"` \| `"deny"` | R1 | gate subagent start |
| `user_message` | string | R1 | optional; shown to the user on deny |

---

## subagentStop

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `subagent_type` | string | R1 | subagent type |
| `status` | `"completed"` \| `"error"` \| `"aborted"` | R1 | terminal status |
| `task` | string | R1 | assigned task |
| `description` | string | R1 | description |
| `summary` | string | R1 | run summary |
| `duration_ms` | number | R1 | duration |
| `message_count` | number | R1 | messages |
| `tool_call_count` | number | R1 | tool calls |
| `loop_count` | number | R1 | loops |
| `modified_files` | string[] | R1 | files changed |
| `agent_transcript_path` | string \| null | R1 | subagent transcript |

### Output (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `followup_message` | string | R1 | optional; **consumed only when `status="completed"`** — auto-submits as the next message |

---

## stop

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `status` | `"completed"` \| `"aborted"` \| `"error"` | R1 | turn terminal status |
| `loop_count` | number | R1 | loop count |

### Output (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `followup_message` | string | R1 | optional; auto-submits as the next user message |

---

## sessionEnd

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `session_id` | string | R1 | session id |
| `reason` | `"completed"`\|`"aborted"`\|`"error"`\|`"window_close"`\|`"user_close"` | R1 | end reason |
| `duration_ms` | number | R1 | session duration |
| `is_background_agent` | boolean | R1 | background-agent session |
| `final_status` | string | R1 | final status |
| `error_message` | string | R1 | optional |

### Output (R1)

Fire-and-forget. No output fields.

---

## beforeSubmitPrompt

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `prompt` | string | R1 | the prompt about to be submitted |
| `attachments` | `[{type:"file"\|"rule", file_path}]` | R1 | attachments |

### Output (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `continue` | boolean | R1 | whether to allow submission |
| `user_message` | string | R1 | optional |

---

## preCompact

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `trigger` | `"auto"` \| `"manual"` | R1 | compaction trigger |
| `context_usage_percent` | number | R1 | context usage |
| `context_tokens` | number | R1 | context tokens |
| `context_window_size` | number | R1 | window size |
| `message_count` | number | R1 | messages |
| `messages_to_compact` | number | R1 | messages to compact |
| `is_first_compaction` | boolean | R1 | first compaction this session |

### Output (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `user_message` | string | R1 | optional |

---

## Other documented events (out of Rosetta scope)

| Event | Class | Input (key fields) | Output | Ref |
|---|---|---|---|---|
| `postToolUseFailure` | agent | `tool_name`, `tool_input`, `tool_use_id`, `cwd`, `error_message`, `failure_type` (`timeout`\|`error`\|`permission_denied`), `duration`, `is_interrupt` | none | R1 |

> **(!) Observed (Run 1):** a `preToolUse` **deny** produces a follow-up `postToolUseFailure` with `failure_type:"permission_denied"`, `duration:0`, `is_interrupt:false`, and **`error_message` = the deny's `user_message`** verbatim. This is the channel by which the deny reason reached the model (see Practical Conclusion 4).
| `afterAgentResponse` | agent | `text` | fire-and-forget | R1 |
| `afterAgentThought` | agent | `text`, `duration_ms` (opt) | fire-and-forget | R1 |
| `beforeTabFileRead` | Tab | `file_path`, `content` | `permission: allow\|deny` | R1 |
| `afterTabFileEdit` | Tab | `file_path`, `edits[{old_string,new_string,range,old_line,new_line}]` | none | R1 |
| `workspaceOpen` | app | `hook_event_name`, `cursor_version`, `workspace_roots`, `user_email` | `pluginPaths: string[]` (opt) | R1 |

---

## Exit Codes (command-based hooks)

| Code | Meaning | Ref |
|---|---|---|
| `0` | Success; stdout JSON parsed | R1 |
| `2` | Block the action — equivalent to `permission: "deny"` | R1 |
| other non-zero | Hook failed; action proceeds (**fail-open** unless `failClosed:true`) | R1 |

---

## Appendix — Observed Wire Examples (Cursor live-hook Run 1)

Real captures via `docs/hooks/tester.js` → `~/.rosetta/hooks.log`; run repo `/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql`; Cursor **3.9.16**; one session (`conversation_id` = `session_id` = `74676b03-…`). Single run — illustrative, not exhaustive. Long values trimmed with `…`; planted test markers only, no real secrets.

**Cleaned log:** `docs/hooks/cursor-logs.txt` (23 invocation blocks, filtered by `session_id`, de-interleaved by pid; zero credential-shaped values). ⚠️ **Do NOT read whole** — `grep` (e.g. `grep -nE 'hook_event_name|RESULT:|PROCESSOR:' docs/hooks/cursor-logs.txt`).

**Runtime env signature (Cursor):** `CURSOR_EXTENSION_HOST_ROLE=agent-exec`, `CURSOR_LAYOUT=unifiedAgent`, `CURSOR_VERSION=3.9.16`, `CURSOR_PROJECT_DIR`, `CURSOR_TRANSCRIPT_PATH`, `CURSOR_USER_EMAIL`, `CURSOR_WORKSPACE_LABEL`, `CURSOR_RIPGREP_PATH`, plus VS-Code-base vars (`VSCODE_PID`, `VSCODE_IPC_HOOK`, `VSCODE_PROCESS_TITLE=extension-host (agent-exec) …`) and the `CLAUDE_PROJECT_DIR` alias. (Cursor is a VS Code fork — both `CURSOR_*` and `VSCODE_*` are present.)

**How Cursor surfaces hook output in the UI** (NOT proof of model ingestion): a denied tool shows the `user_message` in the client, and Cursor appends *"Agent note: Do not suggest workarounds to the blocked tool."* The `cat`/Shell deny prefixes `Rejected: `.

**Events that fired (Run 1):** `beforeSubmitPrompt`, `stop`, `preToolUse`, `beforeShellExecution`, `postToolUse`, `postToolUseFailure`, `afterShellExecution`, `afterAgentThought`, `afterAgentResponse`, `preCompact`. **Run 2 (fresh conversation `3cf8e158-…`)** added `sessionStart`. **Did NOT fire (either run):** `sessionEnd`, `beforeReadFile`, `before/afterMCPExecution`, `afterFileEdit`, `subagentStart/Stop`.

### Captured INPUT payloads (snake_case; flat)

```json
// sessionStart (Run 2, fresh conversation) — generation_id empty, transcript_path null, no `source`; output additional_context reached the model
{"conversation_id":"3cf8e158-…","generation_id":"","model":"default","model_id":"default","is_background_agent":false,"composer_mode":"agent","session_id":"3cf8e158-…","hook_event_name":"sessionStart","cursor_version":"3.9.16","workspace_roots":["…/spring-boot-react-mysql"],"user_email":"…","transcript_path":null}
// preToolUse — Shell tool (tool_input object: command/cwd/timeout)
{"conversation_id":"74676b03-…","generation_id":"f7746f6e-…","model":"default","tool_name":"Shell","tool_input":{"command":"echo rosetta-hook-probe","cwd":"","timeout":30000},"tool_use_id":"09dca0a5-…","cwd":"","session_id":"74676b03-…","hook_event_name":"preToolUse","cursor_version":"3.9.16","workspace_roots":["…/spring-boot-react-mysql"],"user_email":"…","transcript_path":"…/agent-transcripts/74676b03-….jsonl"}
// preToolUse — Read tool (tool_input.file_path)
{…,"tool_name":"Read","tool_input":{"file_path":"…/docs/hooks/HOOK-DENY-PROBE.txt"},"tool_use_id":"tool_ce44…","hook_event_name":"preToolUse"}
// postToolUse — tool_output is a JSON STRING; duration float
{…,"tool_name":"Shell","tool_input":{"command":"echo rosetta-hook-probe",…},"tool_output":"{\"output\":\"rosetta-hook-probe\\n\",\"exitCode\":0}","duration":728.221,"tool_use_id":"09dca0a5-…","hook_event_name":"postToolUse"}
// postToolUseFailure — from a deny; error_message = the deny's user_message
{…,"tool_name":"Read","tool_input":{"file_path":"…HOOK-DENY-PROBE.txt"},"error_message":"HOOK TEST (Rosetta diagnostic): user-facing deny channel marker CURSOR-DENY-USER (shown in the Cursor UI).","failure_type":"permission_denied","duration":0,"tool_use_id":"tool_ce44…","is_interrupt":false,"hook_event_name":"postToolUseFailure"}
// beforeShellExecution — flat command/cwd/sandbox (no tool_input wrapper)
{…,"model":"default","command":"echo rosetta-hook-probe","cwd":"","sandbox":false,"hook_event_name":"beforeShellExecution"}
// afterShellExecution — command/output/duration/sandbox
{…,"command":"echo rosetta-hook-probe","output":"rosetta-hook-probe\n","duration":728.221,"sandbox":false,"hook_event_name":"afterShellExecution"}
// beforeSubmitPrompt — prompt + attachments (active rules); model composer-2.5-fast; transcript_path null
{…,"model":"composer-2.5-fast","model_id":"composer-2.5","model_params":[{"id":"fast","value":"true"}],"composer_mode":"agent","prompt":"…","attachments":[{"type":"rule","file_path":"graphify.mdc"},{"type":"rule","file_path":"CLAUDE.md"}],"hook_event_name":"beforeSubmitPrompt","transcript_path":null}
// stop — status + loop_count (observed status:"error" on a failed turn)
{…,"model":"composer-2.5-fast","status":"error","loop_count":0,"hook_event_name":"stop"}
// preCompact — trigger + context stats (fired on Cursor "summarize")
{…,"model":"gpt-4.1-mini","trigger":"manual","context_usage_percent":9.2085,"context_tokens":18417,"context_window_size":200000,"message_count":13,"messages_to_compact":11,"is_first_compaction":true,"hook_event_name":"preCompact"}
```

### Emitted OUTPUT that Cursor ACCEPTED (flat snake_case, exit 0)

```json
// sessionStart context (Run 2) — flat additional_context; reached the model (recalled CURSOR-SS-3c4d / CSS1)
{"additional_context":"Diagnostic secret CURSOR-SS-3c4d. Report CSS1."}
// preToolUse deny — flat; blocked the tool. user_message reached the model (as postToolUseFailure.error_message); agent_message did NOT.
{"permission":"deny","user_message":"…CURSOR-DENY-USER…","agent_message":"…CURSOR-DENY-AGENT; Report DA1"}
// preToolUse rewrite — flat allow + updated_input; command substituted before exec (output was PRETOOLUSE-HOOK-REWROTE-THIS)
{"permission":"allow","updated_input":{"command":"echo PRETOOLUSE-HOOK-REWROTE-THIS"}}
// postToolUse context — flat additional_context; reached the model (recalled CURSOR-PTU-9f2a / CPT2)
{"additional_context":"Diagnostic secret CURSOR-PTU-9f2a. Report CPT2."}
// stop continuation — flat followup_message; auto-submitted once (model replied STOP-FOLLOWUP-RECEIVED CURSOR-STOP-1)
{"followup_message":"HOOK TEST … STOP-FOLLOWUP-RECEIVED CURSOR-STOP-1 …"}
```
