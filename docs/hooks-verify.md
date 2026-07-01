# Hooks Output Format Verification

Terse, factual findings. Grounded in public docs and codebase inspection.
Started 2026-06-24. Spec status: **Copilot, Codex, Claude Code, Cursor, Devin Desktop (windsurf.md) = VERIFIED/COMPLETE** (per-IDE specs in `docs/hooks/`; Cursor's gained a Run 4 pass on 2026-06-30 covering exit-code/`ask`/`failClosed`/subagent/file-edit/`env`); **Devin CLI (devin-cli.md) = doc-grounded DRAFT, NOT validated** (by decision; Devin Desktop confirmed not to read it). Code/requirements/configure changes: **Cursor's change-phase (steps 4–11) is DONE** (Bug 1 exit-code plumbing + Windsurf's `exitCode()`, `cursor.md`+`r2`/`r3` `cursor.md` configure-guide Hooks section, tests) — see Action 2/3 status below. Remaining IDEs' change-phase work is still gated.

> **Companion file:** raw per-run narratives + wire captures live in `docs/hooks-verify-run-logs.md` (APPEND-ONLY; `grep`, do not read wholesale). Verified contracts live in the per-IDE specs `docs/hooks/<ide>.md`. **This file = protocol, standing rules, change-phase findings, and methodology only** — NOT per-IDE contracts (those are in the specs) and NOT raw run evidence (that is in the run-log).

---

## Core Principle — NOTHING IS APPROVED UNTIL VERIFIED

**The goal of this effort is a VERIFIED SOURCE OF TRUTH for hook contracts.** Build order is one-directional:

> **doc-grounded spec (DRAFT / hypothesis) → empirical live-hook test → VERIFIED truth → only then: code / requirements / configure changes.**

- A spec grounded only in manufacturer docs is a **hypothesis**, never truth. Docs can be wrong, stale, or runtime-dependent.
- **Nothing is "approved" or "confirmed" until it is empirically verified** against the real agent via the live-hook test (`tester.js` + `~/.rosetta/hooks.log`). The hook protocol is model-independent — verify the contract once; the model does not change it.
- HITL approval of a DRAFT spec means only "**this hypothesis is worth testing**" — it does NOT make the spec truth.
- Verified facts (the `Observed` columns) are the source of truth. Code, requirements, and configure guides are reconciled TO that truth — never the reverse, and never ahead of it.

---

## User Intent

Verify all hook output formats used in Rosetta hooks. Check public docs per IDE/agent one at a time.
Check usage in `docs/requirements`, `rosettify-plugins`, and `instructions` (r2 + r3).

---

## Working Protocol (per agent, explicit — MUST follow)

For each IDE/agent, in this exact order:

1. **Spec doc**: Create/update `docs/hooks/<ide>.md` — EXACT contract: input model, output model, field-by-field meaning, constraints, direct links to official docs. No prose. Specs only.
2. **HITL — spec review (DRAFT, NOT truth)**: Present the doc-grounded spec. Resolve all uncertainties. Wait for **explicit approval to PROCEED TO VERIFICATION** — this approves the spec only as a *hypothesis worth testing*, NOT as a confirmed contract. The spec stays **DRAFT** until step 3.
3. **Empirical live-hook verification (collaborative — THIS is what produces the source of truth).** A doc-grounded spec is NOT confirmed until proven against the real agent. Build `docs/hooks/<ide>/hooks.json` wiring every event to `docs/hooks/tester.js`; the **user runs it in the real agent** and captures `~/.rosetta/hooks.log`. (The hook protocol is model-independent — one run verifies the contract; the model does not change it.) **The assistant guides the user** (setup + which probe prompt to paste + what to report), then **verifies against the logs, not the model's word** (see "Verification Process" — the canonical how-to). Fold confirmed results into the spec's `Observed` columns; only now is the spec VERIFIED truth. **HITL gate:** present empirical results; wait for **explicit approval** before any code work.
4. Check `src/hooks` (grep/search — no full reads)
5. Check `docs/REQUIREMENTS` (grep; reset requirement status to `Draft` AFTER implementation, not before)
6. Check `src/rosettify-plugins` (grep for all affected usages)
7. Check `instructions/r*/configure/*.md` (grep; both r2 + r3). **[GENERAL — applies to every IDE's change phase] Scope check (added 2026-06-30, discovered on Cursor but not Cursor-specific):** these guides document the GENERATED PLUGIN's wire contract for END USERS — not `src/hooks`-internal authoring APIs. A field like `_exitCode` (an emergency escape hatch for people writing hooks in `src/hooks`) belongs in code comments / `hooks-verify.md`, never here. Also: `docs/requirements/plugin-generator` explicitly excludes `src/hooks` runtime internals (`SCOPE.md`, AC-3) — don't go hunting for a plugin-generator FR to update when the change is purely `src/hooks` runtime behavior (see OI-4).
8. **HITL gate**: present all findings — wait for **explicit approval** before touching code or docs
9. Update `hooks-verify.md` with confirmed decisions
10. Make changes across all areas
11. Update `hooks-verify.md` with post-change summary

**Constraint:** ONE agent at a time. No jumping ahead.
**HITL is mandatory at every gate (steps 2, 3, 8).** Do NOT proceed past a gate — and do NOT touch code, requirements, plugins, or configure guides — without the user's explicit approval. The live-hook test (step 3) is the proof step: never mark a spec "confirmed" from docs alone.

### Spec file role — `docs/hooks/<ide>.md` (READ THIS before creating/editing one)

**What it is:** the single **authoritative, manufacturer-grounded hook contract** for ONE IDE/agent — `docs/hooks/copilot.md`, `docs/hooks/claude-code.md`, `docs/hooks/cursor.md`, `docs/hooks/codex.md`, `docs/hooks/windsurf.md`, `docs/hooks/devin-cli.md`. One file per IDE.

**Role in the flow:** it is the **output of step 1** and the artifact the rest of the protocol (empirical test → code/requirements/configure changes) is verified *against*. Created **before any code work** on that IDE. The spec is the source of truth for what the manufacturer guarantees; code and configure guides must conform to it, never the reverse.

**SPECS ONLY — FACTS ONLY.** The spec contains ONLY the contract: exact input JSON model, exact output JSON model, field-by-field types/meanings/constraints (with a `Ref` column citing the manufacturer source per field), matchers + wiring, exit codes, direct links to official docs. **NO change log. NO reasoning/justification. NO decision history. NO speculation.** Just the facts as the manufacturer documents them. Obey the **Spec Authoring Rules** below.

**What it is NOT:**
- **NOT a copy of another IDE's spec.** Every name/field/shape comes DIRECTLY from that manufacturer's docs — never inferred from another IDE (e.g. Codex ≠ Copilot). Do not import another IDE's quirks (merged-emit, double-fire, casing variants) unless that manufacturer documents them.
- **NOT a scratchpad.** Cross-references to internal files, adapter analysis, decisions, open items, and run logs live HERE in `hooks-verify.md`, not in the spec. The spec stays a clean, self-contained contract (it may name Rosetta and its own test config, since the spec serves Rosetta).
- **NOT "confirmed" from docs alone.** It starts doc-grounded (DRAFT); empirical live-hook results (step 3) get folded into its `Observed` columns and only then is it sealed COMPLETE (see `copilot.md` for the finished shape).

**Authority vs configure guides:** per INT-IDE-0002 the `instructions/*/configure/*.md` guides are authoritative for hook output format in *generated plugins*; the `docs/hooks/<ide>.md` spec is the verification reference those guides are reconciled against during the changes phase.

**Target hook events (all IDEs):** `SessionStart`, `SessionStop`, `AgentStop`/`SubagentStop`, `PreToolUse`, `PostToolUse` — only these five (documented under each manufacturer's EXACT event names). Each spec covers: exact input JSON model, exact output JSON model, field-by-field types/meanings/constraints, direct doc links. No prose.
**Matchers:** Document per-IDE matchers and wiring inside the respective `docs/hooks/<ide>.md`.

### THINKING MODEL — what each spec section may contain (READ before adding/keeping ANY non-table section)

Added 2026-06-26 after repeated mis-authoring on Codex. **Every spec section must be GENUINE FOR THIS IDE — never ported from another IDE's spec just because it exists there.** Before writing a section, classify the content:

1. **Manufacturer I/O contract?** (events, input fields, output fields, exit codes, matchers) → belongs ONLY in the per-event TABLES (with `Ref`). Never restate it elsewhere.
2. **A "Practical Conclusion"?** A practical conclusion is ONLY one of:
   - a behavior that genuinely SURPRISES a careful reader of the I/O tables (e.g. Codex: *any* extra/misplaced field invalidates the WHOLE output → the hook runs unhooked), or
   - a high-impact, easy-to-miss gotcha with SILENT-FAILURE consequences (e.g. `systemMessage` is user-only and never enters model context — put model guidance there and the model silently never sees it).
   It is NOT field placement, which events exist, registration, tool interception, or exit-code values — those are already pinned in the tables. **If you can derive it from the tables, it is NOT a conclusion.** Keep conclusions to the few that are genuinely earned.
3. **A section that only makes sense because of ANOTHER IDE's complexity?** Then it may not belong here, or belongs in a smaller form. Copilot earned a capability MATRIX and a wire-example APPENDIX because it spans **3 input standards × 2 runtimes** with opposite behaviors. An IDE with ONE standard / ONE runtime may need neither — or a different version (e.g. a matrix that tracks verification STATUS, not runtime divergence). Include a matrix/appendix ONLY if it carries information the tables cannot.
4. **Raw run evidence or test methodology, not the contract?** → does NOT go in the spec as prose. Wire captures, env signatures, which events fired, per-run pass/fail → `hooks-verify-run-logs.md`. How to probe, prompt wording, UI-display caveats, model-recall quirks → `hooks-verify.md`. **The model used does NOT change the protocol — never gate the contract on a model.**

**Failure modes this prevents (all committed 2026-06-26 on Codex):** copying Copilot's merged-emit / double-fire / both-placements framing into a single-standard IDE; writing "practical conclusions" that merely restate the tables; jamming Practical Conclusions + matrix + wire dump + env signatures into one cross-linked blob; deleting a genuine section in overcorrection; gating verification on "all models" when the protocol is model-independent.

---

## User Decisions (HITL answers)

| Issue | Decision |
|---|---|
| Bug 1 — exit code never matches hook result | **Fix for all IDEs. Process exit code MUST match what hook returned. NOT Windsurf-only.** |
| Bug 2 — Copilot `additionalContext` placement | **Emit BOTH: top-level `additionalContext` AND inside `hookSpecificOutput.additionalContext`. Both contracts satisfied, nothing breaks. Do NOT switch between formats — merge them.** |
| Bug 2 — Copilot `additionalContext` on PreToolUse / PostToolUse | **RESOLVED (OI-1, 2026-06-25): use the dedicated field per purpose — PreToolUse deny → `permissionDecisionReason`; PostToolUse advisory + SessionStart context → `additionalContext`. "Do NOT use `additionalContext`" applies ONLY to deny-reasons, NOT as a blanket ban.** |
| Gap 3 — `cursor.md` and `codex.md` missing Output Contract sections | **Yes, add. Re-verify whether all hooks follow same format OR some differ. Include proof links.** |
| Gap 4/5 — `suppressOutput` dead, `ask` unsupported in Codex | **Not a gap — fields defined for future support. No change.** |
| Windsurf is now Devin | **Rosetta never released hooks → no backward-compat burden. Devin Desktop = renamed Windsurf (flat Cascade at `.devin/hooks.json`); the Claude-format `.devin/hooks.v1.json` is Devin CLI, NOT Desktop. `windsurf.md` = Devin Desktop contract; `devin-cli.md` = Devin CLI (left non-validated).** |

---

## Internal Pipeline

```
HookResult (hook logic) → toCanonical() (run-hook.ts) → CanonicalOutput → adapter.formatOutput(canonical, ide) (adapter.ts) → IDE-specific wire JSON → stdout
```
- `CanonicalOutput` (`src/hooks/src/types.ts`) **IS the Claude Code wire shape** (canonical) — full contract in `docs/hooks/claude-code.md`. `HookResult` kinds: `advise` (→ `additionalContext`), `allow`, `deny` (→ `permissionDecision:'deny'` + `continue:false`), `side-effect` (no stdout), `null` (no stdout).
- `run-hook.ts` always exits 0 on success today (**Bug 1** — see below); exit 1 on error.

---

## Per-IDE — spec pointers + change-phase findings

Contracts (events, I/O models, exit codes, matchers) live in the per-IDE specs — **NOT duplicated here**. This section keeps only the pointer/status and the **change-phase findings that are NOT in the spec** (to address in Steps 4–11, after the Step-8 HITL gate).

| IDE / agent | Spec | Status | Adapter |
|---|---|---|---|
| Claude Code | `docs/hooks/claude-code.md` | COMPLETE (canonical: `CanonicalOutput` == wire; adapter identity) | `adapters/claude-code.ts` |
| Codex (OpenAI) | `docs/hooks/codex.md` | COMPLETE | `adapters/codex.ts` (identity) + `ide-rows/codex.ts` |
| Cursor | `docs/hooks/cursor.md` | COMPLETE; **change-phase DONE 2026-06-30** (Actions 2/3/5) | `adapters/cursor.ts` (→ flat snake_case; no `exitCode` override, by decision) |
| GitHub Copilot | `docs/hooks/copilot.md` | COMPLETE | `adapters/copilot.ts` |
| Devin Desktop (Windsurf) | `docs/hooks/windsurf.md` | COMPLETE (flat Cascade; `.devin/hooks.json` current, `.windsurf/` legacy alias) | `adapters/windsurf.ts` |
| Devin CLI | `docs/hooks/devin-cli.md` | DRAFT — NOT validated (out of scope unless Rosetta targets the CLI) | — |

### Change-phase findings (NOT in the specs)

**Copilot — BUG 2** (`additionalContext` must emit at BOTH top-level AND nested for SessionStart, per user decision). Affected files:

| Layer | File | Issue |
|---|---|---|
| Runtime hook adapter | `src/hooks/src/adapters/copilot.ts:93` | Missing top-level `out.additionalContext` alongside existing `hookSpecificOutput` |
| Bootstrap generator | `src/rosettify-plugins/src/escaping/json-string.ts:47` | `buildHookPayloadJson` emits nested only — Copilot needs both top-level AND nested |
| Bootstrap manifest | `src/rosettify-plugins/src/spec/bootstrap-manifest.ts:47,54,62` | Copilot commands emit nested only |
| Lock comment | `src/rosettify-plugins/src/bootstrap/copilot-lock.ts:13` | References nested-only format — needs update |

**Copilot — input normalization gaps** (`normalize()` handles CLI camelCase (R1) but not all VS Code snake_case (R3); see OI-3):
- `tool_name`: also read `raw.tool_name` (snake_case, R3); today camelCase only
- `tool_input`: handle `raw.tool_input` (object, R3); today reads only `raw.toolArgs` (JSON string, R1)
- `tool_use_id`: map `raw.tool_use_id` (R3) — always `undefined` today
- `tool_response`: handle `raw.tool_response` (string, R3); today reads only `raw.toolResult` (object, R1) — type mismatch
- `hook_event_name`: when `raw.hook_event_name` present (R3), consume directly instead of always inferring

**Codex — adapter gap (CX-2):** `ide-rows/codex.ts` maps `PostToolUse`/`PreToolUse`/`SessionStart`/`PreCompact`/`PostCompact`/`UserPromptSubmit` — but **`Stop` and `SubagentStop` are NOT mapped**, though both are Rosetta target events.

**Cursor — DONE (2026-06-30):** deny-reason channel CONFIRMED across 2 mechanisms — the adapter's `permissionDecisionReason → user_message` mapping is correct, **no change needed**. `exitCode()` deny→2 (Action 2) was investigated empirically (Run 4) and **deliberately NOT implemented** — see Bug 1's correction note; Cursor keeps the default exit code 0. Configure-guide Hooks section (Action 3, expanded scope) **added** to `instructions/r2+r3/core/configure/cursor.md`. `src/rosettify-plugins`/`docs/REQUIREMENTS` already correctly specified Cursor's payload shape — no gap found, no change needed there.

**Windsurf (Devin Desktop) — BUG 1, exit-code portion DONE (2026-06-30):** `adapters/windsurf.ts` no longer emits the dead `_exitCode` JSON field; blocking now goes through the **exit-code mechanism** (`exitCode()` → 2 on deny, read by `run-hook.ts`'s decision tree). NOTE: this was implemented alongside Cursor's Action 2 work as a shared plumbing change (decision tree + `IdeAdapter.exitCode` + per-bundle entrypoints), ahead of Windsurf's own dedicated verification turn — Windsurf's spec (`windsurf.md`) was already VERIFIED/COMPLETE with this exact mechanism confirmed (Run 1: "Deny via exit-2 + stderr CONFIRMED"), so this isn't new hypothesis, just completing an already-verified fix. **Still open, NOT done, deferred to Windsurf's own turn:** the deny REASON TEXT itself has no working delivery channel today — `formatOutput`'s `additionalContext` still writes to stdout, which Windsurf never parses (confirmed Run 1: "9× exit 0 with textLen 0/stderrLen 0 — stdout JSON is irrelevant"); the verified-working channel is **stderr**, which `run-hook.ts` does not currently route adapter output through for non-error completions. The block itself now works correctly (exit 2 ⇒ blocked); the human/agent-visible reason does not yet reach anywhere.

**Configure-guide Output Contract gaps (INT-IDE-0002):** `github-copilot.md` (wrong `hookSpecificOutput` wrapper for all events) and `codex.md` (none) still open. `cursor.md` (r2+r3) **DONE** — full Hooks section added (Action 3, expanded beyond just Output Contract). `claude*.md` (verify) still open. See Requirements / Instructions Alignment + Pending Actions.

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

**STATUS: FIXED (2026-06-30)** for the decision-tree plumbing + Windsurf + Cursor. Codex/Copilot/Claude Code adapters were already correct by default (exitCode unset → 0) and needed no change.

**File:** `src/hooks/src/runtime/run-hook.ts` (was lines 397–403; logic now in `resolveExitCode`, exported for tests).

Was: all success paths returned `exitCode: 0` unconditionally. Now: `resolveExitCode(result, canonical, ide)` implements the decision tree below; its result is used in both the side-effect and main return paths.

Per-IDE expected exit code for deny (full exit-code contract is in each spec's Exit Codes section):
- Claude Code: `0` · Codex: `0` · Copilot: `0` (deny via JSON) · **Cursor: `0`** (deliberate — see correction below) · Windsurf: `2` (exit code is the ONLY mechanism; stdout not parsed).

**(!) Correction vs the original plan (Cursor Run 4, 2026-06-30):** the original fix design called for `exitCode()→2` on BOTH Windsurf and Cursor. Empirical testing showed pairing exit-2 with Cursor's JSON deny body does NOT get parsed — Cursor dumps the raw, unparsed JSON text (including `agent_message`, which the working exit-0 path never exposes) as the block reason. Since Cursor's exit-0 + `permission:"deny"` JSON deny is already confirmed working and field-selective (Runs 1+3), adding the exit-code override would trade a clean, verified mechanism for a worse one with no functional gain. **Decision (user, 2026-06-30): Cursor keeps the default `exitCode` (0) — no override implemented.** `adapters/cursor.ts` and `entrypoints/adapter-cursor.ts` both carry a comment explaining this so a future maintainer doesn't "fix" it by adding one. Windsurf's portion proceeded as originally planned (its only mechanism IS the exit code; no JSON-parsing path exists to prefer).

**Implemented:** `exitCode?(canonical: CanonicalOutput): number` added to `IdeAdapter` (`src/hooks/src/types.ts`) and to each slim per-IDE bundle entrypoint (`src/hooks/src/entrypoints/adapter-*.ts`, each bundle aliases `../adapter` to its own entrypoint — see `scripts/build-bundles.mjs`). `adapter.ts` exports `exitCodeFor()`. Windsurf's adapter implements `exitCode` → 2 on deny; the dead `_exitCode` JSON field (never parsed by Windsurf) was removed from its `formatOutput`. Cursor implements no override (see correction above).

**Exit code decision tree (`resolveExitCode`, implemented 2026-06-30):**
```
try {
  _exitCode is not null  → return _exitCode   // emergency override; MUST document: DO NOT use unless EXTREMELY necessary
  deny                   → return IDE-specific exit code (adapter.exitCode(), default 0)
  default                → return 0
} catch {
  return 1000
}
```

`_exitCode` override: optional field on every `HookResult` variant (`src/hooks/src/runtime/types.ts`); if non-null, it bypasses both deny-logic and default. Documented inline as a last-resort escape hatch, not for normal hook use — **scope correction**: this is an internal `src/hooks`-authoring API, not something `instructions/*/configure/*.md` end-user guides should document (those describe the generated plugin's wire contract, not Rosetta's internal hook-writing API).

**Tests:** `src/hooks/tests/runtime/run-hook.test.ts` (`resolveExitCode` decision tree — deny per IDE, `_exitCode` override on deny and on allow, unknown-ide default, throw→1000) and `src/hooks/tests/adapter.windsurf.test.ts` (updated: `_exitCode` no longer in the JSON body; `exitCodeFor` returns 2 on deny, 0 otherwise).

---

## Matchers and Hook Trigger Wiring

Matchers are internal TypeScript predicates that determine whether a hook fires for a given tool call.

**Regex convention:** `^(?:PATTERN)$` — anchored, non-capturing group wrapping alternatives. Example from `dangerous-actions/patterns.ts`:
```typescript
{ id: 'ssh-private-key', re: /^(?:id_rsa|id_ed25519|id_ecdsa|id_dsa)$/, ... }
```

**Wiring in `run-hook.ts`:**
- `FilePathPredicate` → checked at `evalFilePath()` — matches `ctx.filePath` against basename/extension/notContainsAny rules
- `ToolInputPredicate.commandMatchWhen` → checked at `evalToolInput()` — matches `ctx.toolInput.command` against `re.test(command)`; only fires when `ctx.toolName` is in the `tools` array AND the command matches the regex

**Per-hook wiring:**

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
| `docs/requirements/plugin-generator/FR-HOOK.md` | ✅ Per-IDE entry shapes correct: Claude (`once:true`), Codex (`statusMessage+timeout`), Copilot (`bash+powershell`+lock), Cursor (plain command). ⚠️ Copilot bootstrap payload format (`hookSpecificOutput`) NOT explicitly required — no requirement captures that the Copilot bash command must emit `{"additionalContext":"..."}` (top-level). Requirement must be ADDED; status reset to `Draft` only AFTER changes are implemented. |
| `docs/requirements/plugin-generator/FR-VAR.md` | ✅ Cursor `additional_context` (FR-VAR-0020) required explicitly |
| `docs/requirements/plugin-generator/REFERENCES.md` | INT-IDE-0002 designates configure guides as authoritative for hook output format |
| `instructions/*/configure/github-copilot.md` | ❌ Output Contract section (lines 529-556, r2+r3 identical) documents `hookSpecificOutput` wrapper for ALL events — WRONG for Copilot. Must be rewritten to correct top-level format per event type. |
| `instructions/*/configure/cursor.md` | ✅ DONE (2026-06-30) — full Hooks section added (r2+r3): Locations, Registration Format, Supported Events, Output, Exit Codes, Matchers, plus the `failClosed`/`ask`/exit-2-vs-JSON gotchas |
| `instructions/*/configure/codex.md` | ❌ No hook stdout output contract — gap vs INT-IDE-0002 |
| `src/rosettify-plugins/src/escaping/json-string.ts` | ❌ `buildHookPayloadJson` wraps in `hookSpecificOutput` — correct for Claude/Codex, WRONG for Copilot. Need `buildCopilotHookPayloadJson` → `{"additionalContext":"..."}`. |
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

## Open Items — TBD Before Implementation

- **OI-1, OI-2 — ✅ RESOLVED (2026-06-25):** dedicated-field-per-purpose (`additionalContext` for context, `permissionDecisionReason` for deny); `Stop` (VS Code standard) and `agentStop` (Copilot-custom) are SEPARATE events, documented each exactly as defined. Folded into User Decisions + the specs.
- **OI-3 — ⏳ Copilot input-normalization scope:** support BOTH Copilot CLI (R1 camelCase) AND VS Code (R3 snake_case), reasonably (platforms are case-tolerant; do NOT over-engineer). Correctness-blocking: `tool_name`/`tool_input` snake_case (matchers + file-path extraction fail under VS Code today). NOTE (R2): VS Code IGNORES matcher values — hooks fire on ALL tools, must self-guard internally.
- **OI-4 — [GENERAL, all IDEs — not Cursor-specific] ⏳ Should `src/hooks`'s runtime contract get its own requirements doc?** Raised 2026-06-30 during Cursor's Bug-1 work, but the question is about `src/hooks` as a whole (shared runtime serving every IDE), not Cursor alone. `docs/requirements/plugin-generator` deliberately excludes `src/hooks` runtime internals — `SCOPE.md:18` ("compiling TypeScript hook sources is a separate concern") and `ASSUMPTIONS.md:7` AC-3 ("Hook bundles are an external input"). So the per-IDE exit-code contract, adapter `formatOutput`/`exitCode` behavior, and the `_exitCode` escape hatch currently live ONLY in `docs/hooks/<ide>.md` (verification specs) + code comments — no requirements doc pins them down the way FR-HOOK.md pins down generator entry-shapes. Not resolved either way — needs an explicit decision before/independent of the next IDE's turn, not assumed.

---

## Pending Actions (awaiting explicit user approval before implementation)

### Action 1 — Fix Bug 2: Copilot `additionalContext` placement (4 files in `src/rosettify-plugins` + 1 adapter + configure docs r2+r3)
- `src/hooks/src/adapters/copilot.ts:93` — replace `out.hookSpecificOutput = { hookEventName, additionalContext }` with also emitting top-level `out.additionalContext`
- `src/rosettify-plugins/src/escaping/json-string.ts` — add `buildCopilotHookPayloadJson` → `{"additionalContext":"${escaped}"}`
- `src/rosettify-plugins/src/plugin-processors/plugin-assemble-copilot-bootstrap.ts:34` — switch to `buildCopilotHookPayloadJson`
- `src/rosettify-plugins/src/spec/bootstrap-manifest.ts:47,54,62` — change Copilot payload to `{"additionalContext":"..."}`
- `src/rosettify-plugins/src/bootstrap/copilot-lock.ts:13` — update comment
- `instructions/r2+r3/core/configure/github-copilot.md` — rewrite Output Contract: correct per-event top-level schema, add sessionStart two-type table, add matchers/wiring section
- `docs/REQUIREMENTS/plugin-generator/FR-HOOK.md` — add requirement for Copilot payload format; reset status to `Draft` AFTER implementation

### Action 2 — Fix Bug 1: exit code decision tree — ✅ DONE (2026-06-30, scope corrected for Cursor)
- `src/hooks/src/types.ts` — added `exitCode?(canonical: CanonicalOutput): number` to `IdeAdapter`
- `src/hooks/src/adapters/windsurf.ts` — implemented `exitCode`: return 2 on deny; removed dead `_exitCode` from `formatOutput`
- `src/hooks/src/adapters/cursor.ts` — **NOT implemented, by decision** (Run 4 empirically showed exit-2 + Cursor's JSON body gets dumped raw/unparsed — strictly worse than the already-working exit-0 path); left at default (0), with an explanatory code comment
- `src/hooks/src/entrypoints/adapter-*.ts` (all 5) — each slim per-IDE bundle entrypoint needed its own `exitCodeFor` export too (bundler aliases `../adapter` per-bundle, see `scripts/build-bundles.mjs`) — not anticipated in the original plan, discovered via a build failure
- `src/hooks/src/runtime/run-hook.ts` — applied decision tree as `resolveExitCode` (exported for tests): `_exitCode not null → use it; deny → adapter.exitCode(); default → 0; catch → 1000`
- `_exitCode` override documented inline in `runtime/types.ts` (NOT in configure docs — scope correction: it's an internal `src/hooks`-authoring API, not part of the generated plugin's wire contract that `instructions/*/configure/*.md` guides describe)
- Windsurf's deny REASON TEXT still has no working delivery channel (stdout is never parsed, stderr routing not added in this pass) — flagged as a known gap for Windsurf's own dedicated turn, not fixed here (out of Cursor's scope)

### Action 3 — Add Hooks section to `cursor.md` configure guides (r2 + r3) — ✅ DONE (2026-06-30, scope expanded)
- Expanded beyond the original "Output Contract only" framing — guides had ZERO hooks documentation (no Locations/registration/events either), so added the full section: Hook Locations, Registration Format, Supported Events, Output (flat fields), Exit Codes, Matchers — compressed, modeled on the verified `docs/hooks/cursor.md`. Proof: https://cursor.com/docs/reference/hooks

### Action 4 — Add Output Contract to `codex.md` configure guides (r2 + r3)
- Document `hookSpecificOutput` schema; note `permissionDecision: "ask"` NOT supported. Proof: https://developers.openai.com/codex/hooks

### Action 5 — Update tests: exit code assertions per IDE for deny — ✅ DONE for Cursor/Windsurf/Claude Code/Codex/Copilot (2026-06-30)
- `src/hooks/tests/runtime/run-hook.test.ts` — new `resolveExitCode` describe block: deny→2 (Windsurf), deny→0 (Cursor/Claude Code/Codex/Copilot), `_exitCode` override (on deny and on allow), unknown-ide default, throw→1000
- `src/hooks/tests/adapter.windsurf.test.ts` — updated: `_exitCode` no longer in the JSON body; added `exitCodeFor` assertions (2 on deny, 0 otherwise)

---

## Live Hook Tests (per-IDE) — configs + status

The **repeatable methodology** is in "Verification Process" (below); the **probe/recall techniques** in "Testing Methodology Lessons". Per-IDE wiring is committed at **`docs/hooks/<ide>/hooks.json`**; the universal harness is `docs/hooks/tester.js` (output shape per `--mode <ide>`). **All IDE runs are DONE** — per-run narratives + wire captures are in `docs/hooks-verify-run-logs.md` (`grep "<IDE> Run"`); confirmed contracts are folded into each spec's `Observed` columns + Appendix, and cleaned log excerpts are `docs/hooks/<ide>-logs.txt`.

| IDE | Live-test config | `--mode` | Runs | Cleaned log |
|---|---|---|---|---|
| GitHub Copilot | `docs/hooks/copilot/hooks.json` | copilot | 1–8 | `vs-copilot-logs.txt`, `copilot-cli-logs.txt` |
| Codex | `docs/hooks/codex/hooks.json` | codex | 1–3 | `codex-logs.txt` |
| Claude Code | `docs/hooks/claude/hooks.json` | claude | 1 (+`/compact`) | `claude-logs.txt` |
| Cursor | `docs/hooks/cursor/hooks.json` | cursor | 1–4 | `cursor-logs.txt`, `cursor-run3-logs.txt`, `cursor-run4-logs.txt` |
| Devin Desktop (Windsurf) | `docs/hooks/windsurf/hooks.json` (also placed at `.devin/hooks.json`) | windsurf | 1–4 | `windsurf-logs.txt` |
| Devin CLI | `docs/hooks/devin/hooks.v1.json` (no-wrapper) | devin | not run | — |

**Generic sanctioned-test prompt** (frame as a self-authored diagnostic so the model doesn't treat it as prompt-injection; adapt steps per IDE): (1) run `echo rosetta-hook-probe`; (2) read/`cat` `docs/hooks/HOOK-DENY-PROBE.txt` — the PreToolUse/`pre_*` deny should block it; quote the block verbatim and continue; (3) for injection-capable IDEs, ask **per-token YES/NO** recall of the planted markers (+ trailing `Report` code) — never "list/quote" (triggers a secret-refusal); (4) if a Stop-block is wired, run that prompt FIRST so its one-time block doesn't interrupt later steps. **Verify against the LOG, not the model's word.**

> **Devin Desktop note:** `.devin/hooks.json` (flat Cascade) and `.windsurf/hooks.json` are equivalent (Runs 1–2). `.devin/hooks.v1.json` (Claude-Code format) is **NOT read by Devin Desktop** (Runs 3–4) — it's the Devin CLI's file (`devin-cli.md`, non-validated).

---

## Verification Process (repeatable empirical methodology)

How hooks are verified end-to-end. Reusable for every IDE/agent.

1. **Generic diagnostic hook** — `docs/hooks/tester.js`: dumps the full invocation (ms-timestamp, pid, invocation string, argv, cwd, script dir, raw stdin, env) to `~/.rosetta/hooks.log`, then runs flag-selected mutating processors: `--output`, `--exit-code`, `--tag`, `--deny-on-match`, `--rewrite-command`, `--block-stop-once` (atomic per-session marker, can't loop), `--copilot-rewrite-result`. Shape-divergent commands (deny/rewrite/stop) take a `--mode <ide>` parameter and emit that IDE's EXACT shape.
2. **Register every target event** in `docs/hooks/<ide>/hooks.json`, each wired to `tester.js` with a distinct `--tag` (and both capitalizations where a runtime has them, so the log reveals which key actually fired — input `hook_event_name` alone can't tell you).
3. **Probe design — distinct planted markers per (event × placement × key):** presence (secret recall) + instruction (nudge `Report XX`) via `additionalContext`; prevention via `--deny-on-match`; arg/result rewrite via `--rewrite-command`/`--copilot-rewrite-result`; Stop block ONCE via `--block-stop-once`; compaction by registering Pre/Post events.
4. **Run MANUALLY in each runtime** — paste the probe prompt into a real session. Frame it as a sanctioned self-authored test (planted markers, nothing untrusted) to avoid prompt-injection refusals. Run the Stop-block prompt FIRST (it consumes the one-time block).
5. **Verify against the LOG, not the model's word** — confirm each hook EMITTED (RESULT `textLen`/`stderrLen`) and cross-check `tool_input`/`tool_response`; the model's recall tells which placement REACHED it. Trust = emit (log) + delivery (model), both checked.
6. **Probe WORDING matters** — ask "do you see X ANYWHERE (your context, system context, injected/ambient `<...-context>` blocks), without loading?" per specific marker. "In your context" + a generic "list secrets" UNDER-REPORTS → false negatives.
7. **Record per run** (Run N: runtime / model / session id) in the run-log → correct false negatives → fold confirmed results into the spec's `Observed` columns.
8. **Export logs** — `docs/hooks/split-logs.js <session_id> <src-log> <out-file>` (committed, canonical): de-interleaves by pid; keeps only blocks whose input carries `<session_id>` (or `trajectory_id` for Windsurf/Devin); redacts ONLY true secrets (name OR value-format, `isPathOrSimple` guard — the full env otherwise STAYS); trims oversized conversational fields; asserts no unredacted credential survived. Then clean run-state markers (`rm ~/.rosetta/.block-stop-once-*`).

---

## Testing Methodology Lessons (this effort)

1. **Probe injected context by asking "ANYWHERE" + per-marker — "in YOUR context" UNDER-REPORTS.** "Is X in YOUR context?" makes the model EXCLUDE hook-injected / system / ambient blocks (e.g. a `<PostToolUse-context>` wrapper) and answer "no" — a FALSE NEGATIVE. Ask "Do you have X ANYWHERE — your context, the system/conversation context, any injected/ambient block — WITHOUT loading/reading/searching?" per specific marker. Treat a narrow-scope "none" as inconclusive, never proof of absence. (Incident: VS Code PostToolUse `additionalContext` wrongly recorded as not-reaching, Run 5; per-marker re-ask in Run 7 confirmed it DOES reach.)

2. **Ask recall as per-token YES/NO — "list/quote the markers" triggers a secret-refusal.** When `additionalContext` is injected as developer/system context, "list verbatim any planted markers" makes the model treat them as secrets and REFUSE — a FALSE NEGATIVE even though the hook fired. Ask presence per token instead: *"Did you see this token — YES/NO: `CODEX-SS-NEST-3c4d`?"* (+ "if YES, give the trailing Report code"). (Incident: Codex Run 2.) **Corollary (Devin Run 4):** do NOT put the marker token itself in the recall question — the model will answer YES from the prompt alone (false positive). The real signal is the **Report code** (DS1/…), which exists only in the injected context.

3. **(!) Clean the log BY session key — do NOT over-complicate with timestamps/pids.** `~/.rosetta/hooks.log` is shared/append-only and mixes runs. The ONE robust filter is the run's `session_id` (or `trajectory_id` for Windsurf/Devin). `split-logs.js` keeps only invocation blocks carrying it. (Incident: Claude Run 1 — timestamp filtering was a fragile over-complication.)

4. **(!) Redact ONLY TRUE SECRETS — everything else MUST stay.** `split-logs.js` redacts iff (a) the env-var NAME means a credential (`*API_KEY*`, `*_TOKEN*`, `*SECRET*`, `*PASSWORD*`, `*CREDENTIAL*`, `*PRIVATE*`, `BEARER`, `*COOKIE*`, `_KEY`/`KEY`, …) **and** the value isn't a path/short/number/bool (`isPathOrSimple`), OR (b) the VALUE matches a known credential FORMAT (JWT `eyJ…`, `gh*_…`/`github_pat_…`, `AKIA…`, `sk-…`, `xox*-…`, `AIza…`, PEM). Keeps first 5 chars + `…[REDACTED]`; asserts none survived. **Do NOT redact** `PATH`/`HOME`/`JAVA_HOME`/`SSH_AUTH_SOCK`/`CLAUDE_*`/`AI_AGENT`/`TERM`/… — the full env IS the runtime signature. (Incident: Claude Run 1 over-redacted to a 7-var allowlist.)

5. **(!) Pre-run hygiene, EVERY run:** (a) archive the old log (rename); (b) `rm ~/.rosetta/.block-stop-once-*` so the Stop test fires; (c) PARK every OTHER agent's hook config in the test repo (`.cursor/`, `.codex/`, `.github/`, `.windsurf/`/`.devin/` → `*-disabled`) — else they fire and contaminate the log. Only ONE agent's config active at a time.

6. **[GENERAL — applies to every IDE, not Cursor-specific] (!) A confident, detailed model report of "nothing was blocked, everything ran fine" can mean hooks never fired AT ALL — not that they allowed the action.** (Incident: Cursor Run 4, first attempt — but the underlying risk, a hook config silently not registering, can happen on any IDE.) The model has no way to distinguish "hook fired and allowed" from "hook never fired" — it just sees its tool call succeed either way. **Before trusting ANY behavioral report, first confirm `~/.rosetta/hooks.log` has ANY entries at all for that `session_id`** (e.g. even the routine, unconditional `preToolUse`/`postToolUse` that fired in every prior run) — a report describing detailed step-by-step success is not partial evidence of "hooks ran and allowed," it is ZERO evidence either way until the log confirms invocation.

7. **[CURSOR-CONFIRMED; unverified on other IDEs] (!) Editing/renaming a hook config file for an ALREADY-OPEN IDE session may not take effect until a new session starts.** (Cursor Run 4: renaming `.cursor-disabled/` → `.cursor/` and editing `hooks.json` produced zero log entries in the live conversation; a fresh conversation's `sessionStart` was the first evidence the runtime had re-read the file.) Confirmed mechanism is Cursor-specific (session-scoped hook registration); WHETHER Codex/Copilot/Windsurf cache the same way is unverified — treat "start a new session after editing config for an already-open workspace" as a precaution for every IDE until disproven for that IDE, not an established fact for all of them.

8. **[GENERAL — a testing-tool discipline, not an IDE fact] (!) Dry-run new `tester.js` flag combinations against a synthetic payload BEFORE wiring them into `hooks.json` and spending a live IDE run.** (Incident: Cursor Run 4 — paired the UNCONDITIONAL `--exit-code <n>` flag with the CONDITIONAL `--deny-on-match`, so it would have forced exit-2 on every call, not just matched ones — caught only by re-reading the processor code after a confusing live result, not before.) `echo '{"...fixture..."}' | node docs/hooks/tester.js <flags>` locally catches flag-composition bugs for free, before they cost a live run, regardless of which IDE the flags target.

9. **[CURSOR-SPECIFIC — `failClosed` is a Cursor-only field; no other IDE spec documents it] (!) A `failClosed:true` handler that returns EMPTY output on non-matching calls contaminates every OTHER probe registered on the same event.** (Cursor Run 4: one `failClosed` handler on `beforeShellExecution` blocked all 6 shell probes on the first attempt, because Cursor treats its own empty/no-decision response as a failure under `failClosed` — masking whatever the OTHER handler on that event actually did.) When testing `failClosed` alongside other conditional probes on the same event, the `failClosed` handler MUST emit an explicit decision (e.g. `{"permission":"allow"}`) on its own non-match path, or every other probe's result becomes unattributable. Re-apply this lesson only if/when another IDE is found to have an equivalent fail-closed-style flag.

---

## Spec + Live-Test Deliverables Checklist (MANDATORY — produce ALL without being asked)

Every IDE/agent verification MUST produce ALL of the following before it is "done". (Reference shape: `codex.md` + `codex-logs.txt`.)

**A. Spec doc `docs/hooks/<ide>.md`** — every field table has a `Ref` column:
- Status line (DRAFT → VERIFIED/COMPLETE); Practical Conclusions (only genuinely-earned ones); Capability Matrix (✅ confirmed / 📄 documented-not-run / ❓ unknown).
- Events of Interest (Rosetta); References table; Hook Configuration & Locations + registration format.
- Hook Events table (matcher basis per event); Common Input Fields; Common Output Fields.
- Per-event Input + Output tables (the Rosetta target events, in full).
- Exit Codes (+ per-event table where the manufacturer has one).
- **Appendix — Observed Wire Examples** (filled from the live run): captured INPUT payloads (per event); ACCEPTED OUTPUT shapes; **Runtime env signature** = full inherited shell env (in the excerpt) + the injected detection-signature vars (with version var); **UI-surfacing note** (how the IDE shows hook output — NOT proof of model ingestion); link to the cleaned log.

**B. Live-test artifacts:**
- `docs/hooks/<ide>/hooks.json` — wires every target event to `tester.js` (correct `--mode <ide>`, distinct `--tag` per event, injection via `--output`).
- `tester.js` `--mode <ide>` branch if output shapes diverge (extend the switch; never fork the file).
- `docs/hooks/<ide>-logs.txt` — cleaned excerpt via `split-logs.js <session_id>`. Provenance header on top.
- Run-log entry appended to `docs/hooks-verify-run-logs.md` (runtime/model/session id; per-capability ✅/✗; input-field resolutions; env signature; caveats).
- Status flipped in this file's per-IDE table + the run-status line.

---

## Key Source Files

### Live-hook diagnostics tooling (committed, canonical)
- `docs/hooks/tester.js` — universal dump-first hook tester (logs full invocation to `~/.rosetta/hooks.log`; flag-selected processors; output shape per `--mode <ide>`).
- `docs/hooks/split-logs.js` — log cleaner: clean by `session_id`/`trajectory_id`, de-interleave by pid, redact only true secrets, assert no unredacted credential survived. Usage: `node docs/hooks/split-logs.js <session_id> <src-log> <out-file>`.
- `docs/hooks/<ide>/hooks.json` — per-IDE live-test wiring.

### Product source
- `src/hooks/src/runtime/run-hook.ts` — hook executor, exit code decision
- `src/hooks/src/types.ts` — `CanonicalOutput`, `IdeAdapter` interface
- `src/hooks/src/adapter.ts` — `formatOutput` dispatcher
- `src/hooks/src/adapters/*.ts` — per-IDE formatOutput implementations
- `src/rosettify-plugins/src/escaping/json-string.ts` — bootstrap payload builders
- `src/rosettify-plugins/src/bootstrap/payload.ts` — per-IDE entry shape builders
- `docs/requirements/plugin-generator/FR-HOOK.md` — authoritative entry shapes
- `docs/requirements/plugin-generator/FR-VAR.md` — Cursor `additional_context` requirement
- `instructions/r2/core/configure/github-copilot.md` — Output Contract reference (lines 529-556)
