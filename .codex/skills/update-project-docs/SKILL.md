---
name: update-project-docs
description: Explore the One Laundry codebase to detect structural and domain changes, then propose updates to AGENTS.md and UBIQUITOUS_LANGUAGE.md. Use when user says "update docs", "sync agents", "update AGENTS.md", "update glossary", "sync project docs", or after implementing a new feature or module.
---

# Update Project Docs

Keeps `AGENTS.md` and `UBIQUITOUS_LANGUAGE.md` in sync with the codebase after features are implemented. Always ask the user before applying changes.

## Workflow

1. **Explore the codebase** for undocumented changes (see checklist below).
2. **Read both files** to know what is already documented.
3. **Classify** each finding as structural (AGENTS.md), domain (UBIQUITOUS_LANGUAGE.md), or both.
4. **Propose changes** to the user: summary of findings, which file(s), and the specific edits.
5. **Apply only after user confirms.**

## Exploration checklist

Scan these locations and compare against what the docs already describe:

| Location | What to look for |
|---|---|
| `app/dashboard/*/` | New or renamed feature routes |
| `db/tables/` | New Drizzle schemas, entities, enums, columns |
| `types/status.ts`, `types/badge-tones.ts` | New status unions or badge tone maps |
| `lib/` | New shared utilities or architectural patterns |
| `components/` (non-`ui/`) | New shared components (data-table extensions, layout shells) |
| `package.json` scripts | New or changed npm commands |
| `package.json` dependencies | Stack additions |
| `test/` | New test patterns or conventions |

## Classification rules

**Structural (AGENTS.md):**
- New npm scripts --> `Setup and commands`
- New dependencies --> `Stack` (single-line, dot-separated list)
- New patterns (auth, data-fetching, caching) --> `Architecture` (bullet list)
- New routes, libs, components --> `Key file locations` (pipe table)
- New test conventions --> `Testing`
- New coding rules --> `Dos`

**Domain (UBIQUITOUS_LANGUAGE.md):**
- New DB tables/columns --> new term row in the appropriate grouped table
- New status enums --> new term row; check for conflicts with existing terms
- New FK relationships --> `Relationships` section
- Ambiguous or overloaded terms --> `Flagged ambiguities`
- Terms discussed but not yet in code --> `Deferred`

## Format rules

**AGENTS.md:**
- Stack line: dot-separated (`Foo v1 · Bar v2 · …`).
- Key file locations: pipe table (`| What | Where |`).
- Architecture: bullet list with bold lead term.
- Dos: bullet list starting with a verb.

**UBIQUITOUS_LANGUAGE.md:**
- Term tables: `| **Term** | Definition (one sentence) | Aliases to avoid |`.
- Group terms under domain headings (e.g. `## People and employment`).
- Bold term names in Relationships and Example dialogue.
- Keep definitions tight: one sentence, what it IS not what it does.
- If a new term conflicts with an existing one, add to `Flagged ambiguities`.

## Propose-then-confirm protocol

Present findings to the user as a numbered list:

```
Detected changes:
1. New route `app/dashboard/reports/` (not in Key file locations)
2. New DB table `reports` with status enum (no glossary entry)
3. New npm script `db:studio`

Proposed updates:
- AGENTS.md: add row to Key file locations, add script to Setup and commands
- UBIQUITOUS_LANGUAGE.md: add **Report** term, update Relationships

Apply these changes? (yes / edit first / skip)
```

Do NOT edit either file until the user confirms.
