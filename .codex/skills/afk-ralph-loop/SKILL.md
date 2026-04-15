---
name: afk-ralph-loop
description: Drive Codex through a phased local PRD or a parent GitHub PRD issue in strict one-slice iterations with mandatory TDD, source-of-truth updates, progress logging, and per-slice commits. Use when a shell loop asks Codex to autonomously work through plans/*.md phases or GitHub child issues one at a time.
---

# AFK Ralph Loop

## Use This Skill

- Use when the runner provides a local Markdown plan or a parent GitHub PRD issue and expects autonomous iteration.
- Do not use for ordinary one-off feature requests, ad hoc debugging, or broad multi-task implementation in a single run.

## Core Workflow

1. Start with `$tdd`.
2. Pick exactly one unit of work:
   - one incomplete phase from a local plan file, or
   - one incomplete child issue from the parent issue task list
3. Define the public interface for that slice and choose the next behavior to prove.
4. Write one failing test, make the minimum code change to pass, then refactor safely.
5. Run focused checks for the slice first, then broader relevant verification before committing.
6. Update the source of truth:
   - local plan mode: tick the completed phase acceptance criteria in the plan file
   - GitHub mode: update the child issue checklist or acceptance criteria and then update the parent issue task list
7. Append one concise entry to `progress.txt`.
8. Commit once for that completed slice only.
9. Stop after that single phase or child issue. If nothing remains, output `<promise>COMPLETE</promise>`.

## Required Constraints

- Never work on more than one phase or child issue per iteration.
- Never skip the failing-test step when behavior changes.
- Prefer public-interface tests over implementation-coupled tests.
- Do not start the next phase or issue after committing the current one.
- In GitHub mode, close the completed child issue after the commit.

## Verification

- Run the narrowest meaningful test first.
- If product code changed, finish with the relevant broader checks before commit.
- If verification is incomplete, say exactly what remains and why.
