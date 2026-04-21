import { describe, expect, it } from "vitest";

import {
    APRIL_2026_MONTH,
    MAY_2026_MONTH,
    buildApril2026AttendRecordArtifact,
    buildMay2026AttendRecordArtifact,
    type AttendRecordArtifactHandoff,
    type AttendRecordImportMonth,
} from "./attendrecord-artifact-helpers";
import { buildExpectedImportPreviewWorkerGroups } from "./timesheet-import-userflow-playwright-helpers";
import {
    WORKER_USERFLOW_PERMUTATIONS,
    type WorkerUserflowHandoff,
} from "../workers/worker-userflow-helpers";

describe("timesheet-import-userflow-playwright-helpers", () => {
    it.each([
        {
            label: "April 2026",
            month: APRIL_2026_MONTH,
            expectedRows: [26, 28, 27, 29],
        },
        {
            label: "May 2026",
            month: MAY_2026_MONTH,
            expectedRows: [27, 29, 28, 30],
        },
    ])(
        "builds preview group expectations from the generated $label artifact",
        ({ expectedRows, month }) => {
            const artifact = buildArtifact(month);

            expect(buildExpectedImportPreviewWorkerGroups(artifact)).toEqual([
                { workerLabel: "AttendRecord 1 Worker 1", rowCount: expectedRows[0] },
                { workerLabel: "AttendRecord 2 Worker 2", rowCount: expectedRows[1] },
                { workerLabel: "AttendRecord 3 Worker 3", rowCount: expectedRows[2] },
                { workerLabel: "AttendRecord 4 Worker 4", rowCount: expectedRows[3] },
            ]);
        },
    );
});

function buildArtifact(month: AttendRecordImportMonth): AttendRecordArtifactHandoff {
    const handoff = {
        runId: "run-123",
        workers: WORKER_USERFLOW_PERMUTATIONS.map((permutation, index) => ({
            permutationKey: permutation.key,
            workerId: `worker-${index + 1}`,
            initialValues: {
                name: `Worker ${index + 1} Edited`,
                nric: `T000000${index}A`,
                email: `worker-${index + 1}@example.com`,
                phone: `8000000${index}`,
                employmentType: permutation.employmentType,
                employmentArrangement: permutation.employmentArrangement,
                paymentMethod: permutation.paymentMethod,
                hourlyRate: permutation.hourlyRate,
                monthlyPay: permutation.monthlyPay ?? null,
                restDayRate: permutation.restDayRate ?? null,
                minimumWorkingHours: permutation.minimumWorkingHours ?? null,
                cpf: permutation.cpf ?? null,
                countryOfOrigin: permutation.countryOfOrigin ?? null,
                bankAccountNumber: permutation.bankAccountNumber ?? null,
                payNowPhone: permutation.payNowPhone ?? null,
            },
        })),
    } satisfies WorkerUserflowHandoff;

    return month === APRIL_2026_MONTH
        ? buildApril2026AttendRecordArtifact(handoff)
        : buildMay2026AttendRecordArtifact(handoff);
}
