import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    synchronizeWorkerDraftPayrolls: vi.fn(),
    db: {
        select: vi.fn(),
        insert: vi.fn(),
    },
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

vi.mock("@/services/payroll/synchronize-worker-draft-payrolls", () => ({
    synchronizeWorkerDraftPayrolls: (...args: unknown[]) =>
        mocks.synchronizeWorkerDraftPayrolls(...args),
}));

import { importAttendRecordTimesheet } from "@/services/timesheet/import-attend-record-timesheet";

function makeAttendRecordPayload() {
    return {
        attendanceDate: {
            startDate: "01/01/2026",
            endDate: "28/01/2026",
        },
        tablingDate: "28/01/2026 17:10:10",
        workers: [
            {
                userId: "",
                name: "Worker One",
                dates: [
                    {
                        dateIn: "01/01/2026",
                        timeIn: "09:00",
                        dateOut: "01/01/2026",
                        timeOut: "17:00",
                        hours: 8,
                    },
                    {
                        dateIn: "02/01/2026",
                        timeIn: "09:00",
                        dateOut: "02/01/2026",
                        timeOut: "17:00",
                        hours: 8,
                    },
                ],
            },
            {
                userId: "",
                name: "Worker Two",
                dates: [
                    {
                        dateIn: "03/01/2026",
                        timeIn: "10:00",
                        dateOut: "03/01/2026",
                        timeOut: "18:00",
                        hours: 8,
                    },
                ],
            },
        ],
    };
}

describe("services/timesheet/import-attend-record-timesheet", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.db.select.mockReturnValue({
            from: vi.fn().mockResolvedValue([
                { id: "worker-1", name: "Worker One" },
                { id: "worker-2", name: "Worker Two" },
            ]),
        });
        mocks.db.insert.mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
        });
        mocks.synchronizeWorkerDraftPayrolls.mockResolvedValue({ success: true });
    });

    it("imports rows and synchronizes each affected worker once", async () => {
        await expect(
            importAttendRecordTimesheet(makeAttendRecordPayload()),
        ).resolves.toEqual({
            imported: 3,
            errors: undefined,
        });

        expect(mocks.synchronizeWorkerDraftPayrolls).toHaveBeenCalledTimes(2);
        expect(mocks.synchronizeWorkerDraftPayrolls).toHaveBeenNthCalledWith(1, {
            workerId: "worker-1",
        });
        expect(mocks.synchronizeWorkerDraftPayrolls).toHaveBeenNthCalledWith(2, {
            workerId: "worker-2",
        });
    });

    it("returns synchronization failures in the import error list", async () => {
        mocks.synchronizeWorkerDraftPayrolls
            .mockResolvedValueOnce({ success: true })
            .mockResolvedValueOnce({
                error: "Failed to synchronize Draft payrolls",
            });

        await expect(
            importAttendRecordTimesheet(makeAttendRecordPayload()),
        ).resolves.toEqual({
            imported: 3,
            errors: ["Failed to synchronize Draft payrolls"],
        });
    });
});
