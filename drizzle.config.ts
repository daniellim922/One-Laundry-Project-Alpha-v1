import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { resolveAdminDatabaseConfig } from "./lib/database/admin-config";

const adminConfig = resolveAdminDatabaseConfig();

export default defineConfig({
    out: "./drizzle",
    schema: "./db/schema.ts",
    dialect: "postgresql",
    dbCredentials: {
        url: adminConfig.adminUrl,
    },
});
