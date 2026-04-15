export type RuntimeDatabaseTarget = "local-supabase" | "hosted-supabase";

export type RuntimeDatabaseSource = "DATABASE_RUNTIME_URL" | "DATABASE_URL";

export type RuntimeDatabaseConfig = {
    runtimeUrl: string;
    source: RuntimeDatabaseSource;
    target: RuntimeDatabaseTarget;
};

export type RuntimeDatabaseEnv = Record<string, string | undefined>;

const LOCAL_SUPABASE_HOSTS = new Set(["127.0.0.1", "localhost"]);
const LOCAL_SUPABASE_PORT = "54322";

function envValue(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

export function classifyRuntimeDatabaseTarget(
    runtimeUrl: string,
): RuntimeDatabaseTarget {
    const parsedUrl = new URL(runtimeUrl);

    if (
        LOCAL_SUPABASE_HOSTS.has(parsedUrl.hostname) &&
        parsedUrl.port === LOCAL_SUPABASE_PORT
    ) {
        return "local-supabase";
    }

    return "hosted-supabase";
}

export function resolveRuntimeDatabaseConfig(
    env: RuntimeDatabaseEnv = process.env,
): RuntimeDatabaseConfig {
    const runtimeUrl = envValue(env.DATABASE_RUNTIME_URL);
    if (runtimeUrl) {
        return {
            runtimeUrl,
            source: "DATABASE_RUNTIME_URL",
            target: classifyRuntimeDatabaseTarget(runtimeUrl),
        };
    }

    const legacyUrl = envValue(env.DATABASE_URL);
    if (legacyUrl) {
        return {
            runtimeUrl: legacyUrl,
            source: "DATABASE_URL",
            target: classifyRuntimeDatabaseTarget(legacyUrl),
        };
    }

    throw new Error(
        "Missing database runtime URL. Set DATABASE_RUNTIME_URL for the app runtime or DATABASE_URL as the legacy fallback.",
    );
}
