---
name: verify-feature-changes
description: Verify One Laundry changes with targeted checks and the full test suite when product code changed. Use when code was modified or when the user asks to test, verify, harden, or regression-check a change.
---

# Verify Feature Changes

## Workflow

1. Inspect `git diff --name-only` or `git status --short` to understand the touched surface.
2. Run focused checks first for the changed files or feature area:
   - `npx eslint <file>`
   - `npx vitest run <file>`
   - `npx playwright test <spec> --project=chromium`
3. If changes touch `app/`, `components/`, `db/`, `lib/`, `utils/`, `types/`, `test/`, or `package.json`, finish with:
   - `npx tsc --noEmit`
   - `npm run test`
4. If changes only touch docs, prompts, rules, or `.codex` metadata, skip the full suite and say why.
5. When a check fails, fix the root cause, rerun the failing command, then rerun the broader verification it feeds into.

## Reporting

- State the commands you ran.
- State whether they passed, failed, or were skipped.
- If anything remains unverified, name the gap explicitly.
