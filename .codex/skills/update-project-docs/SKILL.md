---
name: update-project-docs
description: Sync One Laundry operating docs with the live codebase, including AGENTS.md, UBIQUITOUS_LANGUAGE.md, and .codex architecture docs. Use when features, schema, API routes, or workflows change, or when the user asks to update docs, the glossary, ERD, or API diagrams.
---

# Update Project Docs

## Outputs

- `AGENTS.md`
- `UBIQUITOUS_LANGUAGE.md`
- `.codex/docs/data-model-erd.md`
- `.codex/docs/api-workflows.md`

## Workflow

1. Inspect changed files first, then check `app/dashboard/`, `app/api/`, `db/`, `types/`, `utils/`, and `package.json` for undocumented behavior.
2. Classify findings:
   - Setup, stack, test, file-location, or implementation-contract changes go to `AGENTS.md`.
   - Domain terms, statuses, relationships, or ambiguities go to `UBIQUITOUS_LANGUAGE.md`.
   - Table, enum, or foreign-key changes go to the ERD doc.
   - Route-handler, auth, export, or request-flow changes go to the API workflow doc.
3. Apply the documentation changes directly when this skill is explicitly invoked or when doc sync is part of the task.
4. Keep terminology aligned with the live schema and route handlers, not speculative future design.
5. Keep definitions tight and operational: one sentence per glossary term, concise architecture bullets, and Mermaid diagrams that reflect the current code paths.

## Guardrails

- Do not invent entities, endpoints, or statuses that do not exist in code.
- Call out important mismatches, such as intended one-to-one relationships that are not enforced by a DB constraint.
- When the code changes only in docs, prompts, or rules, update docs without expanding the product glossary unnecessarily.
- End by noting what changed and what validation, if any, was run.
