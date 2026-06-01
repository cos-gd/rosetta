# Workspace Configuration Instructions

## Overview

This guides tell how to configure environment for the best success with AI.

## 1. Rosetta Installation and Onboarding

See [Quick Start](QUICKSTART.md)

## 2. Repository Activities

Prerequisite: Onboard the repository to Rosetta.

**Modernization**: Onboard both the old and the new repositories. If everything is in one repository, clearly state what is where in CONTEXT.md.

1. Verify and document processes to follow in CONTEXT.md (without technical details):
    - What is the source
    - What is the target
    - What issue tracker used
    - How story gets implemented
    - What is the goal
    - Add what this project does overall in clients ecosystem
    - **Modernization**: state the modernization/migration goals and processes, state that old code in refsrc contains its own docs/CONTEXT.md
2. Verify and document technical aspects to follow in ARCHITECTURE.md:
    - When/where integration tests created
    - When/where e2e tests created
    - Any harnesses to use
    - How to start an application(s) locally
    - Are there any technical dependencies on external or private libraries
    - Technical and architectural targets
    - Any issues or technical gaps in current project
    - Explain authentication / authorization / routing setup for the deployed application
    - Briefly describe deployment infrastructure and environments
    - **Modernization**: state the target for modernization/migration, state how new application will be introduced and patterns followed (ex: component replacements, limitations of modernization, strangler fig pattern, use api gateway for routing old/new, etc.), reference target architecture document (which should be a separate doc and define how new app should be structured, organized, etc.), what stays, what changes, how changes (examples: old state management to new), tips on modernization (examples: copy css then adapt, skip onboarding UI, data generation), address how unit and e2e test to be handled (copy + fix or full regeneration), state that old code in refsrc contains its own docs/CONTEXT.md
3. Provide source code for reference:
    - Backend code for frontend repositories
    - Custom or corporate libraries/packages
    - New or refreshed public framework with the major or breaking update that was done in the last 365 days
    - **Modernization**: original "old" source code
    - Ensure repository root .gitignore contains Rosetta exceptions (and add if not):
      ```
      agents/TEMP/
      refsrc/
      !refsrc/INDEX.md
      ```
    - Clone all such code base to `refsrc` as subfolders. Example: `refsrc/fastmcp-3.3.1` or `refsrc/private-ui-lib`.
    - Create or update INDEX.md using md headers: `## "refsrc/fastmcp-3.3.1" - main framework for MCP handling` and `## "refsrc/private-ui-lib" - must use corporate styles for TailwindCSS`.
4. Verify and define reusable patterns. **Modernization**: additionally mapping old -> to be
    - Components
    - State Management
    - Databases
    - API protocols
    - Messaging
    - Controllers
    - CRUD verticals
    - etc.
5. Configure ecosystem:
    - Install and configure MCPs and CLIs, keep up to 3 MCPs enabled at a time, prefer CLIs since those are always readily available and do not consume context
    - Install and configure plugins / extensions
    - Install and configure AI coding agent CLIs (copilot cli, claude, codex, etc)
6. **Modernization**: use /requirements-authoring-flow or allium to generate specs of existing old code.
7. **Modernization**: use /coding-flow for unit tests and /aqa-flow for e2e tests to cover old code.

## 3. Modernization Workspace Setup

Two options:
1. Reference Source: workspace is just the new repository, uses refsrc to include old code base.
   Easiest and fast-forward.
   Disadvantage is that changes can only be applied on one repository => multiple windows for multiple repositories. 

   Structure:
   ```
   <new git repo root>
   |- docs/ARCHITECTURE.md      # Contains new application definition, modernization target, references refsrc/<old code>/docs/ARCHITECTURE.md for old code.
   |- docs/CONTEXT.md           # Contains new application definition, modernization processes, references refsrc/<old code>/docs/CONTEXT.md for old code.
   |- refsrc/<old code>
   |  |- docs/ARCHITECTURE.md
   |  |- docs/CONTEXT.md
   |  |- <old code>
   |- <new code>
   ```

2. Composite Workspaces: top level folder includes both old and new repos, and other repositories.
   Useful for cross multi-service workflows.
   Disadvantages: workspace itself must be added to git as well, .gitignore to be properly defined, docs routing, overall complexity.

   Structure:
   ```
   <workspace git repo>
   |- docs/ARCHITECTURE.md      # Contains very small documentation, mostly index to all sub-repos. Technical information on what each repository is for. Requires use of large-workspace-handling skill
   |- docs/CONTEXT.md           # Contains very small documentation, mostly index to all sub-repos. Business information on what each repository is for.
   |- <1st old code repository>
   |  |- docs/ARCHITECTURE.md
   |  |- docs/CONTEXT.md
   |  |- <old code 1>
   |- <2nd old code repository>
   |  |- docs/ARCHITECTURE.md
   |  |- docs/CONTEXT.md
   |  |- <old code 2>
   |- <new code repository>
   |  |- docs/ARCHITECTURE.md
   |  |- docs/CONTEXT.md
   |  |- <new code>
   |- <etc>
   |- .gitignore                # Excludes all those cloned repository folders: 1st old, 2nd old, new
   ```
