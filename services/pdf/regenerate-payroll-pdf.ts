import { renderToBuffer } from "@react-pdf/renderer";
import { eq } from "drizzle-orm";
import type { SupabaseClient } from "@supabase/supabase-js";

import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payrollTable";
import { payrollStoragePath, uploadPdf } from "@/lib/supabase/storage";
import { PayrollPdfDocument } from "@/services/pdf/react-pdf";
import { buildPayrollPdfData } from "@/services/pdf/build-payroll-pdf-data";

/**
 * Server-side payroll PDF (re)generation: reads live voucher + timesheet data,
 * renders to a Buffer with `@react-pdf/renderer` (Node), overwrites the stored
 * object, and persists `payrollTable.pdfStoragePath` via a direct Drizzle
 * update.
 *
 * Best-effort by contract: any failure is logged and swallowed. Callers run
 * this AFTER their DB transaction commits and must never let a PDF failure
 * break the data path.
 */
export async function regeneratePayrollPdf(
    payrollId: string,
    supabase: SupabaseClient,
): Promise<void> {
    try {
        const data = await buildPayrollPdfData(payrollId);
        if (!data) {
            return;
        }

        const buffer = await renderToBuffer(PayrollPdfDocument({ data }));
        const path = payrollStoragePath(payrollId);
        await uploadPdf(supabase, path, buffer);

        await db
            .update(payrollTable)
            .set({ pdfStoragePath: path })
            .where(eq(payrollTable.id, payrollId));
    } catch (error) {
        console.error("Failed to regenerate payroll PDF", { payrollId, error });
    }
}
