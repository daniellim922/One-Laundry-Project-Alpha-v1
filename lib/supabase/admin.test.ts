import { beforeEach, describe, expect, it, vi } from "vitest";

import { bootstrapAdminUser } from "@/lib/supabase/admin";

function buildEnv(overrides: Record<string, string | undefined> = {}) {
    return {
        AUTH_ADMIN_EMAIL: "admin@example.com",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        ...overrides,
    };
}

function createMockClient() {
    return {
        auth: {
            admin: {
                listUsers: vi.fn(),
                createUser: vi.fn(),
                updateUserById: vi.fn(),
            },
        },
    };
}

describe("bootstrapAdminUser", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates the configured admin user when it does not exist yet", async () => {
        const client = createMockClient();

        client.auth.admin.listUsers.mockResolvedValue({
            data: { users: [] },
            error: null,
        });
        client.auth.admin.createUser.mockResolvedValue({
            data: {
                user: {
                    id: "user-1",
                    email: "admin@example.com",
                },
            },
            error: null,
        });

        const result = await bootstrapAdminUser({
            client,
            env: buildEnv({ AUTH_ADMIN_EMAIL: " Admin@Example.com " }),
        });

        expect(result).toEqual({
            email: "admin@example.com",
            status: "created",
            userId: "user-1",
        });
        expect(client.auth.admin.createUser).toHaveBeenCalledWith({
            app_metadata: { role: "admin" },
            email: "admin@example.com",
            email_confirm: true,
        });
        expect(client.auth.admin.updateUserById).not.toHaveBeenCalled();
    });

    it("repairs the configured admin user when it already exists", async () => {
        const client = createMockClient();

        client.auth.admin.listUsers.mockResolvedValue({
            data: {
                users: [
                    {
                        app_metadata: {},
                        email: "ADMIN@example.com",
                        email_confirmed_at: null,
                        id: "user-9",
                    },
                ],
            },
            error: null,
        });
        client.auth.admin.updateUserById.mockResolvedValue({
            data: {
                user: {
                    id: "user-9",
                    email: "admin@example.com",
                },
            },
            error: null,
        });

        const result = await bootstrapAdminUser({
            client,
            env: buildEnv(),
        });

        expect(result).toEqual({
            email: "admin@example.com",
            status: "repaired",
            userId: "user-9",
        });
        expect(client.auth.admin.updateUserById).toHaveBeenCalledWith(
            "user-9",
            {
                app_metadata: { role: "admin" },
                email: "admin@example.com",
                email_confirm: true,
            },
        );
        expect(client.auth.admin.createUser).not.toHaveBeenCalled();
    });

    it("fails fast when the configured admin email env var is missing", async () => {
        const client = createMockClient();

        await expect(
            bootstrapAdminUser({
                client,
                env: buildEnv({ AUTH_ADMIN_EMAIL: undefined }),
            }),
        ).rejects.toThrow(
            "AUTH_ADMIN_EMAIL is not set in the environment variables",
        );

        expect(client.auth.admin.listUsers).not.toHaveBeenCalled();
        expect(client.auth.admin.createUser).not.toHaveBeenCalled();
        expect(client.auth.admin.updateUserById).not.toHaveBeenCalled();
    });
});
