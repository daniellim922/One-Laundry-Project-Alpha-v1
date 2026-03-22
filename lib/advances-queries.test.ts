import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";

import {
    getAdvanceByIdWithWorker,
    listAdvancesWithWorkers,
    type AdvanceWithWorker,
} from "./advances-queries";

function mockDbForList(rows: AdvanceWithWorker[]) {
    const orderBy = vi.fn().mockResolvedValue(
        rows.map((r) => ({
            id: r.id,
            amount: r.amount,
            status: r.status,
            loanDate: r.loanDate,
            repaymentDate: r.repaymentDate,
            workerId: r.workerId,
            workerName: r.workerName,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        })),
    );
    const innerJoin = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });
    return { select } as unknown as typeof db;
}

function mockDbForGetById(rows: AdvanceWithWorker[]) {
    const limit = vi.fn().mockResolvedValue(
        rows.map((r) => ({
            id: r.id,
            amount: r.amount,
            status: r.status,
            loanDate: r.loanDate,
            repaymentDate: r.repaymentDate,
            workerId: r.workerId,
            workerName: r.workerName,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        })),
    );
    const where = vi.fn().mockReturnValue({ limit });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });
    return { select } as unknown as typeof db;
}

describe("advances-queries", () => {
    const sample: AdvanceWithWorker = {
        id: "a1",
        amount: 100,
        status: "loan",
        loanDate: "2025-01-10",
        repaymentDate: null,
        workerId: "w1",
        workerName: "Test Worker",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("listAdvancesWithWorkers returns mapped rows from db", async () => {
        const mockDb = mockDbForList([sample]);
        const out = await listAdvancesWithWorkers(mockDb);
        expect(out).toHaveLength(1);
        expect(out[0]).toMatchObject({
            id: "a1",
            workerName: "Test Worker",
            amount: 100,
            status: "loan",
        });
    });

    it("listAdvancesWithWorkers handles empty set", async () => {
        const mockDb = mockDbForList([]);
        const out = await listAdvancesWithWorkers(mockDb);
        expect(out).toEqual([]);
    });

    it("getAdvanceByIdWithWorker returns row when found", async () => {
        const mockDb = mockDbForGetById([sample]);
        const out = await getAdvanceByIdWithWorker("a1", mockDb);
        expect(out).toMatchObject({ id: "a1", workerName: "Test Worker" });
    });

    it("getAdvanceByIdWithWorker returns null when missing", async () => {
        const mockDb = mockDbForGetById([]);
        const out = await getAdvanceByIdWithWorker("missing", mockDb);
        expect(out).toBeNull();
    });
});
