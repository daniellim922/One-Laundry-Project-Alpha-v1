import { describe, expect, it } from "vitest";

import { requireApiUser } from "@/app/api/_shared/auth";

describe("requireApiUser", () => {
    it("returns 401 when no authenticated user is present", () => {
        const response = requireApiUser(null);

        expect(response).toBeInstanceOf(Response);
        expect((response as Response).status).toBe(401);
    });

    it("returns 401 when the user has no email", () => {
        const response = requireApiUser({ email: null });

        expect(response).toBeInstanceOf(Response);
        expect((response as Response).status).toBe(401);
    });

    it("returns the normalized email for an authenticated user", () => {
        expect(
            requireApiUser({
                email: "Operator@Example.com",
            }),
        ).toEqual({
            email: "operator@example.com",
        });
    });
});
