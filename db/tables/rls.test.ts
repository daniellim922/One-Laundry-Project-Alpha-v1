import { describe, expect, it } from "vitest";
import { is } from "drizzle-orm";
import { getTableConfig, PgTable, type AnyPgTable } from "drizzle-orm/pg-core";

import * as schema from "@/db/schema";

describe("application table RLS declarations", () => {
    it("enables RLS on every exported Postgres table", () => {
        const tables = Object.entries(schema).flatMap(([exportName, value]) =>
            is(value, PgTable)
                ? ([[exportName, value as AnyPgTable]] as const)
                : [],
        );

        expect(tables.length).toBeGreaterThan(0);

        const tablesWithoutRls = tables
            .filter(([, table]) => !getTableConfig(table).enableRLS)
            .map(([exportName]) => exportName);

        expect(tablesWithoutRls).toEqual([]);
    });
});
