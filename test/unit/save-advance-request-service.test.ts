import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    synchronizeWorkerDraftPayrolls: vi.fn(),
    localIsoDateYmd: vi.fn(),
    db: {
        select: vi.fn(),
        transaction: vi.fn(),
    },
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

vi.mock("@/services/payroll/synchronize-worker-draft-payrolls", () => ({
    synchronizeWorkerDraftPayrolls: (...args: unknown[]) =>
        mocks.synchronizeWorkerDraftPayrolls(...args),
}));

vi.mock("@/utils/time/local-iso-date", () => ({
    localIsoDateYmd: () => mocks.localIsoDateYmd(),
}));

import {
    createAdvanceRequestRecord,
    updateAdvanceRequestRecord,
} from "@/services/advance/save-advance-request";

describe("services/advance/save-advance-request", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.localIsoDateYmd.mockReturnValue("2026-04-13");
        mocks.synchronizeWorkerDraftPayrolls.mockResolvedValue({ success: true });
    });

    it("creates the request, inserts installments, and synchronizes draft payrolls", async () => {
        const txInsertRequestReturning = vi.fn().mockResolvedValue([{ id: "advance-request-1" }]);
        const txInsertRequestValues = vi.fn().mockReturnValue({
            returning: txInsertRequestReturning,
        });
        const txInsertInstallmentsValues = vi.fn().mockResolvedValue(undefined);
        const txInsert = vi
            .fn()
            .mockReturnValueOnce({ values: txInsertRequestValues })
            .mockReturnValueOnce({ values: txInsertInstallmentsValues });

        mocks.db.transaction.mockImplementationOnce(
            async (callback: (tx: { insert: typeof txInsert }) => Promise<void>) =>
                callback({ insert: txInsert }),
        );

        await expect(
            createAdvanceRequestRecord({
                workerId: "worker-1",
                requestDate: "2026-04-20",
                amount: "700",
                purpose: "Emergency cash flow",
                employeeSignature: "employee-signature",
                employeeSignatureDate: "2026-04-20",
                managerSignature: "manager-signature",
                managerSignatureDate: "2026-04-20",
                installmentAmounts: [
                    { amount: "300", repaymentDate: "2026-04-25" },
                    { amount: "400", repaymentDate: "2026-04-30" },
                ],
            }),
        ).resolves.toEqual({ success: true, id: "advance-request-1" });

        expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
        expect(txInsert).toHaveBeenCalledTimes(2);
        expect(mocks.synchronizeWorkerDraftPayrolls).toHaveBeenCalledWith({
            workerId: "worker-1",
        });
    });

    it("updates the request and synchronizes both workers when ownership changes", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([{ workerId: "worker-old" }]),
                }),
            }),
        });

        const txAdvanceRequestWhere = vi.fn().mockResolvedValue(undefined);
        const txAdvanceRequestSet = vi.fn().mockReturnValue({
            where: txAdvanceRequestWhere,
        });
        const txAdvanceRequestUpdate = vi.fn().mockReturnValue({
            set: txAdvanceRequestSet,
        });

        const txDeleteWhere = vi.fn().mockResolvedValue(undefined);
        const txDelete = vi.fn().mockReturnValue({
            where: txDeleteWhere,
        });

        const txInsertInstallmentsValues = vi.fn().mockResolvedValue(undefined);
        const txInsert = vi.fn().mockReturnValue({
            values: txInsertInstallmentsValues,
        });

        mocks.db.transaction.mockImplementationOnce(
            async (
                callback: (tx: {
                    update: typeof txAdvanceRequestUpdate;
                    delete: typeof txDelete;
                    insert: typeof txInsert;
                }) => Promise<void>,
            ) =>
                callback({
                    update: txAdvanceRequestUpdate,
                    delete: txDelete,
                    insert: txInsert,
                }),
        );

        await expect(
            updateAdvanceRequestRecord("advance-request-1", {
                workerId: "worker-new",
                requestDate: "2026-04-20",
                amount: "700",
                purpose: "Updated purpose",
                employeeSignature: "employee-signature",
                employeeSignatureDate: "2026-04-20",
                managerSignature: "manager-signature",
                managerSignatureDate: "2026-04-20",
                installmentAmounts: [
                    {
                        amount: "300",
                        repaymentDate: "2026-04-25",
                        status: "Installment Paid",
                    },
                    {
                        amount: "400",
                        repaymentDate: "2026-04-30",
                        status: "Installment Loan",
                    },
                ],
            }),
        ).resolves.toEqual({ success: true, id: "advance-request-1" });

        expect(mocks.synchronizeWorkerDraftPayrolls).toHaveBeenNthCalledWith(1, {
            workerId: "worker-new",
        });
        expect(mocks.synchronizeWorkerDraftPayrolls).toHaveBeenNthCalledWith(2, {
            workerId: "worker-old",
        });
        expect(txAdvanceRequestUpdate).toHaveBeenCalledTimes(1);
        expect(txDelete).toHaveBeenCalledTimes(1);
        expect(txInsert).toHaveBeenCalledTimes(1);
    });
});
