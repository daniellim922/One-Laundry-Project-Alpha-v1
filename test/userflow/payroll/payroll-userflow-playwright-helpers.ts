import { expect, type Locator, type Page } from "@playwright/test";

import type {
    PayrollMonthExecutionPlan,
    PayrollMonthPeriod,
    PayrollUserflowWorker,
} from "./payroll-userflow-helpers";

export async function createPayrollForMonthThroughUi(
    page: Page,
    plan: PayrollMonthExecutionPlan,
): Promise<void> {
    await page.goto("/dashboard/payroll/new");
    await expect(
        page.getByRole("heading", { name: "Generate payroll" }),
    ).toBeVisible();

    await fillPayrollCreatePeriod(page, plan.period);
    await selectWorkersFromArtifactByCurrentName(page, plan);

    await expect(
        page.getByText(`${plan.workerRows.length} workers selected`, {
            exact: true,
        }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Generate", exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard\/payroll\/all(?:\?.*)?$/);
    await expect(
        page.getByRole("heading", { name: "All payrolls" }),
    ).toBeVisible();
}

export async function verifyPayrollMonthRowsInAllPayrollsUi(
    page: Page,
    plan: PayrollMonthExecutionPlan,
): Promise<Array<PayrollUserflowWorker["payrollByMonth"][string] & { workerId: string }>> {
    const createdRows: Array<
        PayrollUserflowWorker["payrollByMonth"][string] & { workerId: string }
    > = [];

    await page.goto("/dashboard/payroll/all");
    await expect(
        page.getByRole("heading", { name: "All payrolls" }),
    ).toBeVisible();

    for (const worker of plan.workerRows) {
        const searchInput = getPayrollSearchInput(page);
        await searchInput.fill(worker.workerName);

        const matchingRows = await findPayrollRowsForWorker(page, worker.workerName, plan.period);

        if (matchingRows.length === 0) {
            throw new Error(
                `Missing payroll row for ${worker.workerName} (${buildExpectedPayrollRowSignature(worker.workerName, plan.period)}).`,
            );
        }

        if (matchingRows.length > 1) {
            throw new Error(
                `Duplicate payroll rows found for ${worker.workerName} (${buildExpectedPayrollRowSignature(worker.workerName, plan.period)}).`,
            );
        }

        const payrollId = await readPayrollIdFromRowActions(page, matchingRows[0]!);

        createdRows.push({
            workerId: worker.workerId,
            payrollId,
            status: "Draft",
        });
    }

    return createdRows;
}

async function selectWorkersFromArtifactByCurrentName(
    page: Page,
    plan: PayrollMonthExecutionPlan,
): Promise<void> {
    const searchInput = getPayrollSearchInput(page);

    for (const worker of plan.workerRows) {
        await searchInput.fill(worker.workerName);

        const rows = await getRowsByWorkerName(page, worker.workerName);

        if (rows.length === 0) {
            throw new Error(
                `Worker ${worker.workerName} is not selectable on /dashboard/payroll/new.`,
            );
        }

        if (rows.length > 1) {
            throw new Error(
                `Worker ${worker.workerName} appears multiple times on /dashboard/payroll/new.`,
            );
        }

        const row = rows[0]!;
        const checkbox = row.getByRole("checkbox", {
            name: `Select ${worker.workerName}`,
            exact: true,
        });

        await expect(checkbox).toBeVisible();
        await checkbox.click();
        await expect(checkbox).toHaveAttribute("aria-checked", "true");
    }

    await searchInput.clear();
}

async function fillPayrollCreatePeriod(
    page: Page,
    period: PayrollMonthPeriod,
): Promise<void> {
    await page.getByLabel("Period start").fill(toDisplayDate(period.periodStart));
    await page.getByLabel("Period end").fill(toDisplayDate(period.periodEnd));
    await page.getByLabel("Payroll date").fill(toDisplayDate(period.payrollDate));
}

async function getRowsByWorkerName(page: Page, workerName: string): Promise<Locator[]> {
    const rows = getPayrollTable(page).locator("tbody tr");
    const rowCount = await rows.count();
    const matchingRows: Locator[] = [];

    for (let index = 0; index < rowCount; index += 1) {
        const row = rows.nth(index);
        const workerCell = row.getByRole("cell", { name: workerName, exact: true });

        if ((await workerCell.count()) > 0) {
            matchingRows.push(row);
        }
    }

    return matchingRows;
}

async function findPayrollRowsForWorker(
    page: Page,
    workerName: string,
    period: PayrollMonthPeriod,
): Promise<Locator[]> {
    const expectedSignature = buildExpectedPayrollRowSignature(workerName, period);
    const matches: Locator[] = [];

    for (;;) {
        const rows = getPayrollTable(page).locator("tbody tr");
        const rowCount = await rows.count();

        for (let index = 0; index < rowCount; index += 1) {
            const row = rows.nth(index);
            const signature = await readPayrollRowSignature(row);

            if (signature === expectedSignature) {
                matches.push(row);
            }
        }

        const nextButton = getNextPaginationButton(page);
        if ((await nextButton.count()) === 0 || (await nextButton.isDisabled())) {
            return matches;
        }

        await nextButton.click();
    }
}

async function readPayrollRowSignature(row: Locator): Promise<string> {
    const cells = await row.locator("td").allTextContents();

    return cells.slice(0, 5).map((cell) => cell.trim()).join(" | ");
}

function buildExpectedPayrollRowSignature(
    workerName: string,
    period: PayrollMonthPeriod,
): string {
    return [
        workerName,
        "Draft",
        toDisplayDate(period.payrollDate),
        toDisplayDate(period.periodStart),
        toDisplayDate(period.periodEnd),
    ].join(" | ");
}

async function readPayrollIdFromRowActions(page: Page, row: Locator): Promise<string> {
    await row.getByRole("button", { name: "Open row actions" }).click();

    const viewItem = page
        .locator('[data-slot="dropdown-menu-content"][data-state="open"]')
        .getByRole("menuitem", { name: "View" });
    const href = await viewItem.getAttribute("href");

    if (!href) {
        throw new Error("Payroll row action is missing View href.");
    }

    await page.keyboard.press("Escape");

    const match = href.match(/\/dashboard\/payroll\/([0-9a-f-]+)\/breakdown$/i);
    const payrollId = match?.[1] ?? "";

    if (!payrollId) {
        throw new Error(`Unable to parse payrollId from href ${href}.`);
    }

    return payrollId;
}

function getPayrollSearchInput(page: Page): Locator {
    return page.getByRole("main").getByPlaceholder("Search...");
}

function getPayrollTable(page: Page): Locator {
    return page.getByRole("main").getByRole("table");
}

function getNextPaginationButton(page: Page): Locator {
    return page.getByRole("main").getByRole("button", {
        name: "Next",
        exact: true,
    });
}

function toDisplayDate(isoDate: string): string {
    const [year, month, day] = isoDate.split("-");

    return `${day}/${month}/${year}`;
}
