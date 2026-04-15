import { describe, expect, it } from "vitest";
import {
    classifyRuntimeDatabaseTarget,
    resolveRuntimeDatabaseConfig,
} from "@/lib/database/runtime-config";

describe("runtime database config", () => {
    it("prefers DATABASE_RUNTIME_URL over the legacy DATABASE_URL fallback", () => {
        expect(
            resolveRuntimeDatabaseConfig({
                DATABASE_RUNTIME_URL:
                    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
                DATABASE_URL:
                    "postgresql://postgres:postgres@db.example.supabase.co:5432/postgres",
            }),
        ).toEqual({
            runtimeUrl:
                "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
            source: "DATABASE_RUNTIME_URL",
            target: "local-supabase",
        });
    });

    it("falls back to DATABASE_URL when DATABASE_RUNTIME_URL is absent", () => {
        expect(
            resolveRuntimeDatabaseConfig({
                DATABASE_URL:
                    "postgresql://postgres:postgres@db.example.supabase.co:5432/postgres",
            }),
        ).toEqual({
            runtimeUrl:
                "postgresql://postgres:postgres@db.example.supabase.co:5432/postgres",
            source: "DATABASE_URL",
            target: "hosted-supabase",
        });
    });

    it("throws when neither runtime variable is available", () => {
        expect(() => resolveRuntimeDatabaseConfig({})).toThrow(
            "Missing database runtime URL.",
        );
    });

    it("classifies the committed local Supabase endpoint as local", () => {
        expect(
            classifyRuntimeDatabaseTarget(
                "postgresql://postgres:postgres@localhost:54322/postgres",
            ),
        ).toBe("local-supabase");
    });
});
