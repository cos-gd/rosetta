#!/usr/bin/env node
// Rosetta hooks diagnostics — a dump-first tester usable with ANY hook.
// Reads stdin, then IMMEDIATELY (before parsing) appends a full dump — full invocation string,
// argv, cwd, script dir, raw stdin, every env var — to ~/.rosetta/hooks.log, one
// `[<ISO-ms-timestamp>] [<pid>] <message>` line each.
// Then it JSON-parses the input and runs flag-selected processors. Each `--flag` maps to ONE
// processor fn(input, argValue, output) that mutates `output` ({ text, exitCode }); the runner
// writes output.text to stdout and exits with output.exitCode. Add copilot/codex-specific
// handling later by adding a processor function + a PROCESSORS entry — nothing else changes.
// Usage: <hook stdin> | node tester.js [--exit-code <n>] [--output <text>] [--tag <label>]
//        [--deny-on-match <substr>] [--rewrite-command <match>::<newCmd>]
//        [--rewrite-result <match>::<newText>] [--block-stop-once]
// (!) The env dump WILL capture secrets/tokens present in the hook environment. The log lives at
//     ~/.rosetta/hooks.log (outside any repo) — do not share or commit it.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const LOG_DIR = path.join(os.homedir(), '.rosetta');
const LOG_FILE = path.join(LOG_DIR, 'hooks.log');

// Append `message` to the log; every physical line is prefixed `[<ms-timestamp>] [<pid>] `.
// Never throws — diagnostics must not break the host hook.
function log(message) {
  const prefix = `[${new Date().toISOString()}] [${process.pid}] `;
  const body = String(message).split('\n').map((line) => prefix + line).join('\n');
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, body + '\n');
  } catch (_) {
    /* swallow: a failed log must never abort the hook */
  }
}

// Read all of stdin synchronously (fd 0). Returns '' if stdin is absent or unreadable.
function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (_) {
    return '';
  }
}

// Minimal flag parser. Supports `--flag value` and `--flag=value`; a flag with no value -> true.
function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq !== -1) {
      flags[arg.slice(0, eq)] = arg.slice(eq + 1);
    } else {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[arg] = next;
        i++;
      } else {
        flags[arg] = true;
      }
    }
  }
  return flags;
}

// Split a "<match>::<payload>" processor argument into [match, payload].
function splitMatchPayload(value) {
  const i = typeof value === 'string' ? value.indexOf('::') : -1;
  return i === -1 ? [String(value), ''] : [value.slice(0, i), value.slice(i + 2)];
}

// Parse the JSON currently staged in output.text (so processors can compose), or {} if none/invalid.
function stagedJson(output) {
  if (!output.text) return {};
  try { return JSON.parse(output.text); } catch (_) { return {}; }
}

// Processors: (input, argValue, output) => void. Each mutates `output`. Keyed by flag.
const PROCESSORS = {
  // Set the process exit code to the provided value.
  '--exit-code': (input, value, output) => {
    const n = Number(value);
    if (Number.isFinite(n)) output.exitCode = n;
  },
  // Write the provided text to stdout (the hook return channel).
  '--output': (input, value, output) => {
    output.text = typeof value === 'string' ? value : '';
  },
  // Label only — does nothing to output. Surfaces in the log's INVOCATION/ARGV so you can tell
  // which registered hook key fired (e.g. distinguish camelCase `preToolUse` from `PreToolUse`).
  '--tag': () => {},
  // Conditional prevention test: if the (serialized) input contains <substr>, emit a PreToolUse
  // deny carrying a hook-test reason that asks the AI to report the block and then continue.
  // No match => leaves output untouched (tool proceeds normally).
  '--deny-on-match': (input, value, output) => {
    if (typeof value !== 'string' || !input) return;
    if (!JSON.stringify(input).includes(value)) return;
    const reason =
      'HOOK TEST (Rosetta diagnostic): this tool call was intentionally DENIED by a PreToolUse hook ' +
      'because the request matched the test target. This is only a test of hook-based prevention. ' +
      'Please (1) tell the user verbatim that a hook blocked this action and quote this reason, ' +
      'then (2) continue with the rest of the task normally.';
    output.text = JSON.stringify({
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    });
  },
  // PreToolUse arg-rewrite test. Arg: "<matchSubstr>::<newCommand>". If the input contains
  // <matchSubstr>, emit modifiedArgs (R1) + hookSpecificOutput.updatedInput (R3) replacing the
  // command — to see whether the runtime substitutes tool arguments before execution.
  '--rewrite-command': (input, value, output) => {
    if (typeof value !== 'string' || !input) return;
    const [match, newCmd] = splitMatchPayload(value);
    if (!match || !JSON.stringify(input).includes(match)) return;
    const obj = stagedJson(output);
    obj.modifiedArgs = { command: newCmd };
    obj.hookSpecificOutput = Object.assign({ hookEventName: 'PreToolUse' }, obj.hookSpecificOutput, { updatedInput: { command: newCmd } });
    output.text = JSON.stringify(obj);
  },
  // PostToolUse result-rewrite test. Arg: "<matchSubstr>::<newResultText>". If the input contains
  // <matchSubstr>, merge modifiedResult (R1) into the staged output — to see whether the runtime
  // replaces the tool result the model sees. Composes with --output (additionalContext).
  '--rewrite-result': (input, value, output) => {
    if (typeof value !== 'string' || !input) return;
    const [match, newText] = splitMatchPayload(value);
    if (!match || !JSON.stringify(input).includes(match)) return;
    const obj = stagedJson(output);
    obj.modifiedResult = { resultType: 'success', textResultForLlm: newText };
    output.text = JSON.stringify(obj);
  },
  // Stop block test — blocks the turn-stop EXACTLY ONCE per session, then allows. Uses an atomic
  // marker file (keyed by session id) so it can NEVER loop. No arg. Reset: delete the marker file.
  '--block-stop-once': (input, value, output) => {
    if (!input) return;
    const sid = String(input.session_id || input.sessionId || 'global').replace(/[^A-Za-z0-9_.-]/g, '_');
    const marker = path.join(LOG_DIR, `.block-stop-once-${sid}`);
    try {
      fs.mkdirSync(LOG_DIR, { recursive: true });
      fs.closeSync(fs.openSync(marker, 'wx')); // atomic create; throws if it already exists
    } catch (_) {
      return; // marker already present → not the first stop → allow
    }
    const reason =
      'HOOK TEST (Rosetta diagnostic): your turn-stop was blocked ONE TIME by a Stop hook to test ' +
      'prevention. Please tell the user verbatim that the Stop hook blocked once and quote this reason, ' +
      'then finish normally — it will NOT block again this session.';
    const obj = stagedJson(output);
    obj.decision = 'block';
    obj.reason = reason;
    obj.hookSpecificOutput = Object.assign({ hookEventName: 'Stop' }, obj.hookSpecificOutput, { decision: 'block', reason: reason });
    output.text = JSON.stringify(obj);
  },
};

function main() {
  const raw = readStdin();
  const argv = process.argv.slice(2);

  // 1) DUMP FIRST — before any parsing, so a malformed payload is still fully captured.
  log('===== hook invocation =====');
  log('INVOCATION: ' + process.argv.join(' '));
  log('ARGV: ' + JSON.stringify(argv));
  log('CWD: ' + process.cwd());
  log('SCRIPT DIR (__dirname): ' + __dirname);
  log('RAW STDIN:');
  log(raw.length ? raw : '<empty>');
  log('ENV:');
  for (const key of Object.keys(process.env).sort()) {
    log(`  ${key}=${process.env[key]}`);
  }

  // 2) Parse input (best-effort) and record the outcome.
  let input = null;
  if (raw.trim().length) {
    try {
      input = JSON.parse(raw);
      log('PARSED INPUT: ' + JSON.stringify(input));
    } catch (e) {
      log('PARSE ERROR: ' + e.message);
    }
  } else {
    log('PARSED INPUT: <no stdin>');
  }

  // 3) Run flag-selected processors over a mutable output accumulator.
  const flags = parseFlags(argv);
  const output = { text: '', exitCode: 0 };
  for (const flag of Object.keys(flags)) {
    const proc = PROCESSORS[flag];
    if (!proc) {
      log('UNKNOWN FLAG (ignored): ' + flag);
      continue;
    }
    log(`PROCESSOR: ${flag} (value=${JSON.stringify(flags[flag])})`);
    proc(input, flags[flag], output);
  }

  // 4) Emit: provided text -> stdout, then exit with the resolved code.
  if (output.text) process.stdout.write(output.text);
  log(`RESULT: exitCode=${output.exitCode} textLen=${output.text.length}`);
  log('');
  process.exit(output.exitCode);
}

main();
