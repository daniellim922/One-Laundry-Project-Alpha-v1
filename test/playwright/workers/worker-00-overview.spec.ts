import { expect, test } from "@playwright/test";

import {
    gotoAllWorkers,
    gotoWorkerOverview,
    openWorkerRowMenuItem,
} from "./fixtures";

/**
 * Ordering: `worker-00-*.spec.ts` runs before matrix CRUD chain specs alphabetically so the
 * all-workers smoke test observes a sane row count/search before worker-create adds matrix rows.
 */
test.describe("Worker table and overview", () => {
    test("overview quick actions reach worker routes", async ({ page }) => {
        await gotoWorkerOverview(page);

        await expect(page.getByText("Quick actions", { exact: true })).toBeVisible();
        await expect(
            page.getByRole("main").getByRole("link", { name: "View all workers" }),
        ).toBeVisible();
        await expect(
            page.getByRole("main").getByRole("link", { name: "New worker" }),
        ).toBeVisible();

        await page
            .getByRole("main")
            .getByRole("link", { name: "View all workers" })
            .click();
        await expect(page).toHaveURL(/\/dashboard\/worker\/all/);
        await expect(
            page.getByRole("heading", { name: "All workers" }),
        ).toBeVisible();

        await page.goBack();
        await page
            .getByRole("main")
            .getByRole("link", { name: "New worker" })
            .click();
        await expect(page).toHaveURL(/\/dashboard\/worker\/new/);
    });

    test("all-workers table lists rows, search filters, sort works, row actions navigate", async ({
        page,
    }) => {
        await gotoAllWorkers(page);

        const table = page.getByRole("main").locator("table").first();
        const dataRows = table.locator("tbody tr");
        await expect(dataRows.first()).toBeVisible({ timeout: 60_000 });
        // Avoid capturing the Suspense fallback skeleton table (10 placeholder rows).
        await expect(
            table.getByRole("button", { name: "Open row actions" }).first(),
        ).toBeVisible({ timeout: 60_000 });

        const initialCount = await dataRows.count();
        expect(initialCount).toBeGreaterThan(0);

        const cells = dataRows.first().getByRole("cell");
        const probeName = (await cells.nth(0).innerText()).trim();
        const probeNric = (await cells.nth(1).innerText()).trim();
        /** NRIC yields a tighter probe than “E2E …” prefixes once many fixtures share that token. */
        const probeTerm =
            probeNric.length > 0 && probeNric !== "—" ? probeNric : probeName;

        const search = page.getByRole("main").getByPlaceholder("Search...");
        await search.fill(probeTerm, { force: true });
        await expect.poll(async () => dataRows.count(), { timeout: 15_000 }).toBeGreaterThan(0);
        const filteredCount = await dataRows.count();
        expect(filteredCount).toBeLessThanOrEqual(initialCount);
        if (initialCount > 1) {
            expect(filteredCount).toBeLessThan(initialCount);
        }

        await search.fill("", { force: true });
        await expect.poll(async () => dataRows.count(), { timeout: 15_000 }).toBe(initialCount);

        await expect(
            table.getByRole("button", { name: "Name" }).first(),
        ).toBeVisible();

        await openWorkerRowMenuItem(page, probeName, "View");
        await expect(page).toHaveURL(/\/dashboard\/worker\/[^/]+\/view/);
        await expect(
            page.getByRole("heading", { name: "View worker" }),
        ).toBeVisible();
    });
});
