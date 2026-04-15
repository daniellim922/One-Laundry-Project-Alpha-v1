import "dotenv/config";
import { createAdminDatabaseConnection } from "@/lib/database/admin-client";

const adminDatabase = createAdminDatabaseConnection();

export const adminDb = adminDatabase.db;
export const adminDbConfig = adminDatabase.config;
export const adminSql = adminDatabase.sql;
