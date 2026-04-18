import { z } from "zod";

export const AUTH_ADMIN_EMAIL_ENV_NAME = "AUTH_ADMIN_EMAIL";
export const SUPABASE_ADMIN_ROLE = "admin";

type EnvLike = Record<string, string | undefined>;

const adminEmailSchema = z.email({
    error: `${AUTH_ADMIN_EMAIL_ENV_NAME} must be a valid email address`,
});

export type AuthenticatedUserLike = {
    email?: string | null;
};

export function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

export function getConfiguredAdminEmail(env: EnvLike = process.env) {
    const rawEmail = env[AUTH_ADMIN_EMAIL_ENV_NAME];

    if (!rawEmail?.trim()) {
        throw new Error(
            `${AUTH_ADMIN_EMAIL_ENV_NAME} is not set in the environment variables`,
        );
    }

    return adminEmailSchema.parse(normalizeEmail(rawEmail));
}

export function isConfiguredAdminEmail(
    email: string | null | undefined,
    env: EnvLike = process.env,
) {
    if (!email) {
        return false;
    }

    return normalizeEmail(email) === getConfiguredAdminEmail(env);
}

export function isAdminUser(
    user: AuthenticatedUserLike | null | undefined,
    env: EnvLike = process.env,
) {
    return isConfiguredAdminEmail(user?.email, env);
}

export function requireAdminUser(
    user: AuthenticatedUserLike | null | undefined,
    env: EnvLike = process.env,
) {
    if (!user?.email) {
        throw new Error("Authenticated user email is required");
    }

    if (!isAdminUser(user, env)) {
        throw new Error("Authenticated user is not the configured admin");
    }

    return {
        email: getConfiguredAdminEmail(env),
    };
}
