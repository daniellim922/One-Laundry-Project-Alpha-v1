import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/db/auth-schema";
import { rolesTable } from "@/db/tables/auth/rolesTable";
import { userRolesTable } from "@/db/tables/auth/userRolesTable";

type SeedAdminUserResult = {
    userId: string;
    roleId: string;
    email: string;
    username: string;
};

type SeedUserConfig = {
    email: string;
    password: string;
    name: string;
    username: string;
    roleName: string;
};

async function seedUserWithRole(
    config: SeedUserConfig,
): Promise<SeedAdminUserResult> {
    const { email, password, name, username, roleName } = config;
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

export async function seedAdminUser(): Promise<SeedAdminUserResult> {
    return seedUserWithRole({
        email: process.env.SEED_ADMIN_EMAIL ?? "root@example.com",
        password: process.env.SEED_ADMIN_PASSWORD ?? "root1234",
        name: process.env.SEED_ADMIN_NAME ?? "Root",
        username: process.env.SEED_ADMIN_USERNAME ?? "root",
        roleName: process.env.SEED_ADMIN_ROLE ?? "Admin",
    });
}

export async function seedWorkersReadOnlyUser(): Promise<SeedAdminUserResult> {
    return seedUserWithRole({
        email:
            process.env.SEED_WORKER_READONLY_EMAIL ??
            "worker-reader@example.com",
        password: process.env.SEED_WORKER_READONLY_PASSWORD ?? "worker1234",
        name: process.env.SEED_WORKER_READONLY_NAME ?? "Worker Reader",
        username:
            process.env.SEED_WORKER_READONLY_USERNAME ?? "worker_reader",
        roleName:
            process.env.SEED_WORKER_READONLY_ROLE ?? "Workers Read Only",
    });
}

export async function seedWorkersCreateUser(): Promise<SeedAdminUserResult> {
    return seedUserWithRole({
        email:
            process.env.SEED_WORKER_CREATE_EMAIL ??
            "worker-creator@example.com",
        password: process.env.SEED_WORKER_CREATE_PASSWORD ?? "worker1234",
        name: process.env.SEED_WORKER_CREATE_NAME ?? "Worker Creator",
        username:
            process.env.SEED_WORKER_CREATE_USERNAME ?? "worker_creator",
        roleName:
            process.env.SEED_WORKER_CREATE_ROLE ?? "Workers Create Only",
    });
}

export async function seedWorkersUpdateUser(): Promise<SeedAdminUserResult> {
    return seedUserWithRole({
        email:
            process.env.SEED_WORKER_UPDATE_EMAIL ??
            "worker-updater@example.com",
        password: process.env.SEED_WORKER_UPDATE_PASSWORD ?? "worker1234",
        name: process.env.SEED_WORKER_UPDATE_NAME ?? "Worker Updater",
        username:
            process.env.SEED_WORKER_UPDATE_USERNAME ?? "worker_updater",
        roleName:
            process.env.SEED_WORKER_UPDATE_ROLE ?? "Workers Update Only",
    });
}

export async function seedDefaultAuthUsers(): Promise<SeedAdminUserResult[]> {
    return [
        await seedAdminUser(),
        await seedWorkersReadOnlyUser(),
        await seedWorkersCreateUser(),
        await seedWorkersUpdateUser(),
    ];
}
