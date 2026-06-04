# plugin-generator — Glossary

One meaning per term. Used consistently across all requirement files.

- **Release** — A versioned line of instructions (`r2`, `r3`). Selects the instruction source line and a set of template variables. Default `r2` (`scripts/plugin_generator.py:52`, `:69`).
- **Domain** — The layer folder under a release that holds instruction content (`core`, or an organization overlay such as `acme`). Default `core`. The instruction source resolves to `instructions/<release>/<domain>/`. (New parameter; replaces the hardcoded `core` at `scripts/plugin_generator.py:71`.)
- **Instruction source** — The resolved, possibly merged, tree of instruction files (`agents/`, `rules/`, `skills/`, `workflows/`, `configure/`, `templates/`) used as input for every target.
- **Layer merge** — Combining a base domain with one or more overlay domains so overlay files override or extend base files at the same relative path, mirroring the server-side Bundler. (New capability.)
- **Plugin variant / Target** — One generated distribution for one IDE delivery mode: `core-claude`, `core-cursor`, `core-copilot`, `core-codex`, `core-cursor-standalone`, `core-copilot-standalone`.
- **Standalone** — A target whose output is laid out under the IDE's in-repo subfolder (`.cursor/`, `.github/`) for direct extraction into a project, as opposed to marketplace installation. Differs from a "main" target only by its transform spec and output layout, not by how it is generated.
- **Preserved path** — A folder or file inside a target's output that survives the pre-generation wipe (the IDE manifest/config folder and, where applicable, the `hooks` folder) (`scripts/plugin_generator.py:107`, `:135`).
- **Model normalization** — Rewriting a source document's frontmatter `model:` value into the target IDE's model vocabulary (`scripts/plugin_generator.py:175`–`:217`).
- **Agent file** — A document under `agents/<name>.md` describing a subagent (`scripts/plugin_generator.py:840`).
- **Bootstrap files** — The ordered set of rule/index documents whose stripped bodies are embedded into a target's session-start context (`scripts/plugin_generator.py:501`).
- **Bootstrap context payload** — The per-target, IDE-shaped session-start hook entries that inject bootstrap file bodies into the agent's context (`scripts/plugin_generator.py:561`).
- **Bootstrap prefix** — A fixed lead-in string attached to the first bootstrap document of each target (`scripts/plugin_generator.py:21`).
- **Template** — A Handlebars source file (`*.tmpl`) rendered to a sibling file with the `.tmpl` suffix removed, using release variables plus bootstrap payload values (`scripts/plugin_generator.py:671`).
- **Hook bundle** — A pre-compiled per-IDE runtime hook artifact consumed from `hooks/dist/` and copied into a target's hook folder (`scripts/plugin_generator.py:1184`).
- **Deterministic hooks** — A per-release flag selecting whether advisory runtime hooks (and their bundles) are included (`r2`: off; `r3`: on) (`scripts/plugin_generator.py:72`–`:81`).
- **Folder index** — A generated `INDEX.md` listing a folder's documents with descriptions, used as a table of contents (`scripts/plugin_generator.py:707`).
- **Transform spec** — The declarative per-target description of all adaptations (renames, normalizations, generated indexes, templates, layouts) applied to produce that target. See `MODEL.md`.
- **VirtualFile** — One entry in the VFS: a single prospective output file at a VFS path, holding an ordered collection of `SourceFile`s plus, during processing, its resolved target path, binary flag, and target contents. Class name: `VirtualFile`. (Rewrite term; use instead of the bare word "file".)
- **SourceFile** — One physical source file contributing to a `VirtualFile`: carries its absolute origin path, frontmatter, order key, and conditions. Class name: `SourceFile`. (Rewrite term.)
- **target_contents** — The resolved content a `write()` would emit for a `VirtualFile`, with three distinct states: `null` = content removed (no file is written); `""` = file is written with empty main content (optional frontmatter only); a string or byte array = file is written with that content.

## Canonical type names (rewrite)

Precise terminology applies to **every** concept, not only files (FR-ARCH-0003). Each concept below maps to one named type:

- **PluginTarget** — one generated distribution (the six variants). Use instead of bare "plugin"/"target".
- **PluginSpec** — a `PluginTarget`'s full specification: an ordered list of `SpecEntry`.
- **SpecEntry** — `{source: glob, target: folder, processors: ProcessorPipeline}`.
- **Processor** — one pure pipeline stage operating on a `ProcessingFrame` (`read`, `apply_overrides`, `bundle`, `normalize_models`, `rename`, `generate_index`, `render_template`, `codex_agent_format`, `write`).
- **ProcessorPipeline** — an ordered list of `Processor`s.
- **ProcessingFrame** — the mutable working object passed through a `ProcessorPipeline`: `{path, target, isBinary, target_contents, source: SourceFile[]}`. Distinct from the immutable `VirtualFile`.
- **VirtualFile** — an immutable VFS entry `{path, sourceFiles: SourceFile[]}` (defined above).
- **SourceFile** — a contributing physical source file (defined above).
- **FilenameDirective** — the bracketed `[…]` segment in a source filename.
- **DirectiveToken** — one token inside a `FilenameDirective`; kinds: `OrderToken`, `TargetOnlyToken`, `OverwriteToken`.
- **SourceFileConditions** — the resolved conditions on a `SourceFile` (e.g. overwrite, target scoping) derived from its `DirectiveToken`s.
- **ModelVocabulary** — a per-IDE map from logical model key to that IDE's model identifier.
- **Release**, **Domain** — defined above; each is a named type.
