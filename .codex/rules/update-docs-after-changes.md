---
description: Keep repo instructions, glossary, and architecture diagrams aligned with code changes.
globs: "**/*"
alwaysApply: true
---

# Update Docs After Behavior Changes

When implementation changes the product surface, update the matching docs in the same task.

## Update targets

- `AGENTS.md` for setup, architecture, testing, and repo workflow changes
- `UBIQUITOUS_LANGUAGE.md` for domain vocabulary, statuses, relationships, and ambiguities
- `.codex/docs/data-model-erd.md` for schema and relationship changes
- `.codex/docs/api-workflows.md` for route handler, auth, export, and request-flow changes

## Trigger examples

- New table, enum, or foreign key
- New route handler or export endpoint
- Changed validation or request boundary
- New test command, hook, prompt, or custom agent that affects repo workflow
