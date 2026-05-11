import { expect, test, type Locator, type Page } from "@playwright/test";

import {
    getTimesheetAdvanceMatrixRecords,
    readWorkerMatrixE2EState,
} from "../shared/matrix";

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

async function gotoAllAdvances(page: Page): Promise<void> {
    await page.goto("/dashboard/advance/all");
    await page.getByRole("heading", { name: "All advances" }).waitFor();
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

async function openAdvanceRowActionsFromRow(
    page: Page,
    row: Locator,
    item: "View" | "Edit",
): Promise<void> {
    await row.scrollIntoViewIfNeeded();
    await clickOpenRowActionsTrigger(row);
    await followDashboardRowMenuItem(page, item);
}

async function expectAdvanceDetailAmountRequested(
    page: Page,
    expected: string,
): Promise<void> {
    await expect(page.getByTestId("advance-detail-amount")).toContainText(
        expected,
    );
}

test.describe.configure({ mode: "serial" });

test.describe("Advance matrix read", () => {
    test("workers.json matrix: view advance request breakdown", async ({
        page,
    }) => {
        test.setTimeout(480_000);

        const state = readWorkerMatrixE2EState();

        for (const record of getTimesheetAdvanceMatrixRecords(state)) {
            const workerName = record.name;

            await test.step(`Read advance for ${workerName}`, async () => {
                await gotoAllAdvances(page);

                const table = page.getByRole("main").locator("table").first();
                await expect(
                    table
                        .getByRole("button", { name: "Open row actions" })
                        .first(),
                ).toBeVisible({ timeout: 60_000 });

                const search = page.getByRole("main").getByPlaceholder("Search...");
                await search.fill(workerName, { force: true });
                await expect
                    .poll(async () => table.locator("tbody tr").count(), {
                        timeout: 15_000,
                    })
                    .toBeGreaterThan(0);

                const row = mainTableRowByText(page, workerName).filter({
                    hasText: "$600",
                });
                await expect(row.first()).toBeVisible();

                await openAdvanceRowActionsFromRow(page, row.first(), "View");
                await expect(page).toHaveURL(/\/dashboard\/advance\/[^/]+\/breakdown$/);
                await expectAdvanceDetailAmountRequested(page, "$600");

                const repaymentTable = page
                    .getByTestId("advance-detail")
                    .locator("table")
                    .first();
                await expect(repaymentTable.locator("tbody tr")).toHaveCount(3);
                for (let i = 0; i < 3; i++) {
                    await expect(
                        repaymentTable.locator("tbody tr").nth(i),
                    ).toContainText("$200");
                }
            });
        }
    });
});
