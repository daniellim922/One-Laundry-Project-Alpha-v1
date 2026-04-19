import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import {
    FEBRUARY_2026_MONTH,
    buildFebruary2026AttendRecordArtifact,
    parseGeneratedAttendRecordWorkbook,
    writeFebruary2026AttendRecordArtifacts,
    type FebruaryAttendRecordArtifactHandoff,
} from "./february-attendrecord-artifact-helpers";
import { WORKER_USERFLOW_PERMUTATIONS } from "../workers/worker-userflow-helpers";

describe("february-attendrecord-artifact-helpers", () => {
    it("builds a deterministic February 2026 AttendRecord dataset from edited worker handoff state", () => {
        const artifact = buildFebruary2026AttendRecordArtifact(buildWorkerHandoff());

        expect(artifact.month).toBe(FEBRUARY_2026_MONTH);
        expect(artifact.runId).toBe("run-123");
        expect(artifact.expectedRowCount).toBe(102);
        expect(artifact.workers.map((worker) => worker.permutationKey)).toEqual(
            WORKER_USERFLOW_PERMUTATIONS.map((permutation) => permutation.key),
        );
        expect(artifact.workers.map((worker) => worker.workerName)).toEqual([
            "Worker 1 Edited",
            "Worker 2 Edited",
            "Worker 3 Edited",
            "Worker 4 Edited",
        ]);
        expect(artifact.workers.map((worker) => worker.workerAlias)).toEqual([
            "AttendRecord 1 Worker 1",
            "AttendRecord 2 Worker 2",
            "AttendRecord 3 Worker 3",
            "AttendRecord 4 Worker 4",
        ]);
        expect(artifact.workers.map((worker) => worker.aliasUserId)).toEqual([
            "ATT-RUN123-01",
            "ATT-RUN123-02",
            "ATT-RUN123-03",
            "ATT-RUN123-04",
        ]);

        expect(artifact.workers.map((worker) => worker.totalImportedRows)).toEqual([
            24, 26, 25, 27,
        ]);
        expect(artifact.workers.map((worker) => worker.totalHours)).toEqual([
            264, 260, 262.5, 256.5,
        ]);
        expect(artifact.workers.map((worker) => worker.missingDates)).toEqual([
            ["2026-02-04", "2026-02-11", "2026-02-18", "2026-02-25"],
            ["2026-02-08", "2026-02-22"],
            ["2026-02-03", "2026-02-10", "2026-02-17"],
            ["2026-02-14"],
        ]);

        for (const worker of artifact.workers) {
            expect(worker.totalHours).toBeGreaterThanOrEqual(255);
            expect(worker.totalHours).toBeLessThanOrEqual(265);
            expect(worker.workerAlias).not.toBe(worker.workerName);
            expect(worker.entries).toHaveLength(worker.totalImportedRows);
            expect(worker.entries.every((entry) => entry.workerAlias === worker.workerAlias)).toBe(true);
            expect(worker.entries.every((entry) => entry.aliasUserId === worker.aliasUserId)).toBe(true);
            expect(worker.entries.every((entry) => entry.workerName === worker.workerName)).toBe(true);
        }

        expect(artifact.workers[0]?.entries[0]?.rowSignature).toBe(
            "Worker 1 Edited | 01/02/2026 | 01/02/2026 | 08:00 | 19:00 | 11.00",
        );
        expect(
            artifact.workers[0]?.entries.some(
                (entry) => entry.dateIn === "2026-02-04",
            ),
        ).toBe(false);

        expectMissingDateCoverage(artifact);
    });

    it("writes a real .xls workbook and JSON handoff that round-trip through the AttendRecord parser", async () => {
        const tempDir = await mkdtemp(
            path.join(os.tmpdir(), "february-attendrecord-artifacts-"),
        );
        const workbookPath = path.join(tempDir, "generated-attendrecord.xls");
        const handoffPath = path.join(tempDir, "attendrecord-handoff.json");
        const artifact = withWorkbookPath(
            buildFebruary2026AttendRecordArtifact(buildWorkerHandoff()),
            workbookPath,
        );

        try {
            await writeFebruary2026AttendRecordArtifacts(artifact, handoffPath);

            const written = JSON.parse(
                await readFile(handoffPath, "utf8"),
            ) as FebruaryAttendRecordArtifactHandoff;

            expect(written).toEqual(artifact);

            const parsedWorkbook = parseGeneratedAttendRecordWorkbook(workbookPath);

            expect(parsedWorkbook.attendanceDate).toEqual(artifact.attendanceDate);
            expect(parsedWorkbook.tablingDate).toBe(artifact.tablingDate);
            expect(parsedWorkbook.workers.map((worker) => worker.name)).toEqual(
                artifact.workers.map((worker) => worker.workerAlias),
            );
            expect(parsedWorkbook.workers.map((worker) => worker.userId)).toEqual(
                artifact.workers.map((worker) => worker.aliasUserId),
            );
            expect(
                parsedWorkbook.workers.map((worker) => worker.dates.length),
            ).toEqual(artifact.workers.map((worker) => worker.totalImportedRows));

            const parsedRowSignatures = parsedWorkbook.workers.flatMap(
                (parsedWorker, index) =>
                    parsedWorker.dates.map((date) =>
                        [
                            artifact.workers[index]?.workerName ?? "",
                            date.dateIn,
                            date.dateOut,
                            date.timeIn,
                            date.timeOut,
                            (
                                artifact.workers[index]?.entries.find(
                                    (entry) => entry.dateIn === toIsoDate(date.dateIn),
                                )?.totalHours ?? 0
                            ).toFixed(2),
                        ].join(" | "),
                    ),
            );

            expect(parsedRowSignatures).toEqual(
                artifact.workers.flatMap((worker) =>
                    worker.entries.map((entry) => entry.rowSignature),
                ),
            );
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("preserves the raw AttendRecord RecordTable sheet structure and blank missing-date cells", async () => {
        const tempDir = await mkdtemp(
            path.join(os.tmpdir(), "february-attendrecord-workbook-"),
        );
        const workbookPath = path.join(tempDir, "generated-attendrecord.xls");
        const handoffPath = path.join(tempDir, "attendrecord-handoff.json");
        const artifact = withWorkbookPath(
            buildFebruary2026AttendRecordArtifact(buildWorkerHandoff()),
            workbookPath,
        );

        try {
            await writeFebruary2026AttendRecordArtifacts(artifact, handoffPath);

            const workbook = XLSX.readFile(workbookPath);
            const recordTableSheet = workbook.Sheets.RecordTable;

            expect(recordTableSheet).toBeDefined();

            const rows = XLSX.utils.sheet_to_json(recordTableSheet!, {
                header: 1,
                blankrows: true,
                raw: false,
                defval: "",
            }) as string[][];

            expect(rows[0]?.[0]).toBe("Attendance date:01/02/2026 ~28/02/2026");
            expect(rows[1]?.[0]).toBe("Tabling date:28/02/2026 23:59:59");

            for (const [index, worker] of artifact.workers.entries()) {
                const rowOffset = 2 + index * 4;
                const workerRow = rows[rowOffset];
                const headerRow = rows[rowOffset + 1];
                const valuesRow = rows[rowOffset + 2];
                const spacerRow = rows[rowOffset + 3];

                expect(workerRow?.slice(0, 5)).toEqual([
                    "UserID:",
                    "",
                    worker.aliasUserId,
                    "Name:",
                    worker.workerAlias,
                ]);
                expect(headerRow).toEqual([
                    "",
                    "",
                    "",
                    "",
                    "",
                    ...Array.from({ length: 28 }, (_, dayIndex) =>
                        String(dayIndex + 1),
                    ),
                ]);
                expect(
                    spacerRow === undefined ||
                        spacerRow.every((cell) => cell === ""),
                ).toBe(true);

                for (const missingDate of worker.missingDates) {
                    const dayIndex = Number.parseInt(missingDate.slice(-2), 10) - 1;

                    expect(valuesRow?.[5 + dayIndex]).toBe("");
                }
            }
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});

function buildWorkerHandoff() {
    return {
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
    };
}

function withWorkbookPath(
    artifact: FebruaryAttendRecordArtifactHandoff,
    workbookPath: string,
): FebruaryAttendRecordArtifactHandoff {
    return {
        ...artifact,
        workbookPath,
    };
}

function toIsoDate(displayDate: string): string {
    const [day, month, year] = displayDate.split("/");

    return `${year}-${month}-${day}`;
}

function expectMissingDateCoverage(
    artifact: FebruaryAttendRecordArtifactHandoff,
): void {
    expect(
        artifact.workers.find(
            (worker) => worker.permutationKey === "full-time-foreign-paynow",
        )?.missingDates,
    ).toHaveLength(2);
    expect(
        artifact.workers.find(
            (worker) => worker.permutationKey === "part-time-foreign-cash",
        )?.missingDates,
    ).toHaveLength(3);
    expect(
        artifact.workers.find(
            (worker) => worker.permutationKey === "full-time-local-bank-transfer",
        )?.missingDates,
    ).toHaveLength(4);
    expect(
        artifact.workers.find(
            (worker) => worker.permutationKey === "part-time-local-paynow",
        )?.missingDates,
    ).toHaveLength(1);
}
