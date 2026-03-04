import { db } from "@/lib/db";
import { workersTable } from "@/db/workersTable";
import { rolesTable } from "@/db/rolesTable";
import { workers } from "./workers";
import { roles } from "./roles";

async function seed() {
    await db.insert(workersTable).values(workers);
    console.log("New workers created!");

    await db.insert(rolesTable).values(roles);
    console.log("Roles seeded!");

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
seed();
