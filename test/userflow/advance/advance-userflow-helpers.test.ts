import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
    ADVANCE_USERFLOW_HANDOFF_PATH,
    buildAdvancePurposeTag,
    buildAdvanceUserflowHandoff,
    computeEarliestValidAdvanceAnchor,
    readWorkerUserflowHandoffForAdvances,
    writeAdvanceUserflowHandoff,
    type AdvanceUserflowHandoff,
} from "./advance-userflow-helpers";
import {
    WORKER_USERFLOW_PERMUTATIONS,
    type WorkerUserflowHandoff,
} from "../workers/worker-userflow-helpers";

describe("advance-userflow-helpers", () => {
    it("fails clearly when the worker handoff file is missing", async () => {
        const missingPath = path.join(
            os.tmpdir(),
            `missing-worker-handoff-${Date.now()}.json`,
        );

        await expect(
            readWorkerUserflowHandoffForAdvances(missingPath),
        ).rejects.toThrow(
            `Worker userflow handoff file is missing at ${missingPath}. Run test/userflow/workers/01-worker-new-userflow.spec.ts first.`,
        );
    });

    it("computes one shared future anchor from the supplied run date", () => {
        expect(computeEarliestValidAdvanceAnchor("2026-04-19")).toBe("2026-04-20");
    });

    it("builds the fixed worker-to-scenario mapping in canonical permutation order", () => {
        const reversedHandoff: WorkerUserflowHandoff = {
            runId: "run-123",
            workers: [...buildWorkerHandoff().workers].reverse(),
        };

        const handoff = buildAdvanceUserflowHandoff(reversedHandoff, {
            todayDate: "2026-04-19",
        });

        expect(handoff.anchor).toEqual({
            todayDate: "2026-04-19",
            anchorDate: "2026-04-20",
        });
        expect(handoff.scenarios.map((scenario) => scenario.permutationKey)).toEqual(
            WORKER_USERFLOW_PERMUTATIONS.map((permutation) => permutation.key),
        );
        expect(handoff.scenarios.map((scenario) => scenario.scenarioKey)).toEqual([
            "single-installment",
            "two-installment",
            "three-installment",
            "chained-two-request",
        ]);
    });

    it("derives deterministic request payloads, purpose tags, and installment schedules", () => {
        const handoff = buildAdvanceUserflowHandoff(buildWorkerHandoff(), {
            todayDate: "2026-04-19",
        });

        const flattenedRequests = handoff.scenarios.flatMap((scenario) =>
            scenario.requests.map((request) => ({
                scenarioKey: scenario.scenarioKey,
                requestKey: request.requestKey,
                requestDate: request.requestDate,
                amountRequested: request.amountRequested,
                purpose: request.purpose,
                advanceRequestId: request.advanceRequestId,
                installments: request.installmentAmounts.map((installment) => ({
                    amount: installment.amount,
                    repaymentDate: installment.repaymentDate,
                    status: installment.status,
                })),
            })),
        );

        expect(flattenedRequests).toEqual([
            {
                scenarioKey: "single-installment",
                requestKey: "single-installment-request",
                requestDate: "2026-04-20",
                amountRequested: 180,
                purpose: buildAdvancePurposeTag(
                    "run-123",
                    "single-installment",
                    "single-installment-request",
                ),
                advanceRequestId: null,
                installments: [
                    {
                        amount: 180,
                        repaymentDate: "2026-04-27",
                        status: "Installment Loan",
                    },
                ],
            },
            {
                scenarioKey: "two-installment",
                requestKey: "two-installment-request",
                requestDate: "2026-04-20",
                amountRequested: 320,
                purpose: buildAdvancePurposeTag(
                    "run-123",
                    "two-installment",
                    "two-installment-request",
                ),
                advanceRequestId: null,
                installments: [
                    {
                        amount: 160,
                        repaymentDate: "2026-04-27",
                        status: "Installment Loan",
                    },
                    {
                        amount: 160,
                        repaymentDate: "2026-05-11",
                        status: "Installment Loan",
                    },
                ],
            },
            {
                scenarioKey: "three-installment",
                requestKey: "three-installment-request",
                requestDate: "2026-04-20",
                amountRequested: 450,
                purpose: buildAdvancePurposeTag(
                    "run-123",
                    "three-installment",
                    "three-installment-request",
                ),
                advanceRequestId: null,
                installments: [
                    {
                        amount: 150,
                        repaymentDate: "2026-04-27",
                        status: "Installment Loan",
                    },
                    {
                        amount: 150,
                        repaymentDate: "2026-05-11",
                        status: "Installment Loan",
                    },
                    {
                        amount: 150,
                        repaymentDate: "2026-05-25",
                        status: "Installment Loan",
                    },
                ],
            },
            {
                scenarioKey: "chained-two-request",
                requestKey: "chained-request-1",
                requestDate: "2026-04-20",
                amountRequested: 240,
                purpose: buildAdvancePurposeTag(
                    "run-123",
                    "chained-two-request",
                    "chained-request-1",
                ),
                advanceRequestId: null,
                installments: [
                    {
                        amount: 120,
                        repaymentDate: "2026-04-27",
                        status: "Installment Loan",
                    },
                    {
                        amount: 120,
                        repaymentDate: "2026-05-11",
                        status: "Installment Loan",
                    },
                ],
            },
            {
                scenarioKey: "chained-two-request",
                requestKey: "chained-request-2",
                requestDate: "2026-05-18",
                amountRequested: 180,
                purpose: buildAdvancePurposeTag(
                    "run-123",
                    "chained-two-request",
                    "chained-request-2",
                ),
                advanceRequestId: null,
                installments: [
                    {
                        amount: 90,
                        repaymentDate: "2026-05-25",
                        status: "Installment Loan",
                    },
                    {
                        amount: 90,
                        repaymentDate: "2026-06-08",
                        status: "Installment Loan",
                    },
                ],
            },
        ]);
    });

    it("writes a reusable advance handoff artifact", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "advance-userflow-"));
        const handoffPath = path.join(tempDir, path.basename(ADVANCE_USERFLOW_HANDOFF_PATH));
        const handoff: AdvanceUserflowHandoff = buildAdvanceUserflowHandoff(
            buildWorkerHandoff(),
            {
                todayDate: "2026-04-19",
            },
        );

        try {
            await writeAdvanceUserflowHandoff(handoff, handoffPath);

            const written = JSON.parse(
                await readFile(handoffPath, "utf8"),
            ) as AdvanceUserflowHandoff;

            expect(written).toEqual(handoff);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("fails clearly when the worker handoff is invalid", async () => {
        const tempDir = await mkdtemp(
            path.join(os.tmpdir(), "advance-userflow-invalid-"),
        );
        const handoffPath = path.join(tempDir, "worker-userflow-handoff.json");

        try {
            await writeFile(
                handoffPath,
                JSON.stringify({
                    runId: "run-1",
                    workers: [{ permutationKey: "unknown", workerId: "123" }],
                }),
                "utf8",
            );

            await expect(
                readWorkerUserflowHandoffForAdvances(handoffPath),
            ).rejects.toThrow(/unknown permutationKey/);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});

function buildWorkerHandoff(): WorkerUserflowHandoff {
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
