import { describe, expect, it } from "vitest";

import { resolveTimesheetImportWorkerMatches } from "./worker-matching";

const workers = [
    {
        id: "worker-1",
        name: "Alice Tan",
        status: "Active" as const,
        shiftPattern: "Day Shift" as const,
    },
    {
        id: "worker-2",
        name: "Bob Lim",
        status: "Active" as const,
        shiftPattern: "Day Shift" as const,
    },
    {
        id: "worker-3",
        name: "Chen Wei",
        status: "Inactive" as const,
        shiftPattern: "Day Shift" as const,
    },
];

describe("resolveTimesheetImportWorkerMatches", () => {
    it("automatically resolves imported worker names by trimmed, case-insensitive exact active worker matches", () => {
        const result = resolveTimesheetImportWorkerMatches({
            rows: [
                { workerName: "  alice tan " },
                { workerName: "BOB LIM" },
            ],
            workers,
        });

        expect(result.unresolvedNames).toEqual([]);
        expect(result.groups).toEqual([
            {
                importedName: "  alice tan ",
                rowCount: 1,
                resolvedWorker: workers[0],
            },
            {
                importedName: "BOB LIM",
                rowCount: 1,
                resolvedWorker: workers[1],
            },
        ]);
    });

    it("reports imported worker names that do not match an active worker as unresolved", () => {
        const result = resolveTimesheetImportWorkerMatches({
            rows: [
                { workerName: "Alice Tan" },
                { workerName: "Unknown Worker" },
                { workerName: "Unknown Worker" },
            ],
            workers,
        });

        expect(result.unresolvedNames).toEqual(["Unknown Worker"]);
        expect(result.groups).toEqual([
            {
                importedName: "Alice Tan",
                rowCount: 1,
                resolvedWorker: workers[0],
            },
            {
                importedName: "Unknown Worker",
                rowCount: 2,
                resolvedWorker: null,
            },
        ]);
    });

    it("does not resolve imported names against inactive workers", () => {
        const result = resolveTimesheetImportWorkerMatches({
            rows: [{ workerName: "Chen Wei" }],
            workers,
        });

        expect(result.unresolvedNames).toEqual(["Chen Wei"]);
        expect(result.groups).toEqual([
            {
                importedName: "Chen Wei",
                rowCount: 1,
                resolvedWorker: null,
            },
        ]);
    });

    it("uses a manual active worker match for every row with the same imported name", () => {
        const result = resolveTimesheetImportWorkerMatches({
            rows: [
                { workerName: "Alicia Tan" },
                { workerName: "Alicia Tan" },
            ],
            workers,
            manualMatchesByImportedName: {
                "Alicia Tan": "worker-1",
            },
        });

        expect(result.unresolvedNames).toEqual([]);
        expect(result.groups).toEqual([
            {
                importedName: "Alicia Tan",
                rowCount: 2,
                resolvedWorker: workers[0],
            },
        ]);
    });

    it("does not resolve manual matches to inactive workers", () => {
        const result = resolveTimesheetImportWorkerMatches({
            rows: [{ workerName: "Wei Chen" }],
            workers,
            manualMatchesByImportedName: {
                "Wei Chen": "worker-3",
            },
        });

        expect(result.unresolvedNames).toEqual(["Wei Chen"]);
        expect(result.groups).toEqual([
            {
                importedName: "Wei Chen",
                rowCount: 1,
                resolvedWorker: null,
            },
        ]);
    });

    it("allows multiple imported worker names to resolve to the same active worker", () => {
        const result = resolveTimesheetImportWorkerMatches({
            rows: [
                { workerName: "Alicia Tan" },
                { workerName: "Alice T." },
            ],
            workers,
            manualMatchesByImportedName: {
                "Alicia Tan": "worker-1",
                "Alice T.": "worker-1",
            },
        });

        expect(result.unresolvedNames).toEqual([]);
        expect(result.groups).toEqual([
            {
                importedName: "Alicia Tan",
                rowCount: 1,
                resolvedWorker: workers[0],
            },
            {
                importedName: "Alice T.",
                rowCount: 1,
                resolvedWorker: workers[0],
            },
        ]);
    });

    it("does not keep an unresolved blocker for an imported name with no remaining rows", () => {
        const result = resolveTimesheetImportWorkerMatches({
            rows: [{ workerName: "Alice Tan" }],
            workers,
            manualMatchesByImportedName: {
                "Unknown Worker": "worker-1",
            },
        });

        expect(result.unresolvedNames).toEqual([]);
        expect(result.groups).toEqual([
            {
                importedName: "Alice Tan",
                rowCount: 1,
                resolvedWorker: workers[0],
            },
        ]);
    });
});
