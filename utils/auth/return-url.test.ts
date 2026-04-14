import { describe, expect, it } from "vitest";

import {
    loginUrlWithReturn,
    sanitizeDashboardReturnUrl,
} from "@/utils/auth/return-url";

describe("sanitizeDashboardReturnUrl", () => {
    it("defaults for null, undefined, empty, whitespace", () => {
        expect(sanitizeDashboardReturnUrl(null)).toBe("/dashboard");
        expect(sanitizeDashboardReturnUrl(undefined)).toBe("/dashboard");
        expect(sanitizeDashboardReturnUrl("")).toBe("/dashboard");
        expect(sanitizeDashboardReturnUrl("   ")).toBe("/dashboard");
    });

    it("allows /dashboard and nested paths", () => {
        expect(sanitizeDashboardReturnUrl("/dashboard")).toBe("/dashboard");
        expect(sanitizeDashboardReturnUrl("/dashboard/payroll")).toBe(
            "/dashboard/payroll",
        );
        expect(
            sanitizeDashboardReturnUrl("/dashboard/payroll?period=2026-01"),
        ).toBe("/dashboard/payroll?period=2026-01");
    });

    it("rejects protocol-relative and non-dashboard paths", () => {
        expect(sanitizeDashboardReturnUrl("//evil.com")).toBe("/dashboard");
        expect(sanitizeDashboardReturnUrl("/login")).toBe("/dashboard");
        expect(sanitizeDashboardReturnUrl("/foo")).toBe("/dashboard");
        expect(sanitizeDashboardReturnUrl("/dashboard-evil")).toBe(
            "/dashboard",
        );
    });

    it("rejects backslashes", () => {
        expect(sanitizeDashboardReturnUrl("/dashboard\\evil")).toBe(
            "/dashboard",
        );
    });

    it("rejects traversal that leaves /dashboard", () => {
        expect(sanitizeDashboardReturnUrl("/dashboard/../login")).toBe(
            "/dashboard",
        );
    });
});

describe("loginUrlWithReturn", () => {
    it("returns /login without query when header missing or default path", () => {
        expect(loginUrlWithReturn(null)).toBe("/login");
        expect(loginUrlWithReturn("")).toBe("/login");
        expect(loginUrlWithReturn("/dashboard")).toBe("/login");
    });

    it("adds next for deep dashboard links", () => {
        expect(loginUrlWithReturn("/dashboard/payroll")).toBe(
            "/login?next=%2Fdashboard%2Fpayroll",
        );
        expect(loginUrlWithReturn("/dashboard/x?tab=1")).toBe(
            "/login?next=%2Fdashboard%2Fx%3Ftab%3D1",
        );
    });
});
