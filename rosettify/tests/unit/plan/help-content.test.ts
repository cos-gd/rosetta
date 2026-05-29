/**
 * Unit tests for plan help content.
 * Verifies planSchemasDict coverage, notes array, subcommand examples, and no-leak assertion.
 */
import { describe, it, expect } from "vitest";
import { planSchemasDict } from "../../../src/commands/plan/schemas.js";
import { planHelpContent, planNotes } from "../../../src/commands/plan/help-content.js";

// ---------------------------------------------------------------------------
// planSchemasDict — type-name keyed, one entry per distinct type
// ---------------------------------------------------------------------------

describe("planSchemasDict — type-name keys", () => {
  const EXPECTED_TYPE_NAME_KEYS = [
    // Input types
    "PlanCreateInput",
    "PlanNextInput",
    "PlanUpdateStatusInput",
    "PlanTargetInput",         // shared by show_status and query
    "PlanUpsertInput",
    "PlanCreateWithTemplateInput",
    "PlanUpsertWithTemplateInput",
    "PlanListTemplatesInput",
    // Result types
    "PlanWriteResult",         // shared by all 4 write subcommands
    "PlanNextResult",
    "PlanUpdateStatusResult",
    "PlanShowStatusResult",
    "PlanQueryResult",
    "PlanTemplateCatalog",
    // Shared data shapes
    "Plan",
    "Phase",
    "Step",
  ] as const;

  it("contains an entry for every expected type name", () => {
    for (const name of EXPECTED_TYPE_NAME_KEYS) {
      expect(planSchemasDict[name], `Missing key: ${name}`).toBeDefined();
    }
  });

  it("schemas dict is a flat dictionary (Record<string, unknown>)", () => {
    expect(typeof planSchemasDict).toBe("object");
    expect(planSchemasDict).not.toBeNull();
  });

  it("does not use old subcommand-name keys (no 'create', 'next' as top-level input keys)", () => {
    // The old dict used subcommand names as input keys; new dict uses type names
    // (subcommand names like 'create' may still appear inside nested schema objects
    // but should NOT appear as planSchemasDict top-level input-schema keys)
    // We verify by checking that OLD-style output keys are gone
    expect(planSchemasDict["create-output"]).toBeUndefined();
    expect(planSchemasDict["next-output"]).toBeUndefined();
    expect(planSchemasDict["compressed-tree"]).toBeUndefined();
  });

  it("does not expose input_schema or output_schema as root keys (per M1 fix)", () => {
    const helpResult = planHelpContent;
    expect((helpResult as Record<string, unknown>)["input_schema"]).toBeUndefined();
    expect((helpResult as Record<string, unknown>)["output_schema"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// No-leak assertion — no FR-IDs or NFR-IDs in emitted help
// ---------------------------------------------------------------------------

describe("planHelpContent — no-leak assertion", () => {
  it("serialized help contains no FR-ID or NFR-ID strings", () => {
    const serialized = JSON.stringify(planHelpContent);
    const match = serialized.match(/\bN?FR-[A-Z0-9]/);
    expect(match, `Found requirement ID leak: ${match?.[0]}`).toBeNull();
  });

  it("serialized help contains no 'compressed-tree' wording", () => {
    const serialized = JSON.stringify(planHelpContent);
    expect(serialized).not.toContain("compressed-tree");
  });
});

// ---------------------------------------------------------------------------
// Notes array contents
// ---------------------------------------------------------------------------

describe("planHelpContent — notes array", () => {
  it("notes array has at least 11 entries (7 original + 4 new)", () => {
    expect(Array.isArray(planNotes)).toBe(true);
    expect(planNotes.length).toBeGreaterThanOrEqual(11);
  });

  it("notes array is string[]", () => {
    for (const note of planNotes) {
      expect(typeof note).toBe("string");
      expect(note.length).toBeGreaterThan(0);
    }
  });

  it("notes include silent-drop behavior (discriminator: 'silently drops status')", () => {
    expect(planNotes.some((n) => n.includes("silently drops status"))).toBe(true);
  });

  it("notes include write-cycle summary (discriminator: 'write-cycle process')", () => {
    expect(planNotes.some((n) => n.includes("write-cycle process"))).toBe(true);
  });

  it("notes include .bakNNN rename + previous_version (discriminator: '.bakNNN' and 'previous_version')", () => {
    expect(planNotes.some((n) => n.includes(".bakNNN") && n.includes("previous_version"))).toBe(true);
  });

  it("notes include backup retention with default 5 (discriminator: 'retention' and 'default 5')", () => {
    expect(planNotes.some((n) => n.includes("retention") && n.includes("default 5"))).toBe(true);
  });

  it("notes include missing-but-bak read retry (discriminator: 'missing but at least one backup exists')", () => {
    expect(planNotes.some((n) => n.includes("missing but at least one backup exists"))).toBe(true);
  });

  it("notes include template kind separation (discriminator: 'two kinds' and 'cannot be used with the other kind')", () => {
    expect(planNotes.some((n) => n.includes("two kinds") && n.includes("cannot be used with the other kind"))).toBe(true);
  });

  it("notes include placeholder syntax (discriminator: '[placeholder-name]' and 'match exactly')", () => {
    expect(planNotes.some((n) => n.includes("[placeholder-name]") && n.includes("match exactly"))).toBe(true);
  });

  // 4 new notes from FR-PLAN-0042
  it("notes include plan-construction-flow note (discriminator: 'plan construction flow')", () => {
    expect(planNotes.some((n) => n.includes("plan construction flow"))).toBe(true);
  });

  it("notes include phase-scoped execution note (discriminator: 'phase-scoped execution')", () => {
    expect(planNotes.some((n) => n.includes("phase-scoped execution"))).toBe(true);
  });

  it("notes include what-next-returns note (discriminator: 'what next returns')", () => {
    expect(planNotes.some((n) => n.includes("what next returns"))).toBe(true);
  });

  it("notes include getting-blocked/failed note (discriminator: 'show_status' and 'query')", () => {
    expect(planNotes.some((n) => n.includes("show_status") && n.includes("query"))).toBe(true);
  });

  it("concepts.resume is absent from help content", () => {
    const concepts = planHelpContent.concepts as Record<string, unknown>;
    expect(concepts["resume"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Subcommand entries with dual-form examples
// ---------------------------------------------------------------------------

describe("planHelpContent — subcommand examples", () => {
  const EXPECTED_SUBCOMMANDS = [
    "create",
    "next",
    "update_status",
    "show_status",
    "query",
    "upsert",
    "create-with-template",
    "upsert-with-template",
    "list-templates",
  ];

  it("has entries for all 9 subcommands", () => {
    const names = planHelpContent.subcommands.map((s) => s.name);
    for (const expected of EXPECTED_SUBCOMMANDS) {
      expect(names).toContain(expected);
    }
  });

  it("every subcommand entry has examples with tip and real fields", () => {
    for (const sub of planHelpContent.subcommands) {
      expect(sub.examples).toBeDefined();
      expect(typeof (sub.examples as Record<string, unknown>)["tip"]).toBe("string");
      expect(typeof (sub.examples as Record<string, unknown>)["real"]).toBe("string");
    }
  });

  it("tip examples contain bracketed placeholders", () => {
    const tipsWithBrackets = planHelpContent.subcommands.filter((s) => {
      const tip = (s.examples as Record<string, string>)["tip"] ?? "";
      return tip.includes("[") && tip.includes("]");
    });
    expect(tipsWithBrackets.length).toBeGreaterThan(0);
  });

  it("next subcommand description mentions default 3", () => {
    const next = planHelpContent.subcommands.find((s) => s.name === "next")!;
    expect(next.description).toContain("3");
  });

  it("next subcommand args mention default 3", () => {
    const next = planHelpContent.subcommands.find((s) => s.name === "next")!;
    const limit = (next.args as Record<string, string>)["limit"];
    expect(limit).toContain("3");
  });

  it("next subcommand description does NOT mention flags like resume or previously_blocked", () => {
    const next = planHelpContent.subcommands.find((s) => s.name === "next")!;
    expect(next.description).not.toContain("resume");
    expect(next.description).not.toContain("previously_blocked");
    expect(next.description).not.toContain("previously_failed");
  });
});

// ---------------------------------------------------------------------------
// Required fields
// ---------------------------------------------------------------------------

describe("planHelpContent — required fields", () => {
  it("has plan_file field", () => {
    expect(planHelpContent.plan_file).toBeDefined();
  });

  it("has concepts field", () => {
    expect(planHelpContent.concepts).toBeDefined();
  });

  it("has subagent_fields field", () => {
    expect(planHelpContent.subagent_fields).toBeDefined();
  });

  it("has limits field", () => {
    expect(planHelpContent.limits).toBeDefined();
  });

  it("has templates field (getter)", () => {
    const templates = planHelpContent.templates;
    expect(templates).toBeDefined();
    expect(Array.isArray(templates.create)).toBe(true);
    expect(Array.isArray(templates.upsert)).toBe(true);
  });

  it("has plan_authoring_guidance field with verbatim text", () => {
    expect(planHelpContent.plan_authoring_guidance).toBe(
      "the last step in each phase should verify all work in that phase was actually completed; " +
      "the last phase should verify all work across the entire plan was completed",
    );
  });

  it("has next_steps_for_ai field mentioning 'steps' (not 'ready steps')", () => {
    expect(planHelpContent.next_steps_for_ai).toBeDefined();
    expect(typeof planHelpContent.next_steps_for_ai).toBe("string");
    // Should say 'steps' not 'ready steps'
    expect(planHelpContent.next_steps_for_ai).not.toContain("ready steps");
  });
});
