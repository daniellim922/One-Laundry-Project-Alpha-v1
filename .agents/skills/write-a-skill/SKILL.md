---
name: write-a-skill
description: Create or update agent skills with clear trigger boundaries, progressive disclosure, optional scripts, and repo-safe validation guidance. Use when the user wants to create, revise, structure, or improve a SKILL.md-based workflow.
---

# Writing Skills

## Workflow

1. Define the job and trigger boundary:
   - What concrete task does the skill own?
   - What should trigger it?
   - What should *not* trigger it?
   - Does it need scripts, references, or only instructions?
2. Create the minimum skill structure:
   - `SKILL.md` is required
   - add `references/` only for detail that should stay out of the main file
   - add `scripts/` only for deterministic or repetitive work
   - add `assets/` or `agents/openai.yaml` only when they materially help
3. Draft `SKILL.md` with YAML frontmatter:
   - `name` must be lowercase kebab-case
   - `description` must say what it does and when to use it
4. Keep the main file focused:
   - concise workflow steps
   - explicit inputs and outputs
   - relative links to references or scripts from the skill root
5. Review the skill against likely prompts and refine the description until the trigger boundary is clear.

## SKILL.md Template

```md
---
name: skill-name
description: Explain what the skill does. Use when [specific triggers].
---

# Skill Name

## Workflow

1. Inspect the relevant inputs.
2. Apply the skill-specific process.
3. Validate the result before finishing.

## References

- [Reference guide](references/REFERENCE.md)
- `scripts/validate.sh`
```

## Description Rules

- The description is the main trigger surface. Make it specific.
- First sentence: capability.
- Second sentence: `Use when ...`
- Include keywords, file types, domains, or situations that distinguish it from other skills.
- Avoid vague descriptions like `Helps with documents.`

## Script Rules

Add scripts only when they improve reliability or save repeated generation.

- Scripts must be non-interactive.
- Scripts should expose `--help` with usage, flags, and examples.
- Prefer structured stdout and diagnostic stderr.
- Reference script paths relative to the skill root.

## Authoring Rules

- Prefer instructions over scripts unless execution needs determinism.
- Keep `SKILL.md` short; move deep detail to `references/`.
- Use concrete, procedural steps instead of hardcoded one-off answers.
- Include validation or self-check steps when failure is likely.
- Add example trigger queries when the skill boundary is broad or ambiguous.

## Review Checklist

- [ ] `name` is valid kebab-case
- [ ] `description` clearly states what it does and when to use it
- [ ] The workflow is reusable, not just an answer for one task
- [ ] Relative links to scripts and references are correct
- [ ] Scripts are non-interactive and self-describing
- [ ] The skill avoids time-sensitive or product-version-specific claims unless required
