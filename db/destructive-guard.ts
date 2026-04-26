export type DestructiveDatabaseAction =
    | "reset"
    | "seed-workers"
    | "test"
    | "wipe";

type DestructiveGuardEnv = Record<string, string | undefined>;

type DestructiveGuardInput = {
    action: DestructiveDatabaseAction;
    databaseUrl: string | undefined;
    env?: DestructiveGuardEnv;
};

export const destructiveGuardEnv = {
    allow: "ONE_LAUNDRY_ALLOW_DESTRUCTIVE_DB",
    action: "ONE_LAUNDRY_DESTRUCTIVE_DB_ACTION",
    target: "ONE_LAUNDRY_DESTRUCTIVE_DB_TARGET",
} as const;

function denial(action: DestructiveDatabaseAction, reason: string): Error {
    return new Error(
        `Refusing to run destructive database action "${action}": ${reason}. ` +
            `Set ${destructiveGuardEnv.allow}=true and ` +
            `${destructiveGuardEnv.action}=${action} to run it intentionally.`,
    );
}

function databaseHost(databaseUrl: string | undefined): string | null {
    if (!databaseUrl) return null;

    try {
        return new URL(databaseUrl).hostname;
    } catch {
        return null;
    }
}

function isHostedSupabaseHost(host: string): boolean {
    return host.endsWith(".supabase.co") || host.endsWith(".supabase.com");
}

export function assertDestructiveDatabaseActionAllowed({
    action,
    databaseUrl,
    env = process.env,
}: DestructiveGuardInput): void {
    if (env[destructiveGuardEnv.allow] !== "true") {
        throw denial(action, "explicit destructive opt-in is not present");
    }

    if (env[destructiveGuardEnv.action] !== action) {
        throw denial(
            action,
            `expected ${destructiveGuardEnv.action}=${action}`,
        );
    }

    const host = databaseHost(databaseUrl);
    if (
        host &&
        isHostedSupabaseHost(host) &&
        env[destructiveGuardEnv.target] !== host
    ) {
        throw denial(
            action,
            `hosted Supabase target requires ${destructiveGuardEnv.target}=${host}`,
        );
    }
}
