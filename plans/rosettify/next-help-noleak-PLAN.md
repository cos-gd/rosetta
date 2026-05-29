# rosettify — next/help/no-leak Implementation Plan

Feature: apply approved requirement amendments (CTORNDGAIN-1333, 2026-05-29) to rosettify code.
Source of truth (WHAT): `docs/REQUIREMENTS/rosettify/` — FR-ARCH-0016, FR-HELP-0002, FR-PLAN-0010/0011/0012/0013/0014/0015/0016/0040/0041/0042.
Size: LARGE (~13 source files + tests, one module). Build = `npm run typecheck` + `npm run test` (vitest, 90% line+branch).

## Discovery Summary
- FR-ID leaks live only in `description:`/`brief:` STRING VALUES (26 found), all under `src/commands/plan/`. `//` comments may keep FR-IDs (code, not emitted).
- `planSubcommandSchemas` (validation, keyed by subcommand) is separate from `planSchemasDict` (help display). Only the display dict changes to type-name keys.
- `next` output `{ready,count,plan_status}` + per-step flags `resume/previously_blocked/previously_failed`; types in `core.ts`.
- Default limit 10 in `next.ts:42`, `next.ts:23` (schema), `help-content.ts:92`.
- No commands outside `plan` emit FR-IDs (verified by grep); no-leak still verified by a global scan test.

## Target State (specs, by requirement)
1. FR-PLAN-0011 `next` → result type `PlanNextResult`:
   `{ parent?, next[], count, plan_status, OverallOpenCount, OverallInProgressCount, OverallBlockedCount, OverallFailedCount, OverallCompleteCount }`.
   - `next[]` = in_progress → open-ready → blocked → failed, then `.slice(0, limit)`. Each step carries `status`; NO `resume/previously_*` flags.
   - `parent` present ONLY when `target_id` given = targeted phase scalar fields (id,name,description,status,depends_on,subagent?,role?,model?), NO `steps`.
   - `Overall*Count` = per-status counts; scoped to target phase when `target_id` given, else whole plan.
   - default `limit = 3` (overridable); negative → `invalid_limit`.
   - array field renamed `ready` → `next`.
2. FR-PLAN-0040 → `PlanWriteResult` (rename `CompressedPlanTree`/`buildCompressedTree`); single shared write-result type.
3. FR-PLAN-0012/0013/0014 → named result types `PlanUpdateStatusResult` / `PlanShowStatusResult` / `PlanQueryResult` (already exist as interfaces in core.ts for update_status; add/rename as needed).
4. FR-HELP-0002 + FR-PLAN-0041 → help `schemas` dict (`planSchemasDict`) keyed by EXPORTED TYPE NAME; one entry per distinct type; SRP+DRY (one `PlanWriteResult` shared by all 4 write subcommands; `show_status`+`query` inputs share `PlanTargetInput`). No FR-IDs in any schema `description`.
5. FR-ARCH-0016 → remove all 26 FR-ID strings from emitted `description`/`brief`/notes; replace "compressed-tree (FR-PLAN-0040)" wording with "PlanWriteResult".
6. FR-PLAN-0042 → help `notes` add: plan-construction-flow, phase-scoped execution (`next --target`), what-next-returns, getting-blocked/failed-via-show_status→query→update_status. Remove `resume` concept from `concepts`.

## Schema-key naming (planSchemasDict target keys)
Inputs: `PlanCreateInput`, `PlanNextInput`, `PlanUpdateStatusInput`, `PlanTargetInput` (shared: show_status+query), `PlanUpsertInput`, `PlanCreateWithTemplateInput`, `PlanUpsertWithTemplateInput`, `PlanListTemplatesInput`.
Results: `PlanWriteResult` (create/upsert/create-with-template/upsert-with-template), `PlanNextResult`, `PlanUpdateStatusResult`, `PlanShowStatusResult`, `PlanQueryResult`, `PlanTemplateCatalog`.
Shared data shapes: `Plan`, `Phase`, `Step`.
(`planSubcommandSchemas` validation map is UNCHANGED — keyed by subcommand for input validation.)

## File-by-file HOW
- `core.ts`: `NextStep` drop `resume/previously_blocked/previously_failed`; rename `NextResult`→`PlanNextResult` with new fields (`next` not `ready`, `parent?`, 5 counts); add `PlanNextParent` type; rename `CompressedPlanTree`→`PlanWriteResult` (and its alias usages). Name `PlanShowStatusResult`, `PlanQueryResult` if not present (update_status already has `UpdateStatusResult`→rename `PlanUpdateStatusResult`).
- `output.ts`: rename `buildCompressedTree`→`buildPlanWriteResult`, `CompressedPlanTree`→`PlanWriteResult`; comment may keep FR-ID.
- `next.ts`: rewrite `cmdNext`: keep 4-group ordering+slice; remove flags from `buildNextStep` (step carries `status`); add `parent` when targetId; compute 5 scoped `Overall*Count`; `limit=3`; return `{parent?, next, count, plan_status, ...counts}`. Rewrite `nextOutputSchema` (named, no FR-ID, new shape); input schema `limit` description default 3.
- `create.ts`, `upsert.ts`, `create-with-template.ts`, `upsert-with-template.ts`: use `buildPlanWriteResult`; output schema description → no FR-ID; share single `PlanWriteResult` schema object (import from one place, e.g. output.ts/schemas.ts).
- `update-status.ts`, `show-status.ts`, `query.ts`, `list-templates.ts`: output schema `description` → no FR-ID; align result type names. `update-status.ts`: also update import `UpdateStatusResult`→`PlanUpdateStatusResult`. `show-status.ts`+`query.ts`: import shared `PlanTargetInput` (defined in `schemas.ts`).
- `index.ts`: input field `description` strings (lines 193,197,201,205,209,213) → remove ONLY the `FR-... — ` prefix, KEEP the human text after ` — `.
- `schemas.ts`: rebuild `planSchemasDict` with type-name keys per above; dedupe (one `PlanWriteResult` schema object imported from `output.ts`/defined once; shared `PlanTargetInput` defined here and imported by show-status/query); clean FR-IDs from the 4 shared-shape descriptions (compressedTree/plan/phase/step at lines 30,67,81,97); keep `planSubcommandSchemas` (validation) as-is. Update its doc comment (drop FR-IDs).
- `help-content.ts`: clean emitted `description`/`brief` strings (remove FR-IDs, "compressed-tree"→"PlanWriteResult"); `next` subcommand description rewrite (ordering+truncation+counts, no flags); `next` args `limit` default 3; remove `concepts.resume`; append the 4 new notes (FR-PLAN-0042 verbatim text); `next_steps_for_ai` "ready steps"→"steps". (`//` comments may keep FR-IDs.)

## Baseline capture + diff (per user hint)
- BEFORE any code change: build local (`npm run build`) and save `node dist/bin/rosettify.js help plan` (or CLI entry) JSON to `agents/TEMP/rosettify/help-plan.before.json`.
- AFTER changes: save same to `agents/TEMP/rosettify/help-plan.after.json`; diff the two. Expected diffs ONLY: FR-IDs gone from all descriptions/notes; schema keys = type names; `next` description/limit updated; new notes present; `concepts.resume` gone; "compressed-tree"→"PlanWriteResult". No unexpected regressions (subcommands, examples, templates, limits intact).

## Phasing (sequential; one engineer to avoid coupling conflicts)
P5a. core.ts + output.ts (types) → P5b. next.ts → P5c. write subcommands + read subcommands schemas → P5d. schemas.ts dict → P5e. help-content.ts + index.ts. typecheck after.
P6. reviewer subagent vs specs. P7. validator: typecheck + `npm run test` + help-plan before/after diff + grep emitted output for FR-IDs (all commands).
P9. update/extend vitest tests (ALL files asserting old shape):
  - `tests/unit/plan/next.test.ts`: rename `ready`→`next`; remove flag assertions; default 3; ADD cases — parent present iff target_id, parent has no `steps`, all 5 Overall*Count correct scoped vs whole-plan, blocked/failed truncated by limit but counts still report them, zero-actionable (all blocked) returns next=[blocked...] + counts.
  - `tests/unit/plan/output.test.ts`: import + calls `buildCompressedTree`→`buildPlanWriteResult`.
  - `tests/unit/plan/help-content.test.ts`: schemas-dict loop must key by TYPE NAMES (not subcommand names); add no-leak assertion (no `FR-`/`NFR-` in serialized help); assert new notes present, `concepts.resume` absent.
  - `tests/e2e/cli.e2e.test.ts` + `tests/e2e/mcp.e2e.test.ts`: `.ready`→`.next`.
P11. full `npm run typecheck` + `npm run test` green (90% line+branch); help-plan after-diff reviewed.

## Risks
- Tests assert old shape (`ready`, flags, default 10, old keys) — must update in lockstep.
- `PlanWriteResult` schema must be defined once and imported (DRY) — avoid 4 copies.
- Don't change `planSubcommandSchemas` validation behavior.
