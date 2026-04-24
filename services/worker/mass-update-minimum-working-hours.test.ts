import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    synchronizeWorkerDraftPayrollsInTx: vi.fn(),
    recordGuidedMonthlyWorkflowStepCompletion: vi.fn(),
    db: {
        transaction: vi.fn(),
    },
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

vi.mock("@/services/payroll/synchronize-worker-draft-payrolls", () => ({
    synchronizeWorkerDraftPayrollsInTx: (...args: unknown[]) =>
        mocks.synchronizeWorkerDraftPayrollsInTx(...args),
}));
vi.mock("@/services/payroll/guided-monthly-workflow-activity", () => ({
    recordGuidedMonthlyWorkflowStepCompletion: (...args: unknown[]) =>
        mocks.recordGuidedMonthlyWorkflowStepCompletion(...args),
}));

import { massUpdateWorkerMinimumWorkingHours } from "@/services/worker/mass-update-minimum-working-hours";

type WorkerRow = {
    id: string;
    name: string;
    status: "Active" | "Inactive";
    employmentId: string;
    employmentType: "Full Time" | "Part Time";
};

function makeTx(workerRow: WorkerRow | null) {
    const selectLimit = vi
        .fn()
        .mockResolvedValue(workerRow ? [workerRow] : []);
    const selectWhere = vi.fn().mockReturnValue({
        limit: selectLimit,
    });
    const selectInnerJoin = vi.fn().mockReturnValue({
        where: selectWhere,
    });
    const selectFrom = vi.fn().mockReturnValue({
        innerJoin: selectInnerJoin,
    });

    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn().mockReturnValue({
        where: updateWhere,
    });
    const update = vi.fn().mockReturnValue({
        set: updateSet,
    });

    const tx = {
        select: vi.fn().mockReturnValue({ from: selectFrom }),
        update,
    };

    return { tx, updateWhere };
}

describe("massUpdateWorkerMinimumWorkingHours", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.synchronizeWorkerDraftPayrollsInTx.mockResolvedValue({
            success: true,
        });
    });

    it("returns early when updates are empty", async () => {
        const result = await massUpdateWorkerMinimumWorkingHours({
            updates: [],
        });

        expect(result).toEqual({ updatedCount: 0, failed: [] });
        expect(mocks.db.transaction).not.toHaveBeenCalled();
        expect(
            mocks.recordGuidedMonthlyWorkflowStepCompletion,
        ).not.toHaveBeenCalled();
    });

    it("returns partial success and preserves failures when one worker sync fails", async () => {
        const workerRows: WorkerRow[] = [
            {
                id: "worker-1",
                name: "Alice",
                status: "Active",
                employmentId: "employment-1",
                employmentType: "Full Time",
            },
            {
                id: "worker-2",
                name: "Bob",
                status: "Active",
                employmentId: "employment-2",
                employmentType: "Full Time",
            },
        ];

        let index = 0;
        mocks.db.transaction.mockImplementation(async (callback: unknown) => {
            const { tx } = makeTx(workerRows[index] ?? null);
            index += 1;
            return (callback as (tx: unknown) => Promise<unknown>)(tx);
        });

        mocks.synchronizeWorkerDraftPayrollsInTx
            .mockResolvedValueOnce({ success: true })
            .mockResolvedValueOnce({
                error: "Failed to synchronize draft payrolls",
            });

        const result = await massUpdateWorkerMinimumWorkingHours({
            updates: [
                { workerId: "worker-1", minimumWorkingHours: 260 },
                { workerId: "worker-2", minimumWorkingHours: 250 },
            ],
        });

        expect(result.updatedCount).toBe(1);
        expect(result.failed).toHaveLength(1);
        expect(result.failed[0]).toMatchObject({
            workerId: "worker-2",
            workerName: "Bob",
            error: "Failed to synchronize draft payrolls",
        });
        expect(mocks.synchronizeWorkerDraftPayrollsInTx).toHaveBeenCalledTimes(
            2,
        );
        expect(
            mocks.recordGuidedMonthlyWorkflowStepCompletion,
        ).toHaveBeenCalledTimes(1);
        expect(
            mocks.recordGuidedMonthlyWorkflowStepCompletion,
        ).toHaveBeenCalledWith({
            stepId: "minimum_hours_bulk_update",
        });
    });

    it("enforces Active + Full Time eligibility", async () => {
        mocks.db.transaction.mockImplementation(async (callback: unknown) => {
            const { tx, updateWhere } = makeTx({
                id: "worker-3",
                name: "Charlie",
                status: "Inactive",
                employmentId: "employment-3",
                employmentType: "Full Time",
            });
            const result = await (callback as (tx: unknown) => Promise<unknown>)(
                tx,
            );
            expect(updateWhere).not.toHaveBeenCalled();
            return result;
        });

        const result = await massUpdateWorkerMinimumWorkingHours({
            updates: [{ workerId: "worker-3", minimumWorkingHours: 260 }],
        });

        expect(result).toEqual({
            updatedCount: 0,
            failed: [
                {
                    workerId: "worker-3",
                    workerName: "Charlie",
                    error: "Only active workers can be updated",
                },
            ],
        });
        expect(mocks.synchronizeWorkerDraftPayrollsInTx).not.toHaveBeenCalled();
    });

    it("fails invalid minimum working hours before database work", async () => {
        const result = await massUpdateWorkerMinimumWorkingHours({
            updates: [{ workerId: "worker-4", minimumWorkingHours: -1 }],
        });

        expect(result).toEqual({
            updatedCount: 0,
            failed: [
                {
                    workerId: "worker-4",
                    workerName: "Unknown worker",
                    error: "Minimum working hours must be a non-negative number",
                },
            ],
        });
        expect(mocks.db.transaction).not.toHaveBeenCalled();
    });

    it("reports missing worker failures and continues processing others", async () => {
        const workerRows: Array<WorkerRow | null> = [
            null,
            {
                id: "worker-6",
                name: "Dina",
                status: "Active",
                employmentId: "employment-6",
                employmentType: "Full Time",
            },
        ];

        let index = 0;
        mocks.db.transaction.mockImplementation(async (callback: unknown) => {
            const { tx } = makeTx(workerRows[index] ?? null);
            index += 1;
            return (callback as (tx: unknown) => Promise<unknown>)(tx);
        });

        const result = await massUpdateWorkerMinimumWorkingHours({
            updates: [
                { workerId: "worker-5", minimumWorkingHours: 255 },
                { workerId: "worker-6", minimumWorkingHours: 240 },
            ],
        });

        expect(result.updatedCount).toBe(1);
        expect(result.failed).toHaveLength(1);
        expect(result.failed[0]).toMatchObject({
            workerId: "worker-5",
            error: "Worker not found",
        });
        expect(mocks.synchronizeWorkerDraftPayrollsInTx).toHaveBeenCalledTimes(
            1,
        );
    });
});
