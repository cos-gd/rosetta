// DATA-CFG-0002/0003 — the six PluginSpec values
// FR-VAR-0010–0072, FR-SEED-0001/0002, FR-COPY-0011

import path from 'path';
import { fileURLToPath } from 'url';
import type { PluginSpec, SpecEntry } from '../types.js';
import {
  CLAUDE_VOCABULARY,
  CURSOR_VOCABULARY,
  COPILOT_VOCABULARY,
  CODEX_VOCABULARY,
} from './model-maps.js';
import { BOOTSTRAP_MANIFEST_ORDER } from './bootstrap-manifest.js';
import { fileRead } from '../file-processors/file-read.js';
import { fileApplyOverrides } from '../file-processors/file-apply-overrides.js';
import { fileBundle } from '../file-processors/file-bundle.js';
import { fileNormalizeModels } from '../file-processors/file-normalize-models.js';
import { fileRename } from '../file-processors/file-rename.js';
import { fileCodexAgentFormat } from '../file-processors/file-codex-agent.js';
import { pluginCleanup } from '../plugin-processors/plugin-cleanup.js';
import { pluginCopy } from '../plugin-processors/plugin-copy.js';
import { pluginProcessSpecEntries } from '../plugin-processors/plugin-process-spec-entries.js';
import { pluginRewriteReferences } from '../plugin-processors/plugin-rewrite-references.js';
import { pluginGenerateIndexes } from '../plugin-processors/plugin-generate-indexes.js';
import { pluginInjectSections } from '../plugin-processors/plugin-inject-sections.js';
import { pluginAssembleBootstrap } from '../plugin-processors/plugin-assemble-bootstrap.js';
import { pluginRenderTemplates } from '../plugin-processors/plugin-render-templates.js';
import { pluginMirrorFiles } from '../plugin-processors/plugin-mirror-files.js';
import { pluginSyncBundles } from '../plugin-processors/plugin-sync-bundles.js';
import { pluginWrite } from '../plugin-processors/plugin-write.js';
import type { ReleaseDescriptor } from '../types.js';

// Standard excludes (FR-COPY-0011, GT-8)
const RULES_EXCLUDES = ['rules/bootstrap.md', 'rules/local-files-mode.md'];
// FR-COPY-0011, GT-8: exclude entire templates/shell-schemas/** folder (authoring-only schemas)
const TEMPLATES_EXCLUDES = ['templates/shell-schemas/**'];

// Base processors shared across all text file entries
const BASE_PROCESSORS = [fileRead, fileApplyOverrides, fileBundle];

// --- Spec builders (called at generate time with resolved sources + release) ---

// FR-CLI-0020: all source roots are resolved externally (from --source + overrides) and passed in.
export interface SpecBuildContext {
  pluginsSource: string;  // absolute path to plugin preserved-files root (FR-CLI-0020)
  hooksSource: string;    // absolute path to hooks root for bundle sync (FR-CLI-0020)
  outputDir: string;
  release: ReleaseDescriptor;
  /** FR-CLI-0050: when true, all pipeline processors skip disk writes */
  dryRun?: boolean;
}

// ─── Standard SpecEntries builders ──────────────────────────────────────────

function makeRulesEntry(normalizeModels: typeof fileNormalizeModels): SpecEntry {
  return {
    source: 'rules/**',
    target: 'rules',
    exclude: RULES_EXCLUDES,
    processors: [...BASE_PROCESSORS, normalizeModels],
  };
}

function makeWorkflowsEntry(
  normalizeModels: typeof fileNormalizeModels,
  targetFolder = 'workflows',
  renameExt?: [string, string],
): SpecEntry {
  const processors = [...BASE_PROCESSORS, normalizeModels];
  if (renameExt) {
    processors.push(fileRename(renameExt[0], renameExt[1]));
  }
  return {
    source: 'workflows/**',
    target: targetFolder,
    exclude: [],
    processors,
  };
}

function makeAgentsEntry(
  normalizeModels: typeof fileNormalizeModels,
  targetFolder = 'agents',
  renameExt?: [string, string],
): SpecEntry {
  const processors = [...BASE_PROCESSORS, normalizeModels];
  if (renameExt) {
    processors.push(fileRename(renameExt[0], renameExt[1]));
  }
  return {
    source: 'agents/**',
    target: targetFolder,
    exclude: [],
    processors,
  };
}

function makeSkillsEntry(normalizeModels: typeof fileNormalizeModels, targetFolder = 'skills'): SpecEntry {
  return {
    source: 'skills/**',
    target: targetFolder,
    exclude: [],
    processors: [...BASE_PROCESSORS, normalizeModels],
  };
}

function makeConfigureEntry(targetFolder = 'configure'): SpecEntry {
  return {
    source: 'configure/**',
    target: targetFolder,
    exclude: [],
    processors: [...BASE_PROCESSORS],
  };
}

function makeTemplatesEntry(targetFolder = 'templates', normalizeModels?: typeof fileNormalizeModels, extraExcludes: string[] = []): SpecEntry {
  const processors = normalizeModels ? [...BASE_PROCESSORS, normalizeModels] : [...BASE_PROCESSORS];
  return {
    source: 'templates/**',
    target: targetFolder,
    // FR-COPY-0011, GT-8: exclude shell-schemas folder (authoring-only, not shipped)
    exclude: [...TEMPLATES_EXCLUDES, ...extraExcludes],
    processors,
  };
}

// ─── Factory function for all six PluginSpecs ──────────────────────────────

export function buildAllSpecs(ctx: SpecBuildContext): PluginSpec[] {
  const { pluginsSource, hooksSource, outputDir, release, dryRun = false } = ctx;
  const pluginsRoot = pluginsSource; // alias for readability in spec constructors

  // ── core-claude ───────────────────────────────────────────────────────────
  const coreClaude: PluginSpec = {
    name: 'core-claude',
    destination: 'core-claude',
    baseSubfolder: '',
    preservedSource: path.join(pluginsRoot, 'core-claude'),
    modelVocabulary: CLAUDE_VOCABULARY,
    bootstrapManifest: [...BOOTSTRAP_MANIFEST_ORDER],
    includeIndexEntries: true,
    hookEntryShape: 'claude',
    pluginRootPath: '${CLAUDE_PLUGIN_ROOT}',
    indexes: [
      { folder: 'rules', targetFolder: 'rules', heading: 'rules' },
      { folder: 'workflows', targetFolder: 'workflows', requiredTag: 'workflow', heading: 'workflows' },
    ],
    injections: [],
    // DATA-CFG-0002: hook folder and bundle config
    hookFolder: 'hooks',
    specEntries: [
      makeRulesEntry(fileNormalizeModels),
      makeWorkflowsEntry(fileNormalizeModels),
      makeAgentsEntry(fileNormalizeModels),
      makeSkillsEntry(fileNormalizeModels),
      makeConfigureEntry(),
      makeTemplatesEntry('templates', fileNormalizeModels),
    ],
    pluginProcessors: buildPipeline(hooksSource, outputDir, release, false, dryRun),
  };

  // ── core-cursor ────────────────────────────────────────────────────────────
  // workflows→commands, rules/*.md→*.mdc
  const coreCursor: PluginSpec = {
    name: 'core-cursor',
    destination: 'core-cursor',
    baseSubfolder: '',
    preservedSource: path.join(pluginsRoot, 'core-cursor'),
    modelVocabulary: CURSOR_VOCABULARY,
    bootstrapManifest: [...BOOTSTRAP_MANIFEST_ORDER],
    includeIndexEntries: true,
    hookEntryShape: 'cursor',
    pluginRootPath: '',
    indexes: [
      { folder: 'rules', targetFolder: 'rules', heading: 'rules' },
      { folder: 'workflows', targetFolder: 'commands', requiredTag: 'workflow', heading: 'workflows' },
    ],
    injections: [],
    // DATA-CFG-0002: hook folder and bundle config
    hookFolder: 'hooks',
    specEntries: [
      {
        source: 'rules/**',
        target: 'rules',
        exclude: RULES_EXCLUDES,
        processors: [
          ...BASE_PROCESSORS,
          fileNormalizeModels,
          fileRename('rules/(.+)\\.md', 'rules/$1.mdc'),
        ],
      },
      makeWorkflowsEntry(fileNormalizeModels, 'commands'),
      makeAgentsEntry(fileNormalizeModels),
      makeSkillsEntry(fileNormalizeModels),
      makeConfigureEntry(),
      makeTemplatesEntry('templates', fileNormalizeModels),
    ],
    pluginProcessors: buildPipeline(hooksSource, outputDir, release, false, dryRun),
  };

  // ── core-copilot ───────────────────────────────────────────────────────────
  // workflows→commands, agents/*.md→*.agent.md
  // 3× hooks.json: (a) .github/plugin/hooks.json (rendered), (b) root hooks.json (copy of a), (c) hooks/hooks.json (standalone-form)
  const coreCopilot: PluginSpec = {
    name: 'core-copilot',
    destination: 'core-copilot',
    baseSubfolder: '',
    preservedSource: path.join(pluginsRoot, 'core-copilot'),
    modelVocabulary: COPILOT_VOCABULARY,
    bootstrapManifest: [...BOOTSTRAP_MANIFEST_ORDER],
    includeIndexEntries: true,
    hookEntryShape: 'copilot',
    pluginRootPath: '',
    indexes: [
      { folder: 'rules', targetFolder: 'rules', heading: 'rules' },
      { folder: 'workflows', targetFolder: 'commands', requiredTag: 'workflow', heading: 'workflows' },
    ],
    injections: [],
    // DATA-CFG-0002: hook folder and bundle config
    hookFolder: 'hooks',
    specEntries: [
      makeRulesEntry(fileNormalizeModels),
      makeWorkflowsEntry(fileNormalizeModels, 'commands'),
      {
        source: 'agents/**',
        target: 'agents',
        exclude: [],
        processors: [
          ...BASE_PROCESSORS,
          fileNormalizeModels,
          fileRename('agents/(.+)\\.md', 'agents/$1.agent.md'),
        ],
      },
      makeSkillsEntry(fileNormalizeModels),
      makeConfigureEntry(),
      makeTemplatesEntry('templates', fileNormalizeModels),
    ],
    // GT-4: mirror .github/plugin/hooks.json → root hooks.json (byte-identical copy) after rendering
    // DATA-CFG-0002: declarative mirrors on spec, consumed generically by pluginMirrorFiles
    mirrors: [
      { from: '.github/plugin/hooks.json', to: 'hooks.json' },
    ],
    pluginProcessors: buildPipeline(hooksSource, outputDir, release, false, dryRun),
  };

  // ── core-codex ─────────────────────────────────────────────────────────────
  // Instructions go under .agents/; agents → .codex/agents/*.toml; hooks → .codex/
  const coreCodex: PluginSpec = {
    name: 'core-codex',
    destination: 'core-codex',
    baseSubfolder: '.agents',
    preservedSource: path.join(pluginsRoot, 'core-codex'),
    modelVocabulary: CODEX_VOCABULARY,
    bootstrapManifest: [...BOOTSTRAP_MANIFEST_ORDER],
    includeIndexEntries: true,
    hookEntryShape: 'codex',
    pluginRootPath: '',
    indexes: [
      { folder: '.agents/rules', targetFolder: '.agents/rules', heading: 'rules' },
      { folder: '.agents/workflows', targetFolder: '.agents/workflows', requiredTag: 'workflow', heading: 'workflows' },
    ],
    injections: [],
    // DATA-CFG-0002: hook folder and bundle config
    hookFolder: '.codex/hooks',
    specEntries: [
      {
        source: 'rules/**',
        target: '.agents/rules',
        exclude: RULES_EXCLUDES,
        processors: [...BASE_PROCESSORS, fileNormalizeModels],
      },
      {
        source: 'workflows/**',
        target: '.agents/workflows',
        exclude: [],
        processors: [...BASE_PROCESSORS, fileNormalizeModels],
      },
      {
        source: 'agents/**',
        target: '.codex/agents',
        exclude: [],
        processors: [
          ...BASE_PROCESSORS,
          fileCodexAgentFormat,
          fileRename('\\.codex/agents/(.+)\\.md', '.codex/agents/$1.toml'),
        ],
      },
      {
        source: 'skills/**',
        target: '.agents/skills',
        exclude: [],
        processors: [...BASE_PROCESSORS, fileNormalizeModels],
      },
      {
        source: 'configure/**',
        target: '.agents/configure',
        exclude: [],
        processors: [...BASE_PROCESSORS],
      },
      {
        source: 'templates/**',
        target: '.agents/templates',
        exclude: TEMPLATES_EXCLUDES,
        processors: [...BASE_PROCESSORS],
      },
    ],
    // GT-4: mirror .codex-plugin/hooks.json → .codex/hooks.json after rendering
    // DATA-CFG-0002: declarative mirrors on spec, consumed generically by pluginMirrorFiles
    mirrors: [
      { from: '.codex-plugin/hooks.json', to: '.codex/hooks.json' },
    ],
    pluginProcessors: buildPipeline(hooksSource, outputDir, release, false, dryRun),
  };

  // ── core-cursor-standalone ────────────────────────────────────────────────
  // All files under .cursor/; plugin-files-mode.mdc gets injection
  const cursorStandalonePluginFilesPath = '.cursor/rules/plugin-files-mode.mdc';
  // The leading \n adds the blank line separator after the bullets section.
  // The extra \n in section 3 adds a trailing blank before the end-tag.
  const cursorStandaloneInjectionText =
    `\nRosetta plugin root: ".cursor". You MUST FOLLOW ALL bootstrap* and plugin* instructions and execute every prep step in order. After prep steps, you MUST select a workflow and execute it. All workflows (commands) are stored in ".cursor/commands/<workflowtag>.md". Example ".cursor/commands/coding-flow.md".\n\n`;

  const coreCursorStandalone: PluginSpec = {
    name: 'core-cursor-standalone',
    destination: 'core-cursor-standalone',
    baseSubfolder: '.cursor',
    preservedSource: path.join(pluginsRoot, 'core-cursor'),
    modelVocabulary: CURSOR_VOCABULARY,
    bootstrapManifest: [...BOOTSTRAP_MANIFEST_ORDER],
    includeIndexEntries: false,
    hookEntryShape: 'cursor',
    pluginRootPath: '.cursor',
    indexes: [
      { folder: '.cursor/rules', targetFolder: '.cursor/rules', heading: 'rules' },
      { folder: '.cursor/commands', targetFolder: '.cursor/commands', requiredTag: 'workflow', heading: 'workflows' },
    ],
    injections: [
      {
        hostFramePath: cursorStandalonePluginFilesPath,
        anchor: '# PREP STEP 1:',
        sections: [
          {
            kind: 'literal',
            text: cursorStandaloneInjectionText,
          },
          {
            kind: 'index',
            indexFolder: '.cursor/commands',
          },
        ],
      },
    ],
    manifestOverride: { name: 'core-cursor-standalone', version: 'parent' },
    // GT-4: cursor-standalone renders root hooks.json.tmpl (standalone-form) to .cursor/hooks.json
    standaloneTemplates: [['hooks.json.tmpl', '.cursor/hooks.json.tmpl']],
    // DATA-CFG-0002: hook folder and bundle config
    hookFolder: '.cursor/hooks',
    bundleSource: 'core-cursor', // uses parent target's bundles
    specEntries: [
      {
        source: 'rules/**',
        target: '.cursor/rules',
        exclude: RULES_EXCLUDES,
        processors: [
          ...BASE_PROCESSORS,
          fileNormalizeModels,
          fileRename('\\.cursor/rules/(.+)\\.md', '.cursor/rules/$1.mdc'),
        ],
      },
      {
        source: 'workflows/**',
        target: '.cursor/commands',
        exclude: [],
        processors: [...BASE_PROCESSORS, fileNormalizeModels],
      },
      {
        source: 'agents/**',
        target: '.cursor/agents',
        exclude: [],
        processors: [...BASE_PROCESSORS, fileNormalizeModels],
      },
      {
        source: 'skills/**',
        target: '.cursor/skills',
        exclude: [],
        processors: [...BASE_PROCESSORS, fileNormalizeModels],
      },
      {
        source: 'configure/**',
        target: '.cursor/configure',
        exclude: [],
        processors: [...BASE_PROCESSORS],
      },
    ],
    pluginProcessors: buildPipeline(hooksSource, outputDir, release, true, dryRun),
  };

  // ── core-copilot-standalone ───────────────────────────────────────────────
  // bootstrap rules → .github/instructions/*.instructions.md
  // non-bootstrap rules → .github/rules/
  // workflows → .github/prompts/*.prompt.md
  // agents → .github/agents/*.agent.md
  // plugin-files-mode gets injected with root block + workflows index + rules index
  const copilotStandalonePluginFilesPath = '.github/instructions/plugin-files-mode.instructions.md';
  // The leading \n adds the blank line separator after the bullets section.
  const copilotStandaloneInjectionText =
    `\nRosetta plugin root: ".github". You MUST FOLLOW ALL bootstrap* and plugin* instructions and execute every prep step in order. After prep steps, you MUST select a workflow and execute it. All workflows (commands) are stored in ".github/prompts/<workflowtag>.prompt.md". Example ".github/prompts/coding-flow.prompt.md".\n\n`;

  const coreCopilotStandalone: PluginSpec = {
    name: 'core-copilot-standalone',
    destination: 'core-copilot-standalone',
    baseSubfolder: '.github',
    preservedSource: path.join(pluginsRoot, 'core-copilot'),
    modelVocabulary: COPILOT_VOCABULARY,
    bootstrapManifest: [...BOOTSTRAP_MANIFEST_ORDER],
    includeIndexEntries: false,
    hookEntryShape: 'copilot',
    pluginRootPath: '.github',
    indexes: [
      { folder: '.github/rules', targetFolder: '.github/rules', heading: 'rules' },
      { folder: '.github/prompts', targetFolder: '.github/prompts', requiredTag: 'workflow', heading: 'workflows' },
    ],
    injections: [
      {
        hostFramePath: copilotStandalonePluginFilesPath,
        anchor: '# PREP STEP 1:',
        sections: [
          {
            kind: 'literal',
            text: copilotStandaloneInjectionText,
          },
          {
            kind: 'index',
            indexFolder: '.github/prompts',
          },
          {
            kind: 'literal',
            text: '\n\n',
          },
          {
            kind: 'index',
            indexFolder: '.github/rules',
          },
        ],
      },
    ],
    manifestOverride: { name: 'core-copilot-standalone', version: 'parent' },
    // GT-4: copilot-standalone renders hooks/hooks.json.tmpl (standalone-form) to .github/hooks/hooks.json
    standaloneTemplates: [['hooks/hooks.json.tmpl', '.github/hooks/hooks.json.tmpl']],
    // DATA-CFG-0002: hook folder and bundle config
    hookFolder: '.github/hooks',
    bundleSource: 'core-copilot', // uses parent target's bundles
    specEntries: [
      // Bootstrap rules → .github/instructions/*.instructions.md
      // Only bootstrap-* and plugin-files-mode go here; all others go to .github/rules/
      // FR-COPY-0011, GT-8
      {
        source: 'rules/**',
        target: '.github/instructions',
        exclude: [
          ...RULES_EXCLUDES,
          // Non-bootstrap, non-plugin-files-mode rules are excluded from instructions/
          // They go to .github/rules/ via the entry below
          'rules/coding-iac-best-practices.md',
          'rules/prompt-best-practices.md',
          'rules/requirements-best-practices.md',
          'rules/requirements-use-best-practices.md',
          'rules/speckit-integration-policy.md',
          'rules/todo-tasks-fallback.md',
        ],
        processors: [
          ...BASE_PROCESSORS,
          fileNormalizeModels,
          fileRename('\\.github/instructions/(bootstrap-.+)\\.md', '.github/instructions/$1.instructions.md'),
          fileRename('\\.github/instructions/(plugin-files-mode)\\.md', '.github/instructions/$1.instructions.md'),
        ],
      },
      // Non-bootstrap rules → .github/rules/
      {
        source: 'rules/**',
        target: '.github/rules',
        exclude: [
          ...RULES_EXCLUDES,
          'rules/bootstrap-core-policy.md',
          'rules/bootstrap-execution-policy.md',
          'rules/bootstrap-hitl-questioning.md',
          'rules/bootstrap-guardrails.md',
          'rules/bootstrap-rosetta-files.md',
          'rules/plugin-files-mode.md',
        ],
        processors: [...BASE_PROCESSORS, fileNormalizeModels],
      },
      // Workflows → .github/prompts/*.prompt.md
      {
        source: 'workflows/**',
        target: '.github/prompts',
        exclude: [],
        processors: [
          ...BASE_PROCESSORS,
          fileNormalizeModels,
          fileRename('\\.github/prompts/(.+)\\.md', '.github/prompts/$1.prompt.md'),
        ],
      },
      // Agents → .github/agents/*.agent.md
      {
        source: 'agents/**',
        target: '.github/agents',
        exclude: [],
        processors: [
          ...BASE_PROCESSORS,
          fileNormalizeModels,
          fileRename('\\.github/agents/(.+)\\.md', '.github/agents/$1.agent.md'),
        ],
      },
      {
        source: 'skills/**',
        target: '.github/skills',
        exclude: [],
        processors: [...BASE_PROCESSORS, fileNormalizeModels],
      },
      {
        source: 'configure/**',
        target: '.github/configure',
        exclude: [],
        processors: [...BASE_PROCESSORS],
      },
    ],
    pluginProcessors: buildPipeline(hooksSource, outputDir, release, true, dryRun),
  };

  return [coreClaude, coreCursor, coreCopilot, coreCodex, coreCursorStandalone, coreCopilotStandalone];
}

/**
 * Build the standard plugin processor pipeline for a target.
 * hooksSource: absolute path to hooks root (FR-CLI-0020); used by pluginSyncBundles.
 * dryRun threads through all disk-mutating processors (FR-CLI-0050, FR-ARCH-0045).
 * pluginMirrorFiles reads mirror pairs from spec.mirrors (data-driven, FR-ARCH-0035, DATA-CFG-0002).
 * FR-ARCH-0032
 */
function buildPipeline(
  hooksSource: string,
  outputDir: string,
  release: ReleaseDescriptor,
  isStandalone: boolean,
  dryRun: boolean,
) {
  const pipeline = [
    pluginCleanup(outputDir, dryRun),         // FR-CLI-0050: no-op in dry-run
    pluginCopy(outputDir, dryRun),            // FR-CLI-0050: skip disk copy; keep tmpl frames
    pluginProcessSpecEntries(release),
    pluginRewriteReferences,
    pluginGenerateIndexes,
    pluginInjectSections,
    pluginAssembleBootstrap,
    pluginRenderTemplates,
    // GT-4: mirror step reads spec.mirrors (declarative data); no-op if mirrors is empty/absent
    pluginMirrorFiles,
    // FR-CLI-0020: hooksSource is <source>/hooks; bundles at <hooksSource>/dist/bundles/<bundleSource>
    pluginSyncBundles(hooksSource, outputDir, release.deterministicHooks, dryRun), // FR-CLI-0050
    pluginWrite(outputDir, dryRun),           // FR-ARCH-0045: emit paths+contents in dry-run
  ];
  return pipeline;
}
