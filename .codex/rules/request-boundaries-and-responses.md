---
description: Keep request boundaries consistent: form submissions via server actions, programmatic traffic via API routes, and clear success/error handling on the backend.
globs: "app/**/*.{ts,tsx}"
alwaysApply: true
---

# Request Boundaries And Backend Contracts

## Request routing

1. Form submissions mutate through co-located server actions.
2. Non-form HTTP workflows use `app/api/` route handlers.
3. Do not add fetch-based form mutations when a server action fits the existing feature pattern.

## Backend contracts

1. Server actions return a clear success/error shape such as `{ success: true, id? }` or `{ error }`.
2. API routes return explicit HTTP success payloads or clear error responses with the correct status code.
3. New backend flows must handle both success and failure paths deliberately; never leave silent fallthroughs.
