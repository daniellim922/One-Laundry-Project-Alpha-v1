import { vi } from "vitest";

/** Minimal `Response`-like object for `vi.stubGlobal("fetch", …)` JSON tests. */
export function mockFetchJsonResponse(body: unknown, ok = true) {
    return {
        ok,
        json: vi.fn().mockResolvedValue(body),
    };
}
