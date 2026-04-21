import { describe, expect, it } from "vitest";

import {
    DEFAULT_AUTH_REDIRECT_PATH,
    sanitizeAuthNextParam,
    sanitizeRedirectTo,
} from "@/lib/auth/redirect";

describe("sanitizeAuthNextParam", () => {
    const origin = "https://app.example.com";

    it("uses fallback when raw is empty", () => {
        expect(sanitizeAuthNextParam(undefined, origin)).toBe(
            "/auth/update-password",
        );
    });

    it("allows same-origin relative paths", () => {
        expect(sanitizeAuthNextParam("/auth/update-password", origin)).toBe(
            "/auth/update-password",
        );
        expect(sanitizeAuthNextParam("/dashboard", origin)).toBe("/dashboard");
    });

    it("rejects protocol-relative and non-root-relative paths", () => {
        expect(sanitizeAuthNextParam("//evil.com", origin)).toBe(
            "/auth/update-password",
        );
        expect(sanitizeAuthNextParam("https://evil.com/phish", origin)).toBe(
            "/auth/update-password",
        );
    });

    it("allows absolute URL when origin matches", () => {
        expect(
            sanitizeAuthNextParam(
                "https://app.example.com/auth/update-password",
                origin,
            ),
        ).toBe("/auth/update-password");
    });

    it("rejects absolute URL when origin differs", () => {
        expect(
            sanitizeAuthNextParam(
                "https://other.example.com/auth/update-password",
                origin,
            ),
        ).toBe("/auth/update-password");
    });

    it("respects custom fallback", () => {
        expect(
            sanitizeAuthNextParam("//bad", origin, "/login"),
        ).toBe("/login");
    });
});

describe("sanitizeRedirectTo", () => {
    it("defaults for unsafe paths", () => {
        expect(sanitizeRedirectTo("//x", DEFAULT_AUTH_REDIRECT_PATH)).toBe(
            DEFAULT_AUTH_REDIRECT_PATH,
        );
    });
});
