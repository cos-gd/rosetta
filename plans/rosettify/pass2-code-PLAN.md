# rosettify — pass-2 code implementation PLAN (HOW)

Specs (WHAT) = docs/REQUIREMENTS/rosettify/ Approved pass-2 units: FR-HELP-0002, FR-PLAN-0010/0011/0013/0016/0032/0035/0036/0040/0041/0042.
Size: LARGE (one module, heavy type coupling). Build = `npm run typecheck` + `npm run test` (vitest, 90% line+branch). FR-ID `//` comments stay in code; never in emitted strings.

## Already-conformant (verify only, no change)
- `progress_pct` denominator = `statuses.length` (all in scope incl. blocked/failed) — show-status.ts computeTotals. Matches FR-PLAN-0013. KEEP.
- `computeStatusFromChildren` precedence (all-complete→complete; failed>blocked>in_progress>open) — core.ts. Matches FR-PLAN-0003/0016. KEEP.

## Type model (core.ts + output.ts) — target named set (SRP+DRY)
Rename/extract so every nested shape is a named exported type (FR-HELP-0002 recursive):
- `NextStep` → **`PlanNextStep`** (rename; same fields).
- `PlanNextParent` → **`PlanPhaseContext`** (rename; same fields).
- `StatusTotals` → **`PlanStatusTotals`** (rename).
- New **`PlanStepSummary`** = {id,name,status}. Extract the inline `{id,name,status}` used in PhaseSummaryEntry.steps, ShowStatusPhaseResult.steps, and PlanWriteResult.phases[].steps.
- `PhaseSummaryEntry` → **`PlanPhaseSummary`** = {id,name,status,steps:PlanStepSummary[]}.
- `ShowStatusPhaseResult` → **DELETE**; its shape == PlanPhaseSummary → reuse PlanPhaseSummary for the phase-target result (DRY).
- `ShowStatusStepResult` → **`PlanStepDetail`** = {id,name,status,depends_on,subagent?,role?,model?}.
- `ShowStatusPlanResult` (keep name) = {name,status,phases:PlanStatusTotals,steps:PlanStatusTotals,phase_summary:PlanPhaseSummary[]}.
- `PlanShowStatusResult` = `ShowStatusPlanResult | PlanPhaseSummary | PlanStepDetail`.
- New **`PlanSummary`** = {name,status} (PlanWriteResult.plan).
- **`PlanWriteResult`** (output.ts) = {plan:PlanSummary, phases:PlanPhaseSummary[]} — **remove `previous_version`**. Reuse PlanPhaseSummary/PlanStepSummary (import from core.ts).
- `PlanNextResult` (core.ts): `parent?: PlanPhaseContext`, `next: PlanNextStep[]`, unchanged otherwise.

## File-by-file HOW
1. **core.ts** — apply renames above; add PlanStepSummary, PlanStepDetail, PlanSummary; make PlanPhaseSummary.steps: PlanStepSummary[]; delete ShowStatusPhaseResult (alias phase result to PlanPhaseSummary); update PlanShowStatusResult union; update all internal references. Keep `//` FR-ID comments.
2. **output.ts** — PlanWriteResult = {plan:PlanSummary, phases:PlanPhaseSummary[]} (import those types); `buildPlanWriteResult(plan)` drops the `previousVersion` param and the field. Update callers.
3. **create.ts** — `buildPlanWriteResult(plan)` (drop the `null`/param). createOutputSchema → use shared planWriteResultSchema (remove inline previous_version).
4. **upsert.ts** — first-create + mutate paths: `buildPlanWriteResult(mutated)`; DELETE the post-write `previous_version` patch (lines ~192-196 → just `ok(tree)`); the atomic write still sets plan.previous_version on disk (plan-io.ts unchanged — recovery chain stays). upsertOutputSchema → shared.
5. **create-with-template.ts / upsert-with-template.ts** — outputSchema → shared planWriteResultSchema; no logic change (delegate).
6. **next.ts** — `parent` typed PlanPhaseContext; rewrite `nextOutputSchema` to recursive form: parent={$ref:"PlanPhaseContext"}, next={type:array, items:{$ref:"PlanNextStep"}}; counts primitives. No runtime behavior change.
7. **show-status.ts** — types renamed; phase-target returns PlanPhaseSummary; step-target PlanStepDetail; rewrite showStatusOutputSchema as oneOf [{$ref:"ShowStatusPlanResult"},{$ref:"PlanPhaseSummary"},{$ref:"PlanStepDetail"}]. computeTotals unchanged.
8. **templates/index.ts** — TemplateCatalogEntry add `produces: string`; buildTemplateCatalog maps `produces: t.produces`. Add **`PlanTemplateCatalogEntry`** as the exported entry type name (rename TemplateCatalogEntry or alias).
9. **templates/create/for-orchestrator.ts** — add `produces: "A new plan with one preparation phase (ph-prep) of 10 Rosetta orchestrator bootstrap steps."`.
10. **templates/upsert/for-subagent.ts** — add `produces: "One phase seeded with 6 Rosetta subagent load-context bootstrap steps, step ids prefixed by the phase id."`.
11. **list-templates.ts** — ListTemplatesResult entries add produces; rename to use PlanTemplateCatalogEntry; output schema items={$ref:"PlanTemplateCatalogEntry"}.
12. **schemas.ts** —
    - `planWriteResultSchema`: remove `previous_version`; plan={$ref:"PlanSummary"}, phases items={$ref:"PlanPhaseSummary"}.
    - Add schema objects (named, recursive $ref convention) for: PlanSummary, PlanNextStep, PlanPhaseContext, PlanStatusTotals, PlanPhaseSummary (steps items $ref PlanStepSummary), PlanStepSummary, PlanStepDetail, PlanTemplateCatalogEntry, ShowStatusPlanResult.
    - planSchemasDict: add all the above keys (keep existing). Result keys unchanged (PlanNextResult, PlanShowStatusResult, PlanQueryResult, PlanWriteResult, PlanTemplateCatalog, PlanUpdateStatusResult + inputs).
    - **$ref convention**: nested named shape expressed as `{ $ref: "<DictKey>" }` (string key into planSchemasDict). Array of named shape = `{ type:"array", items:{ $ref:"<DictKey>" } }`. Primitives inline. oneOf may hold $refs. No inline object/array-of-object anywhere in a composite schema.
13. **help-content.ts** —
    - `concepts.status_propagation`: state precedence (all-complete→complete; else failed>blocked>in_progress>open).
    - each `subcommands[]` entry: add a `required` statement field — list unconditionally-required inputs; for upsert add a `conditional_requirements` note ("kind required only when target id is new; phase_id required only when kind=step"). Keep examples.
    - `next_steps_for_ai`: rewrite to the three outcomes (count>0 work; count=0 & complete done [parent.status under --target else plan_status]; count=0 & blocked/failed remain → stop, re-review/re-verify, reset status via show_status→query→update_status).
    - `notes` (planNotes): replace the construction-flow + phase-scoped + what-next + getting-blocked notes with: end-to-end 5-step usage; phase-scoped next (`--target` with or without limit); what next returns; three outcomes; recover-by-reset. Keep silent-drop, write-cycle/backup, template notes. NO FR-IDs/internal refs in any note string.
    - `templates` getter unchanged (produces flows through automatically).

## Recursive-naming walk (the conformance gate)
Add helper + test: walk every value in planSchemasDict; for each composite schema, every `properties.<k>` that is object-typed and every `items` MUST be `{ $ref: <key present in dict> }`; fail on any inline object or array-of-object. oneOf entries must each be `{ $ref }`. This enforces FR-HELP-0002 + FR-PLAN-0041.

## Tests to update (Phase 9, lockstep)
- output.test.ts: keys `["plan","phases"]` (drop previous_version); remove previous_version pass-through assertions.
- create.test.ts / create-with-template.test.ts: drop `previous_version===null` assertions on result (plan FILE still has it — assert on file if desired).
- upsert.test.ts / upsert-with-template.test.ts: result has no previous_version; assert the plan FILE's previous_version advances (read file), not the result.
- next.test.ts: `.next` field name unchanged → mostly green; add PlanNextStep field-shape assertion + parent-is-PlanPhaseContext; add CLI `next <file> --target <id>` no-limit case (already parses; assert).
- show-status.test.ts: progress_pct unchanged; add total-includes-blocked/failed case (4 steps→25%); phase-target shape == PlanPhaseSummary; step-target == PlanStepDetail.
- list-templates.test.ts: each entry has non-empty `produces`.
- help-content.test.ts: update expected schemas-dict keys (add 9 new type names); update notes discriminators to the new note set; add status_propagation-precedence assertion; add next_steps_for_ai three-outcomes assertion; add upsert conditional-required assertion; ADD the recursive-naming walk test (no anonymous nested shape; every $ref resolves to a dict key); keep no-leak regex.
- e2e (cli/mcp): `.next` unchanged; if any assert previous_version on write result → drop.

## Validation (Phase 7, per user) — after impl, before HITL
- Rebuild; save `help plan` AFTER → agents/TEMP/rosettify/help-plan.after.json; diff vs before.json (expect: no previous_version in write schemas; new type keys present; recursive items/$refs; produces in templates; notes rewritten; next_steps 3 outcomes; status precedence; NO FR-ID leak).
- Naive comprehension subagent: read ONLY help-plan.after.json (no codebase), explain every subcommand + the next/recovery loop + each schema; report any ambiguity/gap.
- Command-exercising agent: run EVERY plan subcommand (create, create-with-template, next [±target, ±limit], upsert, upsert-with-template, update_status, show_status [plan/phase/step], query, list-templates) against a temp plan; verify shapes match help schemas; verify no previous_version in write results but present in plan file; report.
- Aggregate the three into the Phase-8 HITL package.

## Review fixes (folded in — reviewer PASS-WITH-FIXES)
- **[HIGH F1]** Step 12 also updates the EXISTING shared shapes for recursion: `planSchema.phases` → `{type:"array", items:{$ref:"Phase"}}`; `phaseSchema.steps` → `{type:"array", items:{$ref:"Step"}}`. The walk test MUST treat a `{type:"array"}` with no `items` (or `items` that is not a `$ref`) as a violation.
- **[HIGH F2]** The `ShowStatusPlanResult` schema entry MUST use `phases:{$ref:"PlanStatusTotals"}`, `steps:{$ref:"PlanStatusTotals"}`, `phase_summary:{type:"array",items:{$ref:"PlanPhaseSummary"}}` — no inline objects.
- **[MED F3]** Tests: add `show-status.test.ts` to the breakage list — remove/replace any `ShowStatusPhaseResult` type references (now `PlanPhaseSummary`); add a `PlanStepDetail` assertion for the step-target result.
- **[MED F4]** Walk test is DEEP: when it meets `{$ref:Key}` it recurses into `planSchemasDict[Key]` and validates that entry too; maintain a visited-set to stop at cycles. Every `$ref` MUST resolve to a present dict key. Shallow checking is insufficient.
- **[MED F5]** Tests: explicitly audit `tests/e2e/cli.e2e.test.ts` and `tests/e2e/mcp.e2e.test.ts` for any `previous_version` assertion on a WRITE result and drop those (the `.next` field name is unchanged so next-related e2e stays).
- **[LOW F6]** Step 13: update the `create` subcommand `description` string — remove "previous_version=null" wording (now "Returns PlanWriteResult: plan + phases summary").
- **[LOW F7]** Step 11: update `listTemplatesOutputSchema` description to mention `produces`.
- **[NIT F8]** `plan_authoring_guidance` stays unchanged; confirm its existing test assertion still passes after the notes rewrite.

## Risks
- Type renames ripple widely — typecheck after core.ts first.
- Breaking output contract (previous_version drop) → MAJOR or MINOR per FR-PKG-0005; version bump handled at finalize (ask user).
- $ref convention is new to this codebase — keep it minimal and covered by the walk test; ensure help still serializes (no cyclic JSON — $ref is a string, safe).
- Do NOT touch plan-io.ts / FR-PLAN-0024 (plan.previous_version on disk stays).
