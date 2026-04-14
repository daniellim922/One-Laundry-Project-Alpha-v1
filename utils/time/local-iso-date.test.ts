import { describe, expect, it } from "vitest";

import { localDateDmy } from "@/utils/time/local-iso-date";

describe("local-iso-date", () => {
    it("localDateDmy formats ISO date string in en-GB", () => {
        expect(localDateDmy("2025-03-03")).toMatch(/03\/03\/2025/);
    });
});
