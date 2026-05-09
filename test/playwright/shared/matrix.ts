import fs from "node:fs";
import path from "node:path";

import type { WorkerUpsertFormInput } from "@/db/schemas/worker-employment";
import { dateToLocalIsoYmd, isoToDmy } from "@/utils/time/calendar-date";

/** Persisted between worker-create → read → delete → update Playwright projects. */
const MATRIX_E2E_STATE_FILENAME = ".matrix-e2e-state.json" as const;

export function workerMatrixE2EStatePath(): string {
    return path.join(
        process.cwd(),
        "test/playwright/workers",
        MATRIX_E2E_STATE_FILENAME,
    );
}

/** Resolved matrix row passed to create form (crypto NRIC per row; omit status → Active). */
export type WorkerMatrixE2EProfileForCreate = Omit<WorkerUpsertFormInput, "status">;

export type WorkerMatrixE2EPersistedRecord = {
    name: string;
    nric: string;
    profile: WorkerMatrixE2EProfileForCreate;
};

export type WorkerMatrixE2EStateFile = {
    runSuffix: string;
    records: WorkerMatrixE2EPersistedRecord[];
};

export function writeWorkerMatrixE2EState(payload: WorkerMatrixE2EStateFile): void {
    const target = workerMatrixE2EStatePath();
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

export function readWorkerMatrixE2EState(): WorkerMatrixE2EStateFile {
    const target = workerMatrixE2EStatePath();
    if (!fs.existsSync(target)) {
        throw new Error(
            `Missing worker matrix E2E state at ${target}. Run worker-create.spec.ts first.`,
        );
    }
    const raw = fs.readFileSync(target, "utf-8");
    return JSON.parse(raw) as WorkerMatrixE2EStateFile;
}

/** ISO calendar date `YYYY-MM-DD` shifted by whole months in local time. */
export function addCalendarMonthsIso(baseIso: string, deltaMonths: number): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(baseIso.trim());
    if (!match) {
        throw new Error(`Invalid ISO date: ${baseIso}`);
    }
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const base = new Date(y, m - 1, d);
    base.setMonth(base.getMonth() + deltaMonths);
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, "0");
    const dd = String(base.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export function todayIsoLocal(): string {
    return dateToLocalIsoYmd();
}

/** DD/MM/YYYY display derived from ISO calendar date. */
export function isoToDisplayDmy(iso: string): string {
    return isoToDmy(iso);
}
