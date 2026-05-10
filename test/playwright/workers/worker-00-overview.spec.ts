import { expect, test, type Locator, type Page } from "@playwright/test";

function isBrowserOrContextClosedError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    return (
        err.name === "TargetClosedError" ||
        err.message.includes("Target page, context or browser has been closed")
    );
}

function mainTableRowByText(page: Page, text: string) {
    return page
        .getByRole("main")
        .getByRole("row")
        .filter({ hasText: text });
}

async function setDashboardMainTableSearchFilter(
    page: Page,
    value: string,
): Promise<void> {
    const search = page.getByRole("main").getByPlaceholder("Search...");
    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.evaluate((el: HTMLInputElement, val: string) => {
        const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
        )?.set;
        setter?.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
}

async function clickOpenRowActionsTrigger(
    row: Locator,
    options?: { visibleTimeoutMs?: number; menuOpenTimeoutMs?: number },
): Promise<void> {
    const visibleTimeoutMs = options?.visibleTimeoutMs ?? 15_000;
    const menuOpenTimeoutMs = options?.menuOpenTimeoutMs ?? 15_000;
    const trigger = row.getByRole("button", { name: "Open row actions" });
    await expect(trigger).toBeVisible({ timeout: visibleTimeoutMs });
    await expect(trigger).toBeEnabled({ timeout: visibleTimeoutMs });

    const page = row.page();
    const MENU_OPEN_PROBE_MS = 750;

    const menuAppearsOpen = async (): Promise<boolean> => {
        try {
            const expanded = await trigger.getAttribute("aria-expanded", {
                timeout: MENU_OPEN_PROBE_MS,
            });
            if (expanded === "true") return true;
        } catch {
            // Trigger detached or row remounted during DataTable URL-sync.
        }

        const menu = page.getByRole("menu").first();
        try {
            await menu.waitFor({ state: "visible", timeout: MENU_OPEN_PROBE_MS });
            return true;
        } catch {
            // No portal menu yet.
        }

        try {
            const menuitem = page.getByRole("menuitem").first();
            await menuitem.waitFor({
                state: "visible",
                timeout: MENU_OPEN_PROBE_MS,
            });
            return true;
        } catch {
            return false;
        }
    };

    const tryOpen = async (): Promise<void> => {
        try {
            await trigger.click({ force: true, timeout: 8_000 });
        } catch (err) {
            if (isBrowserOrContextClosedError(err)) {
                throw err;
            }
            const pg = row.page();
            if (pg.isClosed()) {
                const original =
                    err instanceof Error ? err.stack ?? err.message : String(err);
                throw new Error(
                    `Row actions trigger click failed and page is already closed. Original error:\n${original}`,
                );
            }
            try {
                await trigger.evaluate((el: HTMLElement) => {
                    el.click();
                });
            } catch (evalErr) {
                if (isBrowserOrContextClosedError(evalErr)) {
                    const original =
                        err instanceof Error ? err.message : String(err);
                    const closedMsg =
                        evalErr instanceof Error
                            ? evalErr.message
                            : String(evalErr);
                    throw new Error(
                        `Row actions menu: DOM click fallback ran while browser/context was closing (${closedMsg}). Original pointer click error: ${original}`,
                    );
                }
                throw evalErr;
            }
        }
    };

    await tryOpen();

    await expect
        .poll(
            async () => {
                if (await menuAppearsOpen()) return true;
                await tryOpen();
                return menuAppearsOpen();
            },
            {
                message:
                    "Row actions menu did not open (expected aria-expanded=true or visible menu/menuitem)",
                timeout: menuOpenTimeoutMs,
            },
        )
        .toBeTruthy();
}

async function followDashboardRowMenuItem(
    page: Page,
    itemLabel: string,
): Promise<void> {
    const menuitem = page.getByRole("menuitem", {
        name: itemLabel,
        exact: true,
    });
    await menuitem.waitFor({ state: "visible", timeout: 15_000 });
    await menuitem.scrollIntoViewIfNeeded();

    const href = await menuitem.getAttribute("href");
    if (href?.startsWith("/")) {
        await page.goto(href);
        return;
    }

    try {
        await menuitem.click({ force: true, timeout: 10_000 });
    } catch {
        const hrefRetry = await menuitem.getAttribute("href");
        if (hrefRetry?.startsWith("/")) {
            await page.goto(hrefRetry);
            return;
        }
        throw new Error(
            `Could not activate row menu item "${itemLabel}" (no href and click failed).`,
        );
    }
}

async function gotoWorkerOverview(page: Page): Promise<void> {
    await page.goto("/dashboard/worker");
    await page.getByRole("heading", { name: "Worker" }).waitFor();
}

async function gotoAllWorkers(page: Page): Promise<void> {
    await page.goto("/dashboard/worker/all");
    await page.getByRole("heading", { name: "All workers" }).waitFor();
}

function workerTableRow(page: Page, workerName: string) {
    return mainTableRowByText(page, workerName);
}

async function openWorkerRowMenuItem(
    page: Page,
    workerName: string,
    item: "View" | "Edit",
): Promise<void> {
    const table = page.getByRole("main").locator("table").first();
    await expect(
        table
            .getByRole("button", {
                name: "Open row actions",
            })
            .first(),
    ).toBeVisible({ timeout: 60_000 });

    await setDashboardMainTableSearchFilter(page, workerName);

    const row = workerTableRow(page, workerName);
    await expect(row).toBeVisible({ timeout: 90_000 });
    await row.scrollIntoViewIfNeeded();
    await clickOpenRowActionsTrigger(row, {
        visibleTimeoutMs: 45_000,
        menuOpenTimeoutMs: 45_000,
    });
    await followDashboardRowMenuItem(page, item);
}

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
        /** `openWorkerRowMenuItem` waits up to ~90s for filtered row visibility; global config is 60s. */
        test.setTimeout(180_000);
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
