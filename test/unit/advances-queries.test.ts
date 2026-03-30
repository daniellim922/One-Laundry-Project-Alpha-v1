import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";

import {
    getAdvanceRequestByIdWithWorker,
    listAdvanceRequestsWithWorkers,
    type AdvanceRequestWithWorker,
} from "@/lib/advances-queries";

function mockDbForList(
    rows: Omit<AdvanceRequestWithWorker, "status">[],
    advancesByRequestId: Record<string, { status: "loan" | "paid" }[]>,
) {
    const requestRows = rows.map((r) => ({
        id: r.id,
        workerId: r.workerId,
        workerName: r.workerName,
        amountRequested: r.amountRequested,
        requestDate: r.requestDate,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
    }));
    const advanceRows = Object.entries(advancesByRequestId).flatMap(
        ([advanceRequestId, advs]) =>
            advs.map((a) => ({ advanceRequestId, status: a.status })),
    );

    const orderBy = vi.fn().mockResolvedValue(requestRows);
    const innerJoin = vi.fn().mockReturnValue({ orderBy });
    const fromForRequests = vi.fn().mockReturnValue({ innerJoin });

    const where = vi.fn().mockResolvedValue(advanceRows);
    const fromForAdvances = vi.fn().mockReturnValue({ where });

    const select = vi
        .fn()
        .mockReturnValueOnce({ from: fromForRequests })
        .mockReturnValue({ from: fromForAdvances });
    return { select } as unknown as typeof db;
}

function createMockDbForGetById(
    request: AdvanceRequestWithWorker & {
        purpose?: string | null;
        employeeSignature?: string | null;
        employeeSignatureDate?: string | Date | null;
        managerSignature?: string | null;
        managerSignatureDate?: string | Date | null;
    },
    advanceRows: { id: string; amount: number; status: string; repaymentDate: string | null }[],
) {
    const requestRows = [
        {
            ...request,
            purpose: request.purpose ?? null,
            employeeSignature: request.employeeSignature ?? null,
            employeeSignatureDate: request.employeeSignatureDate ?? null,
            managerSignature: request.managerSignature ?? null,
            managerSignatureDate: request.managerSignatureDate ?? null,
        },
    ];
    return {
        select: vi.fn()
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    innerJoin: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue(requestRows),
                        }),
                    }),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        orderBy: vi.fn().mockResolvedValue(advanceRows),
                    }),
                }),
            }),
    } as unknown as typeof db;
}

describe("advances-queries", () => {
    const sample: AdvanceRequestWithWorker = {
        id: "ar1",
        workerId: "w1",
        workerName: "Test Worker",
        amountRequested: 100,
        status: "loan",
        requestDate: "2025-01-10",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("listAdvanceRequestsWithWorkers returns mapped rows from db", async () => {
        const { status: _s, ...requestWithoutStatus } = sample;
        const mockDb = mockDbForList([requestWithoutStatus], {
            ar1: [{ status: "loan" }],
        });
        const out = await listAdvanceRequestsWithWorkers(mockDb);
        expect(out).toHaveLength(1);
        expect(out[0]).toMatchObject({
            id: "ar1",
            workerName: "Test Worker",
            amountRequested: 100,
            status: "loan",
        });
    });

    it("listAdvanceRequestsWithWorkers derives paid when all advances paid", async () => {
        const { status: _s, ...requestWithoutStatus } = sample;
        const mockDb = mockDbForList([requestWithoutStatus], {
            ar1: [{ status: "paid" }],
        });
        const out = await listAdvanceRequestsWithWorkers(mockDb);
        expect(out[0]!.status).toBe("paid");
    });

    it("listAdvanceRequestsWithWorkers handles empty set", async () => {
        const mockDb = mockDbForList([], {});
        const out = await listAdvanceRequestsWithWorkers(mockDb);
        expect(out).toEqual([]);
    });

    it("getAdvanceRequestByIdWithWorker returns request and advances when found", async () => {
        const advanceRows = [
            { id: "a1", amount: 100, status: "loan", repaymentDate: "2025-02-10" },
        ];
        const mockDb = createMockDbForGetById(sample, advanceRows);
        const out = await getAdvanceRequestByIdWithWorker("ar1", mockDb);
        expect(out).not.toBeNull();
        expect(out!.request).toMatchObject({ id: "ar1", workerName: "Test Worker" });
        expect(out!.advances).toHaveLength(1);
        expect(out!.advances[0]).toMatchObject({ amount: 100, status: "loan" });
    });

    it("getAdvanceRequestByIdWithWorker returns null when request missing", async () => {
        const mockDb = {
            select: vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    innerJoin: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue([]),
                        }),
                    }),
                }),
            }),
        } as unknown as typeof db;
        const out = await getAdvanceRequestByIdWithWorker("missing", mockDb);
        expect(out).toBeNull();
    });
});
