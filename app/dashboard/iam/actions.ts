"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { user, session } from "@/db/auth-schema";
import { rolesTable } from "@/db/tables/rolesTable";
import { rolePermissionsTable } from "@/db/tables/rolePermissionsTable";
import { userRolesTable } from "@/db/tables/userRolesTable";

const IAM_FEATURE = "IAM (Identity and Access Management)";

async function requireIamPermission(
    action: "create" | "read" | "update" | "delete",
) {
    const authSession = await auth.api.getSession({ headers: await headers() });
    if (!authSession) redirect("/login");
    const allowed = await checkPermission(
        authSession.user.id,
        IAM_FEATURE,
        action,
    );
    if (!allowed) return { error: "Forbidden" as const };
    return { userId: authSession.user.id } as const;
}

export async function createRoleWithPermissions(
    name: string,
    permissions: {
        featureId: string;
        create: boolean;
        read: boolean;
        update: boolean;
        delete: boolean;
    }[],
): Promise<{ error?: string }> {
    const perm = await requireIamPermission("create");
    if (perm.error) return perm;

    const trimmedName = name.trim();
    if (!trimmedName) {
        return { error: "Role name is required." };
    }

    const existing = await db
        .select()
        .from(rolesTable)
        .where(eq(rolesTable.name, trimmedName))
        .limit(1);

    if (existing.length > 0) {
        return { error: "A role with this name already exists." };
    }

    const [inserted] = await db
        .insert(rolesTable)
        .values({ name: trimmedName })
        .returning({ id: rolesTable.id });

    if (!inserted) {
        return { error: "Failed to create role." };
    }

    if (permissions.length > 0) {
        await db.insert(rolePermissionsTable).values(
            permissions.map((p) => ({
                roleId: inserted.id,
                featureId: p.featureId,
                create: p.create,
                read: p.read,
                update: p.update,
                delete: p.delete,
            })),
        );
    }

    revalidatePath("/dashboard/iam");
    redirect("/dashboard/iam");
}

export async function updateRolePermissions(
    roleId: string,
    permissions: {
        featureId: string;
        create: boolean;
        read: boolean;
        update: boolean;
        delete: boolean;
    }[],
    name?: string,
): Promise<{ error?: string }> {
    const perm = await requireIamPermission("update");
    if (perm.error) return perm;

    const trimmedName = name?.trim();
    if (trimmedName) {
        const existing = await db
            .select()
            .from(rolesTable)
            .where(eq(rolesTable.name, trimmedName))
            .limit(1);
        if (existing.length > 0 && existing[0].id !== roleId) {
            return { error: "A role with this name already exists." };
        }
        await db
            .update(rolesTable)
            .set({ name: trimmedName })
            .where(eq(rolesTable.id, roleId));
    }

    await db
        .delete(rolePermissionsTable)
        .where(eq(rolePermissionsTable.roleId, roleId));

    if (permissions.length > 0) {
        await db.insert(rolePermissionsTable).values(
            permissions.map((p) => ({
                roleId,
                featureId: p.featureId,
                create: p.create,
                read: p.read,
                update: p.update,
                delete: p.delete,
            })),
        );
    }

    revalidatePath("/dashboard/iam");
    redirect("/dashboard/iam");
}

export async function createUser(data: {
    name: string;
    email: string;
    password: string;
    username?: string;
    roleId?: string;
}): Promise<{ error?: string }> {
    const perm = await requireIamPermission("create");
    if (perm.error) return perm;

    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password;
    const username = data.username?.trim() || undefined;

    if (!name) return { error: "Name is required." };
    if (!email) return { error: "Email is required." };
    if (!password || password.length < 6) {
        return { error: "Password must be at least 6 characters." };
    }

    const existing = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email))
        .limit(1);
    if (existing.length > 0) {
        return { error: "A user with this email already exists." };
    }

    try {
        await auth.api.signUpEmail({
            body: { email, password, name, username },
        });
    } catch (err) {
        return {
            error:
                err instanceof Error ? err.message : "Failed to create user.",
        };
    }

    const [created] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email))
        .limit(1);

    if (created && data.roleId) {
        const [role] = await db
            .select({ id: rolesTable.id })
            .from(rolesTable)
            .where(eq(rolesTable.id, data.roleId))
            .limit(1);
        if (role) {
            await db.insert(userRolesTable).values({
                userId: created.id,
                roleId: data.roleId,
            });
        }
    }

    revalidatePath("/dashboard/iam");
    redirect("/dashboard/iam");
}

export async function updateUser(
    userId: string,
    data: { name: string; username?: string | null; roleIds: string[] },
): Promise<{ error?: string }> {
    const perm = await requireIamPermission("update");
    if (perm.error) return perm;

    const name = data.name.trim();
    if (!name) return { error: "Name is required." };

    await db
        .update(user)
        .set({
            name,
            username: data.username?.trim() || null,
            updatedAt: new Date(),
        })
        .where(eq(user.id, userId));

    await db.delete(userRolesTable).where(eq(userRolesTable.userId, userId));

    if (data.roleIds.length > 0) {
        await db
            .insert(userRolesTable)
            .values(data.roleIds.map((roleId) => ({ userId, roleId })));
    }

    revalidatePath("/dashboard/iam");
    redirect("/dashboard/iam");
}

export async function banUser(
    userId: string,
    reason?: string,
): Promise<{ error?: string }> {
    const perm = await requireIamPermission("update");
    if (perm.error) return perm;

    const [u] = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
    if (!u) return { error: "User not found." };

    await db
        .update(user)
        .set({
            banned: true,
            banReason: reason ?? null,
            banExpires: null,
            updatedAt: new Date(),
        })
        .where(eq(user.id, userId));

    await db.delete(session).where(eq(session.userId, userId));

    revalidatePath("/dashboard/iam");
    return {};
}

export async function unbanUser(userId: string): Promise<{ error?: string }> {
    const perm = await requireIamPermission("update");
    if (perm.error) return perm;

    const [u] = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
    if (!u) return { error: "User not found." };

    await db
        .update(user)
        .set({
            banned: false,
            banReason: null,
            banExpires: null,
            updatedAt: new Date(),
        })
        .where(eq(user.id, userId));

    revalidatePath("/dashboard/iam");
    return {};
}
