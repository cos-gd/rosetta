# rosettify `plan` — Help/Output Improvement Proposal (for later review)

Status: **PROPOSAL / BACKLOG — not approved, not implemented.** Feeds a future requirements-authoring pass.
Source: naive-AI comprehension test (G1–G17) + synthesis of the full design conversation (CTORNDGAIN-1333, 2026-05-29).
Guiding principle (the through-line of the whole session): the `plan` help/output must let an **uninformed AI caller operate correctly with zero codebase access** — self-sufficient, clean (no internal leaks), directive (no optionality hedges in recommendations), and target-state.

## How to read this
Each item: **Gap → Why it matters → Proposed change (which FR to amend / new FR) → Acceptance sketch → Effort.**
Two classes are marked:
- **[CONFORMANCE]** — a gap against an ALREADY-APPROVED requirement (mostly FR-HELP-0002 "no anonymous shapes exposed"). These are arguably completion of work already agreed, not new scope.
- **[NEW]** — a genuinely new improvement needing fresh approval.

---

## P1 — HIGH — `next` returned-step shape is anonymous  [CONFORMANCE] (G1)
- **Gap:** `PlanNextResult.next` is declared `type: array` with no `items`. A caller cannot know which fields each actionable step carries (is `prompt` there? `phase_id`? `depends_on`?). The implementation returns `{id,name,prompt,status,depends_on,phase_id,phase_name,subagent?,role?,model?}` but the schema hides this.
- **Why it matters:** `next` is THE command an AI loops on; not declaring the item shape forces guessing — the exact failure mode this whole change set set out to kill. Also violates FR-HELP-0002 ("every shape exposed SHALL be a named exported type; anonymous inline shapes SHALL NOT be exposed").
- **Proposed change:** Introduce a named type `PlanNextStep` (the returned actionable-step shape: id, name, prompt, status, depends_on, phase_id, phase_name, subagent?, role?, model?). Make it the `items` of `next` in `nextOutputSchema`, and add it as a `schemas` dict entry. Amend FR-PLAN-0011 acceptance to require the `next` items schema be the named `PlanNextStep`. Amend FR-HELP-0002 to state the no-anonymous-shape rule applies **recursively** (array `items` and nested object shapes are named too).
- **Acceptance sketch:** `help plan` → `schemas.PlanNextResult.properties.next.items` references `PlanNextStep`; `schemas.PlanNextStep` exists with all fields described; no anonymous object/array-items anywhere in `schemas`.
- **Effort:** S (1 named type + schema wiring + 1 test).

## P2 — HIGH — phase-scoped loop has no clean completion signal  [NEW] (G2, G3)
- **Gap:** A subagent runs `next --target ph-x` to own one phase. `next_steps_for_ai` says "loop until count:0 and plan_status:complete" — but `plan_status` is WHOLE-plan. There is no documented phase-scoped termination. (`parent.status` does carry the phase status when filtered, but nothing tells the caller to use it, and the `plan_status` field name under `--target` is ambiguous.)
- **Why it matters:** The phase-scoped subagent execution pattern was a central goal this session. A subagent must stop when ITS phase is done, not when the whole plan is done; today that's underspecified.
- **Proposed change:** (a) Document that `plan_status` is ALWAYS whole-plan, even under `--target` (clarify field meaning, no rename). (b) Add explicit guidance: when `--target` is used, the phase is complete when `count:0` AND `parent.status == "complete"`; without `--target`, when `count:0` AND `plan_status == "complete"`. Put this in `next_steps_for_ai` and a note. (No new field — reuse `parent.status`, preserving DRY.) Amend FR-PLAN-0011 + FR-PLAN-0042.
- **Acceptance sketch:** help `next_steps_for_ai` branches on filtered vs unfiltered termination; a note states `plan_status` is whole-plan and `parent.status` is the phase signal.
- **Effort:** S (guidance/notes only).

## P3 — HIGH — no guidance for `count:0` while plan is blocked/failed  [NEW] (G14)
- **Gap:** `next_steps_for_ai` = "loop until count:0 and plan_status:complete." If `count:0` because everything left is blocked/failed, the caller has no instruction and may loop forever or stall. The recovery note exists but isn't tied to the loop's terminal logic.
- **Why it matters:** Directly the "stuck/blocked recovery" concern we spent the most time on. The terminal cases must be exhaustive and unambiguous.
- **Proposed change:** Rewrite `next_steps_for_ai` to cover all three terminal states explicitly: (1) `count>0` → do the work; (2) `count:0` AND `plan_status`(or `parent.status` when filtered)`:complete` → done; (3) `count:0` AND status is `blocked`/`failed` (or Overall Blocked/Failed > 0) → STOP looping, recover via `show_status` → `query` → `update_status`. Amend FR-PLAN-0016/0042.
- **Acceptance sketch:** help `next_steps_for_ai` enumerates the three terminal cases including the blocked/failed stop-and-recover path.
- **Effort:** S.

## P4 — HIGH — no single coherent "usage pattern" tying the flow together  [NEW] (synthesis)
- **Gap:** The orchestration flow is now spread across separate notes (construction flow, phase-scoped execution, recovery). There is no one place that shows the END-TO-END intended usage as a coherent sequence.
- **Why it matters:** This is the synthesis of the entire conversation — the intended way to USE plan (orchestrator builds from template → per-phase upsert template → subagent runs `next --target` loop → recovery). A caller reading the help should see the whole pattern at a glance.
- **Proposed change:** Add a top-level `usage_pattern` (or `workflow`) field to plan help: an ordered, directive walkthrough: (1) `create-with-template for-orchestrator`; (2) for each phase, `upsert-with-template for-subagent`; (3) hand phase to subagent; (4) subagent loops `next --target <phase> → update_status in_progress → work → update_status complete`; (5) on blocked/failed counts, recover. Clean/directive (no FR-IDs, no hedges). New sub-requirement under FR-PLAN-0016 (or new FR-PLAN-00xx).
- **Acceptance sketch:** `help plan` returns a `usage_pattern` array/section describing the 5-step flow; no internal refs; each step is a runnable directive.
- **Effort:** S–M.

## P5 — MEDIUM — per-subcommand error codes not surfaced in help  [NEW] (G5)
- **Gap:** Error codes exist (FR-PLAN-0021) but the help doesn't tell a caller which errors each subcommand can return (e.g., `update_status` on a phase id → `phase_status_is_derived`). The caller only learns on failure.
- **Why it matters:** Self-correction: knowing likely errors up front lets an AI construct valid calls and handle failures without trial-and-error.
- **Proposed change:** Add an `errors` array to each subcommand entry in help listing its possible error codes (+ one-line meaning). Sourced from code (DRY), not hand-authored. Amend FR-PLAN-0016.
- **Acceptance sketch:** each `subcommands[].errors` lists the codes that subcommand can emit; matches the code-declared set.
- **Effort:** M (needs per-subcommand error declarations).

## P6 — MEDIUM — input schemas show `required: []` while prose says fields are required  [NEW] (G6, G8)
- **Gap:** `PlanUpsertInput`, `PlanCreateInput`, etc. have `required: []`; required-ness is only in prose, and some requirements are CONDITIONAL (`kind`/`phase_id` required only when creating a NEW item). A caller reading the schema is misled.
- **Why it matters:** Schema is supposed to be machine-truth; `required: []` understates the contract. Conditional requirements can't be expressed in a flat `required` array.
- **Proposed change:** Either (a) populate `required` for unconditional fields and document conditional ones in the arg descriptions, or (b) add a `conditional_requirements` note per subcommand (e.g., "kind required when target_id does not already exist; phase_id required when kind=step"). Clarify how "new vs existing" is determined (by whether `target_id` exists). Amend FR-PLAN-0015/0016 + relevant input reqs.
- **Acceptance sketch:** help makes the (conditional) required-ness explicit and machine-discoverable.
- **Effort:** M.

## P7 — MEDIUM — `previous_version` appears at two levels, same name  [NEW] (G13)
- **Gap:** `PlanWriteResult.previous_version` (the backup path written this op) sits beside `PlanWriteResult.plan` (which has only name/status), and `Plan.previous_version` also exists. Same name, reader can't tell if they're the same thing.
- **Why it matters:** Minor but real confusion about what `previous_version` refers to in the write result.
- **Proposed change:** Add a description to `PlanWriteResult.previous_version`: "filesystem path of the backup captured during THIS write (same value stored on the plan's previous_version)." Amend FR-PLAN-0040.
- **Acceptance sketch:** `schemas.PlanWriteResult.properties.previous_version.description` disambiguates it.
- **Effort:** S.

## P8 — MEDIUM — under-described `PlanShowStatusResult` / `PlanTemplateCatalog`  [CONFORMANCE] (G4, G11)
- **Gap:** `PlanShowStatusResult` properties (`phases`, `steps`, `phase_summary`) are `type: object`/`array` with no sub-schema or descriptions; `PlanTemplateCatalog.create/upsert` are arrays with no `items`. Anonymous nested shapes → same FR-HELP-0002 violation as P1.
- **Why it matters:** A caller can't know what `phase_summary` entries or template-catalog entries contain. Conformance with the named-types rule.
- **Proposed change:** Name the nested shapes: `PlanStatusTotals`, `PlanPhaseSummaryEntry`, `PlanTemplateCatalogEntry` (name, brief, placeholders). Wire as `items`/property schemas; add to `schemas` dict. Covered by the recursive-named-types amendment in P1 (FR-HELP-0002).
- **Acceptance sketch:** no anonymous nested object/array-items in `PlanShowStatusResult` or `PlanTemplateCatalog`.
- **Effort:** M.

## P9 — MEDIUM — templates are opaque (no preview of what they generate)  [NEW] (G10)
- **Gap:** `create-with-template`/`upsert-with-template` don't reveal the structure they produce; `list-templates` gives only name/brief/placeholders. A caller invokes blind.
- **Why it matters:** AI can't reason about whether a template fits before using it; no dry-run.
- **Proposed change:** Either add a `produces`/summary to each template entry (what phases/steps it yields), OR a `--dry-run` that renders without writing. Prefer the lighter `produces` summary first. New FR-PLAN-00xx.
- **Effort:** M (produces summary) / L (dry-run).

## P10 — LOW — documentation precision  [NEW] (G12, G15, G16, G17)
- **G16:** status-derivation **precedence** is implied, not explicit. Make `concepts.status_propagation` state the order: failed > blocked > in_progress > open (matches FR-PLAN-0003).
- **G17:** `progress_pct` denominator ("total") undefined. State "total = all steps in scope (including blocked/failed)."
- **G15:** `next` arg ordering — clarify `--target` may be passed with or without `limit` (and verify the CLI parses `next <file> --target <id>` without a limit positional).
- **G12:** backup `bakNNN` naming format undefined — state NNN = zero-padded incrementing index (already in FR-PLAN-0024; surface a one-line note).
- **Effort:** S (wording only). Verify G15 against actual CLI arg parsing.

---

## Cross-cutting recommendation
- **Tighten FR-HELP-0002 to recursive named types** (covers P1 + P8): "Every non-primitive shape exposed in `schemas` — including array `items` and nested object properties — SHALL be a named exported type with described fields; no anonymous shape at any depth." Add a test that walks the serialized `schemas` and fails on any object/array-items lacking a named-type reference + description. This single rule closes G1, G4, G11 and prevents regressions.
- **Re-run the naive-AI comprehension test as an acceptance gate** after any help change: a fresh agent, given only `help plan` output, must explain every subcommand + the next/recovery loop with zero ambiguities. Treat new "GAPS" it finds as defects.

## Suggested sequencing for the follow-up requirements pass
1. P1 + P8 + cross-cutting recursive-named-types (one coherent FR-HELP-0002 tightening — highest leverage, closes 3 gaps).
2. P2 + P3 + P4 (the loop/termination/usage-pattern cluster — the operational core).
3. P5, P6, P7 (contract clarity).
4. P9, P10 (ergonomics + polish).

## Out of scope / explicitly NOT proposed
- No reintroduction of per-step flags (resume/previously_*) — `status` is the single source.
- No FR-IDs or internal refs in any emitted output (FR-ARCH-0016 stands).
- No optionality hedges in directive notes (recommendations stay directive).
