export type AdminDatabaseTarget = "local-supabase" | "hosted-supabase";

export type AdminDatabaseSource = "DATABASE_ADMIN_URL" | "DATABASE_URL";

export type AdminDatabaseConfig = {
    adminUrl: string;
    source: AdminDatabaseSource;
    target: AdminDatabaseTarget;
};

export type AdminDatabaseEnv = Record<string, string | undefined>;

const LOCAL_SUPABASE_HOSTS = new Set(["127.0.0.1", "localhost"]);
const LOCAL_SUPABASE_PORT = "54322";

function envValue(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

export function classifyAdminDatabaseTarget(
    adminUrl: string,
): AdminDatabaseTarget {
    const parsedUrl = new URL(adminUrl);

    if (
        LOCAL_SUPABASE_HOSTS.has(parsedUrl.hostname) &&
        parsedUrl.port === LOCAL_SUPABASE_PORT
    ) {
        return "local-supabase";
    }

    return "hosted-supabase";
}

export function resolveAdminDatabaseConfig(
    env: AdminDatabaseEnv = process.env,
): AdminDatabaseConfig {
    const adminUrl = envValue(env.DATABASE_ADMIN_URL);
    if (adminUrl) {
        return {
            adminUrl,
            source: "DATABASE_ADMIN_URL",
            target: classifyAdminDatabaseTarget(adminUrl),
        };
    }

    const legacyUrl = envValue(env.DATABASE_URL);
    if (legacyUrl) {
        return {
            adminUrl: legacyUrl,
            source: "DATABASE_URL",
            target: classifyAdminDatabaseTarget(legacyUrl),
        };
    }

    throw new Error(
        "Missing database admin URL. Set DATABASE_ADMIN_URL for migrations and other admin workflows or DATABASE_URL as the legacy fallback.",
    );
}
