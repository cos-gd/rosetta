# plugin-generator — FR: Bootstrap Context Payloads and Hook Bundles

## Bootstrap context payload assembly

<req id="FR-HOOK-0001" type="FR" level="System" ticketId="" classification="technical">
  <title>Assemble per-target bootstrap context entries</title>
  <statement>For each target, the generator shall build session-start context entries from the target's present bootstrap files, reading each file from the target's own output, and shall make these entries available to template rendering.</statement>
  <rationale>Each plugin injects the bootstrap rules into the agent's context at session start, in the IDE's hook format.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a target containing a subset of bootstrap files When: assembled Then: only present files yield entries; absent variants are skipped.</criteria>
    <criteria>Given: the assembled entries When: rendering Then: they are exposed as per-target payload values.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-HOOK-0002" type="FR" level="System" ticketId="" classification="technical">
  <title>Strip frontmatter from bootstrap bodies</title>
  <statement>The generator shall embed only the body of each bootstrap document, excluding its frontmatter.</statement>
  <rationale>Frontmatter is authoring metadata, not agent context.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a bootstrap document with frontmatter When: embedded Then: the payload contains only the body.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-HOOK-0003" type="FR" level="System" ticketId="" classification="technical">
  <title>Bootstrap prefix on the lead document</title>
  <statement>The generator shall prepend the fixed bootstrap prefix to exactly one designated bootstrap document per target.</statement>
  <rationale>The prefix instructs the agent to read the full bootstrap context first.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a target's bootstrap files When: assembled Then: the prefix appears once, on the designated lead document.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-HOOK-0004" type="FR" level="System" ticketId="" classification="technical">
  <title>Bootstrap/index inclusion flags</title>
  <statement>The generator shall include bootstrap-rule entries and index entries in a target's payload only where that target enables each respectively.</statement>
  <rationale>Some targets deliver bootstrap via copied rules/instructions instead of hook context.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a target with bootstrap inclusion disabled When: assembled Then: no bootstrap-rule entries are produced.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-HOOK-0005" type="FR" level="System" ticketId="" classification="technical">
  <title>Per-IDE entry shape and escaping</title>
  <statement>The generator shall emit each bootstrap entry in the target IDE's hook schema as documented in that IDE's guide (INT-IDE-0002), applying the escaping required for that IDE's command interpreter so the embedded content is transported intact.</statement>
  <rationale>Each IDE expects a different hook schema and quoting; the exact schema is owned by the IDE guide, not duplicated here.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any target When: assembled Then: each entry conforms to that IDE's session-start hook schema per its guide, with content transported intact.</criteria>
    <criteria>Given: a target whose command interpreter requires it When: assembled Then: entries carry the interpreter-specific command form(s) with correct escaping.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>INT-IDE-0002</depends>
</req>

<req id="FR-HOOK-0006" type="FR" level="System" ticketId="" classification="technical">
  <title>Once-per-session delivery</title>
  <statement>The generator shall ensure each bootstrap entry takes effect at most once per session, using the IDE's native deduplication where available and a generated per-entry guard for IDEs that lack it.</statement>
  <rationale>Repeated bootstrap injection wastes context; Copilot fires hooks twice.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: Claude When: assembled Then: entries carry the native once flag.</criteria>
    <criteria>Given: an IDE lacking native deduplication When: assembled Then: entries carry a per-entry session guard.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-HOOK-0007" type="FR" level="System" ticketId="" classification="technical">
  <title>Plugin-path context entry</title>
  <statement>The generator shall append to each target a session-start entry that reports the resolved plugin root path to the agent.</statement>
  <rationale>Agents need the plugin root to resolve instruction file paths at runtime.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any target When: assembled Then: its payload includes a plugin-root path entry in that IDE's shape.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-HOOK-0008" type="FR" level="System" ticketId="" classification="technical">
  <title>Reference rewriting of payload paths</title>
  <statement>The generator shall apply the target's path renames to the bootstrap payload string values before template rendering.</statement>
  <rationale>Bootstrap text references instruction folders that may be renamed for the target.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a Cursor target renaming `workflows`→`commands` When: payloads are rendered Then: payload references read `commands/…`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Hook bundle synchronization

<req id="FR-HOOK-0020" type="FR" level="System" ticketId="" classification="technical">
  <title>Deterministic-hooks gating</title>
  <statement>Where the selected release enables deterministic hooks, the generator shall place hook bundles into each target; otherwise it shall remove any stale hook bundle artifacts from preserved hook folders.</statement>
  <rationale>Only deterministic-hook releases ship runtime advisory hook code; other releases must stay lean.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: release r3 When: generated Then: each target's hook folder contains the compiled bundles and shared assets.</criteria>
    <criteria>Given: release r2 When: generated Then: no compiled bundle artifacts remain in hook folders.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>DATA-CFG-0001</depends>
</req>

<req id="FR-HOOK-0021" type="FR" level="System" ticketId="" classification="technical">
  <title>Bundle source presence check</title>
  <statement>If deterministic hooks are required but the compiled hook build output is absent, the generator shall report the missing build and contribute a non-zero exit status.</statement>
  <rationale>Hooks must be built before generation; a clear error guides the operator.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: missing `hooks/dist` build output and a deterministic-hooks release When: generated Then: stderr names the missing build and exit status is non-zero.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>AC-3</depends>
</req>

<req id="FR-HOOK-0022" type="FR" level="System" ticketId="" classification="technical">
  <title>Preserve unmanaged hook-folder files on sync</title>
  <statement>When placing hook bundles, the generator shall replace only files supplied by the bundle and shared assets, preserving other files already present in the target's hook folder.</statement>
  <rationale>Generated hook configuration and manifests coexist with bundle code in the same folder.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a hook folder with a rendered `hooks.json` When: bundles are synced Then: `hooks.json` remains and bundle files are added/replaced.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>
