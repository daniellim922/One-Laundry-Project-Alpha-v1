import type { PayrollSelectionRow } from "@/services/payroll/_shared/query-payroll-selection-rows";
import { queryPayrollSelectionRows } from "@/services/payroll/_shared/query-payroll-selection-rows";

export async function listPayrollsForDownload(): Promise<PayrollSelectionRow[]> {
    return queryPayrollSelectionRows();
}
