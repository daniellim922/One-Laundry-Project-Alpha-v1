import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { workersTable } from "@/db/schema";
import { workers } from "@/db/seed/workers";

export const db = drizzle(process.env.DATABASE_URL!);

async function seed() {
    await db.insert(workersTable).values(workers);
    console.log("New workers created!");

    // await db
    //     .update(workersTable)
    //     .set({
    //         age: 31,
    //     })
    //     .where(eq(workersTable.email, user.email));
    // console.log("User info updated!");

    // await db.delete(workersTable).where(eq(workersTable.email, user.email));
    // console.log("User deleted!");
}

// seed();
