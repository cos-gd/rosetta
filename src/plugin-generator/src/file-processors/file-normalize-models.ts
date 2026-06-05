// FR-ARCH-0046, FR-COPY-0020–0022 — rewrite frontmatter model: per vocabulary
// PARITY-9: claude scans for first claude-compatible token (not first overall)

import { updateFileFrame } from '../frames.js';
import { rewriteModelLine } from '../serialize/frontmatter.js';
import {
  normalizeClaude,
  normalizeCursor,
  normalizeCopilot,
  normalizeCodex,
} from '../spec/model-maps.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

/**
 * fileNormalizeModels: rewrite frontmatter model: field per IDE vocabulary.
 * No model → unchanged. Preserve line position/format.
 * FR-ARCH-0046
 */
export function fileNormalizeModels(
  frame: FileProcessingFrame,
  ctx: TargetContext,
): FileProcessingFrame {
  if (frame.isBinary || frame.target_contents === null) return frame;

  const content = frame.target_contents as string;
  const vocabulary = ctx.spec.modelVocabulary;

  // Extract model field ONLY from frontmatter (between first --- delimiters)
  // Don't match model: lines in the document body
  if (!content.trimStart().startsWith('---')) return frame; // no frontmatter at all

  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return frame;

  const yamlSection = fmMatch[1];
  const modelLineMatch = yamlSection.match(/^model:\s*(.+)$/m);
  if (!modelLineMatch) return frame; // no model field in frontmatter

  const modelField = modelLineMatch[1].trim();

  switch (vocabulary.kind) {
    case 'claude': {
      const normalized = normalizeClaude(modelField);
      if (!normalized) return frame;
      const newContent = rewriteModelLine(content, normalized);
      if (newContent === content) return frame;
      return updateFileFrame(frame, (draft) => {
        draft.target_contents = newContent;
        // Update frontmatter in source
        if (draft.source[0]?.frontmatter) {
          draft.source[0].frontmatter!.model = normalized;
        }
      });
    }

    case 'cursor': {
      const normalized = normalizeCursor(modelField);
      if (!normalized) return frame;
      const newContent = rewriteModelLine(content, normalized);
      if (newContent === content) return frame;
      return updateFileFrame(frame, (draft) => {
        draft.target_contents = newContent;
        if (draft.source[0]?.frontmatter) {
          draft.source[0].frontmatter!.model = normalized;
        }
      });
    }

    case 'copilot': {
      const normalized = normalizeCopilot(modelField);
      if (!normalized) return frame;
      const newContent = rewriteModelLine(content, normalized);
      if (newContent === content) return frame;
      return updateFileFrame(frame, (draft) => {
        draft.target_contents = newContent;
        if (draft.source[0]?.frontmatter) {
          draft.source[0].frontmatter!.model = normalized;
        }
      });
    }

    case 'codex': {
      // For codex SKILL files (markdown, not converted to TOML), normalize the model field:
      // Extract gpt model+effort and rewrite frontmatter to use gpt model + add model_reasoning_effort.
      // Decoded from baseline: model field becomes two YAML lines.
      // If no gpt model found → STRIP the model: line entirely (baseline shows no model field for non-gpt models).
      const codexModel = normalizeCodex(modelField);
      if (!codexModel) {
        // No gpt model found → strip the model: line from frontmatter
        const newContent = removeModelLine(content);
        if (newContent === content) return frame;
        return updateFileFrame(frame, (draft) => {
          draft.target_contents = newContent;
        });
      }
      // Build the new frontmatter: replace "model: <field>" with "model: <gpt>" and insert "model_reasoning_effort: <effort>"
      const newContent = rewriteCodexModelFields(content, codexModel.model, codexModel.effort);
      if (newContent === content) return frame;
      return updateFileFrame(frame, (draft) => {
        draft.target_contents = newContent;
      });
    }

    default:
      return frame;
  }
}

/**
 * Remove the model: line from frontmatter entirely.
 * Used for codex when the model field has no gpt-* token (non-gpt models are stripped).
 */
function removeModelLine(content: string): string {
  const fmMatch = content.match(/^(---\n)([\s\S]*?)(\n---)([\s\S]*)$/);
  if (!fmMatch) return content;

  const [, openDelim, yamlBody, closeDelim, rest] = fmMatch;

  // Remove the model: line (and model_reasoning_effort if present, though unlikely in source)
  const newYaml = yamlBody
    .replace(/^model:\s*.+\n?/m, '')
    .replace(/^model_reasoning_effort:\s*.+\n?/m, '');

  if (newYaml === yamlBody) return content;
  return openDelim + newYaml + closeDelim + rest;
}

/**
 * For codex markdown files (skills, workflows), rewrite the frontmatter model field
 * to use gpt model name and insert model_reasoning_effort on the next line.
 * Decoded from baseline: model field splits into two YAML fields.
 */
function rewriteCodexModelFields(
  content: string,
  gptModel: string,
  effort: string,
): string {
  // Only rewrite within frontmatter
  const fmMatch = content.match(/^(---\n)([\s\S]*?)(\n---)([\s\S]*)$/);
  if (!fmMatch) return content;

  const [, openDelim, yamlBody, closeDelim, rest] = fmMatch;

  // Rewrite the model: line and insert model_reasoning_effort after it
  const newYaml = yamlBody.replace(
    /^(model:\s*)(.+)$/m,
    `$1${gptModel}\nmodel_reasoning_effort: ${effort}`,
  );

  if (newYaml === yamlBody) return content;
  return openDelim + newYaml + closeDelim + rest;
}
