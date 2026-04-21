import { expect, test, type Page } from "@playwright/test";
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

function payrollGenerateForm(page: Page) {
    /** Payroll form on `/dashboard/payroll/new` — not `form.first()` because `main` includes the header logout `<form>`. */
    return page
        .locator("form")
        .filter({ has: page.locator("#periodStart") });
}

/** Submit without a synthetic pointer event (avoids stuck `click()` when overlays intercept hits on the Generate button). */
async function submitPayrollGenerateForm(page: Page) {
    await payrollGenerateForm(page).evaluate((el) =>
        (el as HTMLFormElement).requestSubmit(),
    );
}

async function selectFirstWorkerOrSkip(page: Page) {
    const checkbox = payrollGenerateForm(page)
        .locator(
            "button[role='checkbox'][aria-label^='Select ']:not([aria-label*='all'])",
        )
        .first();
    try {
        await expect(checkbox).toBeVisible({ timeout: 20_000 });
    } catch {
        test.skip(true, NO_WORKERS_SKIP_REASON);
    }
    await expect(checkbox).toBeEnabled();
    await checkbox.click();
}

function isoCalendarToDmy(iso: string): string {
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
}

/** Ensures the first payroll is visible on `/dashboard/payroll/all` before overlap generation (avoids racing the DB). */
async function waitForBasePeriodPayrollOnAllPage(page: Page) {
    await page.goto("/dashboard/payroll/all");
    await expect(
        page.getByRole("heading", { name: "All payrolls" }),
    ).toBeVisible();

    const baseStartDmy = isoCalendarToDmy(BASE_PERIOD.periodStart);
    const baseEndDmy = isoCalendarToDmy(BASE_PERIOD.periodEnd);
    await expect(
        page.getByRole("cell", { name: baseStartDmy }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
        page.getByRole("cell", { name: baseEndDmy }).first(),
    ).toBeVisible({ timeout: 60_000 });
}

async function fillPayrollDates(
    page: Page,
    input: { periodStart: string; periodEnd: string; payrollDate: string },
) {
    /** DatePickerInput expects DD/MM/YYYY. Targets `#periodStart` / `#periodEnd` / `#payrollDate` from `payroll-form.tsx`. */
    const form = payrollGenerateForm(page);
    await form
        .locator("#periodStart")
        .fill(isoCalendarToDmy(input.periodStart), { force: true });
    await form
        .locator("#periodEnd")
        .fill(isoCalendarToDmy(input.periodEnd), { force: true });
    await form
        .locator("#payrollDate")
        .fill(isoCalendarToDmy(input.payrollDate), { force: true });
}

test.describe("Payroll overlap prevention", () => {
    test("blocks overlapping payroll generation for the same worker", async ({
        page,
    }) => {
        await page.goto("/dashboard/payroll/new");
        await expect(
            page.getByRole("heading", { name: "Generate payroll" }),
        ).toBeVisible();
        await expect(
            payrollGenerateForm(page).locator("#periodStart"),
        ).toBeEditable({ timeout: 30_000 });

        await fillPayrollDates(page, BASE_PERIOD);
        await selectFirstWorkerOrSkip(page);
        await submitPayrollGenerateForm(page);

        await waitForBasePeriodPayrollOnAllPage(page);

        await page.goto("/dashboard/payroll/new");
        await expect(
            page.getByRole("heading", { name: "Generate payroll" }),
        ).toBeVisible();
        await expect(
            payrollGenerateForm(page).locator("#periodStart"),
        ).toBeEditable({ timeout: 30_000 });

        await fillPayrollDates(page, OVERLAP_PERIOD);
        await selectFirstWorkerOrSkip(page);
        await submitPayrollGenerateForm(page);

        await expect(page).toHaveURL(/\/dashboard\/payroll\/new$/);
        await expect(page.getByText(/skipped due to overlap/i)).toBeVisible({
            timeout: 15_000,
        });
        await expect(
            page.getByRole("cell", { name: "01/01/2099" }).first(),
        ).toBeVisible();
        await expect(
            page.getByRole("cell", { name: "31/01/2099" }).first(),
        ).toBeVisible();
    });
});
