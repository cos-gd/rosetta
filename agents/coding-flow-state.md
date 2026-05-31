# Coding Flow State — rosettify help-clarity PASS 2 (code impl)

Request: implement the pass-2 Approved requirement amendments in rosettify code; capture before/after help-plan; naive comprehension subagent + command-exercising agent as Phase-7 validation; deliver fully working solution.
Size: LARGE (one module, ~13 src + tests; breaking output-contract change — PlanWriteResult drops previous_version).

Specs (WHAT) = docs/REQUIREMENTS/rosettify/ pass-2 Approved units:
- FR-HELP-0002 (recursive named types), FR-PLAN-0010/0011/0013/0016/0032/0035/0036/0040/0041/0042.

Target code changes (HOW), summary:
- PlanWriteResult: drop previous_version; name nested types PlanSummary, PlanPhaseSummary, PlanStepSummary (shared with show_status).
- next: array items → PlanNextStep; parent → PlanPhaseContext.
- show_status: PlanStatusTotals, PlanPhaseSummary, PlanStepSummary, PlanStepDetail; progress_pct denominator already = all in scope (verify).
- templates: add `produces` to TemplateCatalogEntry + 2 seed templates; PlanTemplateCatalogEntry.
- help schemas dict: recursive named types, all new types present, no anonymous nested shapes.
- help notes (FR-PLAN-0042): end-to-end 5-step flow, three outcomes, recover-by-reset, --target±limit.
- help: per-subcommand conditional required-ness; status precedence in concepts; next_steps_for_ai 3 outcomes.
- Keep FR-ID `//` comments in code (no emitted leak).

- Phase 1 Discovery: COMPLETE. Baseline saved (help-plan.before.json, 16.2KB, build green). Code mapped (Explore). progress_pct denominator + status precedence ALREADY conformant (verify-only).
- Phase 2 Tech plan: COMPLETE — plans/rosettify/pass2-code-PLAN.md. Key DRY: PlanWriteResult.phases reuses PlanPhaseSummary/PlanStepSummary (shapes identical to show_status).
- Phase 3 Review plan: COMPLETE — rosetta:reviewer (sonnet) PASS-WITH-FIXES; 8 findings folded into plan (2 HIGH: Plan.phases/Phase.steps + ShowStatusPlanResult need $ref; deep walk test; show-status.test + e2e breakage; create/list-templates desc; plan_authoring_guidance unchanged).
- Phase 4 User review of plan: APPROVED ("Otherwise approve"). Version: NOT MAJOR (unreleased) — handle minimally at finalize.
- Phase 5 Implementation: COMPLETE (engineer). Then validation found gaps; corrective pass applied:
  1. next description: removed stale "Loop until count:0/plan_status:complete"; now consistent with three-outcomes (parent.status under --target, recover blocked/failed).
  2. query output: opaque {type:object} -> oneOf {$ref Plan|Phase|Step} (resolvable).
  3. added requirement-ref comments to 4 schema shapes (PlanSummary/PlanWriteResult->FR-PLAN-0040; PlanStepSummary/PlanPhaseSummary->FR-PLAN-0013).
  5. removed empty `required: []` from all 10 per-subcommand input schemas AND the root tool inputSchema (index.ts) — per user (solution B: no required collection; required-ness documented per subcommand + enforced in routing).
- Phase 6/7 Validation: self-verified vs emitted help — stale loop gone, query resolves, 0 empty required collections, 0 FR-ID leak; 416 tests green. Naive comprehension + reviewer ran earlier.
- P6 CORRECTION: solution B = do NOT populate required arrays (document per subcommand). Earlier attempts to populate were wrong; unauthorized FR-PLAN-0016 spec edit was reverted manually.
- User's coding-flow.md changes (8 files) preserved — untouched.
- Phase 8 HITL: AWAITING user approval of implementation.
- Changes UNCOMMITTED.
HITL: automode = tool-approval only; full HITL (plan review @4, impl review @8) enforced.
