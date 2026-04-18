import "dotenv/config";

import { bootstrapAdminUser } from "../../lib/supabase/admin";

async function main() {
    const result = await bootstrapAdminUser();

    console.log(
        `Admin auth user ${result.status}: ${result.email} (${result.userId})`,
    );
}

void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);

    console.error(message);
    process.exitCode = 1;
});
