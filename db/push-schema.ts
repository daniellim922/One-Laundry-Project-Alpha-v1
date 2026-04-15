import "dotenv/config";
import { execSync } from "node:child_process";
import { resolveAdminDatabaseConfig } from "@/lib/database/admin-config";

function pushSchema() {
    const config = resolveAdminDatabaseConfig();
    console.log(
        `Pushing schema via drizzle-kit push (${config.source}, ${config.target})...`,
    );

    try {
        execSync("npx drizzle-kit push", {
            stdio: "inherit",
            cwd: process.cwd(),
            env: process.env,
        });
        console.log("Drizzle schema push completed successfully.");
        process.exit(0);
    } catch {
        process.exit(1);
    }
}

pushSchema();
