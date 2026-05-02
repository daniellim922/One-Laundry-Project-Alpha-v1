import {
    queryPayrollSelectionRows,
    type PayrollSelectionRow,
} from "@/services/payroll/_shared/query-payroll-selection-rows";

export type { PayrollSelectionRow };

export async function listDraftPayrollsForSettlement(): Promise<
    PayrollSelectionRow[]
> {
    return queryPayrollSelectionRows("Draft");
}
