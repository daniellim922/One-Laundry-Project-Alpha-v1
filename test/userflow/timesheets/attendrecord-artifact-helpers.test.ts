import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import {
    APRIL_2026_MONTH,
    MAY_2026_MONTH,
    buildApril2026AttendRecordArtifact,
    buildMay2026AttendRecordArtifact,
    parseGeneratedAttendRecordWorkbook,
    writeAttendRecordArtifacts,
    type AttendRecordArtifactHandoff,
    type AttendRecordImportMonth,
} from "./attendrecord-artifact-helpers";
import { WORKER_USERFLOW_PERMUTATIONS } from "../workers/worker-userflow-helpers";

describe("attendrecord-artifact-helpers", () => {
    it("builds a deterministic April 2026 AttendRecord dataset from edited worker handoff state", () => {
        const artifact = buildApril2026AttendRecordArtifact(buildWorkerHandoff());

        expectCommonArtifactShape(artifact, {
            month: APRIL_2026_MONTH,
            expectedRowCount: 110,
            totalImportedRows: [26, 28, 27, 29],
            totalHours: [286, 280, 283.5, 275.5],
            missingDates: [
                ["2026-04-02", "2026-04-09", "2026-04-16", "2026-04-23"],
                ["2026-04-05", "2026-04-19"],
                ["2026-04-07", "2026-04-14", "2026-04-21"],
                ["2026-04-25"],
            ],
            firstRowSignature:
                "Worker 1 Edited | 01/04/2026 | 01/04/2026 | 08:00 | 19:00 | 11.00",
            excludedDate: "2026-04-02",
        });
    });

    it("builds a deterministic May 2026 AttendRecord dataset from edited worker handoff state", () => {
        const artifact = buildMay2026AttendRecordArtifact(buildWorkerHandoff());

        expectCommonArtifactShape(artifact, {
            month: MAY_2026_MONTH,
            expectedRowCount: 114,
            totalImportedRows: [27, 29, 28, 30],
            totalHours: [297, 290, 294, 285],
            missingDates: [
                ["2026-05-06", "2026-05-13", "2026-05-20", "2026-05-27"],
                ["2026-05-10", "2026-05-24"],
                ["2026-05-05", "2026-05-12", "2026-05-19"],
                ["2026-05-16"],
            ],
            firstRowSignature:
                "Worker 1 Edited | 01/05/2026 | 01/05/2026 | 08:00 | 19:00 | 11.00",
            excludedDate: "2026-05-06",
        });
    });

    it.each([
        {
            label: "April 2026",
            month: APRIL_2026_MONTH,
            buildArtifact: buildApril2026AttendRecordArtifact,
        },
        {
            label: "May 2026",
            month: MAY_2026_MONTH,
            buildArtifact: buildMay2026AttendRecordArtifact,
        },
    ])(
        "writes a real .xls workbook and JSON handoff for $label that round-trip through the AttendRecord parser",
        async ({ month, buildArtifact }) => {
            const tempDir = await mkdtemp(
                path.join(
                    os.tmpdir(),
                    `${month.replace(/-/g, "")}-attendrecord-artifacts-`,
                ),
            );
            const workbookPath = path.join(tempDir, "generated-attendrecord.xls");
            const handoffPath = path.join(tempDir, "attendrecord-handoff.json");
            const artifact = withWorkbookPath(
                buildArtifact(buildWorkerHandoff()),
                workbookPath,
            );

            try {
                await writeAttendRecordArtifacts(artifact, handoffPath);

                const written = JSON.parse(
                    await readFile(handoffPath, "utf8"),
                ) as AttendRecordArtifactHandoff;

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
        },
    );

    it.each([
        {
            label: "April 2026",
            buildArtifact: buildApril2026AttendRecordArtifact,
            expectedHeader: "Attendance date:01/04/2026 ~30/04/2026",
            expectedTablingDate: "Tabling date:30/04/2026 23:59:59",
            dayCount: 30,
        },
        {
            label: "May 2026",
            buildArtifact: buildMay2026AttendRecordArtifact,
            expectedHeader: "Attendance date:01/05/2026 ~31/05/2026",
            expectedTablingDate: "Tabling date:31/05/2026 23:59:59",
            dayCount: 31,
        },
    ])(
        "preserves the raw AttendRecord RecordTable sheet structure and blank missing-date cells for $label",
        async ({
            buildArtifact,
            dayCount,
            expectedHeader,
            expectedTablingDate,
            label,
        }) => {
            const tempDir = await mkdtemp(
                path.join(os.tmpdir(), `${label.toLowerCase().replace(/\s+/g, "-")}-`),
            );
            const workbookPath = path.join(tempDir, "generated-attendrecord.xls");
            const handoffPath = path.join(tempDir, "attendrecord-handoff.json");
            const artifact = withWorkbookPath(
                buildArtifact(buildWorkerHandoff()),
                workbookPath,
            );

            try {
                await writeAttendRecordArtifacts(artifact, handoffPath);

                const workbook = XLSX.readFile(workbookPath);
                const recordTableSheet = workbook.Sheets.RecordTable;

                expect(recordTableSheet).toBeDefined();

                const rows = XLSX.utils.sheet_to_json(recordTableSheet!, {
                    header: 1,
                    blankrows: true,
                    raw: false,
                    defval: "",
                }) as string[][];

                expect(rows[0]?.[0]).toBe(expectedHeader);
                expect(rows[1]?.[0]).toBe(expectedTablingDate);

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
                        ...Array.from({ length: dayCount }, (_, dayIndex) =>
                            String(dayIndex + 1),
                        ),
                    ]);
                    expect(
                        spacerRow === undefined ||
                            spacerRow.every((cell) => cell === ""),
                    ).toBe(true);

                    for (const missingDate of worker.missingDates) {
                        const dayIndex =
                            Number.parseInt(missingDate.slice(-2), 10) - 1;

                        expect(valuesRow?.[5 + dayIndex]).toBe("");
                    }
                }
            } finally {
                await rm(tempDir, { recursive: true, force: true });
            }
        },
    );
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
    artifact: AttendRecordArtifactHandoff,
    workbookPath: string,
): AttendRecordArtifactHandoff {
    return {
        ...artifact,
        workbookPath,
    };
}

function toIsoDate(displayDate: string): string {
    const [day, month, year] = displayDate.split("/");

    return `${year}-${month}-${day}`;
}

function expectCommonArtifactShape(
    artifact: AttendRecordArtifactHandoff,
    expected: {
        month: AttendRecordImportMonth;
        expectedRowCount: number;
        totalImportedRows: number[];
        totalHours: number[];
        missingDates: string[][];
        firstRowSignature: string;
        excludedDate: string;
    },
): void {
    expect(artifact.month).toBe(expected.month);
    expect(artifact.runId).toBe("run-123");
    expect(artifact.expectedRowCount).toBe(expected.expectedRowCount);
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
    expect(artifact.workers.map((worker) => worker.totalImportedRows)).toEqual(
        expected.totalImportedRows,
    );
    expect(artifact.workers.map((worker) => worker.totalHours)).toEqual(
        expected.totalHours,
    );
    expect(artifact.workers.map((worker) => worker.missingDates)).toEqual(
        expected.missingDates,
    );

    for (const worker of artifact.workers) {
        expect(worker.totalHours).toBeGreaterThan(270);
        expect(worker.workerAlias).not.toBe(worker.workerName);
        expect(worker.entries).toHaveLength(worker.totalImportedRows);
        expect(
            worker.entries.every((entry) => entry.workerAlias === worker.workerAlias),
        ).toBe(true);
        expect(
            worker.entries.every((entry) => entry.aliasUserId === worker.aliasUserId),
        ).toBe(true);
        expect(
            worker.entries.every((entry) => entry.workerName === worker.workerName),
        ).toBe(true);
    }

    expect(artifact.workers[0]?.entries[0]?.rowSignature).toBe(
        expected.firstRowSignature,
    );
    expect(
        artifact.workers[0]?.entries.some(
            (entry) => entry.dateIn === expected.excludedDate,
        ),
    ).toBe(false);

    expectMissingDateCoverage(artifact);
}

function expectMissingDateCoverage(artifact: AttendRecordArtifactHandoff): void {
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
