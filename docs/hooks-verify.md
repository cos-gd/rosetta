# Hooks Output Format Verification

Terse, factual findings. Grounded in public docs and codebase inspection.
Session: 2026-06-24. Status: findings complete, implementation NOT started.

---

## User Intent

Verify all hook output formats used in Rosetta hooks. Check public docs per IDE/agent one at a time.
Check usage in `docs/requirements`, `rosettify-plugins`, and `instructions` (r2 + r3).

---

## Working Protocol (per agent, explicit — MUST follow)

For each IDE/agent, in this exact order:

1. **Spec doc**: Create/update `docs/hooks/<ide>.md` — EXACT contract: input model, output model, field-by-field meaning, constraints, direct links to official docs. No prose. Specs only.
2. **HITL — spec review**: Present spec to user. Resolve all uncertainties. Wait for **explicit approval** before proceeding.
3. Check `src/hooks` (grep/search — no full reads)
4. Check `docs/REQUIREMENTS` (grep; reset requirement status to `Draft` AFTER implementation, not before)
5. Check `src/rosettify-plugins` (grep for all affected usages)
6. Check `instructions/r*/configure/*.md` (grep; both r2 + r3)
7. **HITL gate**: present all findings — wait for **explicit approval** before touching code or docs
8. Update `hooks-verify.md` with confirmed decisions
9. Make changes across all areas
10. Update `hooks-verify.md` with post-change summary

**Constraint:** ONE agent at a time. No jumping ahead.
**Spec files:** `docs/hooks/copilot.md`, `docs/hooks/claude.md`, `docs/hooks/cursor.md`, `docs/hooks/codex.md`, `docs/hooks/windsurf.md` — one per IDE, created before any code work on that IDE.
**Target hook events (all IDEs):** `SessionStart`, `SessionStop`, `AgentStop`/`SubagentStop`, `PreToolUse`, `PostToolUse` — only these five. Each spec covers: exact input JSON model, exact output JSON model, field-by-field types/meanings/constraints, direct doc links. No prose.
**Matchers:** Document per-IDE matchers and wiring inside the respective `docs/hooks/<ide>.md`.

---

## User Decisions (HITL answers)

| Issue | Decision |
|---|---|
| Bug 1 — exit code never matches hook result | **Fix for all IDEs. Process exit code MUST match what hook returned. NOT Windsurf-only.** |
| Bug 2 — Copilot `additionalContext` placement | **Emit BOTH: top-level `additionalContext` AND inside `hookSpecificOutput.additionalContext`. Both contracts satisfied, nothing breaks. Do NOT switch between formats — merge them.** |
| Bug 2 — Copilot `additionalContext` on PreToolUse / PostToolUse | **RESOLVED (OI-1, 2026-06-25): earlier wording mis-recorded. Rule = use the dedicated field per purpose — PreToolUse deny → `permissionDecisionReason`; PostToolUse advisory + SessionStart context → `additionalContext` (its dedicated injection field). "Do NOT use `additionalContext`" applies ONLY to deny-reasons, NOT as a blanket ban.** |
| Gap 3 — `cursor.md` and `codex.md` missing Output Contract sections | **Yes, add. Re-verify whether all hooks follow same format OR some differ (in addition to IDE diffs). Include proof links. Output findings here.** |
| Gap 4/5 — `suppressOutput` dead, `ask` unsupported in Codex | **Not a gap — fields defined for future support. No change.** |

---

## Internal Pipeline

```
HookResult (hook logic)
  → toCanonical() in run-hook.ts
  → CanonicalOutput (intermediate)
  → adapter.formatOutput(canonical, ide) in adapter.ts
  → IDE-specific wire JSON → stdout
```

`run-hook.ts` always exits 0 on success (BUG — see below). Exit 1 on error.

### HookResult kinds

```typescript
| { kind: 'advise';      message: string }  // → hookSpecificOutput with additionalContext
| { kind: 'allow' }                          // → hookSpecificOutput with permissionDecision:'allow'
| { kind: 'deny';        reason: string }   // → hookSpecificOutput with permissionDecision:'deny', continue:false
| { kind: 'side-effect' }                   // → no stdout
| null                                       // → no stdout
```

### CanonicalOutput type (`src/hooks/src/types.ts`)

```typescript
interface CanonicalOutput {
  hookSpecificOutput?: {
    hookEventName?: string;
    additionalContext?: string;
    permissionDecision?: string;  // 'allow' | 'deny' | (per user: 'ask' kept for future)
    permissionDecisionReason?: string;
  };
  continue?: boolean;
  suppressOutput?: boolean;  // defined for future use, never set today
}
```

---

## Per-IDE Output Formats

### Claude Code

**Docs:** https://docs.anthropic.com/en/docs/claude-code/hooks  
**Our adapter:** `src/hooks/src/adapters/claude-code.ts` — identity pass-through, CanonicalOutput IS wire format.

Wire format (Claude Code = canonical):
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "permissionDecision": "allow|deny|ask|defer",
    "permissionDecisionReason": "optional",
    "additionalContext": "optional string injected into Claude context"
  },
  "continue": false,
  "suppressOutput": false
}
```

Exit code semantics (official docs):
- `0` = success, stdout parsed as JSON
- `2` = blocking error; stderr → Claude; stdout ignored
- other non-zero = non-blocking; execution continues

**SessionStart additional fields** (not in our CanonicalOutput, not needed today):
`sessionTitle`, `initialUserMessage`, `watchPaths`, `reloadSkills`

---

### Codex (OpenAI)

**Docs:** https://platform.openai.com/docs/guides/codex/hooks  
**Our adapter:** `src/hooks/src/adapters/codex.ts` — identity pass-through (same schema as Claude Code).

Wire format: identical to Claude Code `hookSpecificOutput` schema.  
**Important:** `permissionDecision: "ask"` is NOT supported by Codex (parse failure). Claude Code allows it; Codex does not. Current hooks only emit `"deny"` so not triggered in practice.

Exit codes: `0` = success, `2` = failure with stderr reason.

**Documentation gap:** `instructions/*/configure/codex.md` has no Output Contract section. Only event names and `hooks.json` registration are documented.

---

### Cursor

**Docs:** https://cursor.com/docs/reference/hooks  
**Our adapter:** `src/hooks/src/adapters/cursor.ts` — maps canonical → Cursor snake_case.

Wire format mapping:

| CanonicalOutput field | Cursor wire field | Notes |
|---|---|---|
| `hookSpecificOutput.additionalContext` | `additional_context` | snake_case |
| `hookSpecificOutput.permissionDecision` | `permission` | renamed; values: `allow`/`deny` |
| `hookSpecificOutput.permissionDecisionReason` | `user_message` | user-facing |
| `continue: false` (fallback) | `permission: "deny"` | only if no explicit permissionDecision |

Cursor also documents `agent_message` (agent-visible reason) — our CanonicalOutput has no equivalent field.

Exit codes: `0` = success, `2` = block (equivalent to `permission: "deny"`). Both mechanisms work.

**Documentation gap:** `instructions/*/configure/cursor.md` has NO hook output format / Output Contract section. Cursor's `additional_context` format is only in `docs/requirements/plugin-generator/FR-VAR.md` and source code. Violates INT-IDE-0002 which designates configure guides as authoritative.

---

### GitHub Copilot

**Docs:** https://docs.github.com/en/copilot/tutorials/copilot-cli-hooks  
**Docs:** https://docs.github.com/en/copilot/reference/hooks-reference  
**Docs:** https://code.visualstudio.com/docs/agent-customization/hooks  
**Our adapter:** `src/hooks/src/adapters/copilot.ts`

**Two references, two different output contracts — both must be satisfied (merged approach per user decision):**
- GitHub Copilot CLI docs → `additionalContext` at **top level**
- VS Code agent hooks docs → `additionalContext` inside **`hookSpecificOutput`**

#### Official Copilot output schemas (both references)

**GitHub Copilot CLI** (`docs.github.com/copilot/reference/hooks-reference`):

| Hook | Output fields | Level |
|---|---|---|
| `sessionStart` | `additionalContext` | top-level |
| `preToolUse` | `permissionDecision`, `permissionDecisionReason`, `modifiedArgs` | top-level |
| `postToolUse` | `additionalContext`, `modifiedResult` | top-level |
| `sessionEnd` / `errorOccurred` | none | — |

**VS Code agent hooks** (`code.visualstudio.com/docs/agent-customization/hooks`):

| Hook | Output fields | Level |
|---|---|---|
| `sessionStart` | `hookSpecificOutput.hookEventName`, `hookSpecificOutput.additionalContext` | nested |
| `preToolUse` | `hookSpecificOutput.permissionDecision`, `hookSpecificOutput.permissionDecisionReason` | nested |
| `postToolUse` | `hookSpecificOutput.hookEventName`, `hookSpecificOutput.additionalContext` | nested |
| `sessionEnd` / `errorOccurred` | none | — |

#### Wire format — our adapter output today:
```typescript
// copilot.ts formatOutput (lines 90–94)
if (permissionDecision)       out.permissionDecision = permissionDecision;        // ✅ top-level — correct
if (permissionDecisionReason) out.permissionDecisionReason = permissionDecisionReason; // ✅ top-level — correct
if (cont === false && !out.permissionDecision) out.permissionDecision = 'deny';   // ✅ correct
if (additionalContext)        out.hookSpecificOutput = { hookEventName, additionalContext }; // ⚠️ nested only — missing top-level emit
```

**⚠️ BUG 2 — adapter emits `additionalContext` in `hookSpecificOutput` only. Must emit in BOTH locations for SessionStart.**
**⚠️ PreToolUse / PostToolUse must NOT use `additionalContext` — use specific reason field (TBD).**

Affected files:

| Layer | File | Issue |
|---|---|---|
| Runtime hook adapter | `src/hooks/src/adapters/copilot.ts:93` | Missing top-level `out.additionalContext` alongside existing `hookSpecificOutput` |
| Bootstrap generator | `src/rosettify-plugins/src/escaping/json-string.ts:47` | `buildHookPayloadJson` emits nested only — Copilot needs both top-level AND nested |
| Bootstrap manifest | `src/rosettify-plugins/src/spec/bootstrap-manifest.ts:47,54,62` | Copilot commands emit nested only |
| Lock comment | `src/rosettify-plugins/src/bootstrap/copilot-lock.ts:13` | References nested-only format — needs update |

`permissionDecision` values: `allow`, `deny`, `ask`. `ask` treated as deny in cloud agent.  
`preToolUse` is **fail-closed**: crash/non-zero/timeout denies the tool call.

Exit codes: `0` = parse JSON. `2` = warning or deny (context-dependent). Copilot dedup lock is file-based (session-based lock key per entry index) — handles the duplicate-fire bug.

#### Copilot Input Normalization — Adapter Contract (`src/hooks/src/adapters/copilot.ts`)

`normalize()` maps raw Copilot input to internal `NormalizedInput`. Copilot CLI sends camelCase; VS Code sends snake_case. Both shapes must be handled.

| NormalizedInput field | Source field(s) read | Ref | Notes |
|---|---|---|---|
| `session_id` | `raw.sessionId ?? raw.session_id` | R1, R3 | ✅ both shapes handled |
| `tool_name` | `raw.toolName` | R1 | ⚠️ camelCase only; `raw.tool_name` (R3 snake_case) NOT read |
| `tool_input` | `raw.toolArgs` (JSON string, parsed) | R1 | ⚠️ Copilot CLI sends string; VS Code (R3) sends `tool_input` as object — NOT read |
| `tool_use_id` | — (always `undefined`) | R3 | ⚠️ VS Code provides `tool_use_id` — never mapped |
| `cwd` | `raw.cwd` | R1, R3 | ✅ |
| `tool_response` | `raw.toolResult` (object `{resultType, textResultForLlm}`) | R1 | ⚠️ VS Code (R3) sends `tool_response` as plain string — type mismatch, NOT read |
| `file_path` | derived via `getFilePath(raw)` | — | extracted from parsed `toolArgs` |
| `source` | `raw.source` | R1 | |
| `reason` | `raw.reason` | R1 | |
| `transcript_path` | `raw.transcriptPath ?? raw.transcript_path` | R1, R3 | ✅ both shapes handled |
| `hook_event_name` | inferred via `inferHookEventName(raw)` | R3 | ⚠️ Copilot CLI sends no explicit event name; VS Code sends `hook_event_name` — not consumed directly, always inferred |
| `event` | inferred via `inferEvent(raw)` | — | derived from input shape: `toolResult` present → `PostToolUse`, else `PreToolUse` |

**Input normalization changes required (not yet implemented):**
- `tool_name`: must also read `raw.tool_name` (snake_case, R3 VS Code shape)
- `tool_input`: must handle `raw.tool_input` (object, R3); currently reads only `raw.toolArgs` (JSON string, R1)
- `tool_use_id`: must map `raw.tool_use_id` from R3 — always `undefined` today
- `tool_response`: must handle `raw.tool_response` (string, R3); currently reads only `raw.toolResult` (object, R1) — type mismatch
- `hook_event_name`: when `raw.hook_event_name` is present (R3), consume directly instead of always inferring

Resolution priority — see Open Items OI-3 in hooks-verify.md (below).

---

### Windsurf

**Docs:** https://docs.windsurf.com/windsurf/cascade/hooks (currently redirects to docs.devin.ai/desktop/cascade/hooks)  
**Our adapter:** `src/hooks/src/adapters/windsurf.ts`

**⚠️ BUG 1 (CONFIRMED):** Windsurf does NOT parse hook stdout JSON. Only process exit code matters.
- `_exitCode: 2` in our JSON stdout → silently ignored by Windsurf.
- To block a pre-hook in Windsurf, the process MUST exit with code 2.
- Our `dangerous-actions.js` deny is silently broken for Windsurf.
- `additionalContext` in JSON stdout also ignored (Windsurf has no context injection from hooks).

Current windsurf adapter `formatOutput` output:
```typescript
out.additionalContext = additionalContext;  // ignored by Windsurf
out._exitCode = 2;                           // ignored by Windsurf (not an exit code, just a JSON field)
```

Windsurf-only events (no CC equivalent): `PostResponse`, `PostWorktree`, `PrePromptSubmit`.

Exit code semantics: `0` = success, `2` = blocking (pre-hooks only), other non-zero = error continues.

---

## Hooks — Output Shape by Hook Type

| Hook | Result kinds | Notes |
|---|---|---|
| `dangerous-actions.js` | `deny`, `null` | Uses `deny(reason)` on pattern match; null if safe or marker allows |
| `lint-format-advisory.js` | `advise` | Always `advise(message)` on trigger |
| `loose-files.js` | `advise`, `null` | `advise` if loose file; null if within module |
| `md-file-advisory.js` | `advise` | Always `advise(message)` |
| `codemap-refresh.js` | `side-effect` | No stdout; agent must NOT see this hook |
| `read-once.js` | `advise`, `deny`, `null` | `deny` only in `READ_ONCE_MODE=deny` |
| `read-once-reset.js` | `side-effect` | No stdout |

All advisory hooks (`advise`) set `additionalContext` — relevant to Bug 2 for Copilot PostToolUse.
All deny hooks set `continue: false` + `permissionDecision: 'deny'` — relevant to Bug 1 (exit code).

---

## Bug 1 — Exit Code Never Matches Hook Result

**File:** `src/hooks/src/runtime/run-hook.ts` lines 397–403.

Current: all success paths return `exitCode: 0`. `process.exit(report.exitCode)` at line 33.
Expected: `deny` result → process must exit with code appropriate per IDE.
Additional: nullable _exitCode if set to NOT null must allow to override process exit code from the hooks (must be properly documented TO NOT use it unless EXTREMELY necessary).

Decision Tree: try { _ExitCode is not null ? return it : (deny ? return IDE specific : default 0) } catch { return 1000; }

Per-IDE expected exit code for deny:
- Claude Code: `0` (uses `continue: false` in JSON; exit 2 = error, not deny)
- Codex: `0` (same as Claude Code)
- Copilot: `0` (uses `permissionDecision: "deny"` in JSON; exit 2 = warning)
- Cursor: `2` (both JSON `permission: "deny"` and exit 2 work; being standard)
- Windsurf: `2` (ONLY mechanism; stdout not parsed)

**Fix design:** Add optional `exitCode(canonical: CanonicalOutput): number` to `IdeAdapter` interface (default: `() => 0`). Windsurf and Cursor adapters implement returning 2 on deny. `run-hook.ts` reads it. Remove `_exitCode` field from Windsurf `formatOutput`.

**Exit code decision tree (per user, 2026-06-25):**
```
try {
  _exitCode is not null  → return _exitCode   // emergency override; MUST document: DO NOT use unless EXTREMELY necessary
  deny                   → return IDE-specific exit code (see per-IDE table above)
  default                → return 0
} catch {
  return 1000
}
```

`_exitCode` override: nullable field; if set to non-null, it bypasses both deny-logic and default. Must be documented prominently as a last-resort escape hatch — NOT for normal hook use.

---

## Matchers and Hook Trigger Wiring

Matchers are internal TypeScript predicates that determine whether a hook fires for a given tool call.

**Regex convention:** `^(?:PATTERN)$` — anchored, non-capturing group wrapping alternatives. `PATTERN` is the content of the matcher itself. Example from `dangerous-actions/patterns.ts`:
```typescript
{ id: 'ssh-private-key', re: /^(?:id_rsa|id_ed25519|id_ecdsa|id_dsa)$/, ... }
```

**Wiring in `run-hook.ts`:**
- `FilePathPredicate` → checked at `evalFilePath()` — matches `ctx.filePath` against basename/extension/notContainsAny rules
- `ToolInputPredicate.commandMatchWhen` → checked at `evalToolInput()` — matches `ctx.toolInput.command` against `re.test(command)`
  - Only fires when `ctx.toolName` is in the `tools` array AND the command matches the regex

**Per-hook wiring (Copilot):**

| Hook | Matcher type | Pattern | Notes |
|---|---|---|---|
| `dangerous-actions` | `DANGEROUS_BASH[].re` | Various regex on bash commands | Applied to `ctx.toolInput.command` |
| `dangerous-actions` | `DANGEROUS_PATHS[].re` | `^(?:PATTERN)$` on file paths | Applied to `ctx.toolInput.file_path` |
| `dangerous-actions` | `DANGEROUS_CONTENT[].re` | Pattern on file content | Applied at write/edit time |
| `loose-files` | `commandMatchWhen.re` | `/^\*\*\* (?:Add\|Create) File:/m` | Only for `apply_patch` tool |
| `lint-format-advisory` | no commandMatchWhen | — | Fires on all write/edit tool calls |
| `md-file-advisory` | no commandMatchWhen | — | Fires on `.md` extension |

Document per-IDE matchers and wiring when working on each IDE's configure guide.

---

## Requirements / Instructions Alignment

| Source | Finding |
|---|---|
| `docs/requirements/plugin-generator/FR-HOOK.md` | ✅ Per-IDE entry shapes correct: Claude (`once:true`), Codex (`statusMessage+timeout`), Copilot (`bash+powershell`+lock), Cursor (plain command). ⚠️ Copilot bootstrap payload format (`hookSpecificOutput`) NOT explicitly required in FR-HOOK — no requirement currently captures that the Copilot bash command must emit `{"additionalContext":"..."}` (top-level). Requirement must be ADDED; status reset to `Draft` happens only AFTER changes are approved and implemented. |
| `docs/requirements/plugin-generator/FR-VAR.md` | ✅ Cursor `additional_context` (FR-VAR-0020) required explicitly |
| `docs/requirements/plugin-generator/REFERENCES.md` | INT-IDE-0002 designates configure guides as authoritative for hook output format |
| `instructions/*/configure/github-copilot.md` | ❌ Output Contract section present (lines 529-556, r2+r3 identical) BUT documents `hookSpecificOutput` wrapper for ALL events — WRONG for Copilot. Must be rewritten to show correct top-level format per event type. |
| `instructions/*/configure/cursor.md` | ❌ No Output Contract section — gap vs INT-IDE-0002 |
| `instructions/*/configure/codex.md` | ❌ No hook stdout output contract — gap vs INT-IDE-0002 |
| `src/rosettify-plugins/src/escaping/json-string.ts` | ❌ `buildHookPayloadJson` (used for Claude/Codex/Copilot) wraps in `hookSpecificOutput` — correct for Claude/Codex, WRONG for Copilot. Need `buildCopilotHookPayloadJson` → `{"additionalContext":"..."}`. |
| `src/rosettify-plugins/src/spec/bootstrap-manifest.ts` | ❌ Copilot plugin-root entries (lines 47, 54, 62) hardcode `hookSpecificOutput` → must change to `{"additionalContext":"..."}` |
| `src/rosettify-plugins/src/bootstrap/copilot-lock.ts:13` | ❌ Comment references wrong format `{"hookSpecificOutput":...}` — needs update |
| `src/rosettify-plugins/src/plugin-processors/plugin-assemble-copilot-bootstrap.ts:34` | ❌ Calls `buildHookPayloadJson` → must switch to `buildCopilotHookPayloadJson` |

**Note on requirement status reset:** FR-HOOK.md status fields are reset to `Draft` AFTER changes are approved AND implemented — not during discovery or check phase.

---

## Spec Authoring Rules (Mandatory — apply to every spec doc)

These are standing rules. Violations are NOT acceptable and must be caught before HITL approval.

1. **Ref column on every field table.** Every field table MUST have a `Ref` column citing which reference (R1/R2/R3/R4/etc.) defines each field. No field without a source. No exceptions.
2. **UX-destructive behaviors must be actively flagged.** Behaviors like "`systemMessage` is shown to the user regardless of all other output" are NOT plain field notes — they destroy UX if missed. Mark with `(!) UX: ...` and make it impossible to overlook. Manufacturer guidance must NEVER be downgraded.
3. **Hook names must be EXACT as defined by the manufacturer.** No invented names (e.g., `SessionStop`, `SessionEnd` that appear in no reference). No suggestions. No thinking. FACTS ONLY. If a name exists in R1 and a different name exists in R4, document both separately under their exact names.
4. **Merge by identity, never split, never guess.** Two SEPARATELY-NAMED hooks are TWO hooks — each its own section under its exact manufacturer name (`Stop` vs `agentStop` = separate; `agentStop` vs `subagentStop` = separate). When the ONLY difference is letter-case or model shape of the SAME hook name (`SessionStart`/`sessionStart`, `PreToolUse`/`preToolUse`), it is ONE hook with different field shapes — MERGE into a single section and document the per-shape fields (with `Ref` per field). Never split a single hook into multiple; never invent structure.
5. **Input normalization gaps ARE required work.** Where our adapters in `src/hooks` handle input only partially (e.g., camelCase only, not snake_case), those gaps must be documented as required changes — not deferred silently.
6. **`permissionDecisionReason` constraint must never be simplified.** Correct form: `(!) REQUIRED when permissionDecision is "deny" OR when decision is "block"`. Writing "required when deny" or any shorter form is a violation.
7. **Merged output contract must be explicit.** When a field is emitted at both top-level AND inside `hookSpecificOutput`, that must be stated explicitly — not implied by listing the field twice without explanation.
8. **Document EXACTLY as the manufacturer defines — zero improvements.** No speculation, no editorializing, no "may represent the same lifecycle moment," no inferred unification, no narrating reasoning. State only what the manufacturer documents. If two things are documented separately, keep them separate; if a behavior is unknown, say "unknown / not documented" — never invent a bridge between facts.
9. **Use the dedicated field per purpose — `additionalContext` is not a catch-all.** Map each output to the field the manufacturer designates: deny reason → `permissionDecisionReason`; context injection (SessionStart, PostToolUse advisory) → `additionalContext`. Never use `additionalContext` to carry a deny reason, and never default everything to `additionalContext`.
10. **Scope reasonably — no extremes.** Support the real input/output shapes (CLI camelCase + VS Code snake_case) sensibly; platforms are largely case-tolerant. Don't over-engineer for every theoretical variant, and don't under-handle real ones. When a behavior is uncertain, CONFIRM it empirically (build/install a throwaway probe and observe) rather than guess or speculate in the doc.

---

## Spec Authoring Violations — First Draft of `docs/hooks/copilot.md`

Record of violations found and corrected:

1. **Missing Ref column** — field tables had no source citations. Fixed in rewrite.
2. **`systemMessage` downgraded** — treated as plain field. Fixed: marked `(!) UX: shown to user regardless of all other output`.
3. **Fabricated event names** — used `SessionStop`, `SessionEnd` as section headers; neither exists in any reference. Fixed: R4 uses `Stop`; R1 uses `sessionEnd` as separate event.
4. **Illegal event merge** — merged R4 `Stop` and R1 `agentStop` into one section. Fixed: each is its own section under its exact name from its source.
5. **Implementation detail in spec** — "Input Normalization Contract" referencing `src/hooks/src/adapters/copilot.ts` placed in spec doc. Fixed: removed from spec; documented in hooks-verify.md (Copilot section, normalization table).
6. **`permissionDecisionReason` duplicated without explanation** — appeared in two rows with no statement that both are intentional. Fixed: merged output contract explicitly stated.
7. **`permissionDecisionReason` constraint simplified** — written as "required when deny". Fixed: `(!) REQUIRED when permissionDecision is "deny" OR when decision is "block"`.

---

## Open Items — TBD Before Implementation

| # | Question |
|---|---|
| OI-1 | ✅ RESOLVED (2026-06-25): `additionalContext` IS the dedicated PostToolUse advisory field (R1 top-level + R3 nested); no other advisory field exists, `reason` is block-only. Advisory hooks use `additionalContext`; deny uses `permissionDecisionReason`. Dedicated-field-per-purpose principle. |
| OI-2 | ✅ RESOLVED (2026-06-25): `Stop` is a STANDARD (VS Code) hook event; `agentStop` is a COPILOT-CUSTOM event. They are SEPARATE events — document EACH EXACTLY as the manufacturer defines it. NO merging, NO "same lifecycle moment" speculation, NO improvements. No adapter change needed for now. |
| OI-3 | ⏳ Scope set (2026-06-25): support BOTH Copilot CLI (R1 camelCase) AND VS Code (R3 snake_case), reasonably — platforms are case-tolerant, do NOT over-engineer. Correctness-blocking: `tool_name`/`tool_input` snake_case (matchers + file-path extraction fail under VS Code today). NOTE (R2): VS Code IGNORES matcher values — hooks fire on ALL tools, must self-guard internally. Empirical plugin probe deferred to later this session to confirm real case-tolerance before finalizing which gaps are truly blocking. |

---

## Verification — copilot.md vs sources (2026-06-25, opus subagent, read-only)

Field-by-field verification of `docs/hooks/copilot.md` against R1 (GitHub Copilot CLI), R2 (VS Code agent-customization), R3 (VS Code hooks reference), R4 (local VS Code extension `hooks.md`). All four fetched/read.

**Verdict:** substantially faithful on field mechanics — key names, camelCase/snake_case split, timestamp type split (number-ms vs ISO string), enum values, `REQUIRED when block/deny` constraints, top-level-vs-`hookSpecificOutput` merged-emit claims, exit codes all grounded. No fabricated event names. SubagentStop "top-level only, no wrapper" nuance correct.

**Must-fix — 5 corrections (✅ ALL APPLIED 2026-06-26; copilot.md sealed COMPLETE):**
1. SessionStart `source` "always new" → cite **R3**, not R4 (R4 has no SessionStart input schema).
2. Matcher section "(R1, R4)" → **drop R4** (R4 documents no matcher format).
3. PreToolUse "Fail-closed (R1, R4)" → **drop R4** (R4 states no fail-closed behavior).
4. SessionStart Output top-level `additionalContext` cited R1 → inferred, not verbatim in R1 output schema → soften / re-cite.
5. Stop/agentStop section (line 111) → **remove** "May represent the same lifecycle moment" speculation (OI-2). Document `Stop` as standard VS Code event and `agentStop` as Copilot-custom event, each exactly as the manufacturer defines — no merging, no improvements.

**Withdrawn — verifier false positive (keep doc as-is):** `systemMessage` "(!) UX: displayed regardless / always visible" is CORRECT — real Copilot behavior (shows approval dialog). Verifier was over-constrained (cite-verbatim-or-reject), graded a true-but-not-verbatim UX behavior as "ungrounded embellishment." Prompt defect, not doc defect. Lesson recorded in `agents/MEMORY.md`.

**Completeness (acceptable):** doc deliberately scoped to "events used by Rosetta hooks" (line 50); R1 defines more events (`errorOccurred`, `notification`, `permissionRequest`, `postToolUseFailure`, camelCase `subagentStart`) intentionally omitted. Caveat: "Hook Locations" attributed solely to R4 while dropping R1's broader location set (`.github/hooks/*.json`, `~/.copilot/hooks/`, policy paths) — re-scope or re-attribute in the edit pass.

---

## Pending Actions (current session — awaiting explicit user approval before implementation)

### Action 1 — Fix Bug 2: Copilot `additionalContext` placement (CONFIRMED — wider than originally scoped)

Affects 4 files in `src/rosettify-plugins` + 1 file in `src/hooks/src/adapters` + configure docs r2+r3:

- `src/hooks/src/adapters/copilot.ts:93` — replace `out.hookSpecificOutput = { hookEventName, additionalContext }` with `out.additionalContext = additionalContext`
- `src/rosettify-plugins/src/escaping/json-string.ts` — add `buildCopilotHookPayloadJson` → `{"additionalContext":"${escaped}"}`
- `src/rosettify-plugins/src/plugin-processors/plugin-assemble-copilot-bootstrap.ts:34` — switch to `buildCopilotHookPayloadJson`
- `src/rosettify-plugins/src/spec/bootstrap-manifest.ts:47,54,62` — change Copilot payload from `{"hookSpecificOutput":...}` to `{"additionalContext":"..."}`
- `src/rosettify-plugins/src/bootstrap/copilot-lock.ts:13` — update comment
- `instructions/r2+r3/core/configure/github-copilot.md` — rewrite Output Contract: correct per-event top-level schema, add sessionStart two-type table, add matchers/wiring section
- `docs/REQUIREMENTS/plugin-generator/FR-HOOK.md` — add new requirement for Copilot payload format; reset affected requirement status to `Draft` AFTER implementation

### Action 2 — Fix Bug 1: exit code decision tree

- `src/hooks/src/types.ts` — add `exitCode?(canonical: CanonicalOutput): number` to `IdeAdapter` interface
- `src/hooks/src/adapters/windsurf.ts` — implement `exitCode`: return 2 on deny; remove `_exitCode` from `formatOutput`
- `src/hooks/src/adapters/cursor.ts` — implement `exitCode`: return 2 on deny
- `src/hooks/src/runtime/run-hook.ts` — apply decision tree: `_exitCode not null → use it; deny → adapter.exitCode(); default → 0; catch → 1000`
- Document `_exitCode` override as last-resort escape hatch in configure docs

### Action 3 — Add Output Contract to `cursor.md` (r2 + r3)

- Document `additional_context`, `permission`, `user_message` — top-level Cursor fields
- Include matchers/wiring section for Cursor
- Proof link: https://cursor.com/docs/reference/hooks

### Action 4 — Add Output Contract to `codex.md` (r2 + r3)

- Document `hookSpecificOutput` schema (same as Claude Code)
- Note: `permissionDecision: "ask"` NOT supported by Codex
- Proof link: https://platform.openai.com/docs/guides/codex/hooks

### Action 5 — Update tests: exit code assertions per IDE for deny

- `src/hooks/tests/` — Windsurf deny → exit 2, Cursor deny → exit 2, Claude Code deny → exit 0, Copilot deny → exit 0, Codex deny → exit 0

---

## Live Hook Test — `docs/hooks/copilot/hooks.json` + context-injection probe (MANUAL, user-run)

**Goal:** empirically learn, for real GitHub Copilot, (a) which hook events actually fire and under which **capitalization** (camelCase R1/CLI vs PascalCase R4/VS Code), and (b) whether `SessionStart` `additionalContext` injection actually reaches the model's context — and at which **placement** (top-level vs nested `hookSpecificOutput`).

**Config:** `docs/hooks/copilot/hooks.json` (CLI format per `instructions/r3/core/configure/github-copilot.md:510`). Registers every event of interest in BOTH capitalizations — `sessionStart`/`SessionStart`, `preToolUse`/`PreToolUse`, `postToolUse`/`PostToolUse`, `agentStop`/`Stop`, `subagentStop`/`SubagentStop`, `sessionEnd`. Every entry runs `node docs/hooks/tester.js` (dumps to `~/.rosetta/hooks.log`) and passes `--tag <exact-key>`. SessionStart entries also `--output` an injection payload (plain stdout does NOT reach the AI — must be JSON, per configure guide line 531). PreToolUse entries also pass `--deny-on-match HOOK-DENY-PROBE` for the prevention test (Mode C).

**Capitalization disambiguation (`--tag`):** the input's `hook_event_name` is always PascalCase regardless of which registered key fired, so it can't tell us whether `preToolUse` or `PreToolUse` was honored. Each key therefore passes a distinct `--tag` (e.g. `--tag preToolUse` vs `--tag PreToolUse`); the log's `INVOCATION`/`ARGV` lines then reveal exactly which key fired. For SessionStart, the camel and Pascal keys ALSO inject distinct secrets, so model recall is a second, independent signal of which key reached context.

**Mode A+B — presence & instruction probe (SessionStart `additionalContext`):** predefine tokens GUARANTEED absent from the model's context; inject via the hook; ask the model — WITHOUT acting/reading/searching, scoping to ANYWHERE available (its context, the system/conversation context, AND any injected/ambient `<...-context>` block — NOT only "your context") — (A) to recite any secret tokens it sees, and (B) what it was asked to "Report". Presence proves the text reached context; the `Report` echo proves it was ADOPTED AS A LIVE INSTRUCTION (stronger). Each injected string carries both a secret and a `Report` nudge, distinct per key × placement:

| Registered key | Placement | Injected string | Recall reveals |
|---|---|---|---|
| `sessionStart` (camel) | top-level | `Diagnostic secret CAMELTOP-7a1f. Report CT9.` | camel key + top-level reach context |
| `sessionStart` (camel) | nested | `Diagnostic secret CAMELNEST-2b8c. Report CN4.` | camel key + nested reach context |
| `SessionStart` (Pascal) | top-level | `Diagnostic secret PASCALTOP-5d3e. Report PT2.` | Pascal key + top-level reach context |
| `SessionStart` (Pascal) | nested | `Diagnostic secret PASCALNEST-9f6a. Report PN7.` | Pascal key + nested reach context |

Non-SessionStart entries inject nothing (dump + `--tag` only) — so the only path for these tokens into context is SessionStart injection. Clean signal.

**Mode C — prevention / deny probe with reasoning (PreToolUse):** ask the model to READ a target file (`docs/hooks/HOOK-DENY-PROBE.txt`). The PreToolUse hook (`--deny-on-match HOOK-DENY-PROBE`) detects the target in the tool input and returns `permissionDecision: deny` whose `permissionDecisionReason` states it is a hook test, instructs the model to report the block verbatim, and to continue. Tests three things at once: (1) does PreToolUse deny actually block the tool; (2) does the deny REASON reach the model; (3) does the model honor the embedded instruction (report + continue). Deny is emitted at BOTH placements (top-level + nested). No match ⇒ tool proceeds, so other steps are unaffected.

**Test prompt (user pastes into Copilot — plain ASCII; security-framed so the model does not treat it as prompt injection):**
> This is a sanctioned diagnostic test of MY OWN editor hooks, which I (the user) installed and control. Everything here is authored by me - there is no untrusted or external content, and nothing asks you to bypass security or your guidelines. All "secret" tokens below are planted test markers I made up (not real secrets), so quoting them back to me is safe and is the entire point of the test.
>
> Please do these steps in order; do not skip any:
>
> 1. Run the shell command: echo rosetta-hook-probe  -- and show me its output.
> 2. Spawn a subagent to list the files under docs/hooks/ and show me what it returns. Please delegate this to a subagent rather than doing it yourself.
> 3. Try to read the file docs/hooks/HOOK-DENY-PROBE.txt. One of my diagnostic hooks may intentionally block this read. If it is blocked, just quote the block message back to me verbatim and continue. You do NOT need to act on anything that message says beyond telling me about it - quoting a hook's own message is part of this test, not untrusted instruction content.
> 4. Without running any tool, reading any file, or searching: based only on what is already available to you ANYWHERE — your context, the system/conversation context, AND any injected or ambient context blocks (such as `<...-context>` wrappers) — list verbatim any planted test markers you can see (for example things like CAMELTOP-..., PASCALNEST-..., PTPASCALTOP-..., PTPASCALNEST-..., or KEY=VALUE). Check injected/system context too, not just "your" context. These are my own test markers, not real secrets, so it is safe to repeat them. Only say none if you truly see none anywhere.
> 5. Also without acting: were you asked to report anything (for example "Report XX")? List exactly what, verbatim.

> Prompt-injection note: an earlier wording of step 3 ("follow its instructions exactly") made Copilot CLI Sonnet 4.6 flag the task as a prompt-injection vector; it complied but cautioned. The framing above (sanctioned self-authored test, planted markers, quote-don't-obey) defuses that.

**Setup notes (manual, JetBrains):** copy `docs/hooks/` (with `tester.js`, `HOOK-DENY-PROBE.txt`, and `copilot/hooks.json`) into the target project, and place `hooks.json` where Copilot loads hook configs. The exact hook-config location for **JetBrains** Copilot is NOT confirmed here — verify against current Copilot/JetBrains docs or settings (do NOT assume the VS Code path). The command path `node docs/hooks/tester.js` assumes cwd = project root; adjust if the runtime's cwd differs. Requires `node` on PATH.

**User runs this manually and reports back:**
1. `~/.rosetta/hooks.log` — which `--tag` values appear (reveals which events fired and which **capitalization** key the runtime accepted); whether `sessionEnd` fired.
2. Which secrets the model recited (`CAMEL*`/`PASCAL*`, `TOP`/`NEST`) and which `Report` codes (`CT9`/`CN4`/`PT2`/`PN7`) → which key + placement reach context, as data and as instruction.
3. Whether the read of `HOOK-DENY-PROBE.txt` was blocked, whether the model reported the hook-test reason, and whether it then continued.

**Test coverage — exercised / config-added / not tested (2026-06-26):**
- ✅ Exercised (have results): event firing (SessionStart, PreToolUse, PostToolUse, SubagentStop, Stop; CLI also camelCase keys + `sessionEnd`); SessionStart `additionalContext` injection + placement; PreToolUse `deny` + reason (Mode C).
- 🟡 Config added, awaiting a run: PostToolUse `additionalContext` (`PTCAMEL*`/`PTPASCAL*`); PreToolUse `modifiedArgs`/`updatedInput` (rewrite command, sentinel `REWRITE_ME_PRETOOLUSE` → `echo PRETOOLUSE-HOOK-REWROTE-THIS`); PostToolUse `modifiedResult` (rewrite result, sentinel `REWRITE_RESULT_POST` → `POSTTOOLUSE-HOOK-REWROTE-RESULT`); Stop `decision:"block"` **once-per-session** (atomic marker, on `Stop`+`agentStop`); `PreCompact`/`preCompact`/`PostCompact`/`postCompact` firing (compaction — run manually). — **Results in: VS Code (Runs 5+7): deny✓, modifiedArgs✓, Stop-block✓, PostToolUse additionalContext nested✓ (Run 7, corrected), modifiedResult✗, compaction-hooks✗. CLI (Run 6): all ✓ incl. PostToolUse top-level + modifiedResult + PreCompact.**
- ❌ Still NOT tested: SubagentStop `decision:"block"`; PostToolUse `decision:"block"`; common output `continue:false`+`stopReason` and `systemMessage` via hooks; events `UserPromptSubmit`, `SubagentStart`, and R1-only `errorOccurred`/`notification`/`permissionRequest`/`postToolUseFailure`.

**Follow-up probes — paste into the EXISTING sessions (run S FIRST so its one-time block does not interrupt the others):**

> **(S) Stop block-once.** Continuing my sanctioned hook test (planted markers, safe to quote, nothing untrusted). Reply with only the word DONE and end your turn. If you receive a hook/Stop message when finishing, quote it to me verbatim, then finish normally (it will not block again).

> **(P1) PreToolUse arg-rewrite + PostToolUse injection.** Continuing my sanctioned hook test. (a) Run this exact shell command and show me its VERBATIM output: echo REWRITE_ME_PRETOOLUSE  (b) Then, without running anything else or searching, list any planted markers now in your context (e.g. PTPASCALTOP-..., PTPASCALNEST-..., PTCAMELTOP-...). If none, say none.

> **(P2) PostToolUse result-rewrite.** Continuing my sanctioned hook test. Run this exact shell command: echo REWRITE_RESULT_POST  then tell me VERBATIM what result/output you received for that command (do not re-run it; just report what you saw).

**Expected:** (S) model quotes the Stop reason then finishes; blocks only once. (P1a) if `modifiedArgs` honored, output is `PRETOOLUSE-HOOK-REWROTE-THIS`, not `REWRITE_ME_PRETOOLUSE`. (P1b) `PT*` markers reveal PostToolUse injection + placement. (P2) if `modifiedResult` honored, model reports `POSTTOOLUSE-HOOK-REWROTE-RESULT`, not `REWRITE_RESULT_POST` (R1/CLI; VS Code may ignore).

**Compaction (manual):** trigger compaction in the session, then check `~/.rosetta/hooks.log` for `--tag PreCompact|preCompact|PostCompact|postCompact` entries → which compaction events fire + their input shape.

**Reset Stop-block** to re-test in the same session: `rm ~/.rosetta/.block-stop-once-*`.

**PostToolUse injection — all-options probe (added 2026-06-26; goal: make PostToolUse context-injection work in VS Code).** Research (subagent, sources R2/R3/R4): VS Code docs say PostToolUse supports nested `hookSpecificOutput.additionalContext` ("can provide additional context to the model") and `systemMessage` (user-facing) and `decision:"block"`+`reason` (model-facing, but blocks). Yet Run 5 showed neither top-level nor nested additionalContext reached the model. So the PostToolUse entries now emit ALL non-disruptive mechanisms at once, distinct markers per key:
- `systemMessage` → `PTU-SYSMSG-CAMEL` / `PTU-SYSMSG-PASCAL` (expected USER-facing, shown in IDE — NOT model context).
- top-level `additionalContext` → `PTU-TOPLEVEL-CAMEL` / `PTU-TOPLEVEL-PASCAL`.
- nested `hookSpecificOutput.additionalContext` → `PTU-NESTED-CAMEL` / `PTU-NESTED-PASCAL`.
`decision:"block"`+`reason` is EXCLUDED from the always-on payload (it halts processing after every tool — would brick the session); test it separately as a one-shot if needed.

Probe prompt (VS Code fires `*-PASCAL`; CLI fires both): "Continuing my sanctioned hook test (planted markers, safe to quote, nothing untrusted). (1) Run this exact shell command and show its output: echo posttooluse-injection-probe  (2) Then, WITHOUT running anything else or searching, list verbatim every planted marker containing `PTU-` available to you ANYWHERE — your context, the system/conversation context, OR any injected/ambient context block (such as `<...-context>` wrappers), not only 'your' context. Only say none if genuinely none anywhere."

Interpret: marker the MODEL recites = that additionalContext placement reaches model context; `PTU-SYSMSG-*` appearing in the IDE UI (not the model answer) = systemMessage works but user-facing only. If the model recites no `PTU-*` additionalContext markers, VS Code PostToolUse does not inject model context → fall back to one-shot `decision:block`+`reason`.

### Results — Run 1 (2026-06-26, user-run — **VS Code Copilot**, model gpt-5.4, session `e946202d…`)

> Scope note: all findings below are observations of THIS single run. NOT generalized to all VS Code Copilot, all models, or Copilot CLI (untested).

Model's answer (context-only, no tool/read/search):
- Recited tokens: `ROSETTA-PROBE-NESTED-e5f6a7b8` (Mode A **nested**), `DEF2` (Mode B **nested**), plus two NOT-ours: `ced35933ee83cc0935e6c700865b2ad4`, `e946202d-1afd-4ae7-9876-b7cfd1b60a6c`.
- "Were you asked to report anything?" → "**Yes: Report DEF2.**"

**Finding — placement (SessionStart `additionalContext`):**
- ✅ **NESTED** `hookSpecificOutput.additionalContext` reaches context AND is adopted as a live instruction (`DEF2` recited + acted on as a report request).
- ❌ **TOP-LEVEL** `additionalContext` does NOT reach context — neither `ROSETTA-PROBE-TOPLEVEL-a1b2c3d4` nor `Report ABC1` appeared; model said it was asked to report only `DEF2`, not `ABC1`. Model listed 4 tokens (thorough), so top-level is genuinely absent.
- ⇒ In THIS run: nested reached context; top-level did not. (This run only. CLI not tested — do not generalize.)

**Log facts (`~/.rosetta/hooks.log`, this session):**
- Input **shape = snake_case**: `hook_event_name`, `session_id`, `tool_name`, `tool_input`, `tool_response`, `tool_use_id`, `transcript_path`. `tool_input` is an **object** (not a JSON string); `tool_response` is a **string**; `timestamp` is an **ISO string**.
- Events that **fired** (input `hook_event_name`, all PascalCase): `SessionStart`, `PreToolUse`, `PostToolUse`, `SubagentStop`, `Stop`. `sessionEnd` did NOT fire in this run.
- `SessionStart` fired exactly **2×** — the two entries of ONE capitalization key. So only one of the two registered keys (`sessionStart` / `SessionStart`) was honored; WHICH one is not determinable here (both keys hold identical payloads). To disambiguate next time, give the two keys distinct payloads.
- Subagent step (mandatory-step prompt, SAME original session): AI delegated to the **Explore** subagent (`tool_name: runSubagent`) → **`SubagentStop` fired** (`agent_id`, `agent_type: Explore`, `stop_hook_active`). The subagent's returned text was a "What's new in context on this turn" block — `Last Command: echo rosetta-hook-probe`, `Cwd: …/spring-boot-react-mysql`, `Exit Code: 0`, plus "two zsh entries instead of one". This is VS Code-native subagent context, NOT from our hooks (our `SubagentStop` entry is dump-only; no `SubagentStart` hook registered).
- Tool names are VS Code-specific: `run_in_terminal`, `runSubagent`, `list_dir` (not `Bash`/`Read`) — relevant to matchers.

**Fields seen in input but NOT in `copilot.md` (this run only):** `SessionStart` carried `model` (`"gpt-5.4"`). `SubagentStop` carried `agent_id`/`agent_type`/`stop_hook_active` but NO `agent_name`/`stop_reason`. `Stop` carried `stop_hook_active` but NO `stop_reason`.

**The two "unknown" tokens are identified (not injected by us):** `e946202d-1afd-4ae7-9876-b7cfd1b60a6c` = `session_id`; `ced35933ee83cc0935e6c700865b2ad4` = the VS Code `workspaceStorage` id (from `transcript_path`). The model had these in its own context independently of our hooks.

**Setup confirmed:** run executed in `…/5-min-demo/spring-boot-react-mysql` (hooks copied there); relative `docs/hooks/tester.js` resolved (cwd = that repo root).

**Still open (not covered by this run):** which SessionStart capitalization key fired; `sessionEnd`; Copilot **CLI** behavior.

### Results — Run 2 (2026-06-26, user-run — **JetBrains IDEA, Copilot CLI mode**, session `feb65716…`)

> Scope: observations of this single run/setup. NOT generalized to all Copilot CLI or all setups.

**Headline — the hooks did NOT fire; `~/.rosetta/hooks.log` has ZERO entries for this run.** The run's session id `feb65716-f062-4542-ab26-560db1762cf6` appears 0× in the log; the log's last entry is an unrelated validation test; and the new tagged SessionStart config (`--tag sessionStart`/`SessionStart`, `CAMEL*`/`PASCAL*`) has never fired in any real run.

**All model output is consistent with hooks-not-running:**
- echo, subagent listing, and the file read all completed normally — no dump, no deny.
- Mode C: the read of `HOOK-DENY-PROBE.txt` was NOT blocked; the model showed the file contents → the PreToolUse deny never executed.
- "Secret tokens in context" = only `feb65716-…`, which is the Copilot **session id** (native to context). NONE of the injected `CAMEL*`/`PASCAL*` secrets are present → SessionStart injection never ran.
- "Asked to report → the block" = parroted from the CONTENT of `HOOK-DENY-PROBE.txt` (its text says "report the block"), read in step 3 — NOT from an injected `Report` nudge.

**Interpretation (hypothesis, NOT a conclusion):** the JetBrains Copilot **CLI** did not load/execute `hooks.json` from where it was placed. This is NOT evidence that Copilot CLI lacks hook support — only that no hook ran in this setup. Per R1, Copilot CLI hook locations differ from the IDE (e.g. `~/.copilot/hooks/`, `.github/hooks/*.json`, policy paths); the config likely needs to live in the CLI's expected location.

**Next step:** confirm the exact hook-config path Copilot CLI reads (Copilot CLI docs / `~/.copilot/`), place the config there, re-run, and re-check the log for entries from the new session.

### Results — Run 3 (2026-06-26, user-run — **Copilot CLI direct** (`copilot-cli`), model Sonnet 4.6, session `8abb87fa…`)

Run folder: `/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql`. Hooks DID fire (Run 2's miss was JetBrains config-loading, not a CLI limitation). **Verbatim wire captures + env signatures + tool names are now in the spec: `docs/hooks/copilot.md` → "Appendix — Observed Wire Examples".**

Findings (this run):
- **Double-fire + dual-shape:** every event fired TWICE — camelCase key → R1 camelCase payload (`toolArgs` JSON string, `toolResult` object); PascalCase key → R3 snake_case payload (`tool_input` object). Registering both conventions ⇒ duplicate fires.
- **Runtime is env-detectable:** CLI sets `COPILOT_CLI=1` (no `VSCODE_*`); VS Code sets `VSCODE_*` (no `COPILOT_CLI`).
- **Mode C deny WORKED:** camelCase `preToolUse` fire for tool `view` reading `HOOK-DENY-PROBE.txt` emitted deny (textLen 821); CLI blocked the read; model quoted the reason and continued. Block + reason-delivery + instruction-follow all confirmed.
- **Placement OPPOSITE of VS Code:** model surfaced `PASCALTOP-5d3e` + `PT2` = TOP-LEVEL additionalContext (snake_case SessionStart fire); nested did NOT surface. CLI top-level works; VS Code nested works (Run 1). Two runtimes, opposite placement ⇒ supports emitting BOTH (merged emit). (2 data points — not generalized further.)
- **All target events fired**, incl. `sessionEnd` (camelCase, `reason: user_exit`).
- **Field contrasts (both snake_case but differ):** CLI PostToolUse `tool_result`{result_type,text_result_for_llm} object vs VS Code `tool_response` string; CLI SubagentStop `agent_name`/`agent_display_name`/`stop_reason` vs VS Code `agent_id`/`agent_type`/`stop_hook_active`; CLI SessionStart no `model`, VS Code has `model`. `timestamp` is unix-ms number in camelCase shape, ISO string in snake_case shape.
- **Security:** Sonnet 4.6 flagged the earlier step-3 wording ("follow its instructions exactly") as prompt injection; complied but cautioned. Prompt reworded (sanctioned-test framing, planted-markers, quote-don't-obey).

### Results — Run 4 (2026-06-26, user-run — **VS Code Copilot**, NEW config + reworded prompt, model gpt-5.4, session `f46082a6…`)

Run folder: `/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql`. Clean run with the per-capitalization config (Run 1 used the old config).

- **VS Code fires ONLY PascalCase keys — single-fire, no double-fire.** Log shows only `--tag SessionStart`, `--tag PreToolUse`, `--tag PostToolUse`, `--tag SubagentStop`, `--tag Stop`. The camelCase keys (`sessionStart`/`preToolUse`/…) did NOT fire at all. (Contrast Run 3 CLI: fired BOTH conventions, double-fire.) Resolves Run 1's open question: VS Code honors PascalCase keys.
- **SessionStart injection: NESTED reached context; top-level did not.** Model surfaced `PASCALNEST-9f6a` + `PN7` (nested string), NOT `PASCALTOP`/`PT2`. Confirms Run 1, now pinned to PascalCase-key + nested placement.
- **Mode C deny WORKED.** `PreToolUse` for `read_file` (`tool_input.filePath` = `…/HOOK-DENY-PROBE.txt`, with `startLine`/`endLine`) → deny emitted (textLen 821); model reported the read was blocked and quoted the reason. (Note: VS Code `read_file` uses a camelCase `filePath` key INSIDE the snake_case `tool_input` object.)
- **Subagent → SubagentStop fired** (`agent_id`/`agent_type: Explore`/`stop_hook_active`). snake_case throughout; `model: gpt-5.4`; fired `Stop` (not `agentStop`); no `sessionEnd` (session continued).

**Cross-run synthesis (4 runs):** VS Code Copilot = PascalCase keys only, snake_case payloads, **nested** additionalContext reaches context. Copilot CLI = fires BOTH conventions (double-fire), camelCase→R1 + PascalCase→R3 payloads, **top-level** additionalContext reaches context. ⇒ Implication (for the implementation decision, HITL): registering **PascalCase keys only** serves both runtimes (VS Code honors them; CLI's PascalCase fire works) and avoids CLI double-fire; emitting **both** additionalContext placements (top-level + nested) remains required since the two runtimes honor opposite placements. Mode C deny works in both runtimes.

### Results — Run 5 (2026-06-26, user-run — **VS Code Copilot**, follow-up probes, session `f46082a6…`)

Confirmed against log (RESULT textLen + tool_input/tool_response + model report):
- **Stop `decision:"block"` WORKS; block-once confirmed.** 1st Stop emitted block (textLen 605); model quoted the reason verbatim and finished; 2nd Stop allowed (textLen 0, marker present). No loop.
- **PreToolUse `modifiedArgs`/`updatedInput` WORKS.** Hook rewrote `echo REWRITE_ME_PRETOOLUSE` → the command actually executed was `echo PRETOOLUSE-HOOK-REWROTE-THIS` (the following PostToolUse `tool_input.command` + `tool_response` both show the rewritten string). Hook textLen 179.
- **PostToolUse `additionalContext` — recorded here as "not reaching", but ⚠️ SUPERSEDED by Run 7 (this was a FALSE NEGATIVE).** The model did not volunteer `PT*` under the generic "list secrets" prompt; Run 7 (direct per-marker question) proved nested PostToolUse additionalContext DOES reach the model in VS Code (wrapped in `<PostToolUse-context>`).
- **PostToolUse `modifiedResult` does NOT work.** Hook emitted modifiedResult (textLen 268, matched `REWRITE_RESULT_POST`) but the model saw the original result. ⇒ VS Code ignores modifiedResult (consistent with R1/CLI-only field).
- **Compaction hooks did NOT fire.** User compacted the conversation; ZERO `PreCompact`/`preCompact`/`PostCompact`/`postCompact` entries logged. ⇒ VS Code did not invoke our compaction hooks (event names may differ, or unsupported in this build).

**VS Code capability summary (confirmed):** SessionStart additionalContext (nested) ✓ · PreToolUse deny ✓ · PreToolUse modifiedArgs ✓ · Stop block ✓ · PostToolUse additionalContext (nested) ✓ **[corrected in Run 7 — was false-negative here]** · PostToolUse modifiedResult ✗ · compaction hooks ✗.

### Results — Run 6 (2026-06-26, user-run — **Copilot CLI** (`copilot-cli`), follow-up probes, session `8abb87fa…`)

Confirmed against log:
- **PreToolUse `modifiedArgs`/`updatedInput` WORKS.** `echo REWRITE_ME_PRETOOLUSE` executed as `PRETOOLUSE-HOOK-REWROTE-THIS` (model + log). Hook textLen 179 on the matching fire.
- **PostToolUse `additionalContext` WORKS — top-level.** Model recalled `PTCAMELTOP-3a9f` + `PTPASCALTOP-5d1b` (both TOP-LEVEL, camelCase + PascalCase fires); nested (`PT*NEST`) did NOT surface. Mirrors SessionStart (CLI honors top-level). (VS Code honors **nested** instead — see Run 7.)
- **PostToolUse `modifiedResult` WORKS.** Model saw `POSTTOOLUSE-HOOK-REWROTE-RESULT` (not original); hook textLen 266/268 on matching fires. Contrast VS Code (✗).
- **Stop/agentStop `decision:"block"` fires + block-once works.** Block (textLen 605) when marker absent, allow (textLen 0) when present; `agentStop` fires just before `Stop` and sets the shared per-session marker, so the pair blocks once total. ("S failed" was operational — stale config + marker cleared between attempts — not a hook failure; model-side handling not captured for CLI.)
- **Compaction: `PreCompact` FIRES (both capitalizations); `PostCompact` does NOT.** `preCompact` (camelCase: `sessionId`, `transcriptPath`, `trigger:"manual"`, `customInstructions`) and `PreCompact` (snake_case: `hook_event_name`, `session_id`, `transcript_path`, `trigger:"manual"`, `custom_instructions`) both fired on manual compaction. No `PostCompact`/`postCompact` entries. ⇒ CLI has a pre-compaction hook only; NEW input fields `trigger` + `customInstructions`/`custom_instructions`; no post-compaction event under our candidate names.

### Cross-runtime capability matrix (Runs 1–6, empirical 2026-06-26)

| Behavior | VS Code Copilot (gpt-5.4) | Copilot CLI (Sonnet 4.6) |
|---|---|---|
| Keys fired | PascalCase only, single-fire | both conventions, **double-fire** |
| Input shape | snake_case | camelCase (camel keys) + snake_case (Pascal keys) |
| SessionStart `additionalContext` | ✅ **nested** only | ✅ **top-level** only |
| PostToolUse `additionalContext` | ✅ **nested** (Run 7; wrapped `<PostToolUse-context>`) | ✅ **top-level** (both keys) |
| PreToolUse `deny` + reason | ✅ | ✅ |
| PreToolUse `modifiedArgs`/`updatedInput` | ✅ | ✅ |
| PostToolUse `modifiedResult` | ❌ ignored | ✅ |
| Stop `decision:"block"` (once) | ✅ | ✅ (`Stop`+`agentStop`, shared marker) |
| Compaction hook | ❌ none fired | ✅ `PreCompact` only (no PostCompact); `trigger`+`custom_instructions` |
| Exit code used | 0 (JSON) | 0 (JSON) |

Implication: emit `additionalContext` at BOTH placements (VC=nested, CLI=top-level), for BOTH SessionStart and PostToolUse. `modifiedResult` only helps CLI. Compaction guard is CLI-only via `PreCompact`; there is no observed post-compaction hook.

### Results — Run 7 (2026-06-26, user-run — **VS Code Copilot**, PostToolUse all-options probe, session `f46082a6…`) — CORRECTS Run 5

Log confirms VS Code (PascalCase `--tag PostToolUse`, snake_case), combined payload emitted (textLen 299: systemMessage + top-level + nested additionalContext).

- ✅ **VS Code PostToolUse NESTED `additionalContext` REACHES the model.** On a DIRECT per-marker question the model reported `PTU-NESTED-PASCAL`, stating it came from a `<PostToolUse-context>` block injected after the tool result. ⇒ PostToolUse context-injection WORKS in VS Code via nested placement. **This corrects Run 5's "✗"** — a false negative caused by the generic "list secrets" prompt (model first answered "none", then confirmed the marker on direct ask).
- ❌ **Top-level `additionalContext` does NOT reach the model** in VS Code (`PTU-TOPLEVEL-PASCAL` not seen).
- ✅ **`systemMessage` is shown to the USER but NOT embedded into the model's context.** Copilot DID display `PTU-SYSMSG-PASCAL` as an IDE warning (user saw it), yet the model never had it in context (didn't recite it even on direct ask). So: Copilot *saw/showed* systemMessage, but did NOT merge it into model context — user-facing only.
- Stop block fired once again this turn (textLen 605), expected (marker had been cleared).

**Net (corrected): VS Code PostToolUse → nested additionalContext ✓ (model, via `<PostToolUse-context>`), top-level ✗, systemMessage = user only.** Combined with CLI (top-level ✓): emitting BOTH placements covers both runtimes for PostToolUse too — same rule as SessionStart.

**Method lesson:** context-injection recall must ask DIRECTLY about each specific marker; a generic "list any secrets" prompt UNDER-REPORTS injected context (the model treats a `<PostToolUse-context>` block as ambient, not a "secret to list"). See "Testing Methodology Lessons" below.

### Results — Run 8 (2026-06-26, user-run — **Copilot CLI**, PostToolUse all-options probe, session `8abb87fa…`, `source:"resume"`)

Log confirms: CLI, both keys fired the combined payload (`postToolUse` textLen 296, `PostToolUse` textLen 299: systemMessage + top-level + nested).
- ✅ **CLI PostToolUse TOP-LEVEL `additionalContext` reaches the model.** Model recalled `PTU-TOPLEVEL-CAMEL` + `PTU-TOPLEVEL-PASCAL`, quoting the injection: *"Additional guidance from postToolUse hooks: …"*. (Both keys, double-fire.)
- ❌ Nested (`PTU-NESTED-*`) did NOT reach the model; ❌ `systemMessage` (`PTU-SYSMSG-*`) not in model context.
- **New observation:** SessionStart fired with `source:"resume"` (session was resumed) — first non-`"new"` value seen.

**PostToolUse `additionalContext` — FULLY RESOLVED both runtimes:** VS Code = **nested** (`<PostToolUse-context>`, Run 7); Copilot CLI = **top-level** ("Additional guidance from postToolUse hooks", Run 8). Same opposite-placement split as SessionStart ⇒ emit BOTH placements and PostToolUse context injects in both. `systemMessage` is user-facing only.

---

## Verification Process (repeatable empirical methodology)

How Copilot hooks were verified end-to-end. Reusable for the other IDEs/agents (Cursor, Codex, Windsurf, Claude).

1. **Generic diagnostic hook** — `docs/hooks/tester.js`: dumps the full invocation (ms-timestamp, pid, invocation string, argv, cwd, script dir, raw stdin, env) to `~/.rosetta/hooks.log`, then runs flag-selected mutating processors. One processor per behavior: `--output`, `--exit-code`, `--tag`, `--deny-on-match`, `--rewrite-command` (modifiedArgs), `--rewrite-result` (modifiedResult), `--block-stop-once` (atomic per-session marker, can't loop).
2. **Register every event, BOTH capitalizations** — `docs/hooks/copilot/hooks.json` maps each event (camelCase + PascalCase) to tester.js with a distinct `--tag`, so the log reveals which key the runtime actually fired (input `hook_event_name` is always PascalCase and can't tell you).
3. **Probe design — distinct planted markers per (event × placement × key):**
   - Presence (secret recall) + instruction (nudge `Report XX`) via SessionStart/PostToolUse `additionalContext` at BOTH top-level AND nested.
   - Prevention: `--deny-on-match` → PreToolUse deny + reason.
   - Arg/result rewrite: `--rewrite-command` (modifiedArgs) / `--rewrite-result` (modifiedResult).
   - Stop block ONCE (`--block-stop-once`).
   - Compaction: register Pre/Post + both casings; discover which fire.
4. **Run MANUALLY in each runtime** — paste the probe prompt into a real session (VS Code Copilot, Copilot CLI). Frame it as a sanctioned self-authored test (planted markers, nothing untrusted) to avoid prompt-injection refusals. Run the Stop-block prompt FIRST (it consumes the one-time block so it won't interrupt later steps).
5. **Verify against the LOG, not the model's word** — confirm each hook EMITTED (RESULT `textLen`) and cross-check `tool_input`/`tool_response`; the model's recall tells which placement REACHED it. Trust = emit (log) + delivery (model), both checked.
6. **Probe WORDING matters** — ask "do you see X ANYWHERE (your context, system context, injected/ambient `<...-context>` blocks), without loading?" per specific marker. "In your context" + a generic "list secrets" UNDER-REPORTS → false negatives (see Testing Methodology Lessons).
7. **Record per run** (Run N: runtime / model / session id) → correct false negatives → build a cross-runtime capability matrix → fold confirmed results into the spec's `Observed` columns.
8. **Export logs** — `split-logs.js`: de-interleave by pid (concurrent hooks interleave lines), classify by env signature (`COPILOT_CLI` vs `VSCODE_*`), redact secret values (first-5 + `[…REDACTED]`), split into `docs/hooks/vs-copilot-logs.txt` / `copilot-cli-logs.txt`. Then clean run-state markers (`rm ~/.rosetta/.block-stop-once-*`).

---

## Testing Methodology Lessons (this effort)

1. **Probe injected context by asking "ANYWHERE" + per-marker — "in YOUR context" UNDER-REPORTS.** The question wording decides the answer. "Is X in YOUR context?" makes the model EXCLUDE hook-injected / system / ambient blocks (e.g. a `<PostToolUse-context>` wrapper) and answer "no" — a FALSE NEGATIVE. "Do you have X ANYWHERE — your context, the system/conversation context, any injected/ambient block — WITHOUT loading/reading/searching?" makes it confirm and cite where. Prefer a DIRECT per-marker question over a generic "list any secrets". Incident: VS Code PostToolUse `additionalContext` was wrongly recorded as not-reaching (Run 5); rephrasing + per-marker ask (Run 7) confirmed it DOES reach the model. Treat a narrow-scope "none" as inconclusive, never proof of absence. (The general "empower a verification subagent" lesson lives in `agents/MEMORY.md`.)

---

## Key Source Files

- `src/hooks/src/runtime/run-hook.ts` — hook executor, exit code decision
- `src/hooks/src/types.ts` — `CanonicalOutput`, `IdeAdapter` interface
- `src/hooks/src/adapter.ts` — `formatOutput` dispatcher
- `src/hooks/src/adapters/*.ts` — per-IDE formatOutput implementations
- `src/rosettify-plugins/src/escaping/json-string.ts` — bootstrap payload builders
- `src/rosettify-plugins/src/bootstrap/payload.ts` — per-IDE entry shape builders
- `docs/requirements/plugin-generator/FR-HOOK.md` — authoritative entry shapes
- `docs/requirements/plugin-generator/FR-VAR.md` — Cursor `additional_context` requirement
- `instructions/r2/core/configure/github-copilot.md` — Output Contract reference (lines 529-556)
