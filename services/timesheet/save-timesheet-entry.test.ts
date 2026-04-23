import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    synchronizeWorkerDraftPayrolls: vi.fn(),
    db: {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
    },
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

vi.mock("@/services/payroll/synchronize-worker-draft-payrolls", () => ({
    synchronizeWorkerDraftPayrolls: (...args: unknown[]) =>
        mocks.synchronizeWorkerDraftPayrolls(...args),
}));

import { createTimesheetEntryRecord } from "@/services/timesheet/save-timesheet-entry";

function mockSelectWorkerResolved(
    rows: Array<{ name: string; status: "Active" | "Inactive" }>,
) {
    const limit = vi.fn().mockResolvedValue(rows);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });

    mocks.db.select.mockReturnValue({ from });
}

describe("services/timesheet/save-timesheet-entry", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.db.insert.mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
        });
        mocks.synchronizeWorkerDraftPayrolls.mockResolvedValue({ success: true });
    });

    it("returns a clear error when creating a timesheet entry for an inactive worker", async () => {
        mockSelectWorkerResolved([
            {
                name: "Alicia",
                status: "Inactive",
            },
        ]);

        const result = await createTimesheetEntryRecord({
            workerId: "worker-1",
            dateIn: "2026-03-01",
            dateOut: "2026-03-01",
            timeIn: "09:00",
            timeOut: "17:00",
        });

        expect(result).toEqual({
            error: "Cannot create timesheet for Alicia because worker status is Inactive",
        });
        expect(mocks.db.insert).not.toHaveBeenCalled();
        expect(mocks.synchronizeWorkerDraftPayrolls).not.toHaveBeenCalled();
    });

    it("creates a timesheet entry for an active worker", async () => {
        mockSelectWorkerResolved([
            {
                name: "Alicia",
                status: "Active",
            },
        ]);

        const result = await createTimesheetEntryRecord({
            workerId: "worker-1",
            dateIn: "2026-03-01",
            dateOut: "2026-03-01",
            timeIn: "09:00",
            timeOut: "17:00",
        });

        expect(result).toEqual({ success: true });
        expect(mocks.db.insert).toHaveBeenCalledTimes(1);
        expect(mocks.synchronizeWorkerDraftPayrolls).toHaveBeenCalledWith({
            workerId: "worker-1",
        });
    });
});
