import { describe, expect, it } from "vitest";

import { assertDestructiveDatabaseActionAllowed } from "./destructive-guard";

const localDatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:5432/laundry";
const hostedSupabaseUrl =
    "postgresql://postgres:postgres@db.project-ref.supabase.co:5432/postgres";

describe("destructive database guard", () => {
    it("fails closed when no explicit opt-in is present", () => {
        expect(() =>
            assertDestructiveDatabaseActionAllowed({
                action: "wipe",
                databaseUrl: localDatabaseUrl,
                env: {},
            }),
        ).toThrow(/refusing to run destructive database action "wipe"/i);
    });

    it("requires confirmation for the requested destructive action", () => {
        expect(() =>
            assertDestructiveDatabaseActionAllowed({
                action: "reset",
                databaseUrl: localDatabaseUrl,
                env: {
                    ONE_LAUNDRY_ALLOW_DESTRUCTIVE_DB: "true",
                    ONE_LAUNDRY_DESTRUCTIVE_DB_ACTION: "wipe",
                },
            }),
        ).toThrow(/ONE_LAUNDRY_DESTRUCTIVE_DB_ACTION=reset/);
    });

    it("requires exact target confirmation for hosted Supabase databases", () => {
        expect(() =>
            assertDestructiveDatabaseActionAllowed({
                action: "seed-workers",
                databaseUrl: hostedSupabaseUrl,
                env: {
                    ONE_LAUNDRY_ALLOW_DESTRUCTIVE_DB: "true",
                    ONE_LAUNDRY_DESTRUCTIVE_DB_ACTION: "seed-workers",
                    ONE_LAUNDRY_DESTRUCTIVE_DB_TARGET: "project-ref",
                },
            }),
        ).toThrow(/ONE_LAUNDRY_DESTRUCTIVE_DB_TARGET=db\.project-ref\.supabase\.co/);
    });

    it("allows a local destructive action with matching opt-in and action confirmation", () => {
        expect(() =>
            assertDestructiveDatabaseActionAllowed({
                action: "wipe",
                databaseUrl: localDatabaseUrl,
                env: {
                    ONE_LAUNDRY_ALLOW_DESTRUCTIVE_DB: "true",
                    ONE_LAUNDRY_DESTRUCTIVE_DB_ACTION: "wipe",
                },
            }),
        ).not.toThrow();
    });

    it("allows a hosted Supabase destructive action when the target host is confirmed exactly", () => {
        expect(() =>
            assertDestructiveDatabaseActionAllowed({
                action: "reset",
                databaseUrl: hostedSupabaseUrl,
                env: {
                    ONE_LAUNDRY_ALLOW_DESTRUCTIVE_DB: "true",
                    ONE_LAUNDRY_DESTRUCTIVE_DB_ACTION: "reset",
                    ONE_LAUNDRY_DESTRUCTIVE_DB_TARGET:
                        "db.project-ref.supabase.co",
                },
            }),
        ).not.toThrow();
    });
});
