import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    revalidatePath: vi.fn(),
    synchronizeWorkerDraftPayrolls: vi.fn(),
    createSupabaseServerClient: vi.fn(),
    synchronizeWorkerDraftPayrollsInTx: vi.fn(),
    db: {
        select: vi.fn(),
        update: vi.fn(),
        insert: vi.fn(),
        transaction: vi.fn(),
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: (...args: unknown[]) => mocks.revalidatePath(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
    createSupabaseServerClient: (...args: unknown[]) =>
        mocks.createSupabaseServerClient(...args),
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

vi.mock("@/services/payroll/synchronize-worker-draft-payrolls", () => ({
    synchronizeWorkerDraftPayrolls: (...args: unknown[]) =>
        mocks.synchronizeWorkerDraftPayrolls(...args),
    synchronizeWorkerDraftPayrollsInTx: (...args: unknown[]) =>
        mocks.synchronizeWorkerDraftPayrollsInTx(...args),
}));

import {
    createWorker,
    updateWorker,
} from "@/app/dashboard/worker/actions";

function buildWorkerFormData(
    overrides: Partial<
        Record<
            | "name"
            | "nric"
            | "email"
            | "phone"
            | "status"
            | "countryOfOrigin"
            | "race"
            | "employmentType"
            | "employmentArrangement"
            | "cpf"
            | "monthlyPay"
            | "hourlyRate"
            | "restDayRate"
            | "minimumWorkingHours"
            | "paymentMethod"
            | "payNowPhone"
            | "bankAccountNumber",
            string
        >
    > = {},
): FormData {
    const defaults: Record<string, string> = {
        name: "Alice",
        nric: "S1234567A",
        email: "alice@example.com",
        phone: "81234567",
        status: "Active",
        countryOfOrigin: "Singapore",
        race: "Chinese",
        employmentType: "Full Time",
        employmentArrangement: "Local Worker",
        cpf: "320",
        monthlyPay: "2200",
        hourlyRate: "9",
        restDayRate: "80",
        minimumWorkingHours: "240",
        paymentMethod: "Cash",
        payNowPhone: "",
        bankAccountNumber: "",
    };

    const fd = new FormData();
    const values = { ...defaults, ...overrides };
    for (const [k, v] of Object.entries(values)) {
        fd.set(k, v);
    }
    return fd;
}

function queueInsertResolved(rows: unknown[]) {
    const returning = vi.fn().mockResolvedValue(rows);
    const values = vi.fn().mockReturnValue({ returning });
    mocks.db.insert.mockReturnValueOnce({ values });
    return { values, returning };
}

function queueInsertRejected(error: unknown) {
    const returning = vi.fn().mockRejectedValue(error);
    const values = vi.fn().mockReturnValue({ returning });
    mocks.db.insert.mockReturnValueOnce({ values });
    return { values, returning };
}

function queueSelectWorker(rows: unknown[]) {
    mocks.db.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(rows),
            }),
        }),
    });
}

function queueUpdateResolved() {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    mocks.db.update.mockReturnValueOnce({ set });
    return { set, where };
}

function queueUpdateRejected(error: unknown) {
    const where = vi.fn().mockRejectedValue(error);
    const set = vi.fn().mockReturnValue({ where });
    mocks.db.update.mockReturnValueOnce({ set });
    return { set, where };
}


describe("createWorker", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.createSupabaseServerClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: {
                        user: {
                            email: "admin@example.com",
                        },
                    },
                    error: null,
                }),
            },
        });
        process.env.AUTH_ADMIN_EMAIL = "admin@example.com";
    });

    it("creates employment + worker and revalidates worker pages", async () => {
        queueInsertResolved([{ id: "employment-1" }]);
        queueInsertResolved([{ id: "worker-1" }]);

        const result = await createWorker(buildWorkerFormData());

        expect(result).toEqual({ success: true, id: "worker-1" });
        expect(mocks.db.insert).toHaveBeenCalledTimes(2);
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/worker");
        expect(mocks.revalidatePath).toHaveBeenCalledWith(
            "/dashboard/worker/all",
        );
    });

    it("returns validation error when name is empty", async () => {
        const result = await createWorker(buildWorkerFormData({ name: "" }));

        expect(result).toEqual({ success: false, error: "Name is required" });
        expect(mocks.db.insert).not.toHaveBeenCalled();
    });

    it("returns validation error when status is invalid", async () => {
        const result = await createWorker(
            buildWorkerFormData({ status: "Suspended" }),
        );

        expect(result).toEqual({
            success: false,
            error: "Invalid worker status",
        });
        expect(mocks.db.insert).not.toHaveBeenCalled();
    });

    it("returns duplicate NRIC error when worker nric unique constraint fails", async () => {
        queueInsertResolved([{ id: "employment-1" }]);
        queueInsertRejected({
            code: "23505",
            constraint: "worker_nric_unique",
        });

        const result = await createWorker(buildWorkerFormData());

        expect(result).toEqual({
            success: false,
            error: "NRIC already exists",
        });
    });

    it("returns generic failure on unexpected database errors", async () => {
        queueInsertRejected(new Error("database unavailable"));

        const result = await createWorker(buildWorkerFormData());

        expect(result).toEqual({
            success: false,
            error: "Failed to create worker",
        });
    });
});

describe("updateWorker", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.createSupabaseServerClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: {
                        user: {
                            email: "admin@example.com",
                        },
                    },
                    error: null,
                }),
            },
        });
        process.env.AUTH_ADMIN_EMAIL = "admin@example.com";
        mocks.synchronizeWorkerDraftPayrolls.mockResolvedValue({ success: true });
    });

    it("returns validation error when worker id is missing", async () => {
        const result = await updateWorker("", buildWorkerFormData());
        expect(result).toEqual({
            success: false,
            error: "Worker ID is required",
        });
        expect(mocks.db.select).not.toHaveBeenCalled();
    });

    it("returns validation error when name is empty", async () => {
        const result = await updateWorker(
            "worker-1",
            buildWorkerFormData({ name: "" }),
        );
        expect(result).toEqual({ success: false, error: "Name is required" });
        expect(mocks.db.select).not.toHaveBeenCalled();
    });

    it("returns validation error when status is invalid", async () => {
        const result = await updateWorker(
            "worker-1",
            buildWorkerFormData({ status: "Suspended" }),
        );
        expect(result).toEqual({
            success: false,
            error: "Invalid worker status",
        });
        expect(mocks.db.select).not.toHaveBeenCalled();
    });

    it("returns not found when worker does not exist", async () => {
        queueSelectWorker([]);

        const result = await updateWorker("worker-1", buildWorkerFormData());

        expect(result).toEqual({
            success: false,
            error: "Worker not found",
        });
        expect(mocks.db.update).not.toHaveBeenCalled();
    });

    it("returns duplicate NRIC error when unique constraint fails during update", async () => {
        queueSelectWorker([{ id: "worker-1", employmentId: "employment-1" }]);
        queueUpdateResolved();
        queueUpdateRejected({
            code: "23505",
            constraint: "worker_nric_unique",
        });

        const result = await updateWorker("worker-1", buildWorkerFormData());

        expect(result).toEqual({
            success: false,
            error: "NRIC already exists",
        });
        expect(mocks.synchronizeWorkerDraftPayrolls).not.toHaveBeenCalled();
    });

    it("returns payroll sync errors when synchronization fails", async () => {
        queueSelectWorker([{ id: "worker-1", employmentId: "employment-1" }]);
        queueUpdateResolved();
        queueUpdateResolved();
        mocks.synchronizeWorkerDraftPayrolls.mockResolvedValue({
            error: "Failed to synchronize draft payrolls",
        });

        const result = await updateWorker("worker-1", buildWorkerFormData());

        expect(result).toEqual({
            success: false,
            error: "Failed to synchronize draft payrolls",
        });
    });

    it("updates worker + employment, synchronizes payroll, and revalidates all related pages", async () => {
        queueSelectWorker([{ id: "worker-1", employmentId: "employment-1" }]);
        queueUpdateResolved();
        queueUpdateResolved();

        const result = await updateWorker("worker-1", buildWorkerFormData());

        expect(result).toEqual({ success: true, id: "worker-1" });
        expect(mocks.synchronizeWorkerDraftPayrolls).toHaveBeenCalledWith({
            workerId: "worker-1",
        });
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/worker");
        expect(mocks.revalidatePath).toHaveBeenCalledWith(
            "/dashboard/worker/all",
        );
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/payroll");
        expect(mocks.revalidatePath).toHaveBeenCalledWith(
            "/dashboard/payroll/all",
        );
        expect(mocks.revalidatePath).toHaveBeenCalledWith(
            "/dashboard/payroll/[id]/summary",
            "page",
        );
        expect(mocks.revalidatePath).toHaveBeenCalledWith(
            "/dashboard/payroll/[id]/breakdown",
            "page",
        );
    });
});
