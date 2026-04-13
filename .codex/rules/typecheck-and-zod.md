---
description: Enforce TypeScript strictness and schema-based validation for new or changed application code.
globs: "**/*.{ts,tsx,js,jsx}"
alwaysApply: true
---

# Typecheck And Validate At The Boundary

## Rules

1. Treat `npx tsc --noEmit` as the final gate for TypeScript work. Do not leave type debt behind.
2. Use Zod for new structured validation at the frontend/backend boundary:
   - API JSON bodies
   - search params or query params with real shape
   - complex form contracts
   - imported or external payloads
3. Prefer deriving TypeScript types from schemas or table definitions instead of widening with `as`.
4. Keep parsing and coercion centralized instead of scattering unchecked `Number(...)`, `String(...)`, or manual object shape checks through new code.

## Exceptions

- Small `FormData` reads in existing simple server actions may stay lightweight if they remain consistent with the current route pattern.
- Even then, upgrade to Zod when the contract becomes multi-field, reusable, or error-prone.
