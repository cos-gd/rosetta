# plugin-generator — Configuration Contract (DATA)

The generator is data-driven: a future release, domain, or IDE is added by editing descriptors, not control flow. These descriptors are the contract a re-implementation must reproduce. Field names are normative concepts, not required identifiers.

<req id="DATA-CFG-0001" type="DATA" level="System" ticketId="" classification="technical">
  <title>Release descriptor</title>
  <statement>A release descriptor shall define: a release name; the instruction source line it draws from; and a set of template variables handed verbatim to template rendering. The template-variable set shall be the single source of per-release configuration.</statement>
  <rationale>Adding a release must be one descriptor entry; generator code stays release-agnostic.</rationale>
  <source>Documentation</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the known releases When: inspected Then: `r2` carries `deterministic_hooks=false` and `r3` carries `deterministic_hooks=true`, each carrying its own `release` name value.</criteria>
    <criteria>Given: a new release When: a descriptor entry is added Then: generation succeeds with no other code change.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <notes>Template variables currently observed: `release` (name) and `deterministic_hooks` (bool).</notes>
</req>

<req id="DATA-CFG-0002" type="DATA" level="System" ticketId="" classification="technical">
  <title>Plugin-target descriptor</title>
  <statement>Each plugin-target descriptor shall declare, as data, every adaptation needed to produce that target: target name; output location; preserved config folder and preserved files; the model vocabulary to normalize into; agent-file format; folder renames; file renames; pre-copied folders; generated index folders; templates to render; bootstrap-context inclusion flags; hook folder location; and any runtime-layout transforms.</statement>
  <rationale>Uniform, declarative target definition lets every variant be generated the same way.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the six variants When: each is generated Then: only its descriptor differs; the generation procedure is identical.</criteria>
    <criteria>Given: a descriptor omitting an optional adaptation When: generated Then: that adaptation is skipped without error.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <notes>Main-target fields: name, destination, preserved_folder, preserved_files, normalize_models, copilot_models, cursor_models, codex_models, rename_agents, rename_folders, rename_files, pre_copy_folders, pre_move_files, generated_indexes, include_bootstrap_in_hooks, include_indexes_in_hooks, templates, hook_subdir, runtime_asset_subdirs.</notes>
</req>

<req id="DATA-CFG-0003" type="DATA" level="System" ticketId="" classification="technical">
  <title>Target inventory</title>
  <statement>The generator shall define exactly six targets: `core-claude`, `core-cursor`, `core-copilot`, `core-codex`, `core-cursor-standalone`, `core-copilot-standalone`.</statement>
  <rationale>Fixed, known delivery set per supported IDE and mode.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a generation run When: complete Then: the output directory contains all six target folders.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <notes>Each main target's preserved config folder: core-claude `.claude-plugin`, core-cursor `.cursor-plugin`, core-copilot `.github`, core-codex `.codex-plugin`.</notes>
</req>

<req id="DATA-CFG-0004" type="DATA" level="System" ticketId="" classification="technical">
  <title>Model vocabularies</title>
  <statement>The generator shall hold one model-vocabulary mapping per IDE that uses named or mapped model identifiers, keyed by a release-neutral logical model key.</statement>
  <rationale>Each IDE accepts a different model identifier format for the same underlying model.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Draft</status>
  <approved_by></approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: logical key `sonnet` When: normalized Then: Claude→`sonnet`, Cursor→`claude-sonnet-4-6`, Copilot→`Claude Sonnet 4.6`.</criteria>
    <criteria>Given: a `gpt-*` value When: normalized for Codex Then: a base model and optional reasoning-effort are derived.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <notes>Mapping values (model version strings) are content/config, expected to change over time; the mapping mechanism is the requirement, not the specific strings.</notes>
</req>
