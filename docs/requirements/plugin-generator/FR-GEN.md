# plugin-generator — FR: Index Generation and Template Rendering

## Folder index generation

<req id="FR-GEN-0001" type="FR" level="System" ticketId="" classification="technical">
  <title>Generate folder index</title>
  <statement>Where a target declares generated indexes for a folder, the generator shall produce an `INDEX.md` in that folder listing each document with its description.</statement>
  <rationale>Agents use the index as a table of contents to discover available rules and workflows.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a folder of documents When: indexed Then: `INDEX.md` lists each non-index document with `folder/filename` and its description.</criteria>
    <criteria>Given: a folder with no qualifying documents When: indexed Then: no index file is written.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-GEN-0002" type="FR" level="System" ticketId="" classification="technical">
  <title>Description source and fallback</title>
  <statement>The generator shall take each index entry's description from the document's frontmatter description field, falling back to a title derived from the filename when absent.</statement>
  <rationale>Descriptions let agents understand a document's purpose from the index alone.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a document with a frontmatter description When: indexed Then: that description is used.</criteria>
    <criteria>Given: a document without one When: indexed Then: a title-cased name derived from the filename stem is used.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-GEN-0003" type="FR" level="System" ticketId="" classification="technical">
  <title>Tag-filtered index membership</title>
  <statement>Where an index requires a tag, the generator shall include only documents whose frontmatter tags contain that tag.</statement>
  <rationale>The workflow index must list only workflow entry documents, excluding per-phase files.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a workflows folder containing entry and phase files When: indexed with required tag `workflow` Then: only entry files appear.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-GEN-0004" type="FR" level="System" ticketId="" classification="technical">
  <title>Index heading normalization</title>
  <statement>The generator shall title a generated index by a canonical display name, mapping workflow-equivalent folder names (`commands`, `prompts`) to the same display name as `workflows`.</statement>
  <rationale>The workflow index must read identically regardless of the IDE-specific physical folder name.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: folder `commands` or `prompts` When: indexed Then: the heading reads `# Rosetta Workflows Index`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Template rendering

<req id="FR-GEN-0010" type="FR" level="System" ticketId="" classification="technical">
  <title>Render Handlebars templates</title>
  <statement>Where a target declares templates, the generator shall render each Handlebars template file to a sibling output file with the template suffix removed, using a context of release variables plus per-target bootstrap payload values.</statement>
  <rationale>Hook configuration is generated from templates parameterized by release and per-target bootstrap content.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `hooks/hooks.json.tmpl` When: rendered Then: `hooks/hooks.json` is produced.</criteria>
    <criteria>Given: a declared template that is missing When: rendering Then: a warning is emitted and the run continues.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-GEN-0011" type="FR" level="System" ticketId="" classification="technical">
  <title>Raw injection and release conditionals</title>
  <statement>The generator shall inject bootstrap payload values into templates without escaping (raw), and shall support release-driven conditional blocks keyed on release variables, such that rendered configuration is valid for both the deterministic-hooks and non-deterministic-hooks releases.</statement>
  <rationale>Bootstrap payloads are pre-escaped JSON fragments; advisory hook blocks appear only for deterministic-hook releases.</rationale>
  <source>Documentation</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a raw-injection placeholder When: rendered Then: the JSON fragment is inserted verbatim.</criteria>
    <criteria>Given: a `deterministic_hooks` conditional block When: rendered for r2 Then: the result is valid JSON without advisory blocks; for r3 Then: advisory blocks are present and the result is valid JSON.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <notes>Re-implementation must use a Handlebars engine whose triple-stache raw-injection and `{{#if}}` semantics match (Node `handlebars`).</notes>
</req>
