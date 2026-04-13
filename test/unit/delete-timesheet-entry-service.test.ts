import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    synchronizeWorkerDraftPayrolls: vi.fn(),
    db: {
        select: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

vi.mock("@/services/payroll/synchronize-worker-draft-payrolls", () => ({
    synchronizeWorkerDraftPayrolls: (...args: unknown[]) =>
        mocks.synchronizeWorkerDraftPayrolls(...args),
}));

import { deleteTimesheetEntry } from "@/services/timesheet/delete-timesheet-entry";

function mockSelectResolved(rows: unknown[]) {
    mocks.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(rows),
            }),
        }),
    });
}

describe("services/timesheet/delete-timesheet-entry", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.db.delete.mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
        });
    });

    it("deletes the entry and synchronizes the affected worker's draft payrolls", async () => {
        mockSelectResolved([{ workerId: "worker-1" }]);
        mocks.synchronizeWorkerDraftPayrolls.mockResolvedValue({ success: true });

        await expect(deleteTimesheetEntry({ id: "entry-1" })).resolves.toEqual({
            success: true,
        });

        expect(mocks.synchronizeWorkerDraftPayrolls).toHaveBeenCalledWith({
            workerId: "worker-1",
        });
    });

    it("returns a structured sync error after deletion when payroll synchronization fails", async () => {
        mockSelectResolved([{ workerId: "worker-1" }]);
        mocks.synchronizeWorkerDraftPayrolls.mockResolvedValue({
            error: "Failed to synchronize Draft payrolls",
        });

        await expect(deleteTimesheetEntry({ id: "entry-1" })).resolves.toEqual({
            success: false,
            code: "SYNC_ERROR",
            error: "Failed to synchronize Draft payrolls",
        });
    });
});
