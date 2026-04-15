import { describe, expect, it } from "vitest";
import {
    classifyAdminDatabaseTarget,
    resolveAdminDatabaseConfig,
} from "@/lib/database/admin-config";

describe("admin database config", () => {
    it("prefers DATABASE_ADMIN_URL over the legacy DATABASE_URL fallback", () => {
        expect(
            resolveAdminDatabaseConfig({
                DATABASE_ADMIN_URL:
                    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
                DATABASE_URL:
                    "postgresql://postgres:postgres@db.example.supabase.co:5432/postgres",
            }),
        ).toEqual({
            adminUrl:
                "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
            source: "DATABASE_ADMIN_URL",
            target: "local-supabase",
        });
    });

    it("falls back to DATABASE_URL when DATABASE_ADMIN_URL is absent", () => {
        expect(
            resolveAdminDatabaseConfig({
                DATABASE_URL:
                    "postgresql://postgres:postgres@db.example.supabase.co:5432/postgres",
            }),
        ).toEqual({
            adminUrl:
                "postgresql://postgres:postgres@db.example.supabase.co:5432/postgres",
            source: "DATABASE_URL",
            target: "hosted-supabase",
        });
    });

    it("throws when neither admin variable is available", () => {
        expect(() => resolveAdminDatabaseConfig({})).toThrow(
            "Missing database admin URL.",
        );
    });

    it("classifies the committed local Supabase endpoint as local", () => {
        expect(
            classifyAdminDatabaseTarget(
                "postgresql://postgres:postgres@localhost:54322/postgres",
            ),
        ).toBe("local-supabase");
    });
});
