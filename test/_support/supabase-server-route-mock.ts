import { vi } from "vitest";

/** Email used consistently across route tests that mock `createClient()` + `requireCurrentApiUser`. */
export const ROUTE_TEST_OPERATOR_EMAIL = "operator@example.com";

/** Resolved value for mocked `await createClient()` when the operator is signed in. */
export function resolvedSupabaseSignedInUser(email = ROUTE_TEST_OPERATOR_EMAIL) {
    return {
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user: { email } },
                error: null,
            }),
        },
    };
}

/** Resolved Supabase server client mimicking missing session (`getUser` → user null). */
export function resolvedSupabaseNoSessionUser() {
    return {
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user: null },
                error: null,
            }),
        },
    };
}

/** Session present but `email` absent — `requireApiUser` rejects. */
export function resolvedSupabaseSignedInMissingEmail() {
    return {
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: {
                    user: {
                        email: null,
                    },
                },
                error: null,
            }),
        },
    };
}

/** Shared JSON assertion target for GET/PATCH routes using `requireCurrentApiUser`. */
export function unauthorizedRouteJsonEnvelope() {
    return {
        ok: false as const,
        error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
        },
    };
}
