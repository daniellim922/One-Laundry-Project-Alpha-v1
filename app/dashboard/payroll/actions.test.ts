import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    revalidatePath: vi.fn(),
    redirect: vi.fn(),
    createSupabaseServerClient: vi.fn(),
    createPayrollRecord: vi.fn(),
    createPayrollRecords: vi.fn(),
    updatePayrollRecord: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidatePath: (...args: unknown[]) => mocks.revalidatePath(...args),
}));

vi.mock("next/navigation", () => ({
    redirect: (...args: unknown[]) => mocks.redirect(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
    createSupabaseServerClient: (...args: unknown[]) =>
        mocks.createSupabaseServerClient(...args),
}));

vi.mock("@/services/payroll/save-payroll", () => ({
    createPayrollRecord: (...args: unknown[]) =>
        mocks.createPayrollRecord(...args),
    createPayrollRecords: (...args: unknown[]) =>
        mocks.createPayrollRecords(...args),
    updatePayrollRecord: (...args: unknown[]) =>
        mocks.updatePayrollRecord(...args),
}));

import { createPayrolls, updatePayroll } from "@/app/dashboard/payroll/actions";

describe("payroll form actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.redirect.mockImplementation((url: string) => {
            throw Object.assign(new Error("NEXT_REDIRECT"), {
                digest: `NEXT_REDIRECT;replace;${url};307;`,
            });
        });
        mocks.createSupabaseServerClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: {
                        user: {
                            email: "admin@example.com",
                        },
                    },
                    error: null,
                }),
            },
        });
        process.env.AUTH_ADMIN_EMAIL = "admin@example.com";
    });

    it("createPayrolls delegates to the shared payroll form service and revalidates payroll pages", async () => {
        mocks.createPayrollRecords.mockResolvedValue({
            success: true,
            created: 2,
            skipped: 0,
            conflicts: [],
        });

        const formData = new FormData();
        formData.append("workerId", "worker-1");
        formData.append("workerId", "worker-2");
        formData.set("periodStart", "2026-03-01");
        formData.set("periodEnd", "2026-03-31");
        formData.set("payrollDate", "2026-04-05");

        await expect(createPayrolls(formData)).resolves.toEqual({
            success: true,
            created: 2,
            skipped: 0,
            conflicts: [],
        });

        expect(mocks.createPayrollRecords).toHaveBeenCalledWith({
            workerIds: ["worker-1", "worker-2"],
            periodStart: "2026-03-01",
            periodEnd: "2026-03-31",
            payrollDate: "2026-04-05",
        });
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/payroll");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/payroll/all");
    });

    it("updatePayroll delegates to the shared payroll form service and revalidates the payroll detail pages", async () => {
        mocks.updatePayrollRecord.mockResolvedValue({
            success: true,
        });

        const formData = new FormData();
        formData.set("periodStart", "2026-03-01");
        formData.set("periodEnd", "2026-03-31");
        formData.set("payrollDate", "2026-04-05");

        await expect(updatePayroll("payroll-1", formData)).resolves.toEqual({
            success: true,
        });

        expect(mocks.updatePayrollRecord).toHaveBeenCalledWith({
            payrollId: "payroll-1",
            periodStart: "2026-03-01",
            periodEnd: "2026-03-31",
            payrollDate: "2026-04-05",
        });
        expect(mocks.revalidatePath).toHaveBeenCalledWith(
            "/dashboard/payroll/payroll-1/breakdown",
        );
        expect(mocks.revalidatePath).toHaveBeenCalledWith(
            "/dashboard/payroll/payroll-1/summary",
        );
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/payroll");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/payroll/all");
    });

    it("redirects to /login before mutating when the authenticated user is not the configured admin", async () => {
        mocks.createSupabaseServerClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: {
                        user: {
                            email: "worker@example.com",
                        },
                    },
                    error: null,
                }),
            },
        });

        const formData = new FormData();
        formData.append("workerId", "worker-1");
        formData.set("periodStart", "2026-03-01");
        formData.set("periodEnd", "2026-03-31");
        formData.set("payrollDate", "2026-04-05");

        await expect(createPayrolls(formData)).rejects.toMatchObject({
            digest: "NEXT_REDIRECT;replace;/login;307;",
        });

        expect(mocks.createPayrollRecords).not.toHaveBeenCalled();
        expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });
});
