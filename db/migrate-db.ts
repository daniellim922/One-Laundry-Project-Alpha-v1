import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createAdminDatabaseConnection } from "@/lib/database/admin-client";

async function migrateDb() {
    const { db, sql, config } = createAdminDatabaseConnection();

    console.log(`Applying Drizzle migrations via ${config.source}...`);

    try {
        await migrate(db, { migrationsFolder: "./drizzle" });
        console.log("Drizzle migrations applied successfully.");
        process.exit(0);
    } finally {
        await sql.end({ timeout: 5 });
    }
}

migrateDb().catch((error) => {
    console.error("Failed to apply Drizzle migrations:", error);
    process.exit(1);
});
