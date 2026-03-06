import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { workersTable } from "@/db/tables/workersTable";
import { rolesTable } from "@/db/tables/rolesTable";
import { featuresTable } from "@/db/tables/featuresTable";
import { rolePermissionsTable } from "@/db/tables/rolePermissionsTable";
import { workers } from "./workers";
import { FEATURES, ROLES, ROLE_PERMISSIONS } from "./iam";

async function seed() {
    await db.insert(workersTable).values(workers);
    console.log("New workers created!");
    await db.insert(rolesTable).values(ROLES);
    console.log("New roles created!");
    await db.insert(featuresTable).values(FEATURES);
    console.log("New features created!");

    for (const rolePermission of ROLE_PERMISSIONS) {
        const roleId = await db
            .select({ id: rolesTable.id })
            .from(rolesTable)
            .where(eq(rolesTable.name, rolePermission.role));
        for (const feature of rolePermission.features) {
            const featureId = await db
                .select({ id: featuresTable.id })
                .from(featuresTable)
                .where(eq(featuresTable.name, feature.featureName))
                .limit(1);
            if (featureId.length > 0) {
                await db.insert(rolePermissionsTable).values({
                    roleId: roleId[0].id,
                    featureId: featureId[0].id,
                    create: feature.create,
                    read: feature.read,
                    update: feature.update,
                    delete: feature.delete,
                });
            }
        }
    }
    console.log("New role permissions created!");
    process.exit(0);
}
seed();
