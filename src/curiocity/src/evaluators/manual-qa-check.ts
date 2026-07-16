import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import type { EvalContext, EvalResult, Evaluator } from './types';

/**
 * `manual-qa-check`: detects whether the coding agent actually performed MANUAL QA —
 * booted the live service and hit it with an HTTP client to observe a real response —
 * as a category distinct from merely writing an automated test. This is a heuristic,
 * non-gating metric evaluator: it never blocks a run, it just reports what it saw.
 *
 * Reads `ctx.rawTranscriptPath` as plain text (not parsed JSONL — the signatures we're
 * hunting for can appear inside tool-call `input`/`output` fields regardless of how the
 * transcript happens to be framed line-by-line) and looks for three signals:
 *
 * 1. **ranService**: a command that starts/serves the app (§`RAN_SERVICE_SIGNATURES`).
 * 2. **hitEndpoint**: a live HTTP client invocation (§`CLIENT_TOOL_SIGNATURES`) alongside
 *    a reference to the target endpoint (`urlPattern`, default `/api/health`) or a
 *    loopback host (`localhost` / `127.0.0.1`).
 * 3. **verified**: the `successPattern` regex (default: an HTTP 2xx status line, a bare
 *    `200`, or a `"status":"UP"` JSON field) matches somewhere in the transcript.
 *
 * Level: `passed` (ran + hit + verified) > `attempted` (ran + hit, unverified) > `none`.
 */
export const manualQaCheckParamsSchema = z.object({
  /** Endpoint reference to look for alongside a client-tool invocation. */
  urlPattern: z.string().default('/api/health'),
  /** Regex (source string) matched against the raw transcript text to confirm a live
   *  success response was actually observed. */
  successPattern: z.string().default('\\bHTTP[^\\n]*2\\d\\d\\b|\\b200\\b|"status"\\s*:\\s*"UP"'),
});

/** Commands that start/serve an app — heuristics, kept in one named list so they're
 *  easy to extend as new frameworks/runtimes come up. */
export const RAN_SERVICE_SIGNATURES: RegExp[] = [
  /spring-boot:run/i,
  /bootRun/i,
  /java\s+-jar/i,
  /nohup.*run/i,
  /gradlew\s+bootRun/i,
  /npm\s+start/i,
  /npm\s+run\s+start/i,
  /uvicorn/i,
  /flask\s+run/i,
  /rails\s+s\b/i,
  /go\s+run/i,
  /dotnet\s+run/i,
];

/** Tools that issue a live HTTP request against a running endpoint (as opposed to,
 *  say, reading a test file that merely mentions HTTP). The httpie signature requires
 *  a verb (`http GET ...`) rather than a bare `http ` — real transcripts show the agent's
 *  OWN prose narrating results (e.g. "...matches ... with HTTP 200") which would otherwise
 *  false-positive against a bare `\bhttp\s/i` (empirically observed against a real
 *  transcript where no client tool actually ran — see manual-qa-check validation). */
export const CLIENT_TOOL_SIGNATURES: RegExp[] = [
  /curl/i,
  /wget/i,
  /\bhttp\s+(get|post|put|delete|patch|head)\b/i, // httpie CLI ("http GET ...")
  /Invoke-WebRequest/i,
  /fetch\(/i,
];

const zeroMetrics = (): EvalResult['metrics'] => [
  { name: 'manual_qa_ran_service', value: 0 },
  { name: 'manual_qa_hit_endpoint', value: 0 },
  { name: 'manual_qa_verified', value: 0 },
];

export const manualQaCheck: Evaluator = {
  id: 'manual-qa-check',
  paramsSchema: manualQaCheckParamsSchema,

  async evaluate(ctx: EvalContext, params: unknown): Promise<EvalResult> {
    const p = manualQaCheckParamsSchema.parse(params);

    if (ctx.rawTranscriptPath === undefined || !existsSync(ctx.rawTranscriptPath)) {
      return {
        pass: false,
        gate: false,
        details: 'no raw transcript available',
        metrics: zeroMetrics(),
      };
    }

    let raw: string;
    try {
      raw = readFileSync(ctx.rawTranscriptPath, 'utf8');
    } catch {
      return {
        pass: false,
        gate: false,
        details: 'no raw transcript available',
        metrics: zeroMetrics(),
      };
    }

    const ranService = RAN_SERVICE_SIGNATURES.some((re) => re.test(raw));

    const hitClientTool = CLIENT_TOOL_SIGNATURES.some((re) => re.test(raw));
    const lowerRaw = raw.toLowerCase();
    const referencesEndpoint =
      (p.urlPattern.length > 0 && lowerRaw.includes(p.urlPattern.toLowerCase())) ||
      lowerRaw.includes('localhost') ||
      lowerRaw.includes('127.0.0.1');
    const hitEndpoint = hitClientTool && referencesEndpoint;

    let verified = false;
    try {
      verified = new RegExp(p.successPattern).test(raw);
    } catch {
      // A malformed successPattern param must not crash the trial — treat as unverified.
      verified = false;
    }

    const level: 'passed' | 'attempted' | 'none' =
      ranService && hitEndpoint && verified ? 'passed' : ranService && hitEndpoint ? 'attempted' : 'none';
    const pass = level === 'passed';

    const details =
      level === 'passed'
        ? `manual QA: passed (ran service + hit ${p.urlPattern} + verified 200/UP)`
        : level === 'attempted'
          ? `manual QA: attempted (ran service + hit ${p.urlPattern}, but no verified success response)`
          : 'manual QA: none (no live run detected)';

    return {
      pass,
      gate: false,
      details,
      metrics: [
        { name: 'manual_qa_ran_service', value: ranService ? 1 : 0 },
        { name: 'manual_qa_hit_endpoint', value: hitEndpoint ? 1 : 0 },
        { name: 'manual_qa_verified', value: verified ? 1 : 0 },
      ],
    };
  },
};
