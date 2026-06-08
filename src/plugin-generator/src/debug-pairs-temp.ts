// Let me instrument the actual pluginRewriteReferences to log what it does
// with the init-workspace-rules content

import { generate } from './index.js';
import fs from 'fs';

// First, let me examine what init-workspace-rules content looks like BEFORE rewrite
// by checking the source and also look at what pairs are generated

// Actually let me check if maybe there's another pair that matches
// Try with the FULL set of frames from an actual run

// Instrument: temporarily patch pluginRewriteReferences to log
// Actually, let me just look at the intermediate state more cleverly.

// The source text has "rules/bootstrap.md" but the output has "instructions/bootstrap.md"
// The only way this happens is if something rewrites "rules/" → "instructions/"

// HYPOTHESIS: Maybe the copilot-standalone has ADDITIONAL configure/** entries from somewhere?
// Or maybe the generate run has a DIFFERENT set of frames than I simulated?

// Let me print all pairs generated during an actual generate run by monkeypatching
// I'll add a console.error call and check the ACTUAL run

// Actually there might be a MUCH simpler explanation:
// When I listed specEntries in debug output, I saw:
// rules/** → .github/instructions  (unambiguous specEntry for folder 'rules')
// rules/** → .github/rules         (second specEntry for folder 'rules')
// The "unambiguous" check: srcToTargets.get('rules') would have both 'instructions' and 'rules'
// BUT WAIT: I need to check what happens with the FOLDER PAIR generation 
// FOLDER PAIRS are for specEntries only (not frames)
// srcToTargets = Map { 'rules' → Set{'instructions', 'rules'} } → ambiguous → no pair emitted ✓

// WAIT - I see it now! Let me re-read buildRenamePairs more carefully...
// For the in-scope check: isInScope('.github/instructions') with base='.github'
// '.github/instructions'.startsWith('.github/') → true → in scope ✓
// pluginRelTarget = stripBase('.github/instructions') = 'instructions' ✓
// srcToTargets.get('rules') has 'instructions' and 'rules' → ambiguous → no pair ✓

// So folder pairs are NOT the issue. Let me look at FILE PAIRS more carefully.
// For FILE PAIRS: frames with sourcePath !== pluginRelTarget are added
// Frames IN .github/ namespace: all frames starting with .github/
// But what about frames OUTSIDE .github/ namespace? They're excluded by isInScope check.

// HOLD ON. Let me re-read the isInScope logic for FILE PAIRS:
// "if (!isInScope(frame.target)) continue;"
// For base='.github': target must start with '.github/'
// But what about agents frames? agents/.github/agents/engineer.agent.md?
// No wait, agents target in copilot-standalone is: '.github/agents'
// So agents/engineer.md → .github/agents/engineer.agent.md (target starts with .github/)
// After base strip: agents/engineer.md → agents/engineer.agent.md
// pair: [agents/engineer.md, agents/engineer.agent.md] → added!

// Does "agents/" match "rules/bootstrap.md"? No!

// What about the fileRename for agents?
// agents/(.+)\.md → .github/agents/$1.agent.md (the rename pattern target has .github/)
// So the FRAME target has path .github/agents/engineer.agent.md ✓
// sourcePath = agents/engineer.md

// Hmm. Let me just ADD ACTUAL LOGGING to the source code temporarily
// to see WHAT pair causes "rules/bootstrap.md" → "instructions/bootstrap.md"

// First: let me check if maybe it's a SUBSTRING match issue
// What if "rules/bootstrap-core-policy.md" pair somehow creates a substring match?
// Regex: (?<![A-Za-z0-9_-])rules\/bootstrap-core-policy\.md
// Pattern does NOT match "rules/bootstrap.md" because after "bootstrap" there's "-core-policy"
// expected but ".md" found.

// I'm confused. Let me look at this from a COMPLETELY different angle.
// Let me check if maybe the issue is in the configure/ frames!
// configure/claude-code.md contains ".claude/commands/" references
// The configure frame: configure/claude-code.md → .github/configure/claude-code.md (same path, no rename)
// So no file pair for configure.

// One more thing to check: are there 'configure/' frames coming from the preserved source copy?
// What does pluginCopy add to the frames?
// pluginCopy copies the preservedSource files as binary/text frames
// For copilot-standalone, preservedSource is core-copilot's preserved files
// These include .github/plugin/hooks.json.tmpl, hooks/hooks.json.tmpl, etc.
// These are raw copies, they don't go through any rename

// I'm going to try a completely different approach: dump all pairs during an ACTUAL run
// by modifying the source temporarily to log them

import { readFileSync, writeFileSync } from 'fs';
const src = readFileSync('./plugin-processors/plugin-rewrite-references.ts', 'utf-8');
console.log('File exists, checking buildRenamePairs signature...');
console.log(src.includes('buildRenamePairs') ? 'Found' : 'Not found');
