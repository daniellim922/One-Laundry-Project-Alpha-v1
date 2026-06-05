import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { regenerateAdvancePdf } from "@/services/pdf/regenerate-advance-pdf";
import { regeneratePayrollPdf } from "@/services/pdf/regenerate-payroll-pdf";

export async function regeneratePayrollPdfsBestEffort(
    payrollIds: string[],
    supabase: SupabaseClient,
): Promise<void> {
    const uniqueIds = [...new Set(payrollIds.filter(Boolean))];
    for (const payrollId of uniqueIds) {
        await regeneratePayrollPdf(payrollId, supabase);
    }
}

export async function regeneratePayrollPdfsAfterMutation(
    payrollIds: string[],
): Promise<void> {
    if (payrollIds.length === 0) return;
    const supabase = await createClient();
    await regeneratePayrollPdfsBestEffort(payrollIds, supabase);
}

export async function regenerateAdvancePdfAfterMutation(
    advanceRequestId: string,
): Promise<void> {
    const supabase = await createClient();
    await regenerateAdvancePdf(advanceRequestId, supabase);
}
