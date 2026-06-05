// FR-ARCH-0055, FR-HOOK-* — bootstrap payload assembly → writes templateContext placeholders

import { updatePluginFrame } from '../frames.js';
import { assembleBootstrapPayload } from '../bootstrap/payload.js';
import type { PluginProcessingFrame } from '../types.js';

/**
 * pluginAssembleBootstrap: assemble bootstrap payload(s) and write to templateContext.
 * Sets bootstrap_hooks_claude / bootstrap_hooks_codex / bootstrap_hooks_copilot
 * based on the target's hookEntryShape.
 * FR-ARCH-0055
 */
export function pluginAssembleBootstrap(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  const { payload, errors } = assembleBootstrapPayload(p);
  const shape = p.spec.hookEntryShape;

  const contextKey = `bootstrap_hooks_${shape}`;

  return updatePluginFrame(p, (draft) => {
    draft.templateContext = {
      ...draft.templateContext,
      [contextKey]: payload,
    };
    if (errors.length > 0) {
      draft.errors = [...draft.errors, ...errors] as typeof draft.errors;
    }
  });
}
