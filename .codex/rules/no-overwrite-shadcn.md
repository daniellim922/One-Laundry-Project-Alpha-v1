---
description: Never overwrite default shadcn/ui components — compose or extend them instead
globs: components/ui/**/*.tsx
alwaysApply: true
---

# Never Overwrite Default shadcn/ui Components

The files in `components/ui/` that were scaffolded by shadcn (e.g. `button.tsx`, `input.tsx`, `select.tsx`, `dialog.tsx`, `calendar.tsx`) are **read-only primitives**. Do not modify them.

## Rules

1. **Never edit a default shadcn component** to add project-specific behaviour, variants, or styles.
2. **Create a new file** that imports and composes the shadcn primitive when custom behaviour is needed.
3. New wrapper/composed components live in `components/ui/` (or a feature-specific folder) with a descriptive name that makes the relationship clear.

## Examples

```tsx
// ❌ BAD — editing components/ui/input.tsx to add a date mask
export function Input({ dateMask, ...props }) { /* … */ }

// ✅ GOOD — new file components/ui/date-picker-input.tsx
import { Input } from "@/components/ui/input"
export function DatePickerInput(props) {
  return <Input {...props} /* compose here */ />
}
```

```tsx
// ❌ BAD — adding an "xs" size variant directly inside components/ui/button.tsx
// ✅ GOOD — already added via shadcn CLI update; if you need a project-specific
//    button, create components/ui/submit-button.tsx that wraps Button
```

## When shadcn Components Need Updating

Use the shadcn CLI (`npx shadcn@latest add <component>`) to pull upstream changes. Never hand-edit the generated files.
