---
description: Use Context7 for documentation questions about libraries, frameworks, SDKs, APIs, CLI tools, and cloud services before answering or implementing against them.
globs: "**/*"
alwaysApply: true
---

# Use Context7 For Documentation Queries

When a task depends on third-party product behavior, do not rely on memory alone.

## Requirements

1. Use Context7 first for libraries, frameworks, SDKs, APIs, CLI tools, and cloud services.
2. Start with `resolve-library-id`, then query the selected library with the full user question.
3. Ground implementation details in the fetched docs before changing code or answering.
4. Use web search only when Context7 does not cover the product or cannot answer the specific question.

## Typical triggers

- React, Next.js, Tailwind, shadcn, Zod, Drizzle, better-auth, Playwright
- API syntax or version migration questions
- Setup, configuration, CLI usage, or provider-specific debugging
