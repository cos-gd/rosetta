# plugin-generator — Assumptions, Quirks, Open Questions

## Assumptions (AC)

- **AC-1 — Uniform generation is the intent; two-pass derivation is an accident.** The current code generates the four "main" targets first, then derives the two standalone targets by reading from the already-generated main plugin trees (`scripts/plugin_generator.py:901` reads `plugins_root / spec.source_plugin`; `:1152` second loop). Per the maintainer, this coupling caused repeated defects and is *not* a requirement. Target state: all six targets are generated independently from the instruction source. Requirements capture per-variant **output properties**, never the derive-from-main mechanism.
- **AC-2 — Parity bar is functional/semantic.** A re-implementation must produce functionally equivalent, IDE-correct output; byte-for-byte identity is not required (whitespace/key-order differences acceptable) provided generated JSON/TOML remain valid and content meaning is preserved.
- **AC-3 — Hook bundles are an external input.** `hooks/dist/bundles/<target>` and `hooks/dist/shell/` are produced by a separate build step. The generator assumes they exist when a release requires deterministic hooks.
- **AC-4 — Instruction source layout is stable.** Source content lives under typed folders (`agents/`, `rules/`, `skills/`, `workflows/`, `configure/`, `templates/`). Agent files are `agents/<name>.md` exactly one level deep (`scripts/plugin_generator.py:840`).
- **AC-5 — Run via npx.** The re-implementation targets a TypeScript/Node runtime invoked through `npx`, replacing the Python entry point; the Handlebars dialect and filesystem operations have direct Node equivalents.
- **AC-6 — Logical model keys are release-neutral.** Frontmatter `model:` values are logical keys (`opus`, `sonnet`, `gpt-5.4`, …); the per-IDE version strings they map to are config expected to change.

## Flagged Quirks / Findings (QF) — current behavior, not necessarily intended

- **QF-1 — Order-sensitive bootstrap prefix.** The bootstrap prefix attaches to the *first bootstrap-classified file found* per target; reordering the bootstrap file list silently moves the prefix (`scripts/plugin_generator.py:501-507`, `:599`). Intended outcome: the prefix leads exactly one designated bootstrap document per target. A re-implementation should make the prefixed document explicit rather than position-dependent.
- **QF-2 — Oversize payloads are a soft error (CONFIRMED INTENDED).** A bootstrap context entry exceeding 10000 characters is reported, still emitted, and sets a non-zero exit status. This soft-error behavior is intended (not a defect): the run completes so all problems surface together, and the non-zero exit signals the violation. Codified in NFR-0004.
- **QF-3 — Copilot duplicate-hook lock is a workaround.** Copilot fires session hooks twice, so per-entry file locks are generated to dedupe (`scripts/plugin_generator.py:469-498`, `:614-638`). This is a workaround for an IDE defect; the underlying need is "each bootstrap entry takes effect once per session." Other IDEs rely on native dedup (`once`, built-in).
- **QF-4 — Standalone subfolder self-nesting guard.** When a source folder name equals the standalone's target subfolder (e.g. `.cursor`), special-case merging avoids `.cursor/.cursor/` (`scripts/plugin_generator.py:914-919`). This is a defensive patch arising from the derive-from-main approach (AC-1); a uniform generator writing directly to the target layout avoids the situation.
- **QF-5 — Silent skips.** Missing bootstrap-file variants and missing templates are skipped silently or with only a stderr warning (`scripts/plugin_generator.py:589`, `:685`). Acceptable because variants legitimately differ per target, but a re-implementation should log what was skipped.
- **QF-6 — Mixed concerns in one module.** Filesystem mechanics, IDE-specific string escaping (bash/PowerShell/TOML/JSON), model maps, and orchestration live in one file. This is the "awful architecture" the maintainer wants split; it is a structural finding, not a behavioral requirement.

## Target-state assumptions (added from rewrite design)

- **AC-7 — Processor model supersedes the as-is engine.** `FR-ARCH.md` defines the rewrite as an immutable VFS + pure processor pipeline. Where it conflicts with reverse-engineered as-is FRs (`FR-COPY`, `FR-GEN`, `FR-HOOK`, the two-pass derivation), the FR-ARCH target-state wins for the rewrite; the as-is FRs remain the record of current behavior and the parity reference (NFR-0001).
- **AC-8 — Override is a directive, not deferred.** The `overwrite` filename directive provides per-file override now, realized by `apply_overrides()`. The earlier "bundle, don't override" framing is replaced by the processor model: default behavior is `bundle()` concatenation; `overwrite` prunes earlier entries via `apply_overrides()`.
- **AC-9 — Directive special characters are filesystem-safe on all targets.** Source filenames carry `[`, `]`, and `,`. These are valid on Windows (NTFS), macOS (APFS), and Linux (ext4) and in git. The rewrite must verify round-trip handling (checkout, glob, read) on all three; bracket/comma must not be interpreted by any shell glob during generation.

## Open Questions (OQ)

- **OQ-1 — RESOLVED.** Bundling is plain concatenation by `bundle()` with no markup/delimiters, in VFS order (set by order tokens / filename sort). No `<rosetta:file>`-style tags (unlike the server Bundler). See FR-ARCH-0042.
- **OQ-2 — RESOLVED.** Per-file override exists now via the `overwrite` directive (AC-8, FR-ARCH-0024/0041).
- **OQ-3 — `--domain` interaction with model normalization and excluded files.** Assumed identical across domains. Confirm overlays may introduce new excluded rule files (could itself be expressed as `overwrite`/`*-only` directives).
- **OQ-4 — Scope of byte-identity for hooks JSON.** NFR-0001 sets functional parity, but the codebase historically valued byte-identical hook JSON across the r2/r3 migration. Confirm whether hook JSON specifically must stay byte-identical to the current output.
- **OQ-5 — Frontmatter population timing.** FR-ARCH-0011 builds the VFS from structure + filename directives only; the `frontmatter` slot in each VFS file is therefore populated by `read()` during processing, not at VFS-build time (which would require an early content read, violating FR-ARCH-0033). Confirm this is intended (the VFS example in the request shows a populated `frontmatter` field, interpreted here as the post-`read()` working state).
