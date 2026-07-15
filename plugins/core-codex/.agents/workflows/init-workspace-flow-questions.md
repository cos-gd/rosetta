---
name: init-workspace-flow-questions
description: "Phase 8 Questions of init-workspace-flow"
tags: ["init", "workspace", "questions", "hitl", "phase"]
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_questions>

<description_and_purpose>

Problem: Automated analysis leaves gaps — ambiguous domain logic, unstated conventions, missing rationale.
Validation: Every accumulated gap has a resolution; each answer traces to at least one file update.

</description_and_purpose>

<workflow_context>

- Phase 8 of 9 in init-workspace-flow
- Input: all docs from Phases 1–7, accumulated gaps from state
- Output: answers integrated into docs, affected files updated via subagents

</workflow_context>

<phase_steps>

1. Read state and accumulated gaps
2. Review all created docs for gaps and contradictions
3. Ask user reflective questions
4. Map answers to affected files
5. Update affected files
6. Ask critical/high/major impact questions
7. Prioritize by impact: scope > security/privacy > UX > technical
8. Ask few independent questions at a time
9. Adjust and interview user relentlessly about every aspect of his task until you reach a full shared understanding
10. User is allowed to skip and leave items unresolved
11. Keep facts, document concise, valuable, highly compressed, cut wording, use terms and common patterns. 
12. Update state — clear resolved gaps, note unresolved

</phase_steps>

<pitfalls>

- Do not re-ask questions answered as in-phase blockers — check state
- Unanswered questions: log as deferred gap, do not guess

</pitfalls>

</init_workspace_flow_questions>
