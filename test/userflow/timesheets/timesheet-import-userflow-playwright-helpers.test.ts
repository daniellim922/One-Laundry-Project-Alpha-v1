import { describe, expect, it } from "vitest";

import {
    buildFebruary2026AttendRecordArtifact,
    type FebruaryAttendRecordArtifactHandoff,
} from "./february-attendrecord-artifact-helpers";
import {
    buildExpectedFebruaryImportedRowsByWorker,
    buildExpectedFebruaryPreviewWorkerGroups,
} from "./timesheet-import-userflow-playwright-helpers";
import {
    WORKER_USERFLOW_PERMUTATIONS,
    type WorkerUserflowHandoff,
} from "../workers/worker-userflow-helpers";

describe("timesheet-import-userflow-playwright-helpers", () => {
    it("builds preview group expectations from the generated February artifact", () => {
        const artifact = buildArtifact();

        expect(buildExpectedFebruaryPreviewWorkerGroups(artifact)).toEqual([
            { workerLabel: "AttendRecord 1 Worker 1", rowCount: 24 },
            { workerLabel: "AttendRecord 2 Worker 2", rowCount: 26 },
            { workerLabel: "AttendRecord 3 Worker 3", rowCount: 25 },
            { workerLabel: "AttendRecord 4 Worker 4", rowCount: 27 },
        ]);
    });

    it("builds imported-row expectations keyed by edited app worker names", () => {
        const artifact = buildArtifact();
        const importedRowsByWorker =
            buildExpectedFebruaryImportedRowsByWorker(artifact);

        expect(importedRowsByWorker.map((worker) => worker.workerName)).toEqual([
            "Worker 1 Edited",
            "Worker 2 Edited",
            "Worker 3 Edited",
            "Worker 4 Edited",
        ]);

        expect(importedRowsByWorker.map((worker) => worker.rowSignatures)).toEqual(
            artifact.workers.map((worker) =>
                worker.entries.map((entry) => entry.rowSignature),
            ),
        );
    });
});

function buildArtifact(): FebruaryAttendRecordArtifactHandoff {
    return buildFebruary2026AttendRecordArtifact({
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
    } satisfies WorkerUserflowHandoff);
}
