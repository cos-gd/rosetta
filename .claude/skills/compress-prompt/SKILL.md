---
name: compress-prompt
description: Compress a Rosetta KB prompt artifact (skill · workflow · phase · rule · agent · template · generic) by stripping structural tautology and ineffective scaffolding while preserving every importance-bearing token. Use when the user asks to compress, shorten, tighten, densify, or reduce a prompt / skill / workflow / phase / rule file.
disable-model-invocation: true
---

# Compress a KB Prompt

## Mental model
- The artifact you compress is loaded into a coding agent that runs in ANOTHER repo, on ANOTHER user's task. Every token becomes that agent's context → scaffolding = distraction that dilutes focus.
- Compress ≠ shrink words. Compress = strip scaffolding, keep 100% signal, sharpen focus, replace with meaningful unicode characters, like arrows.
- Reader is AI like you, capable: it already knows the domain AND the KB grammar. Use terms and acronyms. Don't explain — nudge.
- CAPS = importance. Word count is an OUTCOME, never a target.
- GOLDEN RULE: NEVER trade a high-value token for a few saved words.
- BULLETS vs ORDERED: convert bullets to ordered lists, if work is sequential or can be sequential. Reason: aligns with AI sequential token generation.
- DENSIFY each rule.

## Allowed reads — read-only, NEVER adjust
Read ONLY: the target artifact + its type schema + the grammar below. Nothing else. Stay focused.

Schemas (learn which XML scopes are MANDATORY vs optional, and each scope's role):
- `docs/schemas/skill.md`
- `docs/schemas/workflow.md`
- `docs/schemas/phase.md`
- `docs/schemas/rule.md`
- `docs/schemas/agent.md`
- `docs/schemas/template.md`
- `docs/schemas/generic.md`

Grammar — directive commands the system ACTS ON; protect verbatim + their args:

| Command | Semantics |
|---|---|
| `USE SKILL <name>` / `READ SKILL <name>` | activate skill (load `SKILL.md` + act) / load content only |
| `READ SKILL FILE <subpath>` / `APPLY SKILL FILE <subpath>` | load / load+execute a file of the CURRENT skill; never names a skill (isolation is grammar-enforced) |
| `USE FLOW <name>.md` / `READ FLOW <name>.md` | invoke a whole workflow / load without executing |
| `APPLY PHASE <file>.md` | load + fully execute the next phase body of a running workflow |
| `INVOKE SUBAGENT <name>` / `READ SUBAGENT <name>` | spawn subagent / load its definition only |
| `READ RULE <file>.md` / `APPLY RULE <file>.md` | load / load+execute a rule |
| `READ TEMPLATE <file>.md` | load a template |
| `READ CONFIGURE <tool>.md` | load an IDE/agent configure spec |
| `LIST <path>` | enumerate immediate children of a KB folder |
| `ACQUIRE <path> FROM KB` | MCP-only, generated shells: `query_instructions(tags="<path>")` |

## KEEP verbatim (never shrink / drop)
- XML scope tags `<…>` + nesting — structure is signal; schema defines required scopes.
- Grammar commands above + their args: file / skill / tool / model names, paths, section anchors.
- CAPS importance markers: MUST · NEVER · DO NOT · HALT · WAIT · SELF-CHECK · HITL …
- Per-scope / per-step instructions, kept IN their scope (e.g. update-state, gate notes).
- Semantic distinctions: required vs recommended, blocking vs optional, default vs conditional.

## CUT — where real reduction lives
- Tautology → rule stated >1× across scopes; keep ONE authoritative copy, kill the echoes.
- Meta-commentary explaining the prompt's own notation / convention to a reader.
- Stale / orphaned items → reference a scheme, attribute, or value no longer present.
- Duplicate scopes (e.g. a references index that re-lists inline content).
- Repeated literals → define once as a short alias (e.g. `OUT/ = <long/path>`), reuse everywhere.
- Cut the fluff

## COMPRESS → nudge
- HARD CAP: every rule / bullet line < 10 words.
- Line needs more? Rephrase; merge same-topic rules.
- NO new lines as escape hatch.
- Whole file: MAY add ≤ 10 lines total.
- NEVER drop signal to hit the cap.
- Verbose prose / step-narration the agent already infers → terse cue.
  e.g. "ONE PHASE AT A TIME: read file, execute, update state, advance" → "ONE PHASE AT A TIME. READ JIT."
- Favor unicode connectives for density: → · ⇒ ≠ ± …  (English words only otherwise).
- DENSE, TERMS, ACRONYMS, TERSE-phrases (not sentences!)

## NEVER
- Shave adjectives while leaving duplication intact (tiny gain, no structural fix).
- Drop CAPS / grammar commands / per-step instructions / distinctions to hit a number.
- Remove a schema-mandatory scope, or edit any schema / `ARCHITECTURE.md` file.
- Re-inject your own explanations while compressing.

## Process (HITL)
1. Read target + its type schema + the grammar above. Nothing else.
2. Inventory: per-scope purpose + list of duplications, stale items, repeated literals.
3. Draft the compressed artifact as file next to current one. Do not overwrite yet.
4. HITL: present to the user → word Δ (before→after, %) + where the cuts came from + your reasoned take on the subagent findings.
5. VERIFY via subagent — `INVOKE SUBAGENT` (Sonnet-5 class, low reasoning (!), e.g. `claude-sonnet-5`) with a fresh read of OLD vs NEW, asking only:
   - Does anything change in an executing agent's understanding or behavior?
   - Is anything now ambiguous, underspecified, or lost?
   - Any rule / gate / distinction present in OLD but missing or weaker in NEW?
6. Do NOT auto-apply the subagent's output. CRITICALLY evaluate its findings — decide which are real vs noise, and why; adjust the draft only where a finding is genuine.
7. HITL: present to the user → proposed artifact + word Δ (before→after, %) + where the cuts came from + your reasoned take on the subagent findings.
8. On explicit user approval → write the TARGET file only.
