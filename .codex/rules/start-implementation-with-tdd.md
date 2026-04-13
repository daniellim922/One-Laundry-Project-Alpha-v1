---
description: Start behavior-changing implementation with the $tdd skill and follow a red-green-refactor loop.
globs: "**/*.{ts,tsx,js,jsx}"
alwaysApply: true
---

# Start Implementation With $tdd

When a task changes runtime behavior, begin by using `$tdd`.

## Requirements

1. For feature work and bug fixes, activate `$tdd` before writing implementation code.
2. Start by defining the public interface and the most important behaviors to test.
3. Implement in vertical slices:
   - one failing behavior-focused test
   - the minimum code to pass it
   - then refactor safely
4. Prefer tests through public interfaces over implementation-coupled tests.
5. Do not write all tests up front and do not implement broad horizontal slices before getting feedback from a passing tracer bullet.

## Exceptions

- Docs-only, prompt-only, rule-only, or glossary-only changes
- Copy, styling, or comment-only edits with no behavior change
- Purely mechanical refactors with no behavior change

If behavior risk appears during a refactor, fall back to `$tdd`.
