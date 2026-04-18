import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    revalidatePath: vi.fn(),
    synchronizeWorkerDraftPayrolls: vi.fn(),
    createClient: vi.fn(),
    db: {
        select: vi.fn(),
        update: vi.fn(),
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: (...args: unknown[]) => mocks.revalidatePath(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: (...args: unknown[]) =>
        mocks.createClient(...args),
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

vi.mock("@/services/payroll/synchronize-worker-draft-payrolls", () => ({
    synchronizeWorkerDraftPayrolls: (...args: unknown[]) =>
        mocks.synchronizeWorkerDraftPayrolls(...args),
}));

import { updateTimesheetEntry } from "@/app/dashboard/timesheet/actions";

function mockSelectResolved(rows: unknown[]) {
    mocks.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(rows),
            }),
        }),
    });
}

describe("updateTimesheetEntry", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: {
                        user: {
                            email: "operator@example.com",
                        },
                    },
                    error: null,
                }),
            },
        });
        mocks.synchronizeWorkerDraftPayrolls.mockResolvedValue({ success: true });
    });

    it("returns error and does not update when entry is Timesheet Paid", async () => {
        mockSelectResolved([{ workerId: "worker-1", status: "Timesheet Paid" }]);

        const fd = new FormData();
        fd.set("workerId", "worker-1");
        fd.set("dateIn", "2025-01-01");
        fd.set("dateOut", "2025-01-01");
        fd.set("timeIn", "09:00");
        fd.set("timeOut", "17:00");

        const result = await updateTimesheetEntry("entry-1", fd);

        expect(result).toEqual({
            error: "Timesheet Paid entries cannot be edited",
        });
        expect(mocks.db.update).not.toHaveBeenCalled();
    });
});
