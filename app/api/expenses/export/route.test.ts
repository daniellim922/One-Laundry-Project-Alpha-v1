import * as XLSX from "@e965/xlsx";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

import { EXPENSE_EXPORT_HEADERS } from "@/services/expense/build-expenses-export-xlsx-buffer";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    listExpensesWithCategories: vi.fn(),
    listExpensesByIds: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

vi.mock("@/services/expense/list-expenses", () => ({
    listExpensesWithCategories: (...args: unknown[]) =>
        mocks.listExpensesWithCategories(...args),
    listExpensesByIds: (...args: unknown[]) => mocks.listExpensesByIds(...args),
}));

import { GET, POST } from "@/app/api/expenses/export/route";

const sampleRow = {
    id: "00000000-0000-4000-8000-000000000099",
    categoryName: "Overheads",
    subcategoryName: "Rent",
    supplierName: "Invoice Co",
    description: null,
    invoiceNumber: "INV-1",
    supplierGstRegNumber: null,
    subtotalCents: 10000,
    gstCents: 900,
    grandTotalCents: 10900,
    invoiceDate: "2026-05-01",
    submissionDate: "2026-05-02",
    status: "Expense Submitted" as const,
    createdAt: new Date("2026-05-03T04:05:06.000Z"),
    updatedAt: new Date("2026-05-04T07:08:09.000Z"),
};

describe("GET /api/expenses/export", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        mocks.listExpensesWithCategories.mockResolvedValue([sampleRow]);
    });

    it("returns 401 when unauthenticated", async () => {
        mocks.requireCurrentApiUser.mockResolvedValueOnce(
            new Response(null, { status: 401 }),
        );
        const res = await GET();
        expect(res.status).toBe(401);
    });

    it("returns an xlsx attachment with expected headers and rows", async () => {
        const res = await GET();
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        expect(res.headers.get("Content-Disposition")).toContain(
            "expenses-export.xlsx",
        );

        const body = new Uint8Array(await res.arrayBuffer());
        const workbook = XLSX.read(body, { type: "array" });
        expect(workbook.SheetNames).toEqual(["Expenses"]);
        const sheet = workbook.Sheets.Expenses;
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: "",
        });
        expect(rows).toHaveLength(1);
        const keys = Object.keys(rows[0] ?? {});
        expect(keys).toEqual([...EXPENSE_EXPORT_HEADERS]);
        expect(rows[0]).toMatchObject({
            "Expense ID": sampleRow.id,
            Supplier: sampleRow.supplierName,
            Subtotal: 100,
            GST: 9,
            "Grand Total": 109,
            "Invoice Date": sampleRow.invoiceDate,
            Status: sampleRow.status,
        });
    });

    it("exports an empty sheet with column headers only", async () => {
        mocks.listExpensesWithCategories.mockResolvedValueOnce([]);
        const res = await GET();
        expect(res.status).toBe(200);
        const body = new Uint8Array(await res.arrayBuffer());
        const workbook = XLSX.read(body, { type: "array" });
        const sheet = workbook.Sheets.Expenses;
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: "",
        });
        expect(rows).toHaveLength(0);
        const ref = sheet["!ref"];
        expect(ref).toBeDefined();
        const [headerRow] = XLSX.utils.sheet_to_json<(string | number)[]>(
            sheet,
            { header: 1, range: 0 },
        );
        expect(headerRow).toEqual([...EXPENSE_EXPORT_HEADERS]);
    });
});

describe("POST /api/expenses/export", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        mocks.listExpensesByIds.mockResolvedValue([sampleRow]);
    });

    it("returns 401 when unauthenticated", async () => {
        mocks.requireCurrentApiUser.mockResolvedValueOnce(
            new Response(null, { status: 401 }),
        );
        const res = await POST(
            new Request("http://localhost/api/expenses/export", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ ids: [sampleRow.id] }),
            }),
        );
        expect(res.status).toBe(401);
        expect(mocks.listExpensesByIds).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid JSON", async () => {
        const res = await POST(
            new Request("http://localhost/api/expenses/export", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: "{",
            }),
        );
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.ok).toBe(false);
        expect(json.error.code).toBe("INVALID_JSON");
    });

    it("returns 400 when ids is empty", async () => {
        const res = await POST(
            new Request("http://localhost/api/expenses/export", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ ids: [] }),
            }),
        );
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.ok).toBe(false);
        expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when ids contains non-UUID strings", async () => {
        const res = await POST(
            new Request("http://localhost/api/expenses/export", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ ids: ["nope"] }),
            }),
        );
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.ok).toBe(false);
        expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("exports selected rows as xlsx using listExpensesByIds", async () => {
        const res = await POST(
            new Request("http://localhost/api/expenses/export", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ ids: [sampleRow.id] }),
            }),
        );
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Disposition")).toContain(
            "expenses-export-selected.xlsx",
        );
        expect(mocks.listExpensesByIds).toHaveBeenCalledWith([sampleRow.id]);

        const body = new Uint8Array(await res.arrayBuffer());
        const workbook = XLSX.read(body, { type: "array" });
        const sheet = workbook.Sheets.Expenses;
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: "",
        });
        expect(rows).toHaveLength(1);
        expect(rows[0]?.["Expense ID"]).toBe(sampleRow.id);
    });
});
