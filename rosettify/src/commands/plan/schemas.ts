// Implements FR-HELP-0002 / FR-PLAN-0041 (schemas dict keyed by exported type name, SRP+DRY).
// Aggregates per-subcommand declarations into dictionaries for help output and validation.

import { createInputSchema, createOutputSchema } from "./create.js";
import { upsertInputSchema, upsertOutputSchema } from "./upsert.js";
import { updateStatusInputSchema, updateStatusOutputSchema } from "./update-status.js";
import { nextInputSchema, nextOutputSchema } from "./next.js";
import { showStatusInputSchema, showStatusOutputSchema } from "./show-status.js";
import { queryInputSchema, queryOutputSchema } from "./query.js";
import { createWithTemplateInputSchema, createWithTemplateOutputSchema } from "./create-with-template.js";
import { upsertWithTemplateInputSchema, upsertWithTemplateOutputSchema } from "./upsert-with-template.js";
import { listTemplatesInputSchema, listTemplatesOutputSchema } from "./list-templates.js";

// FR-HELP-0002 — per-subcommand schema dict, keyed by subcommand name
export const planSubcommandSchemas = {
  create: { input: createInputSchema, output: createOutputSchema },
  next: { input: nextInputSchema, output: nextOutputSchema },
  update_status: { input: updateStatusInputSchema, output: updateStatusOutputSchema },
  show_status: { input: showStatusInputSchema, output: showStatusOutputSchema },
  query: { input: queryInputSchema, output: queryOutputSchema },
  upsert: { input: upsertInputSchema, output: upsertOutputSchema },
  "create-with-template": { input: createWithTemplateInputSchema, output: createWithTemplateOutputSchema },
  "upsert-with-template": { input: upsertWithTemplateInputSchema, output: upsertWithTemplateOutputSchema },
  "list-templates": { input: listTemplatesInputSchema, output: listTemplatesOutputSchema },
} as const;

// ---------------------------------------------------------------------------
// Shared schemas defined once (SRP+DRY)
// ---------------------------------------------------------------------------

// PlanWriteResult — shared by all 4 write subcommands (create, upsert, create-with-template, upsert-with-template)
const planWriteResultSchema = {
  type: "object" as const,
  description: "Compact plan snapshot returned by all write subcommands (create, upsert, create-with-template, upsert-with-template)",
  properties: {
    plan: {
      type: "object" as const,
      properties: {
        name: { type: "string" as const },
        status: { type: "string" as const },
      },
    },
    previous_version: { type: ["string", "null"] as const },
    phases: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          name: { type: "string" as const },
          status: { type: "string" as const },
          steps: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                id: { type: "string" as const },
                name: { type: "string" as const },
                status: { type: "string" as const },
              },
            },
          },
        },
      },
    },
  },
};

// PlanTargetInput — shared by show_status and query (both accept plan_file + target_id)
export const planTargetInputSchema = {
  type: "object" as const,
  properties: {
    plan_file: { type: "string", description: "Path to the plan JSON file" },
    target_id: { type: "string", description: "entire_plan | phase-id | step-id (default: entire_plan)" },
  },
  required: [],
};

const planSchema = {
  type: "object" as const,
  description: "Full plan JSON: name, description, status, timestamps, previous_version, phases",
  properties: {
    name: { type: "string" as const },
    description: { type: "string" as const },
    status: { type: "string" as const, enum: ["open", "in_progress", "complete", "blocked", "failed"] as const },
    created_at: { type: "string" as const },
    updated_at: { type: "string" as const },
    previous_version: { type: ["string", "null"] as const },
    phases: { type: "array" as const },
  },
};

const phaseSchema = {
  type: "object" as const,
  description: "Phase fields: id, name, description, status, depends_on, subagent, role, model, steps",
  properties: {
    id: { type: "string" as const },
    name: { type: "string" as const },
    description: { type: "string" as const },
    status: { type: "string" as const },
    depends_on: { type: "array" as const, items: { type: "string" as const } },
    subagent: { type: "string" as const },
    role: { type: "string" as const },
    model: { type: "string" as const },
    steps: { type: "array" as const },
  },
};

const stepSchema = {
  type: "object" as const,
  description: "Step fields: id, name, prompt, status, depends_on, subagent, role, model",
  properties: {
    id: { type: "string" as const },
    name: { type: "string" as const },
    prompt: { type: "string" as const },
    status: { type: "string" as const },
    depends_on: { type: "array" as const, items: { type: "string" as const } },
    subagent: { type: "string" as const },
    role: { type: "string" as const },
    model: { type: "string" as const },
  },
};

/**
 * FR-HELP-0002 — flat schemas dict: keyed by exported type name.
 * One entry per distinct named type — inputs, results, and shared data shapes.
 * Used for help display (planSchemasDict).
 */
export const planSchemasDict: Record<string, unknown> = {
  // Input schemas keyed by exported type name
  PlanCreateInput: createInputSchema,
  PlanNextInput: nextInputSchema,
  PlanUpdateStatusInput: updateStatusInputSchema,
  PlanTargetInput: planTargetInputSchema,       // shared by show_status and query
  PlanUpsertInput: upsertInputSchema,
  PlanCreateWithTemplateInput: createWithTemplateInputSchema,
  PlanUpsertWithTemplateInput: upsertWithTemplateInputSchema,
  PlanListTemplatesInput: listTemplatesInputSchema,
  // Result schemas keyed by exported type name
  PlanWriteResult: planWriteResultSchema,       // shared by all 4 write subcommands
  PlanNextResult: nextOutputSchema,
  PlanUpdateStatusResult: updateStatusOutputSchema,
  PlanShowStatusResult: showStatusOutputSchema,
  PlanQueryResult: queryOutputSchema,
  PlanTemplateCatalog: listTemplatesOutputSchema,
  // Shared data shapes
  Plan: planSchema,
  Phase: phaseSchema,
  Step: stepSchema,
};
