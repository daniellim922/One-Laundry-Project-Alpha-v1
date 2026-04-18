import { describe, expect, it } from "vitest";

import {
    getConfiguredAdminEmail,
    isAdminUser,
    requireAdminUser,
} from "@/lib/auth/admin";

describe("admin auth contract", () => {
    const env = {
        AUTH_ADMIN_EMAIL: "Admin@Example.com ",
    };

    it("normalizes the configured admin email", () => {
        expect(getConfiguredAdminEmail(env)).toBe("admin@example.com");
    });

    it("rejects any authenticated user outside the configured admin email", () => {
        expect(isAdminUser({ email: "worker@example.com" }, env)).toBe(false);
        expect(isAdminUser({ email: "admin@example.com" }, env)).toBe(true);
    });

    it("throws when a non-admin authenticated user reaches the admin gate", () => {
        expect(() =>
            requireAdminUser({ email: "worker@example.com" }, env),
        ).toThrow("Authenticated user is not the configured admin");
    });
});
