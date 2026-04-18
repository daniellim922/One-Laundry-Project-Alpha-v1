import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";

describe("proxy auth tracer bullet", () => {
    it("redirects the dashboard root into login", async () => {
        const response = await proxy(
            new NextRequest("http://localhost/dashboard"),
        );

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe(
            "http://localhost/login?redirectTo=%2Fdashboard",
        );
    });

    it("redirects nested dashboard routes into login with their original path", async () => {
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
});
