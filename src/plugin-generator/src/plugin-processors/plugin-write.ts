// FR-ARCH-0045 — sole egress; null→no file, else write; dry-run → emit only

import fs from 'fs';
import path from 'path';
import type { PluginProcessingFrame } from '../types.js';
import { getLogger } from '../logging.js';

/**
 * pluginWrite: write all frames to the output directory.
 * Frames with null target_contents → no file (FR-ARCH-0036).
 * Dry-run → emit to log, write nothing (FR-CLI-0050).
 * Encoding: UTF-8, LF only (NFR encoding).
 * FR-ARCH-0045
 */
export function pluginWrite(outputDir: string, dryRun: boolean) {
  return function pluginWriteProcessor(
    p: PluginProcessingFrame,
  ): PluginProcessingFrame {
    const logger = getLogger();
    const targetDir = path.join(outputDir, p.spec.destination);

    // Create ensureDirs (empty directories required even if no files produced). GT-8
    if (p.spec.ensureDirs && !dryRun) {
      for (const dir of p.spec.ensureDirs) {
        fs.mkdirSync(path.join(targetDir, dir), { recursive: true });
      }
    }

    for (const frame of p.frames) {
      if (frame.target_contents === null) continue; // drop

      const outputPath = path.join(targetDir, frame.target);

      if (dryRun) {
        // FR-ARCH-0045, FR-CLI-0050: emit full target path AND full target contents to stdout.
        // Binary frames emit a placeholder (binary content is not printable).
        logger.info({ path: outputPath }, 'dry-run: would write');
        if (frame.isBinary) {
          process.stdout.write(`=== DRY-RUN: ${outputPath} (binary) ===\n`);
        } else {
          const content = frame.target_contents as string;
          process.stdout.write(`=== DRY-RUN: ${outputPath} ===\n${content}\n`);
        }
        continue;
      }

      // Ensure directory exists
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      if (frame.isBinary) {
        fs.writeFileSync(outputPath, frame.target_contents as Buffer);
      } else {
        // Ensure LF-only (NFR encoding rule)
        let content = frame.target_contents as string;
        content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        fs.writeFileSync(outputPath, content, { encoding: 'utf-8' });
      }
    }

    return p;
  };
}
