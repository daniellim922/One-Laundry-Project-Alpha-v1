import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const configToml = readFileSync(
    join(process.cwd(), "supabase/config.toml"),
    "utf8",
);

describe("supabase/config.toml local auth contract", () => {
    it("enables local auth and keeps signup disabled for the single-admin flow", () => {
        expect(configToml).toMatch(/\[auth\]\s+enabled = true/);
        expect(configToml).toMatch(/enable_signup = false/);
        expect(configToml).toMatch(/\[auth\.email\]\s+enable_signup = false/);
    });

    it("allowlists the local callback URLs used by the magic-link flow", () => {
        expect(configToml).toContain('site_url = "http://127.0.0.1:3000"');
        expect(configToml).toContain(
            '"http://127.0.0.1:3000/auth/callback"',
        );
        expect(configToml).toContain('"http://localhost:3000"');
        expect(configToml).toContain(
            '"http://localhost:3000/auth/callback"',
        );
    });

    it("enables Inbucket for local auth email capture", () => {
        expect(configToml).toMatch(/\[inbucket\]\s+enabled = true/);
        expect(configToml).toContain("port = 54324");
        expect(configToml).toContain("smtp_port = 54325");
        expect(configToml).toContain("pop3_port = 54326");
    });
});
