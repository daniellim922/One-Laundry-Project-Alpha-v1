---
description: UI work must use shadcn primitives/composition and expose visible async loading or pending states.
globs: "app/**/*.tsx"
alwaysApply: true
---

# Frontend Loading States And shadcn

## Rules

1. Build UI with shadcn primitives or wrappers around them; do not introduce a parallel component system for standard controls.
2. Keep generated shadcn primitives read-only and compose new wrappers instead of editing the defaults.
3. Every user-visible async interaction needs pending feedback:
   - disabled buttons while submitting
   - inline loading or skeleton UI while fetching
   - Suspense or route-level loading UI where async route content blocks rendering
4. Do not leave a promise-driven view with no visible state transition.
