import type { AdhocLineItem } from "@/db/tables/payrollVoucherTable";

function roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
}

export function computeAdhocTotal(adhoc: AdhocLineItem[] | null | undefined): number {
    if (!adhoc?.length) {
        return 0;
    }
    return roundMoney(adhoc.reduce((sum, item) => sum + item.amount, 0));
}
