# plugin-generator — FR: Per-Target Structure, Reasoning, and Bootstrap Delivery

Per-target requirements: required output structure, **why each target is shaped that way**, and how each delivers the bootstrap context. Generation is uniform (FR-CLI-0040); these state per-target *outcomes and rationale*, never derivation mechanics. IDs keep the stable `FR-VAR-*` prefix; new cross-cutting units use the same series.

## Bootstrap delivery — the cross-cutting dimension

Each IDE consumes bootstrap context differently, so each target declares a **delivery strategy**:
- **SessionStart hooks** — bootstrap bodies are injected at session start via the IDE's hook mechanism. Used where the IDE has no always-on auto-load for this content (Claude, Codex, and the marketplace Cursor/Copilot forms).
- **Native rules** — the IDE auto-loads rule files, so bootstrap is delivered as rules and no SessionStart bootstrap hook is needed (Cursor-standalone, via `.mdc` rules).
- **Auto-loaded instructions** — the IDE auto-loads instruction files (`applyTo: "**"`), so bootstrap is delivered as instructions and no SessionStart bootstrap hook is needed (Copilot-standalone).

This is why some targets carry full bootstrap hook payloads and others deliver the same content through rules/instructions instead — see the authoritative per-IDE guides (REFERENCES.md, INT-IDE-0002).

<req id="FR-VAR-0070" type="FR" level="System" ticketId="" classification="technical">
  <title>Per-target bootstrap-delivery strategy</title>
  <statement>Each target shall declare exactly one bootstrap-delivery strategy — session-start hooks, native rules, or auto-loaded instructions — and a target whose IDE natively auto-loads rules or instructions shall not also carry session-start bootstrap hooks for the same content.</statement>
  <rationale>Avoids double-delivery and matches each IDE's documented capability; the strategy, not the mechanics, is the requirement.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: a target using native rules/instructions for bootstrap When: generated Then: it carries no session-start bootstrap hook for that content.</criteria>
    <criteria>Given: a target using session-start hooks When: generated Then: bootstrap content is delivered via those hooks.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>INT-IDE-0002, FR-HOOK-0004</depends>
</req>

<req id="FR-VAR-0071" type="FR" level="System" ticketId="" classification="technical">
  <title>Two hook-template forms for in-repo distributions</title>
  <statement>A target that has a separate in-repo (standalone) distribution shall provide both a marketplace-form and a standalone-form hook template, so each distribution references hooks by paths valid in its runtime location.</statement>
  <rationale>Marketplace install and in-repo extraction resolve hook paths from different roots; one template form cannot serve both.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: Cursor or Copilot When: generated Then: both a marketplace-form and a standalone-form hook template are produced.</criteria>
    <criteria>Given: a target with no separate in-repo distribution When: generated Then: a single hook-template form suffices.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

<req id="FR-VAR-0072" type="FR" level="System" ticketId="" classification="technical">
  <title>Standalone index/instruction injection rationale</title>
  <statement>Where a standalone target delivers bootstrap through native rules or auto-loaded instructions, the generator shall ensure the workflow index and the plugin-root instructions are present in that natively-loaded file, inserted via the `pluginInjectSections()` processor (FR-ARCH-0051).</statement>
  <rationale>A standalone carries no session-start hook to convey the workflow catalog or the plugin-root path, so that information must travel in the rule/instruction file the IDE auto-loads. The insertion is an explicit content-only processor, not an in-place edit bolted onto a derivation pass.</rationale>
  <source>User</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: Cursor-standalone When: generated Then: the commands index and plugin-root instructions appear in the auto-loaded rule file.</criteria>
    <criteria>Given: Copilot-standalone When: generated Then: the workflow index and plugin-root instructions appear in the auto-loaded instructions file.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-VAR-0070, FR-ARCH-0051</depends>
</req>

## Claude (`core-claude`) — marketplace

Native folder names, short model names, hooks, `.claude-plugin` manifest. Bootstrap via **session-start hooks** (no always-on rule auto-load for this payload); native dedup.

<req id="FR-VAR-0010" type="FR" level="System" ticketId="" classification="technical">
  <title>Claude output</title>
  <statement>The Claude variant shall contain instruction folders unchanged in name, model values in Claude short-name vocabulary, generated `rules` and `workflows` indexes, a rendered `hooks/hooks.json`, and a preserved `.claude-plugin` config folder.</statement>
  <rationale>Claude Code consumes native folder names, short model names, and a plugin manifest.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Claude variant When: generated Then: `rules/INDEX.md`, `workflows/INDEX.md`, and `hooks/hooks.json` exist and `.claude-plugin` is preserved.</criteria>
    <criteria>Given: a document model `claude-opus-4-6` When: generated Then: its model reads `opus`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>DATA-CFG-0003, FR-COPY-0021, FR-GEN-0001, FR-GEN-0010, FR-HOOK-0001, FR-VAR-0070</depends>
</req>

## Cursor (`core-cursor`) — marketplace

`workflows`→`commands`, `rules/*.md`→`*.mdc`, Cursor model vocabulary, two hook-template forms. Marketplace form delivers bootstrap via **session-start hooks**; the standalone derivative uses native rules (see FR-VAR-0050).

<req id="FR-VAR-0020" type="FR" level="System" ticketId="" classification="technical">
  <title>Cursor output</title>
  <statement>The Cursor variant shall rename `workflows` to `commands`, rename `rules/*.md` to `*.mdc`, use Cursor model vocabulary, generate `rules` and `commands` indexes, render both plugin-form and standalone-form hook templates, and preserve a `.cursor-plugin` config folder.</statement>
  <rationale>Cursor expects `commands/`, `.mdc` rules, mapped model identifiers, and two hook template forms.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Cursor variant When: generated Then: `commands/` exists, `rules/*.mdc` exist, and `commands/INDEX.md` reads `# Rosetta Workflows Index`.</criteria>
    <criteria>Given: a cross-reference to `workflows/x.md` When: generated Then: it reads `commands/x.md`.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-COPY-0030, FR-COPY-0031, FR-COPY-0032, FR-GEN-0004, FR-VAR-0071</depends>
</req>

## Copilot (`core-copilot`) — marketplace

`workflows`→`commands`, agents→`*.agent.md`, Copilot model vocabulary, runtime config at plugin root, `.github` preserved. Bootstrap via **session-start hooks** with a per-entry dedup lock (Copilot fires hooks twice).

<req id="FR-VAR-0030" type="FR" level="System" ticketId="" classification="technical">
  <title>Copilot output</title>
  <statement>The Copilot variant shall rename `workflows` to `commands`, rename agent files to `*.agent.md`, use Copilot model vocabulary, generate `rules` and `commands` indexes, render hook templates, place runtime configuration at the plugin root (the root copy expressed as a `SpecEntry`/`fileRename()` target, not a bespoke layout step), and preserve a `.github` config folder.</statement>
  <rationale>Copilot expects `*.agent.md` agents, mapped model names, and root-level runtime config. The root placement of the runtime config is a declared output path, not an imperative `generate_copilot_runtime_layout` move.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Copilot variant When: generated Then: agent files end in `.agent.md` and runtime config exists at the plugin root.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-COPY-0031, FR-HOOK-0006, FR-VAR-0071</depends>
</req>

## Codex (`core-codex`) — marketplace

Agents → TOML subagents; instruction folders under the Codex agent-config root; hooks mirrored to the Codex runtime location; `.codex-plugin` preserved. Bootstrap via **session-start hooks**.

<req id="FR-VAR-0040" type="FR" level="System" ticketId="" classification="technical">
  <title>Codex agents as subagents</title>
  <statement>The Codex variant shall convert each source agent document into the Codex subagent format defined by the Codex guide (INT-IDE-0002), deriving the subagent's sandbox mode from the agent's read-only flag, and shall not retain a plain `agents` folder.</statement>
  <rationale>Codex consumes subagents in its own format with a sandbox mode, not markdown; the exact format is owned by the Codex guide.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: an agent with `readonly: true` When: converted Then: its subagent sets a read-only sandbox mode; otherwise workspace-write.</criteria>
    <criteria>Given: generation completes When: inspected Then: subagent definitions exist under the Codex agents location and no markdown `agents` folder remains.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-ARCH-0044, INT-IDE-0002</depends>
</req>

<req id="FR-VAR-0041" type="FR" level="System" ticketId="" classification="technical">
  <title>Codex directory layout</title>
  <statement>The Codex variant shall place instruction folders under the Codex agent-config root (`.agents/…`) by `SpecEntry` `target` placement (with `fileRename()` where filenames also change) rather than a post-hoc move pass, mirror hook configuration to the Codex runtime location, generate `rules` and `workflows` indexes, and preserve a `.codex-plugin` config folder.</statement>
  <rationale>Codex resolves instructions and hooks from specific reserved directories. Expressing the layout as each file's `fileRename()` target keeps it within the uniform pipeline (no `generate_codex_runtime_layout`-style imperative move of whole folders).</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Codex variant When: generated Then: instruction folders reside under the Codex agent-config root and hook config is mirrored to the Codex runtime location.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>

## Cursor standalone (`core-cursor-standalone`) — in-repo extraction

All content under `.cursor/`; bootstrap delivered via **native Cursor rules** (`.mdc`) — no session-start bootstrap hook; standalone-form hooks at `.cursor/hooks.json`.

<req id="FR-VAR-0050" type="FR" level="System" ticketId="" classification="technical">
  <title>Cursor standalone output</title>
  <statement>The Cursor-standalone variant shall be generated from the instruction source by the same uniform pipeline as every other target (not derived from `core-cursor`'s output), with Cursor adaptations laid out entirely under `.cursor/`: a standalone-form hook configuration, the commands index and plugin-root instructions injected (via `pluginInjectSections()`) into the plugin-files-mode rule, no plugin-marketplace-only templates or config (simply not emitted — no cleanup pass), and a generated plugin manifest.</statement>
  <rationale>In-repo extraction needs IDE-rooted paths and rule-delivered bootstrap. Generating directly from source — rather than deriving from the main plugin — removes the coupling AC-1 identifies as the root of repeated standalone defects (and the `.cursor/.cursor/` self-nesting guard, QF-4).</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Cursor-standalone variant When: generated Then: all content sits under the IDE subfolder with a top-level standalone hook config and no marketplace-only template files.</criteria>
    <criteria>Given: the Cursor-standalone target generated in isolation When: complete Then: its output is complete and correct.</criteria>
    <criteria>Given: the generation design When: inspected Then: the standalone is produced from the instruction source, not by reading `core-cursor`'s output.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-CLI-0040, FR-SEED-0002, FR-VAR-0070, FR-VAR-0072, FR-ARCH-0051</depends>
</req>

## Copilot standalone (`core-copilot-standalone`) — in-repo extraction

All content under `.github/`; bootstrap delivered via **auto-loaded instructions** (`instructions/*.instructions.md`, `applyTo: "**"`) — no session-start bootstrap hook; workflows as `prompts/*.prompt.md`; nested standalone hooks.

<req id="FR-VAR-0051" type="FR" level="System" ticketId="" classification="technical">
  <title>Copilot standalone output</title>
  <statement>The Copilot-standalone variant shall be generated from the instruction source by the same uniform pipeline as every other target (not derived from `core-copilot`'s output), with Copilot adaptations laid out entirely under `.github/`: bootstrap rules relocated (via a relocation `SpecEntry` `target` and `fileRename()`) to auto-loaded instruction files, workflow content under `prompts` with `*.prompt.md` names, nested standalone hook configuration, regenerated indexes, plugin instructions injected (via `pluginInjectSections()`), no plugin-marketplace-only config (simply not emitted — no cleanup pass), and a generated plugin manifest.</statement>
  <rationale>Copilot in-repo extraction auto-loads instructions and expects `prompts/*.prompt.md`. Generating directly from source removes the derive-from-main coupling (AC-1); relocation is `fileRename()` and injection is `pluginInjectSections()`, not pre/post-cleanup passes.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: the Copilot-standalone variant When: generated Then: bootstrap rules appear as `instructions/*.instructions.md`, workflows appear as `prompts/*.prompt.md`, and nested standalone hook config exists.</criteria>
    <criteria>Given: the Copilot-standalone target generated in isolation When: complete Then: its output is complete and correct.</criteria>
    <criteria>Given: the generation design When: inspected Then: the standalone is produced from the instruction source, not by reading `core-copilot`'s output.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-CLI-0040, FR-SEED-0002, FR-VAR-0070, FR-VAR-0072, FR-ARCH-0043, FR-ARCH-0051</depends>
</req>

## All standalones

<req id="FR-VAR-0060" type="FR" level="System" ticketId="" classification="technical">
  <title>Standalone plugin manifest</title>
  <statement>Each standalone variant shall carry a plugin manifest naming the variant and the version taken from the parent target's preserved manifest.</statement>
  <rationale>Distribution requires a manifest with a consistent version, drawn from the parent target's committed manifest.</rationale>
  <source>Sources</source>
  <priority>Must</priority>
  <status>Approved</status>
  <approved_by>User</approved_by>
  <changed>2026-06-04</changed>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a standalone variant When: generated Then: its manifest version equals the parent target's manifest version.</criteria>
  </acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
  <depends>FR-SEED-0002</depends>
</req>
