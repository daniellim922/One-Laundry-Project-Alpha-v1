import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import {
    resolveAdminDatabaseConfig,
    type AdminDatabaseConfig,
    type AdminDatabaseEnv,
} from "@/lib/database/admin-config";

export type AdminSqlClient = ReturnType<typeof postgres>;

export type AdminDatabaseClient = ReturnType<typeof drizzle<typeof schema>>;

export type AdminDatabaseConnection = {
    config: AdminDatabaseConfig;
    db: AdminDatabaseClient;
    sql: AdminSqlClient;
};

export function createAdminDatabaseConnection(
    env: AdminDatabaseEnv = process.env,
): AdminDatabaseConnection {
    const config = resolveAdminDatabaseConfig(env);
    const sql = postgres(config.adminUrl, {
        // Keep legacy fallback targets safe if they still point through a pooler.
        prepare: false,
    });

    return {
        config,
        db: drizzle(sql, { schema }),
        sql,
    };
}
