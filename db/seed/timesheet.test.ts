import { describe, expect, it } from "vitest";

import { timesheets } from "./timesheet";
import { workers } from "./workers";
import { seedPeriods } from "./periods";
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
