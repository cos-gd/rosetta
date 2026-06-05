// FR-ARCH-0049, FR-COPY-0032 — content-only reference rewrite via frame lookup
// Complete boundary-delimited path token replacement only (FR-ARCH-0037)
// NFR-0006: no per-target-name branching; extension rewrites are declarative on SpecEntry.

import { updatePluginFrame } from '../frames.js';
import type { FileProcessingFrame, PluginProcessingFrame } from '../types.js';

/**
 * pluginRewriteReferences: build lookup from frames (sourcePath→targetPath)
 * + SpecEntry folder pairs (<from>/→<to>/) derived generically from spec data.
 * Replace only complete boundary-delimited path tokens (FR-ARCH-0037).
 * Content-only; bootstrap payload gets it too via FR-HOOK-0008.
 * FR-ARCH-0049
 */
export function pluginRewriteReferences(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { frames, spec } = p;

  // Derive folder pairs from spec data (no per-target-name branching, NFR-0006)
  const folderPairs = buildFolderPairs(spec);

  if (folderPairs.length === 0) return p;

  // Rewrite content in all text frames
  let changed = false;
  const rewrittenFrames = frames.map((frame) => {
    if (frame.isBinary || frame.target_contents === null) return frame;

    const content = frame.target_contents as string;
    let newContent = content;

    // Apply folder-level rewrites (deduplicated, longer patterns first)
    for (const [from, _to] of folderPairs) {
      // Sentinel extension-rewrite pairs use special handling
      if (from.includes('__MD_TO_MDC__') || from.includes('__MD_TO_PROMPT_MD__')) {
        newContent = applyExtensionRewrite(newContent, from);
      } else if (newContent.includes(from)) {
        newContent = rewritePathToken(newContent, from, _to);
      }
    }

    if (newContent === content) return frame;
    changed = true;
    return { ...frame, target_contents: newContent } as FileProcessingFrame;
  });

  if (!changed) return p;

  return updatePluginFrame(p, (draft) => {
    draft.frames = rewrittenFrames as typeof draft.frames;
  });
}

/**
 * Apply a folder rename to content string references.
 * Replaces only complete boundary-delimited occurrences of `from` in content.
 * Boundaries: string start/end, whitespace, quotes, backticks, parens, brackets, or
 * a preceding path separator `/`. A preceding `-` or alphanumeric is NOT a boundary
 * (so `my-workflows/` must NOT match). FR-ARCH-0037.
 *
 * Negative lookbehind (?<![A-Za-z0-9_-]) ensures the token is not part of a longer word.
 * A preceding `/` IS allowed (e.g. `.windsurf/workflows/` → `.windsurf/commands/`).
 */
function rewritePathToken(content: string, from: string, to: string): string {
  // Escape regex special chars in 'from' (e.g., "workflows/")
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Negative lookbehind: not preceded by alphanumeric, underscore, or hyphen
  const regex = new RegExp(`(?<![A-Za-z0-9_-])${escaped}`, 'g');
  return content.replace(regex, to);
}

/**
 * Apply folder rewrites to a string (for bootstrap payload strings - FR-HOOK-0008).
 * Same logic as frame rewrite but on a standalone string.
 */
export function applyFolderRewrites(
  content: string,
  folderPairs: Array<[string, string]>,
): string {
  let result = content;
  for (const [from, _to] of folderPairs) {
    if (from.includes('__MD_TO_MDC__') || from.includes('__MD_TO_PROMPT_MD__')) {
      result = applyExtensionRewrite(result, from);
    } else if (result.includes(from)) {
      result = rewritePathToken(result, from, _to);
    }
  }
  return result;
}

/**
 * Build folder pairs from a PluginSpec for reference rewriting in CONTENT FILES.
 * Derived generically from spec data (no per-target-name branching, NFR-0006, F-F fix):
 * 1. "workflows/" → target folder (from workflows specEntry)
 * 2. Extension rewrites from SpecEntry.extensionRewrites declarative data:
 *    - 'md-to-mdc': rewrites `rules/X.md` → `rules/X.mdc` in content
 *    - 'md-to-prompt-md': rewrites `prompts/X.md` → `prompts/X.prompt.md` in content
 * 3. Cascaded folder rename (commands→prompts) detected from specEntry targets
 * GT-8, FR-ARCH-0049, NFR-0006
 */
export function buildFolderPairs(spec: PluginProcessingFrame['spec']): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const seen = new Set<string>();
  const baseSubfolder = spec.baseSubfolder;

  let workflowsTarget = '';

  // Pass 1: workflows folder rename and extension rewrites from SpecEntry data
  for (const entry of spec.specEntries) {
    const srcFolder = entry.source.replace(/\/?\*.*$/, '');
    const tgtFolder = entry.target;
    if (!srcFolder || !tgtFolder) continue;

    // Workflows folder rename: if source is 'workflows' and target differs
    if (srcFolder === 'workflows') {
      // Strip the baseSubfolder prefix to get plugin-root-relative target
      const tgtRelative = baseSubfolder && tgtFolder.startsWith(baseSubfolder + '/')
        ? tgtFolder.slice(baseSubfolder.length + 1)
        : tgtFolder;

      // Get last path component of target
      const tgtLast = tgtRelative.split('/').pop() ?? tgtRelative;

      // Only create a pair if the target folder name differs from "workflows"
      if (tgtLast !== 'workflows') {
        const key = `workflows→${tgtLast}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push(['workflows/', tgtLast + '/']);
          workflowsTarget = tgtLast;
        }
      }
    }

    // Extension rewrites: declarative on SpecEntry — no spec.name branching (NFR-0006)
    if (entry.extensionRewrites) {
      for (const rewrite of entry.extensionRewrites) {
        if (rewrite === 'md-to-mdc') {
          // Sentinel: rewrite rules/X.md → rules/X.mdc in content
          const sentinel = 'rules/__MD_TO_MDC__';
          if (!seen.has(sentinel)) {
            seen.add(sentinel);
            pairs.push([sentinel, sentinel]);
          }
        } else if (rewrite === 'md-to-prompt-md') {
          // Sentinel: rewrite prompts/X.md → prompts/X.prompt.md in content
          const sentinel = 'prompts/__MD_TO_PROMPT_MD__';
          if (!seen.has(sentinel)) {
            seen.add(sentinel);
            pairs.push([sentinel, sentinel]);
          }
        }
      }
    }
  }

  // Pass 2: cascaded folder rewrites from SpecEntry.cascadedFolderRewrites declarative data.
  // Used when standalone plugin's source content has intermediate folder names that need
  // further rewriting (e.g. 'commands/' → 'prompts/' for copilot-standalone).
  // NFR-0006: no spec.name branching; data lives on the SpecEntry.
  for (const entry of spec.specEntries) {
    if (!entry.cascadedFolderRewrites) continue;
    for (const [from, to] of entry.cascadedFolderRewrites) {
      const key = `${from}→${to}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push([`${from}/`, `${to}/`]);
      }
    }
  }

  return pairs;
}

/**
 * Apply regex-based extension rewrites to a content string.
 * Handles sentinels inserted by buildFolderPairs:
 *   "rules/__MD_TO_MDC__" → rewrite "rules/X.md" to "rules/X.mdc" in content
 *   "prompts/__MD_TO_PROMPT_MD__" → rewrite "prompts/X.md" to "prompts/X.prompt.md"
 * NFR-0006: sentinel approach separates the "what" (data on SpecEntry) from "how" (this fn).
 */
function applyExtensionRewrite(content: string, fromPair: string): string {
  if (fromPair === 'rules/__MD_TO_MDC__') {
    // Replace "rules/X.md" → "rules/X.mdc" ONLY when "rules/" is NOT preceded by "/"
    // (so ".agent/rules/agents.md" is left alone, but plain "rules/agents.md" is rewritten)
    return content.replace(/(?<!\/)rules\/([a-z0-9_-]+)\.md(?!\.\w)/g, 'rules/$1.mdc');
  }
  if (fromPair === 'prompts/__MD_TO_PROMPT_MD__') {
    // Replace "prompts/X.md" → "prompts/X.prompt.md"
    // Require that "prompts/" is NOT preceded by alphanumeric/hyphen/slash (compound names).
    return content.replace(/(?<![a-zA-Z0-9_\-\/])prompts\/([a-z0-9_.-]+)\.md(?!\.\w)/g, 'prompts/$1.prompt.md');
  }
  return content;
}
