# plugin-generator — FR: Tree Reset, Copy, Normalization, Renames

## Reset

<req id="FR-COPY-0001" type="FR" level="System" ticketId="" classification="technical">
  <title>Reset generated content, preserve config</title>
  <statement>Before generating a target, the generator shall remove all content in the target's output except its preserved config folder and preserved files, and shall create the output directory if absent.</statement>
  <rationale>Each run starts from a clean state while keeping the IDE manifest and other non-generated config.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a populated target output When: reset Then: only the preserved config folder and preserved files remain.</criteria>
    <criteria>Given: a non-existent output When: reset Then: the directory is created and the run proceeds.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>DATA-CFG-0002</depends>
</req>

## Copy and content adaptation

<req id="FR-COPY-0010" type="FR" level="System" ticketId="" classification="technical">
  <title>Copy instruction source into target</title>
  <statement>The generator shall copy every file from the resolved instruction source into the target output, preserving relative structure except where renames apply, and shall skip operating-system artifact files.</statement>
  <rationale>The instruction content is the payload of every plugin.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a source tree When: copied Then: all non-artifact files appear in the target at their (possibly renamed) paths.</criteria>
    <criteria>Given: a `.DS_Store` file in source When: copied Then: it is omitted.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-COPY-0011" type="FR" level="System" ticketId="" classification="technical">
  <title>Exclude designated rule files</title>
  <statement>The generator shall not copy instruction source files on the excluded-rule list into any target.</statement>
  <rationale>Certain bootstrap rule files are delivered via hooks, not as copied files.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `rules/bootstrap.md` or `rules/local-files-mode.md` in source When: copied Then: it is absent from the target.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-COPY-0012" type="FR" level="System" ticketId="" classification="technical">
  <title>Preserve file timestamps and metadata</title>
  <statement>The generator shall preserve source file metadata (timestamps) on copied files.</statement>
  <rationale>Stable metadata supports change detection downstream.</rationale>
  <source>Sources</source>
  <priority>Could</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a copied file When: inspected Then: its modification time matches the source.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Model normalization

<req id="FR-COPY-0020" type="FR" level="System" ticketId="" classification="technical">
  <title>Normalize model identifiers per IDE</title>
  <statement>Where a target requires model normalization, the generator shall rewrite each markdown document's frontmatter `model:` value into that target's model vocabulary, selecting the first model from a comma-separated list.</statement>
  <rationale>Each IDE accepts only its own model identifier format; the first listed model is the intended primary.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `model: opus,gpt-5.4` for Cursor When: normalized Then: the value becomes `claude-opus-4-6`.</criteria>
    <criteria>Given: a document without frontmatter When: processed Then: content is unchanged.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>DATA-CFG-0004</depends>
</req>

<req id="FR-COPY-0021" type="FR" level="System" ticketId="" classification="technical">
  <title>Claude model normalization with fallback</title>
  <statement>For the Claude vocabulary, the generator shall map a model value to one of the allowed short names, inferring from substrings where not an exact match, and shall fall back to `inherit` when no mapping applies.</statement>
  <rationale>Claude Code accepts only `opus`/`sonnet`/`haiku`/`inherit`.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `claude-sonnet-4-6` When: normalized for Claude Then: result is `sonnet`.</criteria>
    <criteria>Given: an unrecognized value When: normalized for Claude Then: result is `inherit`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-COPY-0022" type="FR" level="System" ticketId="" classification="technical">
  <title>Codex model and reasoning-effort split</title>
  <statement>For the Codex vocabulary, the generator shall select the first `gpt-*` model from a comma-separated list, separate a trailing reasoning-effort suffix into a distinct effort value when present, and emit no model when none qualifies.</statement>
  <rationale>Codex requires an OpenAI model and a separate reasoning-effort field.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: `gpt-5.3-codex-high` When: normalized for Codex Then: model is `gpt-5.3-codex` and effort is `high`.</criteria>
    <criteria>Given: a value with no `gpt-` entry When: normalized for Codex Then: no model is produced.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Renames and reference rewriting

<req id="FR-COPY-0030" type="FR" level="System" ticketId="" classification="technical">
  <title>Folder renames</title>
  <statement>Where a target declares folder renames, the generator shall place affected files under the renamed top-level folder in the output.</statement>
  <rationale>IDEs expect workflow content under IDE-specific folder names (e.g. `commands`, `prompts`).</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: rename `workflows`→`commands` When: generated Then: source `workflows/x.md` lands at `commands/x.md`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-COPY-0031" type="FR" level="System" ticketId="" classification="technical">
  <title>Pattern-based file renames</title>
  <statement>Where a target declares file-rename patterns, the generator shall rename matching files in the output according to the pattern's replacement.</statement>
  <rationale>IDEs require specific file suffixes (e.g. `.mdc`, `.prompt.md`, `.agent.md`).</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: pattern `rules/(.+)\.md`→`\1.mdc` When: generated Then: `rules/x.md` lands at `rules/x.mdc`.</criteria>
    <criteria>Given: a Copilot agent file When: generated Then: `agents/x.md` lands at `agents/x.agent.md`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-COPY-0032" type="FR" level="System" ticketId="" classification="technical">
  <title>Precise content reference rewriting</title>
  <statement>When folder or file renames apply, the generator shall rewrite cross-references inside copied markdown using exact full-path replacement so that only renamed paths change, and shall also update bare folder references for renamed folders.</statement>
  <rationale>Instruction text references other instruction files by path; references must follow the rename without corrupting partial-word matches.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a reference `workflows/coding-flow.md` and rename to `commands` When: rewritten Then: it becomes `commands/coding-flow.md`.</criteria>
    <criteria>Given: a bare reference `workflows/` When: rewritten Then: it becomes `commands/`.</criteria>
    <criteria>Given: an unrelated word containing the folder name as a substring When: rewritten Then: it is unchanged.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-COPY-0033" type="FR" level="System" ticketId="" classification="technical">
  <title>Pre-copied alternate-name folders</title>
  <statement>Where a target declares pre-copied folders, the generator shall copy the named source folders under their alternate output names with model normalization applied and without content reference rewriting or file renames.</statement>
  <rationale>Some targets need a duplicate of a source folder under a different name before the main rename pass.</rationale>
  <source>Sources</source>
  <priority>Could</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a pre-copy mapping When: generated Then: the alternate-named folder exists with frontmatter models normalized.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-COPY-0034" type="FR" level="System" ticketId="" classification="technical">
  <title>Pre-move files</title>
  <statement>Where a target declares pre-move rules, the generator shall move matching files into a destination subfolder under a renamed filename.</statement>
  <rationale>Some IDEs require certain rule files relocated into a dedicated folder.</rationale>
  <source>Sources</source>
  <priority>Should</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a pre-move mapping `rules/bootstrap-*.md`→`instructions/*.instructions.md` When: applied Then: matching files move and are renamed accordingly.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>
