import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";
import { proxy } from "@/proxy";

vi.mock("@/lib/supabase/proxy", () => ({
    updateSession: vi.fn(),
}));

describe("proxy", () => {
    it("delegates to updateSession and returns its response", async () => {
        const request = new NextRequest("http://localhost/dashboard");
        const expected = NextResponse.next();
        vi.mocked(updateSession).mockResolvedValue(expected);

        const response = await proxy(request);

        expect(updateSession).toHaveBeenCalledTimes(1);
        expect(updateSession).toHaveBeenCalledWith(request);
        expect(response).toBe(expected);
    });
});
