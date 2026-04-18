import { describe, expect, it, vi } from "vitest";

import { signInWithPassword } from "@/lib/auth/login";

function createMockClient() {
    return {
        auth: {
            signInWithPassword: vi.fn(),
            getUser: vi.fn(),
            signOut: vi.fn(),
        },
    };
}

describe("signInWithPassword", () => {
    it("returns error when signInWithPassword fails", async () => {
        const client = createMockClient();

        client.auth.signInWithPassword.mockResolvedValue({
            error: { message: "Invalid login credentials" },
        });

        const result = await signInWithPassword({
            client,
            email: "operator@example.com",
            password: "wrong",
        });

        expect(result).toEqual({
            error: "Invalid login credentials",
        });
        expect(client.auth.getUser).not.toHaveBeenCalled();
    });

    it("signs out and returns error when getUser fails after sign-in", async () => {
        const client = createMockClient();

        client.auth.signInWithPassword.mockResolvedValue({ error: null });
        client.auth.getUser.mockResolvedValue({
            data: { user: { email: "user@example.com" } },
            error: { message: "session error" },
        });

        const result = await signInWithPassword({
            client,
            email: "user@example.com",
            password: "secret",
        });

        expect(client.auth.signOut).toHaveBeenCalled();
        expect(result).toEqual({
            error: "Unable to verify sign-in session.",
        });
    });

    it("signs out and returns error when the session user has no email", async () => {
        const client = createMockClient();

        client.auth.signInWithPassword.mockResolvedValue({ error: null });
        client.auth.getUser.mockResolvedValue({
            data: { user: { email: null } },
            error: null,
        });

        const result = await signInWithPassword({
            client,
            email: "user@example.com",
            password: "secret",
        });

        expect(client.auth.signOut).toHaveBeenCalled();
        expect(result).toEqual({
            error: "Unable to verify sign-in session.",
        });
    });

    it("returns email on success", async () => {
        const client = createMockClient();

        client.auth.signInWithPassword.mockResolvedValue({ error: null });
        client.auth.getUser.mockResolvedValue({
            data: { user: { email: "user@example.com" } },
            error: null,
        });

        const result = await signInWithPassword({
            client,
            email: "user@example.com",
            password: "secret",
        });

        expect(result).toEqual({ email: "user@example.com" });
        expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
            email: "user@example.com",
            password: "secret",
        });
        expect(client.auth.signOut).not.toHaveBeenCalled();
    });

    it("normalizes email before signInWithPassword", async () => {
        const client = createMockClient();

        client.auth.signInWithPassword.mockResolvedValue({ error: null });
        client.auth.getUser.mockResolvedValue({
            data: { user: { email: "operator@example.com" } },
            error: null,
        });

        const result = await signInWithPassword({
            client,
            email: "  Operator@Example.COM  ",
            password: "secret",
        });

        expect(result).toEqual({ email: "operator@example.com" });
        expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
            email: "operator@example.com",
            password: "secret",
        });
    });
});
