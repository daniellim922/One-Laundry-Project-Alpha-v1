import { describe, expect, it } from "vitest";

import {
    configureDestructiveTestDatabase,
    destructiveTestDatabaseUrlEnv,
} from "./destructive-test-env";

describe("configureDestructiveTestDatabase", () => {
    it("rejects destructive database tests without a dedicated test database URL", () => {
        expect(() =>
            configureDestructiveTestDatabase({
                ONE_LAUNDRY_ALLOW_DESTRUCTIVE_DB: "true",
                ONE_LAUNDRY_DESTRUCTIVE_DB_ACTION: "test",
            }),
        ).toThrow(destructiveTestDatabaseUrlEnv);
    });

    it("rejects the dedicated test database URL without explicit destructive opt-in", () => {
        expect(() =>
            configureDestructiveTestDatabase({
                [destructiveTestDatabaseUrlEnv]:
                    "postgresql://127.0.0.1:5432/one_laundry_test",
            }),
        ).toThrow(/ONE_LAUNDRY_ALLOW_DESTRUCTIVE_DB=true/);
    });

    it("maps the dedicated test database URL into DATABASE_URL after opt-in", () => {
        const env: Record<string, string | undefined> = {
            ONE_LAUNDRY_ALLOW_DESTRUCTIVE_DB: "true",
            ONE_LAUNDRY_DESTRUCTIVE_DB_ACTION: "test",
            [destructiveTestDatabaseUrlEnv]:
                "postgresql://127.0.0.1:5432/one_laundry_test",
        };

        expect(configureDestructiveTestDatabase(env)).toBe(
            "postgresql://127.0.0.1:5432/one_laundry_test",
        );
        expect(env.DATABASE_URL).toBe(
            "postgresql://127.0.0.1:5432/one_laundry_test",
        );
    });
});
