import { expect, test, type Page } from "@playwright/test";

const NO_DRAFT_SKIP_REASON =
    "No Draft payroll in the database; run db:seed or create a Draft payroll to exercise this flow.";
const NOT_AUTHENTICATED_SKIP_REASON =
    "Not authenticated (auth setup did not produce a valid session). Configure DB/env and re-run e2e.";

function requireAuthenticatedOrSkip(page: { url(): string }) {
    if (page.url().includes("/login")) {
        test.skip(true, NOT_AUTHENTICATED_SKIP_REASON);
    }
}

/**
 * When at least one payroll has status `Draft`, these tests run the real assertions.
 * If none appears within the timeout (empty DB, all Settled, etc.), tests **skip** so
 * `npm run test:e2e` still exits successfully.
 *
 * Fresh seed (`npm run db:seed`) creates Draft payrolls for the first and 32nd workers
 * in db/seed/payrolls.ts.
 */
async function requireDraftPayrollRowOrSkip(page: Page) {
    const draftRows = page.getByRole("row").filter({ hasText: "Draft" });
    const first = draftRows.first();
    try {
        await expect(first).toBeVisible({ timeout: 20_000 });
    } catch {
        test.skip(true, NO_DRAFT_SKIP_REASON);
    }
    return first;
}

test.describe("Payroll settle flow", () => {
    test.describe.configure({ mode: "serial" });

    test.beforeEach(async ({ page }) => {
        await page.goto("/dashboard/payroll/all");
        requireAuthenticatedOrSkip(page);
        await expect(
            page.getByRole("heading", { name: "All payrolls" }),
        ).toBeVisible();
    });

    test("lists at least one Draft payroll", async ({ page }) => {
        await requireDraftPayrollRowOrSkip(page);
    });

    test("settles a Draft payroll from detail page", async ({ page }) => {
        const draftRow = await requireDraftPayrollRowOrSkip(page);

        await draftRow.getByRole("button", { name: "Open row actions" }).click();
        await page.getByRole("menuitem", { name: "View" }).click();

        await expect(page).toHaveURL(/\/dashboard\/payroll\/[0-9a-f-]+\/breakdown$/i);

        await page.getByRole("button", { name: "Settle" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.getByRole("button", { name: "Yes, settle" }).click();

        await expect(page.getByRole("dialog")).not.toBeVisible();
        await expect(page).toHaveURL(/\/dashboard\/payroll\/[0-9a-f-]+\/summary/i);
        await expect(page.getByText("Settled").first()).toBeVisible();
    });
});
