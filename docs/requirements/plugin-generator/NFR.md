# plugin-generator — Non-Functional Requirements

ISO/IEC 25010 buckets. Metrics and conditions stated.

<req id="NFR-0001" type="NFR" level="System" ticketId="" classification="technical">
  <title>Functional/semantic parity with current generator</title>
  <statement>The re-implementation shall produce output functionally equivalent to the current generator for the same inputs: identical file set per target (modulo declared new behavior), valid per-IDE formats, and equivalent content meaning. Byte-for-byte identity is not required.</statement>
  <rationale>Maintainability bucket: a rewrite must not change downstream IDE behavior.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: release r2, domain core When: both generators run Then: each target has the same file set and every generated JSON/TOML parses and carries equivalent values.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <notes>Hook-JSON-specific byte-identity is ASSUMPTIONS OQ-4.</notes>
</req>

<req id="NFR-0002" type="NFR" level="System" ticketId="" classification="technical">
  <title>Deterministic, reproducible output</title>
  <statement>Given identical inputs, the generator shall produce identical output across runs, processing files in a stable sorted order.</statement>
  <rationale>Reliability: reproducible builds; clean diffs in version control.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: two runs with identical inputs When: outputs compared Then: they are identical.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="NFR-0003" type="NFR" level="System" ticketId="" classification="technical">
  <title>Idempotent re-generation</title>
  <statement>The generator shall be safely re-runnable, wiping and rebuilding generated content while preserving each target's config folder and preserved files.</statement>
  <rationale>Reliability: re-running must not accumulate stale artifacts.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: two consecutive runs When: the second completes Then: output equals a single-run output with no leftover files.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-COPY-0001</depends>
</req>

<req id="NFR-0004" type="NFR" level="System" ticketId="" classification="technical">
  <title>Bootstrap context size limit</title>
  <statement>The generator shall treat any single bootstrap context entry exceeding 10000 characters (after escaping) as a soft error: it shall report each offending target and file, still emit the output, and set a non-zero exit status.</statement>
  <rationale>Compatibility: IDE session-start context has a size budget; the run completes so all problems surface at once, and the non-zero exit signals the violation.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: an entry over 10000 chars When: assembled Then: a violation is reported naming the target and file, the output is still emitted, and exit status is non-zero.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="NFR-0005" type="NFR" level="System" ticketId="" classification="technical">
  <title>Generated artifact validity</title>
  <statement>Every generated configuration artifact shall be syntactically valid in its format: JSON for hook configuration and manifests, TOML for Codex subagents.</statement>
  <rationale>Functional correctness: invalid config breaks the IDE plugin.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any generated `hooks.json`, `plugin.json`, or subagent TOML When: parsed Then: parsing succeeds.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="NFR-0006" type="NFR" level="System" ticketId="" classification="technical">
  <title>Release- and content-agnostic engine</title>
  <statement>The generation engine shall contain no per-release or per-instruction-content branching; adding a release or a domain shall require only descriptor/config changes.</statement>
  <rationale>Maintainability: generator stays generic (agents/MEMORY.md "Keep Generators Generic And Content-Agnostic").</rationale>
  <source>Documentation</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the engine code When: inspected Then: release names and instruction file names appear only in descriptors/config, not in control flow.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="NFR-0007" type="NFR" level="System" ticketId="" classification="technical">
  <title>Modular, single-responsibility structure</title>
  <statement>The re-implementation shall separate concerns into distinct, reusable units: source resolution/merge, copy/normalize/rename engine, index/template generation, bootstrap-payload assembly, per-IDE escaping, hook-bundle sync, and per-target descriptors — such that each IDE adaptation is data, not bespoke procedure.</statement>
  <rationale>Maintainability: separable concerns enable reuse and isolated testing.</rationale>
  <source>User</source>
  <priority>Should</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the re-implementation When: inspected Then: filesystem mechanics, IDE-specific escaping, model maps, and orchestration reside in separate units.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <notes>Detailed architecture deliberately deferred by the user; this NFR states the quality target only.</notes>
</req>

<req id="NFR-0008" type="NFR" level="System" ticketId="" classification="technical">
  <title>TypeScript / npx runtime</title>
  <statement>The re-implementation shall run on Node via `npx` with no build step required by the consumer, using a Handlebars engine whose raw-injection and conditional semantics match the current templates and Node filesystem operations equivalent to the current copy/move/stat behavior.</statement>
  <rationale>Portability: stated target runtime.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Demo</verification>
  <acceptance>
    <criteria>Given: a clean environment with Node When: `npx <tool>` is run Then: it generates all targets without a separate install/build step.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="NFR-0009" type="NFR" level="System" ticketId="" classification="technical">
  <title>Cross-platform hook payloads</title>
  <statement>For IDEs requiring it, the generator shall emit both POSIX-shell and PowerShell command forms with correct per-interpreter escaping.</statement>
  <rationale>Compatibility: plugins run on macOS/Linux and Windows.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Copilot target When: generated Then: each hook entry carries valid bash and PowerShell forms.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-HOOK-0005</depends>
</req>

<req id="NFR-0010" type="NFR" level="System" ticketId="" classification="technical">
  <title>Lightweight libraries, versions consistent with rosettify</title>
  <statement>The re-implementation shall use robust, lightweight libraries for CLI parsing, logging, and templating, pinned to versions consistent with the rosettify package, and shall target the same Node and TypeScript baseline (ESM, Node ≥ 22, TypeScript 6.x, vitest for tests).</statement>
  <rationale>Maintainability: a sibling Node tool in the same repo must share toolchain and dependency versions to avoid drift.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the package manifest When: inspected Then: CLI uses `commander`, logging uses `pino`, templating uses `handlebars`, with major versions matching rosettify (commander ^14, pino ^10) and a Handlebars engine reproducing the current triple-stache raw-injection and conditional semantics.</criteria>
    <criteria>Given: the toolchain When: inspected Then: it is ESM, Node ≥ 22, TypeScript 6.x, tested with vitest, matching rosettify.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>NFR-0008</depends>
</req>
