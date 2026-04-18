import { afterEach, describe, expect, it } from "vitest";

import { requireApiAdminUser } from "@/app/api/_shared/auth";

describe("requireApiAdminUser", () => {
    const originalAdminEmail = process.env.AUTH_ADMIN_EMAIL;

    afterEach(() => {
        process.env.AUTH_ADMIN_EMAIL = originalAdminEmail;
    });

    it("returns 401 when no authenticated user is present", () => {
        const response = requireApiAdminUser(null);

        expect(response).toBeInstanceOf(Response);
        expect((response as Response).status).toBe(401);
    });

    it("returns 401 when the authenticated user is not the configured admin", () => {
        process.env.AUTH_ADMIN_EMAIL = "admin@example.com";

        const response = requireApiAdminUser({
            email: "worker@example.com",
        });

        expect(response).toBeInstanceOf(Response);
        expect((response as Response).status).toBe(401);
    });

    it("returns the normalized admin email for the configured admin user", () => {
        process.env.AUTH_ADMIN_EMAIL = "Admin@Example.com";

        expect(
            requireApiAdminUser({
                email: "admin@example.com",
            }),
        ).toEqual({
            email: "admin@example.com",
        });
    });
});
