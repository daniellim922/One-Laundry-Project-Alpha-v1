import {
    createClient,
    type SupabaseClient,
    type User,
} from "@supabase/supabase-js";

import {
    getConfiguredAdminEmail,
    normalizeEmail,
    SUPABASE_ADMIN_ROLE,
} from "@/lib/auth/admin";

export const SUPABASE_URL_ENV_NAME = "NEXT_PUBLIC_SUPABASE_URL";
export const SUPABASE_SERVICE_ROLE_KEY_ENV_NAME =
    "SUPABASE_SERVICE_ROLE_KEY";

type EnvLike = Record<string, string | undefined>;

type AuthAdminError = {
    message: string;
};

type AuthAdminUserRecord = Pick<
    User,
    "id" | "email" | "email_confirmed_at" | "app_metadata"
>;

type AuthAdminApiLike = {
    listUsers: () => Promise<{
        data: { users: AuthAdminUserRecord[] };
        error: AuthAdminError | null;
    }>;
    createUser: (attributes: {
        email: string;
        email_confirm: boolean;
        app_metadata: Record<string, unknown>;
    }) => Promise<{
        data: { user: AuthAdminUserRecord | null };
        error: AuthAdminError | null;
    }>;
    updateUserById: (
        uid: string,
        attributes: {
            email: string;
            email_confirm: boolean;
            app_metadata: Record<string, unknown>;
        },
    ) => Promise<{
        data: { user: AuthAdminUserRecord | null };
        error: AuthAdminError | null;
    }>;
};

type AuthAdminClientLike = {
    auth: {
        admin: AuthAdminApiLike;
    };
};

export type BootstrapAdminResult = {
    email: string;
    status: "created" | "repaired";
    userId: string;
};

function getRequiredEnvVar(name: string, env: EnvLike = process.env) {
    const value = env[name];

    if (!value?.trim()) {
        throw new Error(`${name} is not set in the environment variables`);
    }

    return value;
}

function getBootstrapAttributes(adminEmail: string) {
    return {
        email: adminEmail,
        email_confirm: true,
        app_metadata: {
            role: SUPABASE_ADMIN_ROLE,
        },
    };
}

function findExistingAdminUser(
    users: AuthAdminUserRecord[],
    adminEmail: string,
) {
    return users.find(
        (user) => user.email && normalizeEmail(user.email) === adminEmail,
    );
}

export function createSupabaseAdminClient(
    env: EnvLike = process.env,
): SupabaseClient {
    return createClient(
        getRequiredEnvVar(SUPABASE_URL_ENV_NAME, env),
        getRequiredEnvVar(SUPABASE_SERVICE_ROLE_KEY_ENV_NAME, env),
        {
            auth: {
                autoRefreshToken: false,
                detectSessionInUrl: false,
                persistSession: false,
            },
        },
    );
}

export async function bootstrapAdminUser({
    client = createSupabaseAdminClient(),
    env = process.env,
}: {
    client?: AuthAdminClientLike;
    env?: EnvLike;
} = {}): Promise<BootstrapAdminResult> {
    const adminEmail = getConfiguredAdminEmail(env);
    const attributes = getBootstrapAttributes(adminEmail);

    const {
        data: listedUsers,
        error: listUsersError,
    } = await client.auth.admin.listUsers();

    if (listUsersError) {
        throw new Error(`Failed to list auth users: ${listUsersError.message}`);
    }

    const existingUser = findExistingAdminUser(
        listedUsers.users ?? [],
        adminEmail,
    );

    if (!existingUser) {
        const {
            data: createdUser,
            error: createUserError,
        } = await client.auth.admin.createUser(attributes);

        if (createUserError) {
            throw new Error(
                `Failed to create admin auth user: ${createUserError.message}`,
            );
        }

        if (!createdUser.user?.id) {
            throw new Error("Supabase did not return the created admin user");
        }

        return {
            email: adminEmail,
            status: "created",
            userId: createdUser.user.id,
        };
    }

    const {
        data: updatedUser,
        error: updateUserError,
    } = await client.auth.admin.updateUserById(existingUser.id, attributes);

    if (updateUserError) {
        throw new Error(
            `Failed to repair admin auth user: ${updateUserError.message}`,
        );
    }

    if (!updatedUser.user?.id) {
        throw new Error("Supabase did not return the repaired admin user");
    }

    return {
        email: adminEmail,
        status: "repaired",
        userId: updatedUser.user.id,
    };
}
