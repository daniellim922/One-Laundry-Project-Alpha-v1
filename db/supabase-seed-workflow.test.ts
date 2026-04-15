import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readRepoFile(path: string): string {
    return readFileSync(join(repoRoot, path), "utf8");
}

describe("Supabase local seeded workflow contract", () => {
    it("exposes a Supabase-first command surface while keeping reset, migrate, and seed responsibilities split", () => {
        const packageJson = JSON.parse(readRepoFile("package.json")) as {
            scripts?: Record<string, string>;
        };

        expect(packageJson.scripts?.["supabase:db:reset"]).toBe(
            "npm run supabase:db:wipe && npm run supabase:db:migrate && npm run supabase:db:seed",
        );
        expect(packageJson.scripts?.["supabase:db:generate"]).toBe(
            "drizzle-kit generate",
        );
        expect(packageJson.scripts?.["supabase:db:migrate"]).toBe(
            "npx tsx db/migrate-db.ts",
        );
        expect(packageJson.scripts?.["supabase:db:seed"]).toBe(
            "npx tsx db/seed/seed.ts",
        );
        expect(packageJson.scripts?.["supabase:db:wipe"]).toBe(
            "npx tsx db/wipe-db.ts",
        );
        expect(packageJson.scripts?.["db:reset"]).toBe("npm run supabase:db:reset");
    });

    it("documents the Supabase-first seeded local workflow for developers and tests", () => {
        const readme = readRepoFile("README.md");
        const agents = readRepoFile("AGENTS.md");

        expect(readme).toContain("npm run supabase:db:reset");
        expect(readme).toContain("reset, migrate, and seed");
        expect(readme).toContain("Run `npm run supabase:db:reset` first.");
        expect(agents).toContain("npm run supabase:db:reset");
        expect(agents).toContain("loads a deterministic 12-month historical dataset");
    });

    it("resets migration state so the schema can be replayed from scratch", () => {
        const wipeScript = readRepoFile("db/wipe-db.ts");

        expect(wipeScript).toContain("schemaname IN ('public', 'drizzle')");
        expect(wipeScript).toContain('"\${table.schemaname}"."\${table.tablename}"');
    });

    it("tracks the full migration chain needed for the seeded schema", () => {
        const journal = JSON.parse(
            readRepoFile("drizzle/meta/_journal.json"),
        ) as {
            entries?: Array<{ tag: string }>;
        };

        expect(journal.entries?.map((entry) => entry.tag)).toEqual([
            "0000_yellow_ultimates",
            "0001_employment_decimal_rename",
            "0002_payroll_voucher",
            "0003_move_rest_days_to_voucher",
            "0004_rename_pay_to_rate",
            "0005_payroll_voucher_public_holidays_hours_not_met",
            "0006_payroll_voucher_hours_not_met_deduction_net_pay",
            "0007_fix_hours_not_met_deduction_sign",
            "0008_advance_repayment_date_nullable",
            "0009_advance_request_schema",
            "0010_advance_request_status_enum",
            "0011_payroll_voucher_advance",
            "0012_timesheet_status_enum",
            "0013_remove_approved_payroll_status",
            "0014_payroll_status_settled",
            "0015_worker_nric",
            "0016_status_pascal_case",
            "0017_payroll_worker_period_overlap_exclusion",
            "0018_split_advance_status_enums",
            "0019_rename_timesheet_payment_status",
        ]);
    });

    it("clears legacy status defaults before enum recasts in later migrations", () => {
        expect(readRepoFile("drizzle/0018_split_advance_status_enums.sql")).toContain(
            'ALTER TABLE "advance_request" ALTER COLUMN "status" DROP DEFAULT;',
        );
        expect(readRepoFile("drizzle/0018_split_advance_status_enums.sql")).toContain(
            'ALTER TABLE "advance" ALTER COLUMN "status" DROP DEFAULT;',
        );
        expect(readRepoFile("drizzle/0019_rename_timesheet_payment_status.sql")).toContain(
            'ALTER TABLE "timesheet" ALTER COLUMN "status" DROP DEFAULT;',
        );
    });
});
