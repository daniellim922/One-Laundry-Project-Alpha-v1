/**
 * Deterministic quarterly advance cohort for the settled historical payroll seed window.
 * workerName is resolved to workerId when seeding.
 */

import { isForeignFullTimeWorker } from "./minimum-hours";
import { settledHistoricalPayrollSeedPeriods } from "./periods";
import {
    getSeedAdvanceRequestStatus,
    getSeedInstallmentStatus,
} from "./settlement-state";
import { workers } from "./workers";

const ADVANCE_COHORT_SIZE = 5;
const QUARTERLY_ADVANCE_AMOUNT = 300;
const QUARTERLY_ADVANCE_INSTALLMENT_AMOUNT = QUARTERLY_ADVANCE_AMOUNT / 3;
const advanceSeedPeriods = settledHistoricalPayrollSeedPeriods;

const ADVANCE_PURPOSE_BY_QUARTER = [
    "Family support expenses",
    "Housing deposit support",
    "Renewal fee buffer",
    "School fee support",
] as const;

const quarterlyAdvanceCohortWorkerIndexes = workers
    .map((worker, workerIndex) => ({ worker, workerIndex }))
    .filter(({ worker }) => isForeignFullTimeWorker(worker))
    .slice(0, ADVANCE_COHORT_SIZE)
    .map(({ workerIndex }) => workerIndex);

type SeedAdvanceInstallment = {
    installmentAmt: number;
    installmentDate: string;
    status: "Installment Loan" | "Installment Paid";
};

type SeedAdvanceRequest = {
    workerIndex: number;
    workerName: string;
    amount: number;
    status: "Advance Loan" | "Advance Paid";
    dateRequested: string;
    purpose: string;
    repaymentTerms: SeedAdvanceInstallment[];
};

type Quarter = {
    periods: (typeof advanceSeedPeriods)[number][];
    quarterIndex: number;
};

function chunkPeriodsIntoQuarters(): Quarter[] {
    const quarters: Quarter[] = [];

    for (let index = 0; index < advanceSeedPeriods.length; index += 3) {
        quarters.push({
            periods: advanceSeedPeriods.slice(index, index + 3),
            quarterIndex: index / 3,
        });
    }

    return quarters;
}

function getQuarterlyAdvancePurpose(quarterIndex: number): string {
    return ADVANCE_PURPOSE_BY_QUARTER[
        quarterIndex % ADVANCE_PURPOSE_BY_QUARTER.length
    ]!;
}

export function getAdvanceDeductionForWorkerPeriod(
    workerIndex: number,
    periodStart: string,
): number {
    return advances
        .filter(
            (advance) =>
                advance.workerIndex === workerIndex &&
                advance.repaymentTerms.some((term) =>
                    term.installmentDate.startsWith(periodStart.slice(0, 7)),
                ),
        )
        .reduce((sum, advance) => {
            const installment = advance.repaymentTerms.find((term) =>
                term.installmentDate.startsWith(periodStart.slice(0, 7)),
            );

            return sum + (installment?.installmentAmt ?? 0);
        }, 0);
}

function generateAdvances(): SeedAdvanceRequest[] {
    return chunkPeriodsIntoQuarters().flatMap(({ periods, quarterIndex }) =>
        quarterlyAdvanceCohortWorkerIndexes.map((workerIndex) => {
            const worker = workers[workerIndex]!;
            const repaymentTerms = periods.map((period) => ({
                installmentAmt: QUARTERLY_ADVANCE_INSTALLMENT_AMOUNT,
                installmentDate: `${period.key}-10`,
                status: getSeedInstallmentStatus(period),
            }));

            return {
                workerIndex,
                workerName: worker.name,
                amount: QUARTERLY_ADVANCE_AMOUNT,
                status: getSeedAdvanceRequestStatus(
                    repaymentTerms.map((term) => term.status),
                ),
                dateRequested: `${periods[0]!.key}-05`,
                purpose: getQuarterlyAdvancePurpose(quarterIndex),
                repaymentTerms,
            };
        }),
    );
}

export const advances = generateAdvances();
