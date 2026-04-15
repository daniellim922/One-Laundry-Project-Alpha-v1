import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    drizzle: vi.fn(),
    postgres: vi.fn(),
}));

vi.mock("drizzle-orm/postgres-js", () => ({
    drizzle: (...args: unknown[]) => mocks.drizzle(...args),
}));

vi.mock("postgres", () => ({
    default: (...args: unknown[]) => mocks.postgres(...args),
}));

import { createAdminDatabaseConnection } from "@/lib/database/admin-client";

describe("admin database client", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.postgres.mockReturnValue({ tag: "sql-client" });
        mocks.drizzle.mockReturnValue({ tag: "db-client" });
    });

    it("builds the admin database boundary through postgres.js", () => {
        const connection = createAdminDatabaseConnection({
            DATABASE_ADMIN_URL:
                "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
        });

        expect(mocks.postgres).toHaveBeenCalledWith(
            "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
            {
                prepare: false,
            },
        );
        expect(mocks.drizzle).toHaveBeenCalledTimes(1);
        expect(connection).toMatchObject({
            config: {
                adminUrl:
                    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
                source: "DATABASE_ADMIN_URL",
                target: "local-supabase",
            },
            db: { tag: "db-client" },
            sql: { tag: "sql-client" },
        });
    });
});
