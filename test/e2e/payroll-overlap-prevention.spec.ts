import { expect, test, type Page } from "@playwright/test";

const NOT_AUTHENTICATED_SKIP_REASON =
    "Not authenticated (auth setup did not produce a valid session). Configure DB/env and re-run e2e.";
const NO_WORKERS_SKIP_REASON =
    "No worker rows available to generate payroll. Seed workers and re-run e2e.";

const BASE_PERIOD = {
    periodStart: "2099-01-01",
    periodEnd: "2099-01-31",
    payrollDate: "2099-02-05",
};

const OVERLAP_PERIOD = {
    periodStart: "2099-01-15",
    periodEnd: "2099-02-15",
    payrollDate: "2099-02-20",
};

function requireAuthenticatedOrSkip(page: { url(): string }) {
    if (page.url().includes("/login")) {
        test.skip(true, NOT_AUTHENTICATED_SKIP_REASON);
    }
}

async function selectFirstWorkerOrSkip(page: Page) {
    const checkbox = page
        .locator(
            "button[role='checkbox'][aria-label^='Select ']:not([aria-label*='all'])",
        )
        .first();
    try {
        await expect(checkbox).toBeVisible({ timeout: 20_000 });
    } catch {
        test.skip(true, NO_WORKERS_SKIP_REASON);
    }
    await checkbox.click();
}

function isoCalendarToDmy(iso: string): string {
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
}

async function fillPayrollDates(
    page: Page,
    input: { periodStart: string; periodEnd: string; payrollDate: string },
) {
    /** DatePickerInput masks DD/MM/YYYY; raw ISO digit-strips incorrectly. */
    await page
        .getByLabel("Period start")
        .fill(isoCalendarToDmy(input.periodStart));
    await page
        .getByLabel("Period end")
        .fill(isoCalendarToDmy(input.periodEnd));
    await page
        .getByLabel("Payroll date")
        .fill(isoCalendarToDmy(input.payrollDate));
}

test.describe("Payroll overlap prevention", () => {
    test("blocks overlapping payroll generation for the same worker", async ({
        page,
    }) => {
        await page.goto("/dashboard/payroll/new");
        requireAuthenticatedOrSkip(page);
        await expect(
            page.getByRole("heading", { name: "Generate payroll" }),
        ).toBeVisible();

        await fillPayrollDates(page, BASE_PERIOD);
        await selectFirstWorkerOrSkip(page);
        await page.getByRole("button", { name: "Generate" }).click();

        if (page.url().includes("/dashboard/payroll/all")) {
            await expect(
                page.getByRole("heading", { name: "All payrolls" }),
            ).toBeVisible();
        } else {
            await expect(page).toHaveURL(/\/dashboard\/payroll\/new$/);
        }

        await page.goto("/dashboard/payroll/new");
        requireAuthenticatedOrSkip(page);
        await expect(
            page.getByRole("heading", { name: "Generate payroll" }),
        ).toBeVisible();

        await fillPayrollDates(page, OVERLAP_PERIOD);
        await selectFirstWorkerOrSkip(page);
        await page.getByRole("button", { name: "Generate" }).click();

        await expect(page).toHaveURL(/\/dashboard\/payroll\/new$/);
        await expect(page.getByText(/skipped due to overlap/i)).toBeVisible();
        await expect(
            page.getByRole("cell", { name: "01/01/2099" }).first(),
        ).toBeVisible();
        await expect(
            page.getByRole("cell", { name: "31/01/2099" }).first(),
        ).toBeVisible();
    });
});
