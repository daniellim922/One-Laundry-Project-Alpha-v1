# Agent Skills

A collection of agent skills that extend capabilities across planning, development, and tooling.

## Planning & Design

These skills help you think through problems before writing code.

- **to-prd** — Turn the current conversation context into a PRD and submit it as a GitHub issue. No interview — just synthesizes what you've already discussed.

- **to-issues** — Break any plan, spec, or PRD into independently-grabbable GitHub issues using vertical slices.

- **grill-me** — Get relentlessly interviewed about a plan or design until every branch of the decision tree is resolved.

- **design-an-interface** — Generate multiple radically different interface designs for a module using parallel sub-agents.

- **request-refactor-plan** — Create a detailed refactor plan with tiny commits via user interview, then file it as a GitHub issue.

## Development

These skills help you write, refactor, and fix code.

- **tdd** — Test-driven development with a red-green-refactor loop. Builds features or fixes bugs one vertical slice at a time.

- **triage-issue** — Investigate a bug by exploring the codebase, identify the root cause, and file a GitHub issue with a TDD-based fix plan.

- **improve-codebase-architecture** — Explore a codebase for architectural improvement opportunities, focusing on deepening shallow modules and improving testability.

## Tooling & Setup

- **git-guardrails-claude-code** — Set up Claude Code hooks to block dangerous git commands (push, reset --hard, clean, etc.) before they execute.

  ```
  npx skills@latest add mattpocock/skills/git-guardrails-claude-code
  ```

## Writing & Knowledge

- **write-a-skill** — Create new skills with proper structure, progressive disclosure, and bundled resources.

- **ubiquitous-language** — Extract a DDD-style ubiquitous language glossary from the current conversation.
