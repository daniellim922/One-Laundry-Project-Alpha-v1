import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/db/auth-schema";
import { rolesTable } from "@/db/tables/rolesTable";
import { userRolesTable } from "@/db/tables/userRolesTable";

type SeedAdminUserResult = {
    userId: string;
    roleId: string;
    email: string;
    username: string;
};

export async function seedAdminUser(): Promise<SeedAdminUserResult> {
    const email = process.env.SEED_ADMIN_EMAIL ?? "root@example.com";
    const password = process.env.SEED_ADMIN_PASSWORD ?? "root1234";
    const name = process.env.SEED_ADMIN_NAME ?? "Root";
    const username = process.env.SEED_ADMIN_USERNAME ?? "root";
    const roleName = process.env.SEED_ADMIN_ROLE ?? "Admin";

    const roleRow = await db
        .select({ id: rolesTable.id })
        .from(rolesTable)
        .where(eq(rolesTable.name, roleName))
        .limit(1);

    if (roleRow.length === 0) {
        throw new Error(
            `Seed admin user failed: role "${roleName}" not found. Seed roles first.`,
        );
    }

    const roleId = roleRow[0].id;

    const existingUser = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email))
        .limit(1);

    const userId =
        existingUser[0]?.id ??
        (await (async () => {
            await auth.api.signUpEmail({
                body: { email, password, name, username },
            });

            const created = await db
                .select({ id: user.id })
                .from(user)
                .where(eq(user.email, email))
                .limit(1);

            if (created.length === 0) {
                throw new Error(
                    "Seed admin user failed: signUpEmail succeeded but user not found in DB.",
                );
            }

            return created[0].id;
        })());

    const existingLink = await db
        .select({ id: userRolesTable.id })
        .from(userRolesTable)
        .where(
            and(
                eq(userRolesTable.userId, userId),
                eq(userRolesTable.roleId, roleId),
            ),
        )
        .limit(1);

    if (existingLink.length === 0) {
        await db.insert(userRolesTable).values({ userId, roleId });
    }

    return { userId, roleId, email, username };
}
