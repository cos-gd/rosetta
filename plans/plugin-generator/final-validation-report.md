# Plugin Generator — Final Validation Report

**Date:** 2026-06-05  
**Validator:** Rosetta validator subagent (Phase 10+11)  
**Execution evidence:** all commands run locally; no assumptions.

---

## Section A — Execution Validation

### A.1 Parity re-confirm (NFR-0001) — PASS

**Command evidence:**

```
$ npm run start -- --release r2 --output-dir $TMP_R2 2>/dev/null
$ diff -rq $TMP_R2 agents/TEMP/old-gen-r2
Exit: 0   Files: 880   Diff: empty (exit 0)

$ npm run start -- --release r3 --output-dir $TMP_R3 2>/dev/null
$ diff -rq $TMP_R3 agents/TEMP/old-gen-r3
Exit: 0   Files: 946   Diff: empty (exit 0)
```

R2 (880 files) and R3 (946 files) are byte-for-byte identical to baselines. PASS.

---

### A.2 NFR-0003 Idempotency — PASS

**Run-twice (same dir):**
```
Run 1: exit 0, 880 files
Run 2: exit 0, 880 files
diff -rq $IDEM_DIR agents/TEMP/old-gen-r2 → exit 0 (identical)
```

**Clean-dir (empty dir):**
```
Run into fresh empty dir: exit 0, 880 files
diff -rq $FRESH agents/TEMP/old-gen-r2 → exit 0 (identical)
```

No leftover accumulation, clean-dir seeding works. PASS.

---

### A.3 FR-CLI-0030/0031 Multi-domain bundling — PASS (via unit tests; live CLI also confirmed)

**Unit tests** (`source-resolver.test.ts`) verified:
- Single domain resolves one source dir
- `--domain core,acme` resolves two dirs in left-to-right order
- Same-path documents are concatenated (core first, acme appended)
- Acme-only file present; core-only file present

**Live CLI test** (temporary acme overlay with `UNIQUE_ACME_MARKER_XYZ123`):
```
$ npm run start -- --repo-root $TMPINSTR --domain core,acme --output-dir $TMP_OUT 2>/dev/null
$ grep "UNIQUE_ACME_MARKER_XYZ123" $TMP_OUT/core-claude/rules/coding-iac-best-practices.md
UNIQUE_ACME_MARKER_XYZ123   ← acme content present
$ head -5 same file:  core content (IaC best practices body) present first
$ ls $TMP_OUT/core-claude/rules/acme-security.md  → PRESENT
$ ls $TMP_OUT/core-claude/rules/bootstrap-core-policy.md → PRESENT
```

Content concatenation is correct (core then acme, no double frontmatter). PASS.

---

### A.4 FR-CLI-0010/0011/0030 Error handling — PASS

**Unknown release r9:**
```
$ npm run start -- --release r9 --output-dir $TMP 2>&1
Unknown release: "r9". Known releases: r2, r3
Exit code: 1   Files created: 0
```
Exit ≠ 0, names known releases, no output written. PASS.

**Missing domain `nope`:**
```
$ npm run start -- --domain nope --output-dir $TMP 2>&1
Failed to resolve instruction sources: Instruction source not found: .../instructions/r2/nope
Exit code: 1   Files created: 0
```
Exit ≠ 0, no output written. PASS.

---

### A.5 FR-CLI-0050 Dry-run — PARTIAL FAIL

**Zero files on disk:** PASS — `--dry-run` writes 0 files (confirmed).

**Emits file contents:** FAIL — The requirement states "emit the full target path and full target contents for every file to the output." The implementation emits only the path and byte size via a JSON log line:
```json
{"path": "/tmp/.../rules/bootstrap-core-policy.md", "size": 8732, "msg": "dry-run: would write"}
```
Full file contents are NOT emitted to stdout. The test only checks "zero files on disk" and does not verify content emission. This is a partial implementation of FR-CLI-0050.

**Severity: Major** — The requirement is explicit ("full target contents") and is marked Must-priority. The test does not catch this gap.

---

### A.6 FR-CLI-0051 Verbose mode — FAIL

**Observation:**
```
Normal mode: 22 log lines (all at info level)
Verbose mode: 22 log lines (identical count and content)
```

The logger is initialized at `'debug'` level when `--verbose` is set (`logging.ts` line 9), but there are ZERO `logger.debug()` calls anywhere in the codebase. Verbose mode produces identical output to normal mode. The test suite never calls `generate()` with `verbose: true`.

**Severity: Major** — FR-CLI-0051 is marked "Should" priority. The feature is advertised in help text and the logger scaffold is wired, but the per-VirtualFile/per-processor debug logging is missing.

---

### A.7 NFR-0004 Size limit soft error + FR-HOOK-0021 Missing bundles — MIXED

**FR-HOOK-0021 (missing bundles → exit 1):** PASS — confirmed via `generate.test.ts` test "r3 with missing bundles → returns exit code 1":
```
generate({release:'r3', missing bundle files}) → exit code 1   ✓
```

**NFR-0004 (bootstrap size > 10000 → exit ≠ 0):** FAIL — soft errors DO NOT propagate to non-zero exit code.

Evidence from live R2 run:
```
$ npm run start -- --release r2 --output-dir $TMP 2>&1
[soft] core-copilot: Bootstrap entry exceeds 10000 chars (14168)
[soft] core-copilot: Bootstrap entry exceeds 10000 chars (18275)
[soft] core-copilot: Bootstrap entry exceeds 10000 chars (12237)
[soft] core-copilot: Bootstrap entry exceeds 10000 chars (16803)
[soft] core-copilot: Bootstrap entry exceeds 10000 chars (12571)
Exit code: 0   ← WRONG: should be 1 per NFR-0004
```

Root cause in `generate.ts` lines 96-99:
```typescript
if (e.kind === 'hard') anyError = true;   // soft errors excluded
```
`return anyError ? 1 : 0;` → exits 0 despite 5 size violations.

The test `plugin-assemble-bootstrap.test.ts:105` verifies the soft error is recorded in `result.errors` with `kind:'soft'`, but there is NO integration test verifying that `generate()` returns exit code 1 when soft errors occur.

**Severity: Blocker** — NFR-0004 is Must-priority and the SPECS §11 / §10 explicitly call this out. The bug is in `generate.ts:99` (missing `|| e.kind === 'soft'`). It also means R2 normal operation reports exit 0 despite 5 violations, masking real problems in pre-commit and CI.

---

### A.8 GROUND-TRUTH spot byte-checks — PASS (all)

All GT-specific checks confirmed with freshly generated R2 output:

| Check | Result |
|---|---|
| Claude `hooks.json` SessionStart has 9 entries (r2) | 9 entries confirmed |
| Last entry contains `CLAUDE_PLUGIN_ROOT` env var | Confirmed |
| Copilot root `hooks.json` MD5 == `.github/plugin/hooks.json` | MD5 identical (b53bc4...) |
| Codex `.codex/hooks.json` MD5 == `.codex-plugin/hooks.json` | MD5 identical (70fb58...) |
| No `templates/shell-schemas/` in any target | 0 files found |
| `rules/bootstrap.md` absent from all targets | 0 files found |
| `rules/local-files-mode.md` absent from all targets | 0 files found |

All GT-8 ground-truth checks pass. PASS.

---

## Section B — Test Suite Review (Phase 10)

### B.1 Test coverage summary

- 31 test files, 293 tests — all pass
- Coverage: 93.87% stmt / 84.54% branch / 99.32% func / 96.91% lines
- TypeScript: clean (`tsc --noEmit` exits 0)

### B.2 Per-requirement coverage assessment

| Requirement | Tests | Adequacy |
|---|---|---|
| NFR-0001 byte parity r2+r3 | `parity.e2e.test.ts`: full diff + per-file assertions | ADEQUATE |
| NFR-0002 deterministic output | Covered by parity (same result on each run) | ADEQUATE |
| NFR-0003 idempotency | Covered implicitly by parity; no explicit run-twice test | MINOR GAP (parity subsumes it) |
| **NFR-0004 size limit exit ≠ 0** | Unit test checks `kind:'soft'` present; NO integration test that generate() returns 1 | **MISSING — BLOCKER** |
| NFR-0005 valid JSON/TOML | Parity produces byte-identical output that is syntactically valid | ADEQUATE |
| NFR-0006 content-agnostic engine | Inspection-only per requirement; no code branching on release names | ADEQUATE |
| NFR-0007 modular SRP | Structure verifiable by inspection | ADEQUATE |
| FR-CLI-0001 CLI entry | `sample.e2e.test.ts` exercises via generate() | ADEQUATE |
| FR-CLI-0002 importable generate() | Used in all e2e tests | ADEQUATE |
| FR-CLI-0010/0011 release validation | `generate.test.ts` + `sample.e2e.test.ts` exit-1 tests | ADEQUATE |
| FR-CLI-0020/0021 repo-root/output-dir | Implicitly covered by all e2e tests | ADEQUATE |
| FR-CLI-0030 domain selection | `source-resolver.test.ts` + `sample.e2e.test.ts` | ADEQUATE |
| FR-CLI-0031 multi-domain bundling | `source-resolver.test.ts` (unit) + `sample.e2e.test.ts` (e2e core+acme) | ADEQUATE |
| **FR-CLI-0050 dry-run content emission** | Only "zero files" checked; content NOT asserted | **GAP — MAJOR** |
| **FR-CLI-0051 verbose per-file logging** | Never called with verbose:true; no debug log calls in source | **NOT IMPLEMENTED / NOT TESTED — MAJOR** |
| FR-CLI-0060 help text | Verification mode is "Inspection"; help tested manually — PASS | ACCEPTABLE |
| FR-CLI-0040 uniform per-target | All 6 targets generated in parity test | ADEQUATE |
| FR-CLI-0041 run-to-completion | `generate.test.ts` r3-missing-bundles test (hard errors); soft error path UNTESTED | PARTIAL GAP |
| FR-COPY-0011 exclusions (bootstrap.md, local-files-mode.md, shell-schemas) | `sample.e2e.test.ts` asserts absence | ADEQUATE |
| FR-COPY-0010 DS_Store skip | `source-resolver.test.ts`, `build-vfs.test.ts` | ADEQUATE |
| FR-ARCH-0020–0024 overwrite directive | `directives.test.ts`, `file-apply-overrides.test.ts`, `build-vfs.test.ts` | ADEQUATE (unit) |
| FR-HOOK-0001–0009 bootstrap assembly | `plugin-assemble-bootstrap.test.ts` (6 tests) + parity | ADEQUATE |
| FR-HOOK-0007 plugin-root separate entry | `plugin-assemble-bootstrap.test.ts` + parity (9 entries) | ADEQUATE |
| FR-HOOK-0020 bundle sync r3 | `plugin-sync-bundles.test.ts` (r3 copies .js) | ADEQUATE |
| FR-HOOK-0021 missing bundles → exit 1 | `generate.test.ts` r3-missing-bundles | ADEQUATE |
| FR-GEN-0001–0011 INDEX generation | `plugin-generate-indexes.test.ts` + `sample.e2e.test.ts` | ADEQUATE |
| FR-VAR-* model normalization | `file-normalize-models.test.ts` + `model-maps.test.ts` + parity | ADEQUATE |
| GT-6 Codex TOML field order | `toml.test.ts` + parity | ADEQUATE |
| GT-7 standalone plugin.json format | `parity.e2e.test.ts` + `sample.e2e.test.ts` | ADEQUATE |

### B.3 Mocking assessment

Mocks are appropriately limited to the filesystem boundary. All unit tests use real `fs.mkdtempSync` + real processor logic. No over-mocking detected. The processors are pure functions (take state in, return state out) so unit tests exercise real behavior without mocking business logic.

### B.4 E2E sample data gaps vs SPECS §11

SPECS §11 specifies the sample fixture tree must include:
- Binary file — NOT present in `tests/fixtures/sample-instructions/` (binary handling tested only in unit)
- `.DS_Store` — NOT present in sample fixtures (tested only in unit)
- `~overwrite` directive file in sample tree — NOT present (overwrite tested only in unit)
- Committed `tests/fixtures/sample-output/` expected output — does NOT exist; e2e uses behavioral assertions not byte-comparison against committed output
- Verbose adds log lines — NOT tested

These are gaps against the SPECS §11 contract for the e2e harness but are partially compensated by unit tests that cover the same behaviors individually.

### B.5 Significant uncovered branches (84.54% branch)

| Location | Uncovered | Impact |
|---|---|---|
| `generate.ts:99` | `e.kind === 'soft'` branch never sets anyError | **BLOCKER: NFR-0004 exit-code bug** |
| `generate.ts:84-92` | Processor throw/catch path | Low: covered by r3-missing-bundles test indirectly |
| `logging.ts:8` | verbose=true branch (initLogger with debug level) | Low: no debug log calls to emit |
| `file-normalize-models.ts:91-150` | Codex paths with no-frontmatter content | Low: parity confirms real output is correct |
| `payload.ts:197,230` | Default branch (unknown hookEntryShape) | Low: defensive code, never triggered |
| `plugin-copy.ts:170` | Version fallback to '2.0.40' | Low: safety fallback |

---

## Final Verdict

**CONDITIONAL PASS — 2 Blockers, 2 Majors**

The generator passes byte-for-byte parity (NFR-0001) for both R2 (880 files) and R3 (946 files), idempotency, all error-rejection cases (unknown release, missing domain), the multi-domain bundling feature, the FR-HOOK-0021 missing-bundles check, and all spot GT checks. 293 tests pass, tsc is clean, coverage is 93.9%/84.5%.

### Residual Gaps

| ID | Severity | Description | Fix |
|---|---|---|---|
| G-1 | **Blocker** | NFR-0004: soft errors (bootstrap size > 10000 chars) set exit code 0 instead of 1. R2 normal operation exits 0 despite 5 copilot violations. Bug: `generate.ts:99` only propagates `hard` errors. | Add `|| e.kind === 'soft'` to line 99; add integration test that `generate()` returns 1 when soft error present. |
| G-2 | **Major** | FR-CLI-0050 dry-run: full file contents are NOT emitted. Only path + size logged. The requirement says "emit the full target path and full target contents for every file." The test only verifies "zero files on disk." | Either implement content emission to stdout, or renegotiate the requirement with stakeholder. |
| G-3 | **Major** | FR-CLI-0051 verbose: no `logger.debug()` calls exist anywhere. Verbose=true produces identical output to normal mode. Test never passes `verbose: true`. | Add debug-level log calls in file/plugin processors; add test asserting verbose produces more lines than normal. |
| G-4 | Minor | SPECS §11 e2e sample data: missing binary file, `.DS_Store`, and `~overwrite` directive in the sample fixture tree. No committed `sample-output/` fixtures for byte-comparison. | Add the missing fixture files; add test assertions. These behaviors are unit-tested individually, so this is documentation/completeness gap not a functional gap. |

**The primary acceptance gate (byte-parity, NFR-0001) passes unconditionally. G-1 is a behavioral correctness bug that the orchestrator should fix before declaring the /goal complete.**
