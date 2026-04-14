import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
    db: {
        select: vi.fn(),
        update: vi.fn(),
        insert: vi.fn(),
        transaction: vi.fn(),
    },
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

import { synchronizeWorkerDraftPayrolls } from "@/services/payroll/synchronize-worker-draft-payrolls";

describe("synchronizeWorkerDraftPayrolls", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns error when workerId is blank", async () => {
        const r = await synchronizeWorkerDraftPayrolls({ workerId: "   " });
        expect(r).toEqual({ error: "Missing workerId" });
        expect(mocks.db.select).not.toHaveBeenCalled();
    });

    it("returns success when no Draft payrolls exist", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
            }),
        });

        const r = await synchronizeWorkerDraftPayrolls({ workerId: "worker-1" });
        expect(r).toEqual({ success: true });
        expect(mocks.db.select).toHaveBeenCalled();
    });
});
