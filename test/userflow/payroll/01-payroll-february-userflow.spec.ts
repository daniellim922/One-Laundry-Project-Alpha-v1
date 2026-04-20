import { expect, test } from "@playwright/test";

import { registerUserflowResultFolderRenaming } from "../register-userflow-result-folder";
import { assertOpenDashboardAccess } from "../../e2e/worker-test-helpers";
import {
    signInToUserflowSession,
    WORKER_USERFLOW_PERMUTATIONS,
} from "../workers/worker-userflow-helpers";
import {
    buildFebruary2026PayrollPlan,
    initializePayrollUserflowHandoff,
    readWorkerUserflowHandoffForPayroll,
    writePayrollUserflowHandoff,
} from "./payroll-userflow-helpers";
import {
    createPayrollForMonthThroughUi,
    verifyPayrollMonthRowsInAllPayrollsUi,
} from "./payroll-userflow-playwright-helpers";

registerUserflowResultFolderRenaming(test);

test.describe("Payroll userflow", () => {
    test("creates deterministic February 2026 payrolls from persisted workers and writes the initial payroll handoff", async ({
        page,
    }) => {
        const workerHandoff = await readWorkerUserflowHandoffForPayroll();

        expect(workerHandoff.workers).toHaveLength(
            WORKER_USERFLOW_PERMUTATIONS.length,
        );
        expect(workerHandoff.workers.map((worker) => worker.permutationKey)).toEqual(
            WORKER_USERFLOW_PERMUTATIONS.map((permutation) => permutation.key),
        );

        const plan = buildFebruary2026PayrollPlan(workerHandoff);

        const payrollHandoff = initializePayrollUserflowHandoff(workerHandoff);
        await writePayrollUserflowHandoff(payrollHandoff);

        await signInToUserflowSession(page, "/dashboard/payroll/new");
        await assertOpenDashboardAccess(page);

        await createPayrollForMonthThroughUi(page, plan);

        const createdRows = await verifyPayrollMonthRowsInAllPayrollsUi(page, plan);

        expect(createdRows).toHaveLength(plan.workerRows.length);

        const createdByWorkerId = new Map(
            createdRows.map((row) => [row.workerId, row]),
        );

        payrollHandoff.periodsByMonth[plan.monthKey] = plan.period;
        payrollHandoff.workers = payrollHandoff.workers.map((worker) => {
            const created = createdByWorkerId.get(worker.workerId);

            if (!created) {
                throw new Error(
                    `Missing created payroll row for workerId ${worker.workerId}.`,
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

        await writePayrollUserflowHandoff(payrollHandoff);
    });
});
