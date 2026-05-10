import { expect, test, type Page } from "@playwright/test";

import {
    readWorkerMatrixE2EState,
    type WorkerMatrixE2EProfileForCreate,
} from "../shared/matrix";
import type { WorkerStatus } from "@/types/status";

const WORKER_E2E_DEFAULT_TABLE_STATUS =
    "Active" as const satisfies WorkerStatus;

function mainTableRowByText(page: Page, text: string) {
    return page
        .getByRole("main")
        .getByRole("row")
        .filter({ hasText: text });
}

function workerTableRow(page: Page, workerName: string) {
    return mainTableRowByText(page, workerName);
}

function workerTableMoneyCellFromJsonAmount(amount: string | number): string {
    return `$${Number(amount)}`;
}

function workerTableMinimumHoursCellFromJson(hours: string | number): string {
    return `${Number(hours)}h`;
}

function nonEmptyMoneyOrHoursField(
    value: string | number | null | undefined,
): string | null {
    if (value == null) return null;
    const s = typeof value === "number" ? String(value) : value.trim();
    return s.length > 0 ? s : null;
}

async function gotoAllWorkers(page: Page): Promise<void> {
    await page.goto("/dashboard/worker/all");
    await page.getByRole("heading", { name: "All workers" }).waitFor();
}

async function expectWorkerMatrixRowMatchesCreatedProfile(
    page: Page,
    profile: WorkerMatrixE2EProfileForCreate,
): Promise<void> {
    const row = workerTableRow(page, profile.name);
    await expect(row).toBeVisible();
    await expect(row).toContainText(WORKER_E2E_DEFAULT_TABLE_STATUS);
    expect(profile.shiftPattern).toBeTruthy();
    expect(profile.employmentType).toBeTruthy();
    expect(profile.employmentArrangement).toBeTruthy();
    expect(profile.paymentMethod).toBeTruthy();

    await expect(row).toContainText(profile.shiftPattern!);
    await expect(row).toContainText(profile.employmentType!);
    await expect(row).toContainText(profile.employmentArrangement!);
    await expect(row).toContainText(profile.paymentMethod!);

    const monthlyPay = nonEmptyMoneyOrHoursField(profile.monthlyPay);
    if (monthlyPay != null) {
        await expect(row).toContainText(
            workerTableMoneyCellFromJsonAmount(monthlyPay),
        );
    }
    const hourlyRate = nonEmptyMoneyOrHoursField(profile.hourlyRate);
    if (hourlyRate != null) {
        await expect(row).toContainText(
            workerTableMoneyCellFromJsonAmount(hourlyRate),
        );
    }
    const minimumWorkingHours = nonEmptyMoneyOrHoursField(
        profile.minimumWorkingHours,
    );
    if (minimumWorkingHours != null) {
        await expect(row).toContainText(
            workerTableMinimumHoursCellFromJson(minimumWorkingHours),
        );
    }
}

test.describe.configure({ mode: "serial" });

test.describe("Worker matrix read", () => {
    test("workers.json matrix: rows match persisted creates", async ({
        page,
    }) => {
        test.setTimeout(180_000);
        const { records } = readWorkerMatrixE2EState();

        await gotoAllWorkers(page);

        for (const record of records) {
            await expectWorkerMatrixRowMatchesCreatedProfile(
                page,
                record.profile,
            );
        }
    });
});
