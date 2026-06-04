# plugin-generator — Requirements Index

Reverse-engineered requirements for the Rosetta plugin generator: the build step that transforms an instruction source tree (`instructions/<release>/<domain>/`) into IDE plugin distributions. Source of truth for a clean re-implementation (target runtime: TypeScript, run via `npx`).

Grep a header below for a one-line description and the file it lives in.

## Files

### SCOPE.md — In/out of scope, actors, entry points, goals, non-goals, global constraints.
### GLOSSARY.md — Domain terms: release, domain, plugin variant, target, bootstrap hook, template, standalone.
### MODEL.md — Configuration contract: release, plugin-target, and per-target transform descriptors (`DATA-*`).
### FR-ARCH.md — Target architecture for the rewrite: uniform spec contract, immutable flat VFS, filename directives, pure processor pipeline (`FR-ARCH-*`).
### FR-CLI.md — Invocation, release selection, source (domain) resolution + bundling, run modes (dry-run/verbose), orchestration, exit status (`FR-CLI-*`).
### FR-COPY.md — Source-tree reset, copy, model normalization, file/folder renames, content reference rewriting (`FR-COPY-*`).
### FR-GEN.md — Folder index generation and template rendering (`FR-GEN-*`).
### FR-HOOK.md — Per-target bootstrap-context payload assembly and hook-bundle synchronization (`FR-HOOK-*`).
### FR-VAR.md — Per-target structure, reasoning, and bootstrap-delivery strategy (hooks vs native rules vs auto-loaded instructions), incl. two-hook-set rationale; per-variant output properties (`FR-VAR-*`).
### NFR.md — Non-functional requirements: parity, determinism, idempotency, portability, limits (`NFR-*`).
### REFERENCES.md — Authoritative per-IDE configuration guides to consult under `instructions/r3/core/configure/` for plugin/subagent/skill/command/rule/hook structure and links (`INT-IDE-*`).
### STRUCTURES.md — Generalized example folder structure per target (preserved vs generated, with provenance), grounded in a v3 build (`FR-STRUCT-*`).
### ASSUMPTIONS.md — Assumptions, flagged implementation accidents/quirks, open questions.

## Status

All requirement units are `Draft` and `<implementation>NotStarted</implementation>`. The requirements are **reverse-engineered from the Python generator (`scripts/plugin_generator.py`) but target a clean TypeScript/npx re-implementation** — nothing is implemented in the target yet, so every unit is NotStarted and source grounding lives only in `docs/plugin-generator/analysis.md`, not in the requirements.
- **Behavior carried over from the Python generator** — FR-CLI (core), FR-COPY, FR-GEN, FR-HOOK, FR-VAR, FR-STRUCT, MODEL, most NFR.
- **New / target-state design** — FR-ARCH (whole), FR-CLI-0030/0031 (`--domain` + bundling), FR-CLI-0040 (uniform generation), FR-CLI-0050/0051 (dry-run/verbose), FR-VAR-0070/0071/0072 (bootstrap delivery), NFR-0007/0008/0010 (modularity, TS/npx, libraries), INT-IDE (guide references).
