import type { ColumnDef } from "@tanstack/react-table";

import { createRowSelectionColumn } from "@/components/data-table/column-builders";
import {
    columns as baseColumns,
    type PayrollWithWorker,
} from "@/app/dashboard/payroll/columns";

export const selectableColumns: ColumnDef<PayrollWithWorker>[] = [
    createRowSelectionColumn<PayrollWithWorker>({
        ariaLabelForRow: (p) => `Select ${p.workerName}`,
    }),
    ...baseColumns,
];
