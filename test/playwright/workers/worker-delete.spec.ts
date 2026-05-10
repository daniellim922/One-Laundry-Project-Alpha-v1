import { expect, test, type Locator, type Page } from "@playwright/test";

import type { WorkerStatus } from "@/types/status";
import { readWorkerMatrixE2EState } from "../shared/matrix";
import {
    submitWorkerForm,
    WORKER_ALL_PATH_URL_RE,
} from "./worker-submit-form";

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

function workerTableRow(page: Page, workerName: string) {
    return mainTableRowByText(page, workerName);
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

async function gotoAllWorkers(page: Page): Promise<void> {
    await page.goto("/dashboard/worker/all");
    await page.getByRole("heading", { name: "All workers" }).waitFor();
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

async function setStatus(page: Page, value: WorkerStatus): Promise<void> {
    const group = page.getByRole("group", { name: "Status" });
    try {
        await group.waitFor({ state: "visible", timeout: 45_000 });
    } catch {
        return;
    }
    await group.getByRole("button", { name: value, exact: true }).click();
}

async function fillWorkerFormFields(
    page: Page,
    values: { status?: WorkerStatus },
): Promise<void> {
    if (values.status !== undefined) {
        await setStatus(page, values.status);
    }
}

test.describe.configure({ mode: "serial" });

test.describe("Worker matrix delete (inactive)", () => {
    test("workers.json matrix: set status inactive for each worker", async ({
        page,
    }) => {
        test.setTimeout(180_000);
        const { records } = readWorkerMatrixE2EState();

        for (const record of records) {
            await gotoAllWorkers(page);
            await openWorkerRowMenuItem(page, record.name, "Edit");
            // Confirms row-actions menu opened under URL-sync remount before Edit navigation.
            await expect(page).toHaveURL(/\/dashboard\/worker\/[^/]+\/edit$/);

            await fillWorkerFormFields(page, { status: "Inactive" });
            await submitWorkerForm(page, "edit");
            await expect(page).toHaveURL(WORKER_ALL_PATH_URL_RE, {
                timeout: 15_000,
            });

            const row = workerTableRow(page, record.name);
            await expect(row).toBeVisible();
            await expect(row).toContainText("Inactive");
        }
    });
});
