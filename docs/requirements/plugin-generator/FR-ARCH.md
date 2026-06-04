# plugin-generator — FR: Target Architecture (VFS + Processor Pipeline)

Architecture requirements: the configuration-driven generation model — uniform spec contract, immutable flat VFS, filename directives, and the pure processor pipeline. Terms: see `GLOSSARY.md`.

## Specification contract

<req id="FR-ARCH-0001" type="FR" level="System" ticketId="" classification="technical">
  <title>Uniform spec contract, values externalized</title>
  <statement>The generator shall define one specification contract used identically for every target, and shall store the concrete per-target values in a separate data module (`plugin-specs.ts`).</statement>
  <rationale>One contract + externalized data keeps every target generated the same way and additions data-only.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the six targets When: inspected Then: each is described by a single named spec type (one shared TypeScript interface) of identical shape, differing only in values held in `plugin-specs.ts`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-CLI-0040, DATA-CFG-0002</depends>
</req>

<req id="FR-ARCH-0002" type="FR" level="System" ticketId="" classification="technical">
  <title>SpecEntry shape</title>
  <statement>Each `SpecEntry` shall declare a VFS-relative source glob, a target folder, and an ordered `ProcessorPipeline`; a `PluginTarget`'s full `PluginSpec` shall be an ordered list of `SpecEntry`s.</statement>
  <rationale>Processing is expressed as source→target mappings with an explicit processor chain.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a `SpecEntry` When: read Then: it provides `{source: glob, target: folder, processors: ProcessorPipeline}`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0003" type="FR" level="System" ticketId="" classification="technical">
  <title>Precise, specific naming for every concept</title>
  <statement>The re-implementation shall give every domain concept a precise, specific named type — not only files — and shall avoid bare generic words (e.g. "item", "entry", "value", "thing", "data", "spec", "frame") as type or identifier names; each concept named in this component's glossary shall map to one such named type.</statement>
  <rationale>Unambiguous, self-documenting code; the maintainer requires specific terminology throughout.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the type definitions When: inspected Then: each glossary concept (Release, Domain, PluginTarget, PluginSpec, SpecEntry, Processor, ProcessorPipeline, ProcessingFrame, VirtualFile, SourceFile, FilenameDirective, DirectiveToken, ModelVocabulary, …) has a correspondingly named type.</criteria>
    <criteria>Given: any identifier When: inspected Then: it names a specific concept, not a generic placeholder.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Virtual File System (VFS)

<req id="FR-ARCH-0010" type="FR" level="System" ticketId="" classification="technical">
  <title>Flat VFS model</title>
  <statement>The generator shall build a flat virtual file system as an ordered list of `VirtualFile`s, each `VirtualFile` having a VFS path and an ordered collection of `SourceFile`s, where each `SourceFile` carries its absolute origin path, a frontmatter slot, an order key, and a conditions set.</statement>
  <rationale>The VFS is the single intermediate model the processors operate on; precise types (`VirtualFile`, `SourceFile`) replace the ambiguous word "file".</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the source structure When: the VFS is built Then: each `VirtualFile` has shape `{path, sourceFiles:[{origin, frontmatter, order, conditions}]}`.</criteria>
    <criteria>Given: two source files mapping to the same VFS path When: built Then: both appear as `SourceFile`s in that `VirtualFile`'s collection in order.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0011" type="FR" level="System" ticketId="" classification="technical">
  <title>VFS built from structure and filename directives only</title>
  <statement>The generator shall build the VFS from filesystem structure and filename-encoded directives only, without reading file contents.</statement>
  <rationale>Content reads are confined to the `read()` processor (FR-ARCH-0033); directives live in filenames, so VFS assembly needs no content.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: VFS assembly When: it runs Then: no file body is opened; only names, paths, and directives are used.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0033</depends>
</req>

<req id="FR-ARCH-0012" type="FR" level="System" ticketId="" classification="technical">
  <title>Sorted, ordered VFS</title>
  <statement>The generator shall present every VFS array sorted and ordered, with each `VirtualFile`'s `SourceFile`s ordered by their order key.</statement>
  <rationale>Deterministic, reproducible processing.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a built VFS When: inspected Then: the `VirtualFile`s and each `VirtualFile`'s `SourceFile` collection are in stable sorted order.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>NFR-0002</depends>
</req>

<req id="FR-ARCH-0013" type="FR" level="System" ticketId="" classification="technical">
  <title>Immutable VFS after render</title>
  <statement>Once fully rendered, the VFS content shall be protected from mutation; processors shall operate on copies and shall not alter the rendered VFS.</statement>
  <rationale>A frozen source of truth prevents cross-target contamination and order-of-execution defects.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a rendered VFS When: a `Processor` runs Then: any attempt to mutate the shared VFS is prevented or has no effect on it.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Filename directives

<req id="FR-ARCH-0020" type="FR" level="System" ticketId="" classification="technical">
  <title>Directive-bearing filenames</title>
  <statement>The generator shall recognize a `FilenameDirective` (bracketed `[…]` segment) in a source filename of the form `name.[tokens].ext`, and shall map the `SourceFile` to the VFS path `name.ext` (the `FilenameDirective` removed).</statement>
  <rationale>Per-file behavior is declared in the filename; the output name is the clean base name.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `bootstrap-core-policy.[1a,claude-only,overwrite].md` When: mapped Then: VFS path is `rules/bootstrap-core-policy.md` with order `1a` and conditions `{claude-only, overwrite}`.</criteria>
    <criteria>Given: a filename with no bracket When: mapped Then: it maps to its plain name with default order and no conditions.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0021" type="FR" level="System" ticketId="" classification="technical">
  <title>Directive grammar and validation</title>
  <statement>The generator shall parse a `FilenameDirective` as comma-separated `DirectiveToken`s where an optional `OrderToken`, if present, appears first and the remaining `DirectiveToken`s appear in any order; it shall reject the `SourceFile` with an error if any `DirectiveToken` is unknown or if any appears more than once.</statement>
  <rationale>Strict validation prevents silent misconfiguration.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `[1a,overwrite,claude-only]` When: parsed Then: it is accepted.</criteria>
    <criteria>Given: a duplicate token or an unknown token When: parsed Then: it errors naming the file and token.</criteria>
    <criteria>Given: an order token not in first position When: parsed Then: it errors.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0022" type="FR" level="System" ticketId="" classification="technical">
  <title>OrderToken semantics</title>
  <statement>The generator shall treat the `OrderToken` as an opaque sort key and order a `VirtualFile`'s `SourceFile`s by it as a filesystem/IDE would sort the equivalent name (WYSIWYG lexicographic), defaulting to the plain filename order when absent.</statement>
  <rationale>Authors control bundling order by what they literally see in the name.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: files with order `1a`, `2a`, `10a` When: ordered Then: ordering follows lexicographic name sort (`10a` before `2a`), matching the filesystem.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0023" type="FR" level="System" ticketId="" classification="technical">
  <title>TargetOnlyToken scoping</title>
  <statement>Where a `SourceFile` declares a `TargetOnlyToken` (`<target>-only`), the generator shall include that `SourceFile` only when generating a matching `PluginTarget`, accepting both an IDE-family key (expanding to all that IDE's `PluginTarget`s) and an exact `PluginTarget` name.</statement>
  <rationale>Some content applies only to one IDE or one specific variant.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `copilot-only` When: generating Then: the file participates for `core-copilot` and `core-copilot-standalone` only.</criteria>
    <criteria>Given: `core-copilot-standalone-only` When: generating Then: the file participates for that exact target only.</criteria>
    <criteria>Given: a `PluginTarget` not matched When: generating Then: the `SourceFile` is absent from that `PluginTarget`'s VFS contribution.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0024" type="FR" level="System" ticketId="" classification="technical">
  <title>OverwriteToken condition</title>
  <statement>Where a `SourceFile` declares the `OverwriteToken` (`overwrite`), the generator shall, during override application, render all earlier-ordered `SourceFile`s for that `VirtualFile` irrelevant so only the overwriting `SourceFile` and later ones remain.</statement>
  <rationale>Lets a target- or domain-specific file replace accumulated content for a path.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a path with files ordered A, B(overwrite), C When: overrides applied Then: A is removed; B and C remain in order.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0041</depends>
</req>

## Processor pipeline

<req id="FR-ARCH-0030" type="FR" level="System" ticketId="" classification="technical">
  <title>ProcessingFrame</title>
  <statement>The generator shall pass through each `Processor` a `ProcessingFrame` carrying the VFS path, the target plugin-relative path, a binary flag, `target_contents`, and `source` — a mutable deep copy of the originating `VirtualFile`'s `SourceFile` collection. The `VirtualFile` itself remains immutable; the `ProcessingFrame` is the mutable working object.</statement>
  <rationale>A uniform, distinctly-named `ProcessingFrame` lets `Processor`s compose as pipes without touching the frozen `VirtualFile`.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: any `Processor` When: invoked Then: it receives a `ProcessingFrame` `{path, target, isBinary, target_contents, source}` where `source` is a deep copy of the `VirtualFile`'s `SourceFile` collection.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0036" type="FR" level="System" ticketId="" classification="technical">
  <title>target_contents states</title>
  <statement>The generator shall treat `target_contents` as having three distinct states: `null` meaning the content was removed and no file is to be produced; empty meaning a file is to be produced with optional frontmatter and empty main content; and a string or byte array meaning a file is to be produced with that content.</statement>
  <rationale>Removal and emptiness are different outcomes and must drive different `write()` behavior.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `target_contents` is `null` When: written Then: no file is created.</criteria>
    <criteria>Given: `target_contents` is empty When: written Then: a file is created with empty main content (optional frontmatter).</criteria>
    <criteria>Given: `target_contents` holds content When: written Then: a file is created with that content.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0045</depends>
</req>

<req id="FR-ARCH-0031" type="FR" level="System" ticketId="" classification="technical">
  <title>Processor purity</title>
  <statement>A `Processor` shall not modify its input `ProcessingFrame`; it shall return that `ProcessingFrame` unchanged or a full copy carrying its own values.</statement>
  <rationale>Purity makes the pipeline predictable and the VFS safe.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a `Processor` When: it runs Then: the input `ProcessingFrame` is unchanged after the call.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0013</depends>
</req>

<req id="FR-ARCH-0032" type="FR" level="System" ticketId="" classification="technical">
  <title>Processing order</title>
  <statement>The generator shall process `PluginTarget`s one at a time, `VirtualFile`s within a `PluginTarget` one at a time, and `Processor`s within a `VirtualFile` in declared order.</statement>
  <rationale>Deterministic, debuggable execution; uniform across targets.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a run When: traced Then: ordering is plugin-by-plugin, file-by-file, processor-by-processor.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-CLI-0040</depends>
</req>

<req id="FR-ARCH-0034" type="FR" level="System" ticketId="" classification="technical">
  <title>Processor input validation (fail-fast)</title>
  <statement>Every `Processor` shall deeply validate its input `ProcessingFrame` before acting and shall exit with an error when anything is wrong or unexpected for that `Processor`'s contract.</statement>
  <rationale>Fail-fast on invalid pipeline state prevents silent corruption of generated output. (`bundle()`'s binary-with-multiple-`SourceFile`s error in FR-ARCH-0042 is one example of this general rule.)</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any `Processor` receiving a `ProcessingFrame` that violates its contract When: invoked Then: it errors with a message identifying the `Processor`, the `VirtualFile` path, and the violation, rather than producing output.</criteria>
    <criteria>Given: `bundle()` with a binary `VirtualFile` and more than one remaining `SourceFile` When: invoked Then: it errors per this rule (FR-ARCH-0042).</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0033" type="FR" level="System" ticketId="" classification="technical">
  <title>Content I/O confined to read and write</title>
  <statement>The generator shall read file contents only within the `read()` processor and write file contents only within the `write()` processor.</statement>
  <rationale>Isolating I/O makes the pipeline testable and the no-content-in-logs rule enforceable.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the code When: inspected Then: file-content reads appear only in `read()` and file writes only in `write()`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Processor contracts

<req id="FR-ARCH-0040" type="FR" level="System" ticketId="" classification="technical">
  <title>read() processor</title>
  <statement>The `read()` processor shall read each remaining `SourceFile`'s content and, for text `SourceFile`s, split frontmatter from body, erroring on malformed frontmatter and logging (without error) when frontmatter is absent; for binary `SourceFile`s it shall load only the byte content and set the binary flag without splitting.</statement>
  <rationale>Single, well-defined content ingress with explicit failure modes.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a text file with valid frontmatter When: read Then: frontmatter and body are separated.</criteria>
    <criteria>Given: malformed frontmatter When: read Then: it errors naming the file.</criteria>
    <criteria>Given: no frontmatter When: read Then: it logs and proceeds with body only.</criteria>
    <criteria>Given: a binary file When: read Then: only byte content is loaded and the binary flag is set.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0041" type="FR" level="System" ticketId="" classification="technical">
  <title>apply_overrides() processor</title>
  <statement>The `apply_overrides()` processor shall produce an operation over the working `SourceFile` collection that removes `SourceFile`s made irrelevant by an `overwrite` condition, by a `<target>-only` mismatch with the current target, or otherwise no longer applicable, leaving the effective set.</statement>
  <rationale>Centralizes override/relevance resolution so downstream processors see only effective files.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a `SourceFile` collection containing an `OverwriteToken` `SourceFile` When: applied Then: earlier-ordered `SourceFile`s for the path are removed.</criteria>
    <criteria>Given: `SourceFile`s irrelevant to the current `PluginTarget` When: applied Then: they are removed.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0024, FR-ARCH-0023</depends>
</req>

<req id="FR-ARCH-0042" type="FR" level="System" ticketId="" classification="technical">
  <title>bundle() processor</title>
  <statement>The `bundle()` processor shall concatenate the contents of the remaining `SourceFile`s in order into `target_contents` without inserting any markup or delimiters, and — as one instance of the general input-validation rule (FR-ARCH-0034) — shall error when the `VirtualFile` is binary and more than one `SourceFile` remains.</statement>
  <rationale>Layer content is combined by plain concatenation; binaries cannot be concatenated.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: two text `SourceFile`s When: bundled Then: the output is their bodies concatenated in order with no added tags.</criteria>
    <criteria>Given: a single binary `SourceFile` When: bundled Then: its bytes pass through unchanged.</criteria>
    <criteria>Given: a binary `VirtualFile` with more than one remaining `SourceFile` When: bundled Then: it errors.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0041</depends>
</req>

<req id="FR-ARCH-0043" type="FR" level="System" ticketId="" classification="technical">
  <title>rename(pattern, replacement) processor</title>
  <statement>The `rename()` processor shall set the target plugin-relative path by applying a regular-expression pattern and replacement to the path, leaving the path unchanged when the pattern does not match.</statement>
  <rationale>Per-IDE file/folder naming expressed declaratively.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: pattern `^rules/(.+)\.md$`→`rules/$1.mdc` When: applied to `rules/x.md` Then: target is `rules/x.mdc`.</criteria>
    <criteria>Given: a non-matching path When: applied Then: the target is unchanged.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-ARCH-0044" type="FR" level="System" ticketId="" classification="technical">
  <title>codex_agent_format(meta) processor</title>
  <statement>The `codex_agent_format()` processor shall convert an agent document's frontmatter and body into the Codex subagent format defined by the Codex guide (INT-IDE-0002), honoring a configurable meta parameter, producing the target contents in that form.</statement>
  <rationale>Codex requires a specific subagent format; the transform is one declarative processor and the exact format is owned by the Codex guide.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: an agent document and the configured meta parameter When: applied Then: target contents are a valid Codex subagent definition per the Codex guide.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>INT-IDE-0002</depends>
</req>

<req id="FR-ARCH-0045" type="FR" level="System" ticketId="" classification="technical">
  <title>write() processor with dry-run</title>
  <statement>The `write()` processor shall produce a file at the `VirtualFile`'s target path under the output directory according to the `target_contents` state — creating no file when `target_contents` is `null`, and creating the file otherwise — and under dry-run it shall instead emit the full target path and full target contents to the output and write nothing to disk.</statement>
  <rationale>Single content egress; honors removal vs. emptiness; dry-run gives a complete preview without side effects.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a `VirtualFile` with non-null `target_contents` When: written Then: the file appears at the target path under the output directory.</criteria>
    <criteria>Given: `target_contents` is `null` When: written Then: no file is created.</criteria>
    <criteria>Given: dry-run When: written Then: the full path and full content are emitted and no file is created.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-CLI-0050</depends>
</req>

<req id="FR-ARCH-0046" type="FR" level="System" ticketId="" classification="technical">
  <title>normalize_models() processor</title>
  <statement>The `normalize_models()` processor shall rewrite a text `VirtualFile`'s frontmatter model value into the current `PluginTarget`'s `ModelVocabulary`, leaving content without a model value unchanged.</statement>
  <rationale>Each IDE accepts only its own model identifier format; normalization is one explicit pipeline stage, not hidden inside copying.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a `VirtualFile` whose frontmatter declares a model When: normalized for a `PluginTarget` Then: the model value is rewritten per that target's `ModelVocabulary`.</criteria>
    <criteria>Given: a `VirtualFile` with no model value When: normalized Then: its content is unchanged.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>DATA-CFG-0004</depends>
</req>

<req id="FR-ARCH-0047" type="FR" level="System" ticketId="" classification="technical">
  <title>generate_index() processor</title>
  <statement>The `generate_index()` processor shall produce a folder-index `VirtualFile` whose `target_contents` lists the qualifying `VirtualFile`s of a folder with their descriptions, where membership and heading follow the folder-index rules.</statement>
  <rationale>The table-of-contents output is a generated artifact and must have an explicit pipeline stage.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a folder of `VirtualFile`s When: indexed Then: a single index `VirtualFile` is produced listing each qualifying member with its description.</criteria>
    <criteria>Given: no qualifying members When: indexed Then: no index `VirtualFile` is produced.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-GEN-0001</depends>
</req>

<req id="FR-ARCH-0048" type="FR" level="System" ticketId="" classification="technical">
  <title>render_template() processor</title>
  <statement>The `render_template()` processor shall render a template `VirtualFile` into its non-template output `VirtualFile`, using a context of release variables plus the target's bootstrap payload values, with raw injection and release-driven conditionals.</statement>
  <rationale>Template rendering is a distinct transform and must be an explicit pipeline stage rather than an out-of-band step.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a template `VirtualFile` and a render context When: rendered Then: the output `VirtualFile` content is the rendered result and the template suffix is removed from its path.</criteria>
    <criteria>Given: a release-conditional block When: rendered Then: the output is valid for the selected release.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-GEN-0010</depends>
</req>

## Observability

<req id="FR-ARCH-0050" type="FR" level="System" ticketId="" classification="technical">
  <title>Decision and I/O logging without content</title>
  <statement>The generator shall log every decision and every `Processor`'s input and output `ProcessingFrame`, excluding the actual file content, and shall expand logging detail under verbose mode.</statement>
  <rationale>Full traceability of pipeline behavior without leaking or bloating logs with file bodies.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a run When: logs are inspected Then: each decision and each `Processor`'s input/output `ProcessingFrame` metadata is logged and no file body appears.</criteria>
    <criteria>Given: verbose mode When: enabled Then: per-`VirtualFile`, per-`Processor` detail is logged.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-CLI-0051, NFR-0010</depends>
</req>
