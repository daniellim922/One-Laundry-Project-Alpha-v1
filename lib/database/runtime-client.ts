import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import {
    resolveRuntimeDatabaseConfig,
    type RuntimeDatabaseConfig,
    type RuntimeDatabaseEnv,
} from "@/lib/database/runtime-config";

export type RuntimeSqlClient = ReturnType<typeof postgres>;

export type RuntimeDatabaseClient = ReturnType<typeof drizzle<typeof schema>>;

export type RuntimeDatabaseConnection = {
    config: RuntimeDatabaseConfig;
    db: RuntimeDatabaseClient;
    sql: RuntimeSqlClient;
};

export function createRuntimeDatabaseConnection(
    env: RuntimeDatabaseEnv = process.env,
): RuntimeDatabaseConnection {
    const config = resolveRuntimeDatabaseConfig(env);
    const sql = postgres(config.runtimeUrl, {
        // Disable prepared statements so hosted Supabase pooler targets remain safe.
        prepare: false,
    });

    return {
        config,
        db: drizzle(sql, { schema }),
        sql,
    };
}
