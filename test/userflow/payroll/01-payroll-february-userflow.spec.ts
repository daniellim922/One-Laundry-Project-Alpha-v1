import { expect, test } from "@playwright/test";

import { registerUserflowResultFolderRenaming } from "../register-userflow-result-folder";
import { assertOpenDashboardAccess } from "../../e2e/worker-test-helpers";
import {
    signInToUserflowSession,
    WORKER_USERFLOW_PERMUTATIONS,
} from "../workers/worker-userflow-helpers";
import {
    buildFebruary2026PayrollPlan,
    buildMarch2026PayrollPlan,
    initializePayrollUserflowHandoff,
    readWorkerUserflowHandoffForPayroll,
    type PayrollMonthExecutionPlan,
    type PayrollUserflowHandoff,
    writePayrollUserflowHandoff,
} from "./payroll-userflow-helpers";
import {
    createPayrollForMonthThroughUi,
    verifyPayrollMonthRowsInAllPayrollsUi,
} from "./payroll-userflow-playwright-helpers";

registerUserflowResultFolderRenaming(test);

test.describe("Payroll userflow", () => {
    test("creates deterministic February and March 2026 payrolls from persisted workers and writes one shared payroll handoff", async ({
        page,
    }) => {
        const workerHandoff = await readWorkerUserflowHandoffForPayroll();

        expect(workerHandoff.workers).toHaveLength(
            WORKER_USERFLOW_PERMUTATIONS.length,
        );
        expect(workerHandoff.workers.map((worker) => worker.permutationKey)).toEqual(
            WORKER_USERFLOW_PERMUTATIONS.map((permutation) => permutation.key),
        );

        const februaryPlan = buildFebruary2026PayrollPlan(workerHandoff);
        const marchPlan = buildMarch2026PayrollPlan(workerHandoff);

        const payrollHandoff = initializePayrollUserflowHandoff(workerHandoff);
        await writePayrollUserflowHandoff(payrollHandoff);

        await signInToUserflowSession(page, "/dashboard/payroll/new");
        await assertOpenDashboardAccess(page);

        await createPayrollForMonthThroughUi(page, februaryPlan);

        const februaryRows = await verifyPayrollMonthRowsInAllPayrollsUi(
            page,
            februaryPlan,
        );
        expect(februaryRows).toHaveLength(februaryPlan.workerRows.length);
        persistMonthRowsIntoPayrollHandoff(payrollHandoff, februaryPlan, februaryRows);
        await writePayrollUserflowHandoff(payrollHandoff);

        await createPayrollForMonthThroughUi(page, marchPlan);

        const marchRows = await verifyPayrollMonthRowsInAllPayrollsUi(page, marchPlan);
        expect(marchRows).toHaveLength(marchPlan.workerRows.length);
        persistMonthRowsIntoPayrollHandoff(payrollHandoff, marchPlan, marchRows);
        await writePayrollUserflowHandoff(payrollHandoff);
    });
});

function persistMonthRowsIntoPayrollHandoff(
    payrollHandoff: PayrollUserflowHandoff,
    plan: PayrollMonthExecutionPlan,
    createdRows: Array<{ workerId: string; payrollId: string; status: "Draft" }>,
): void {
    const createdByWorkerId = new Map(
        createdRows.map((row) => [row.workerId, row]),
    );

    payrollHandoff.periodsByMonth[plan.monthKey] = plan.period;
    payrollHandoff.workers = payrollHandoff.workers.map((worker) => {
        const created = createdByWorkerId.get(worker.workerId);

        if (!created) {
            throw new Error(
                `Missing created payroll row for workerId ${worker.workerId} in ${plan.monthKey}.`,
            );
        }

        return {
            ...worker,
            payrollByMonth: {
                ...worker.payrollByMonth,
                [plan.monthKey]: {
                    payrollId: created.payrollId,
                    status: "Draft",
                },
            },
        };
    });
}
