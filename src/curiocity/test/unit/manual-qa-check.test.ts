import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { describe, it, expect } from 'vitest';
import { manualQaCheck } from '../../src/evaluators/manual-qa-check';
import type { EvalContext } from '../../src/evaluators/types';
import { FakeModelRouter } from '../../src/shared/model-router';

/**
 * `manual-qa-check`: detects whether the coding agent actually booted the live
 * service and hit it with an HTTP client — as opposed to merely writing an
 * automated test — by scanning the run's raw transcript text for three signals:
 * a service-start command, a live client request to the endpoint, and an observed
 * success response.
 */

const FIXTURES_DIR = fileURLToPath(new URL('../fixtures/manual-qa/', import.meta.url));

function ctx(over: Partial<EvalContext> = {}): EvalContext {
  return {
    workspace: over.workspace ?? mkdtempSync(join(tmpdir(), 'curio-manual-qa-ws-')),
    workspaceDiff: over.workspaceDiff ?? '',
    events: over.events ?? [],
    qnaLog: over.qnaLog ?? [],
    caseFiles: over.caseFiles ?? { promptMd: 'do it' },
    agentId: over.agentId ?? 'mock',
    models: over.models ?? new FakeModelRouter({ entries: [] }),
    exec: execa,
    ...(over.rawTranscriptPath !== undefined ? { rawTranscriptPath: over.rawTranscriptPath } : {}),
  };
}

describe('manual-qa-check', () => {
  it('level "passed": ran the service, hit the endpoint, and verified a live 200/UP response', async () => {
    const res = await manualQaCheck.evaluate(
      ctx({ rawTranscriptPath: join(FIXTURES_DIR, 'passed-transcript.jsonl') }),
      {},
    );
    expect(res.pass).toBe(true);
    expect(res.gate).toBe(false);
    expect(res.details).toBe('manual QA: passed (ran service + hit /api/health + verified 200/UP)');
    expect(res.metrics).toEqual([
      { name: 'manual_qa_ran_service', value: 1 },
      { name: 'manual_qa_hit_endpoint', value: 1 },
      { name: 'manual_qa_verified', value: 1 },
    ]);
  });

  it('level "attempted": ran the service and hit the endpoint, but no verified success response', async () => {
    const res = await manualQaCheck.evaluate(
      ctx({ rawTranscriptPath: join(FIXTURES_DIR, 'attempted-transcript.jsonl') }),
      {},
    );
    expect(res.pass).toBe(false);
    expect(res.gate).toBe(false);
    expect(res.details).toBe(
      'manual QA: attempted (ran service + hit /api/health, but no verified success response)',
    );
    expect(res.metrics).toEqual([
      { name: 'manual_qa_ran_service', value: 1 },
      { name: 'manual_qa_hit_endpoint', value: 1 },
      { name: 'manual_qa_verified', value: 0 },
    ]);
  });

  it('level "none": neither ran the service nor hit a live endpoint (e.g. only wrote a test)', async () => {
    const res = await manualQaCheck.evaluate(
      ctx({ rawTranscriptPath: join(FIXTURES_DIR, 'none-transcript.jsonl') }),
      {},
    );
    expect(res.pass).toBe(false);
    expect(res.gate).toBe(false);
    expect(res.details).toBe('manual QA: none (no live run detected)');
    expect(res.metrics).toEqual([
      { name: 'manual_qa_ran_service', value: 0 },
      { name: 'manual_qa_hit_endpoint', value: 0 },
      { name: 'manual_qa_verified', value: 0 },
    ]);
  });

  it('fails without throwing when rawTranscriptPath is absent', async () => {
    const res = await manualQaCheck.evaluate(ctx({}), {});
    expect(res.pass).toBe(false);
    expect(res.gate).toBe(false);
    expect(res.details).toBe('no raw transcript available');
    expect(res.metrics).toEqual([
      { name: 'manual_qa_ran_service', value: 0 },
      { name: 'manual_qa_hit_endpoint', value: 0 },
      { name: 'manual_qa_verified', value: 0 },
    ]);
  });

  it('fails without throwing when rawTranscriptPath points at a nonexistent file', async () => {
    const res = await manualQaCheck.evaluate(
      ctx({ rawTranscriptPath: join(FIXTURES_DIR, 'does-not-exist.jsonl') }),
      {},
    );
    expect(res.pass).toBe(false);
    expect(res.details).toBe('no raw transcript available');
  });

  it('honors a custom urlPattern for the endpoint-hit check', async () => {
    // The "none" fixture mentions /api/health in prose but never ran a service or a
    // client tool, so it stays "none" regardless of urlPattern.
    const res = await manualQaCheck.evaluate(
      ctx({ rawTranscriptPath: join(FIXTURES_DIR, 'none-transcript.jsonl') }),
      { urlPattern: '/api/health' },
    );
    expect(res.details).toBe('manual QA: none (no live run detected)');
  });
});
