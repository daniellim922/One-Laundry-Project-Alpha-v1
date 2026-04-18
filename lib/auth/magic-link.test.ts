import { describe, expect, it, vi } from "vitest";

import {
    finalizeMagicLinkSignIn,
    requestMagicLinkSignIn,
} from "@/lib/auth/magic-link";

function createMockClient() {
    return {
        auth: {
            exchangeCodeForSession: vi.fn(),
            getUser: vi.fn(),
            signInWithOtp: vi.fn(),
            signOut: vi.fn(),
            verifyOtp: vi.fn(),
        },
    };
}

const env = {
    AUTH_ADMIN_EMAIL: "admin@example.com",
};

describe("requestMagicLinkSignIn", () => {
    it("rejects emails outside the configured admin allowlist", async () => {
        const client = createMockClient();

        const result = await requestMagicLinkSignIn({
            client,
            email: "worker@example.com",
            env,
            origin: "http://127.0.0.1:3000",
            redirectTo: "/dashboard/payroll",
        });

        expect(result).toEqual({
            error: "Only the configured admin email can request a sign-in link.",
        });
        expect(client.auth.signInWithOtp).not.toHaveBeenCalled();
    });

    it("sends a magic link for the configured admin email", async () => {
        const client = createMockClient();

        client.auth.signInWithOtp.mockResolvedValue({
            error: null,
        });

        const result = await requestMagicLinkSignIn({
            client,
            email: " Admin@Example.com ",
            env,
            origin: "http://127.0.0.1:3000",
            redirectTo: "/dashboard/payroll?period=2026-03",
        });

        expect(result).toEqual({
            email: "admin@example.com",
        });
        expect(client.auth.signInWithOtp).toHaveBeenCalledWith({
            email: "admin@example.com",
            options: {
                emailRedirectTo:
                    "http://127.0.0.1:3000/auth/callback?redirectTo=%2Fdashboard%2Fpayroll%3Fperiod%3D2026-03",
                shouldCreateUser: false,
            },
        });
    });
});

describe("finalizeMagicLinkSignIn", () => {
    it("exchanges the auth code and accepts the configured admin user", async () => {
        const client = createMockClient();

        client.auth.exchangeCodeForSession.mockResolvedValue({
            error: null,
        });
        client.auth.getUser.mockResolvedValue({
            data: {
                user: {
                    email: "admin@example.com",
                },
            },
            error: null,
        });

        const result = await finalizeMagicLinkSignIn({
            client,
            code: "test-code",
            env,
            tokenHash: null,
            type: null,
        });

        expect(result).toEqual({
            email: "admin@example.com",
        });
        expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith(
            "test-code",
        );
        expect(client.auth.signOut).not.toHaveBeenCalled();
    });

    it("signs out authenticated users who are not on the admin allowlist", async () => {
        const client = createMockClient();

        client.auth.verifyOtp.mockResolvedValue({
            error: null,
        });
        client.auth.getUser.mockResolvedValue({
            data: {
                user: {
                    email: "worker@example.com",
                },
            },
            error: null,
        });
        client.auth.signOut.mockResolvedValue({
            error: null,
        });

        const result = await finalizeMagicLinkSignIn({
            client,
            code: null,
            env,
            tokenHash: "token-hash",
            type: "magiclink",
        });

        expect(result).toEqual({
            error: "Authenticated user is not the configured admin.",
        });
        expect(client.auth.verifyOtp).toHaveBeenCalledWith({
            token_hash: "token-hash",
            type: "magiclink",
        });
        expect(client.auth.signOut).toHaveBeenCalled();
    });
});
