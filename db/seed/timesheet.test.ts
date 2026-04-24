import { describe, expect, it, vi } from "vitest";

import { timesheets } from "./timesheet";
import { workers } from "./workers";
import {
    openTimesheetSeedPeriods,
    seedPeriods,
    settledHistoricalPayrollSeedPeriods,
} from "./periods";
import { isLocalFullTimeWorker } from "./minimum-hours";

const EXCEPTION_LOCAL_NAMES = ["ALVIS ONG THAI YING", "ONG CHONG WEE"];

describe("timesheet Local FT filtering", () => {
    it("excludes Local FT workers except Alvis Ong and Ong Chong Wee from timesheet generation", () => {
        const excludedLocals = workers
            .map((worker, index) => ({ worker, index }))
            .filter(
                ({ worker }) =>
                    isLocalFullTimeWorker(worker) &&
                    !EXCEPTION_LOCAL_NAMES.includes(worker.name),
            );

        expect(excludedLocals).toHaveLength(15);

        for (const { index } of excludedLocals) {
            const workerTimesheets = timesheets.filter(
                (entry) => entry.workerIndex === index,
            );
            expect(workerTimesheets).toHaveLength(0);
        }
    });

    it("still generates timesheets for Alvis Ong and Ong Chong Wee", () => {
        for (const name of EXCEPTION_LOCAL_NAMES) {
            const workerIndex = workers.findIndex((w) => w.name === name);
            expect(workerIndex).toBeGreaterThanOrEqual(0);

            const workerTimesheets = timesheets.filter(
                (entry) => entry.workerIndex === workerIndex,
            );
            expect(workerTimesheets.length).toBeGreaterThan(0);
        }
    });

    it("generates timesheets for every seeded month for exception locals", () => {
        const monthCoverage = new Set(
            timesheets.map((entry) => `${entry.workerIndex}:${entry.dateIn.slice(0, 7)}`),
        );

        for (const period of seedPeriods) {
            for (const name of EXCEPTION_LOCAL_NAMES) {
                const workerIndex = workers.findIndex((w) => w.name === name);
                expect(monthCoverage.has(`${workerIndex}:${period.key}`)).toBe(true);
            }
        }
    });

    it("does not affect Foreign FT worker timesheets", () => {
        const foreignFtWorkers = workers.filter(
            (w) =>
                w.employmentType === "Full Time" &&
                w.employmentArrangement === "Foreign Worker",
        );

        expect(foreignFtWorkers.length).toBeGreaterThan(0);

        for (const [workerIndex, worker] of workers.entries()) {
            if (
                worker.employmentType === "Full Time" &&
                worker.employmentArrangement === "Foreign Worker"
            ) {
                const workerTimesheets = timesheets.filter(
                    (entry) => entry.workerIndex === workerIndex,
                );
                expect(workerTimesheets.length).toBeGreaterThan(0);
            }
        }
    });

    it("does not affect Part-Time worker timesheets", () => {
        for (const [workerIndex, worker] of workers.entries()) {
            if (worker.employmentType === "Part Time") {
                const workerTimesheets = timesheets.filter(
                    (entry) => entry.workerIndex === workerIndex,
                );
                expect(workerTimesheets.length).toBeGreaterThan(0);
            }
        }
    });
});

describe("timesheet seed windows", () => {
    it("extends eligible worker coverage into the Jan-Mar 2026 open timesheet window as unpaid entries", () => {
        const monthCoverage = new Set(
            timesheets.map((entry) => `${entry.workerIndex}:${entry.dateIn.slice(0, 7)}`),
        );

        for (const period of [...settledHistoricalPayrollSeedPeriods, ...openTimesheetSeedPeriods]) {
            for (const [workerIndex, worker] of workers.entries()) {
                const shouldHaveTimesheets =
                    !isLocalFullTimeWorker(worker) ||
                    EXCEPTION_LOCAL_NAMES.includes(worker.name);

                if (shouldHaveTimesheets) {
                    expect(monthCoverage.has(`${workerIndex}:${period.key}`)).toBe(true);
                }
            }
        }

        const openWindowMonthKeys = new Set(
            openTimesheetSeedPeriods.map((period) => period.key),
        );

        const openWindowTimesheets = timesheets.filter((entry) =>
            openWindowMonthKeys.has(entry.dateIn.slice(0, 7)),
        );

        expect(openWindowTimesheets.length).toBeGreaterThan(0);
        expect(
            openWindowTimesheets.every(
                (entry) => entry.status === "Timesheet Unpaid",
            ),
        ).toBe(true);
        expect(
            timesheets
                .filter((entry) =>
                    settledHistoricalPayrollSeedPeriods.some(
                        (period) => period.key === entry.dateIn.slice(0, 7),
                    ),
                )
                .every((entry) => entry.status === "Timesheet Paid"),
        ).toBe(true);
    });

    it("keeps generated timesheets deterministic across repeated module evaluation", async () => {
        const firstEvaluation = structuredClone(timesheets);

        vi.resetModules();
        const { timesheets: secondEvaluation } = await import("./timesheet");

        expect(secondEvaluation).toEqual(firstEvaluation);
    });
});
