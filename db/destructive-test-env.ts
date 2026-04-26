import {
    assertDestructiveDatabaseActionAllowed,
    destructiveGuardEnv,
} from "./destructive-guard";

export const destructiveTestDatabaseUrlEnv =
    "ONE_LAUNDRY_DESTRUCTIVE_TEST_DATABASE_URL";

export function configureDestructiveTestDatabase(
    env: Record<string, string | undefined> = process.env,
): string {
    const databaseUrl = env[destructiveTestDatabaseUrlEnv];
    if (!databaseUrl) {
        throw new Error(
            `Refusing to run destructive database tests: ${destructiveTestDatabaseUrlEnv} is not set. ` +
                `Use a dedicated test database, not DATABASE_URL.`,
        );
    }

    assertDestructiveDatabaseActionAllowed({
        action: "test",
        databaseUrl,
        env,
    });

    env.DATABASE_URL = databaseUrl;
    return databaseUrl;
}

export function destructiveTestEnvHelp(): string {
    return [
        `${destructiveGuardEnv.allow}=true`,
        `${destructiveGuardEnv.action}=test`,
        `${destructiveTestDatabaseUrlEnv}=<dedicated-test-database-url>`,
    ].join(" ");
}
