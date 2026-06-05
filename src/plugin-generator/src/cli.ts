#!/usr/bin/env node
// FR-CLI-0001–0060 — commander wiring, flag parsing, exit-status aggregation

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initLogger } from './logging.js';
import { generate } from './generate.js';
import type { GenerateOptions } from './types.js';

const program = new Command();

/**
 * Resolve the default repo root: walk up from cli.ts's location until we find a directory
 * that contains an `instructions/` folder OR a `.git` directory.
 * This is robust against re-locations of the generator within the repo (FR-CLI-0020).
 */
function resolveRepoRoot(): string {
  const thisFile = fileURLToPath(import.meta.url);
  let dir = path.dirname(thisFile);

  // Walk up to find the repo root (contains instructions/ or .git)
  while (true) {
    if (
      fs.existsSync(path.join(dir, 'instructions')) ||
      fs.existsSync(path.join(dir, '.git'))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      // Reached filesystem root without finding a marker — fall back to cwd
      return process.cwd();
    }
    dir = parent;
  }
}

program
  .name('rosetta-plugin-gen')
  .description('Generate Rosetta IDE plugins from instruction sources')
  .version('1.0.0')
  .option('--release <r>', 'Release name (e.g. r2, r3)', 'r2')
  .option('--domain <list>', 'Comma-separated domain list (e.g. core)', 'core')
  .option('--repo-root <dir>', 'Repository root directory', resolveRepoRoot())
  .option('--output-dir <dir>', 'Output directory (default: <repo-root>/plugins)')
  .option('--dry-run', 'Print what would be written, but do not write', false)
  .option('--verbose', 'Enable verbose logging', false);

program.addHelpText('after', `
Source structure:
  instructions/<release>/<domain>/{rules,workflows,agents,skills,configure,templates}/

Directives (in filenames, tilde-separated):
  file~overwrite.md   — overwrite earlier layers
  file~core-only.md   — include only for core domain

Processor catalog:
  fileRead, fileApplyOverrides, fileBundle, fileNormalizeModels, fileRename, fileCodexAgentFormat
  pluginCleanup, pluginCopy, pluginProcessSpecEntries, pluginRewriteReferences,
  pluginGenerateIndexes, pluginInjectSections, pluginAssembleBootstrap,
  pluginRenderTemplates, pluginSyncBundles, pluginWrite

Spec model:
  Each target is a PluginSpec with specEntries, pluginProcessors, hookEntryShape, etc.
  See src/spec/targets.ts for the six built-in targets.
`);

async function main(): Promise<void> {
  program.parse(process.argv);
  const opts = program.opts();

  const repoRoot = opts.repoRoot as string;
  const outputDir = (opts.outputDir as string) ?? path.join(repoRoot, 'plugins');
  const verbose = opts.verbose as boolean;
  const dryRun = opts.dryRun as boolean;

  initLogger(verbose);

  const options: GenerateOptions = {
    repoRoot,
    release: opts.release as string,
    domain: opts.domain as string,
    outputDir,
    dryRun,
    verbose,
  };

  const exitCode = await generate(options);
  process.exit(exitCode);
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err.message ?? String(err)}\n`);
  process.exit(1);
});
