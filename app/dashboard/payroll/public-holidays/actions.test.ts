import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    revalidatePath: vi.fn(),
    redirect: vi.fn(),
    createClient: vi.fn(),
    savePublicHolidaysForYear: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidatePath: (...args: unknown[]) => mocks.revalidatePath(...args),
}));

vi.mock("next/navigation", () => ({
    redirect: (...args: unknown[]) => mocks.redirect(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: (...args: unknown[]) => mocks.createClient(...args),
}));

vi.mock("@/services/payroll/public-holiday-calendar", () => ({
    savePublicHolidaysForYear: (...args: unknown[]) =>
        mocks.savePublicHolidaysForYear(...args),
}));

import { savePublicHolidayYear } from "@/app/dashboard/payroll/public-holidays/actions";

describe("public holiday year action", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.redirect.mockImplementation((url: string) => {
            throw Object.assign(new Error("NEXT_REDIRECT"), {
                digest: `NEXT_REDIRECT;replace;${url};307;`,
            });
        });
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: { email: "operator@example.com" } },
                    error: null,
                }),
            },
        });
    });

    it("delegates to the holiday calendar service and revalidates payroll pages", async () => {
        mocks.savePublicHolidaysForYear.mockResolvedValue({
            success: true,
            saved: 2,
        });

        await expect(
            savePublicHolidayYear({
                year: 2026,
                holidays: [
                    { date: "2026-01-01", name: "New Year's Day" },
                    { date: "2026-05-01", name: "Labour Day" },
                ],
            }),
        ).resolves.toEqual({
            success: true,
            saved: 2,
        });

        expect(mocks.savePublicHolidaysForYear).toHaveBeenCalledWith({
            year: 2026,
            holidays: [
                { date: "2026-01-01", name: "New Year's Day" },
                { date: "2026-05-01", name: "Labour Day" },
            ],
        });
        expect(mocks.revalidatePath).toHaveBeenCalledWith(
            "/dashboard/payroll/public-holidays",
        );
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/payroll");
    });

    it("redirects to /login before saving when the authenticated user has no email", async () => {
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: { email: null } },
                    error: null,
                }),
            },
        });

        await expect(
            savePublicHolidayYear({
                year: 2026,
                holidays: [],
            }),
        ).rejects.toMatchObject({
            digest: "NEXT_REDIRECT;replace;/login;307;",
        });

        expect(mocks.savePublicHolidaysForYear).not.toHaveBeenCalled();
        expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });
});
