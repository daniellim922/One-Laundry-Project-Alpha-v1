import "dotenv/config";
import { createRuntimeDatabaseConnection } from "@/lib/database/runtime-client";

const runtimeDatabase = createRuntimeDatabaseConnection();

export const db = runtimeDatabase.db;
export const runtimeDbConfig = runtimeDatabase.config;
export const runtimeSql = runtimeDatabase.sql;
