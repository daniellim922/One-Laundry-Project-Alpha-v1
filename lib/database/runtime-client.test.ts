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

import { createRuntimeDatabaseConnection } from "@/lib/database/runtime-client";

describe("runtime database client", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.postgres.mockReturnValue({ tag: "sql-client" });
        mocks.drizzle.mockReturnValue({ tag: "db-client" });
    });

    it("builds the runtime database boundary through postgres.js", () => {
        const connection = createRuntimeDatabaseConnection({
            DATABASE_RUNTIME_URL:
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
                runtimeUrl:
                    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
                source: "DATABASE_RUNTIME_URL",
                target: "local-supabase",
            },
            db: { tag: "db-client" },
            sql: { tag: "sql-client" },
        });
    });
});
