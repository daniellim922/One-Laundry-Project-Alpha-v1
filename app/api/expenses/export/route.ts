import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { apiError } from "@/app/api/_shared/responses";
import { expenseExportSelectionRequestSchema } from "@/db/schemas/api";
import { buildExpensesExportXlsxBuffer } from "@/services/expense/build-expenses-export-xlsx-buffer";
import {
    listExpensesByIds,
    listExpensesWithCategories,
} from "@/services/expense/list-expenses";

export const runtime = "nodejs";

function xlsxAttachmentResponse(buffer: Buffer, filename: string) {
    const safeName = filename.replace(/[\r\n"]/g, "_");
    return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
            "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${safeName}"`,
            "Cache-Control": "no-store",
        },
    });
}

export async function GET() {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) return auth;

    const rows = await listExpensesWithCategories();
    const buffer = buildExpensesExportXlsxBuffer(rows);

    return xlsxAttachmentResponse(buffer, "expenses-export.xlsx");
}

export async function POST(request: Request) {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) return auth;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return apiError({
            status: 400,
            code: "INVALID_JSON",
            message: "Invalid JSON",
        });
    }

    const parsed = expenseExportSelectionRequestSchema.safeParse(body);
    if (!parsed.success) {
        return apiError({
            status: 400,
            code: "VALIDATION_ERROR",
            message: "Invalid expense export selection request.",
            details: parsed.error.flatten(),
        });
    }

    const rows = await listExpensesByIds(parsed.data.ids);
    const buffer = buildExpensesExportXlsxBuffer(rows);

    return xlsxAttachmentResponse(buffer, "expenses-export-selected.xlsx");
}
