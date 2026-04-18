import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { createSupabaseProxyClient } from "@/lib/supabase/proxy";
import { proxy } from "@/proxy";

vi.mock("@/lib/supabase/proxy", () => ({
    createSupabaseProxyClient: vi.fn(),
}));

describe("proxy auth tracer bullet", () => {
    beforeEach(() => {
        vi.mocked(createSupabaseProxyClient).mockReset();
        process.env.AUTH_ADMIN_EMAIL = "admin@example.com";
    });

    it("redirects the dashboard root into login", async () => {
        vi.mocked(createSupabaseProxyClient).mockReturnValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                }),
            },
        } as never);

        const response = await proxy(
            new NextRequest("http://localhost/dashboard"),
        );

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe(
            "http://localhost/login?redirectTo=%2Fdashboard",
        );
    });

    it("redirects nested dashboard routes into login with their original path", async () => {
        vi.mocked(createSupabaseProxyClient).mockReturnValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                }),
            },
        } as never);

        const response = await proxy(
            new NextRequest(
                "http://localhost/dashboard/payroll?period=2026-03",
            ),
        );

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe(
            "http://localhost/login?redirectTo=%2Fdashboard%2Fpayroll%3Fperiod%3D2026-03",
        );
    });

    it("allows authenticated admin users to reach the dashboard", async () => {
        vi.mocked(createSupabaseProxyClient).mockReturnValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: { email: "admin@example.com" } },
                }),
            },
        } as never);

        const response = await proxy(
            new NextRequest("http://localhost/dashboard"),
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("location")).toBeNull();
    });
});
