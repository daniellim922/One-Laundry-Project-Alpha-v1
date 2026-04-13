# One Laundry Feature Implementation Prompt

Use this prompt when drafting or delegating implementation work in this repo.

## Instructions

- Read `AGENTS.md` and `UBIQUITOUS_LANGUAGE.md` first.
- Keep server components as the default; add `"use client"` only for interactive UI.
- Route form submissions through co-located server actions.
- Route non-form HTTP workflows through `app/api/`.
- Validate new structured inputs with Zod.
- Return clear success/error contracts for server actions and route handlers.
- Expose pending or loading UI for async interactions and Suspense-backed route data where the wait is user-visible.
- Use shadcn primitives or wrappers for standard UI controls.
- Update `AGENTS.md`, `UBIQUITOUS_LANGUAGE.md`, `.codex/docs/data-model-erd.md`, and `.codex/docs/api-workflows.md` when behavior, schema, or routes change.
- Run targeted checks and the broader test suite required by the touched surface.
