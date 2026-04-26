import type { Mock } from "vitest";

/**
 * Hoisted `requireCurrentApiUser` mock shape for API route tests. Declare with
 * `requireCurrentApiUser: vi.fn()` inside `vi.hoisted` in each file — do not import helpers
 * into the hoisted callback (Vitest ESM hoisting / TDZ).
 */
export type ApiRouteAuthMocks = {
    requireCurrentApiUser: Mock;
};

const DEFAULT_OPERATOR_EMAIL = "operator@example.com";

/** Typical authenticated dashboard/API operator for `beforeEach`. */
export function mockAuthenticatedApiOperator(
    mocks: ApiRouteAuthMocks,
    email: string = DEFAULT_OPERATOR_EMAIL,
) {
    mocks.requireCurrentApiUser.mockResolvedValue({ email });
}
