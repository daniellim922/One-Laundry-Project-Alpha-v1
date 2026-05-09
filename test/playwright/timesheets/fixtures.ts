import type { Locator, Page } from "@playwright/test";

import { clickOpenRowActionsTrigger, followDashboardRowMenuItem, mainTableRowByText } from "../shared/ui";

export async function gotoTimesheetOverview(page: Page): Promise<void> {
    await page.goto("/dashboard/timesheet");
    await page.getByRole("heading", { name: "Timesheet" }).waitFor();
}

export async function gotoAllTimesheets(page: Page): Promise<void> {
    await page.goto("/dashboard/timesheet/all");
    await page.getByRole("heading", { name: "All timesheets" }).waitFor();
}

/** Row in the main dashboard timesheet table for a worker (may match multiple entries). */
export function timesheetTableRow(page: Page, workerName: string) {
    return mainTableRowByText(page, workerName);
}

export async function openTimesheetRowMenuItem(
    page: Page,
    workerName: string,
    item: "View" | "Edit" | "Delete",
): Promise<void> {
    const row = timesheetTableRow(page, workerName).first();
    await openTimesheetRowActionsFromRow(page, row, item);
}

/** Use when multiple rows exist for one worker — pass the exact table row locator. */
export async function openTimesheetRowActionsFromRow(
    page: Page,
    row: Locator,
    item: "View" | "Edit" | "Delete",
): Promise<void> {
    await row.scrollIntoViewIfNeeded();
    await clickOpenRowActionsTrigger(row);
    await followDashboardRowMenuItem(page, item);
}

/** Confirms the destructive delete dialog from [app/dashboard/timesheet/columns.tsx]. */
export async function confirmTimesheetDeleteDialog(
    page: Page,
    options?: { deleteApiTimeoutMs?: number },
): Promise<void> {
    const deleteApiTimeoutMs = options?.deleteApiTimeoutMs ?? 180_000;

    const dialog = page.getByRole("dialog", {
        name: "Delete timesheet entry?",
    });
    await dialog.waitFor({ state: "visible", timeout: 15_000 });

    const deleteResponse = page.waitForResponse(
        (response) =>
            response.request().method() === "DELETE" &&
            response.url().includes("/api/timesheets/"),
        { timeout: deleteApiTimeoutMs },
    );

    const confirmButton = dialog.getByRole("button", {
        name: "Delete",
        exact: true,
    });
    await confirmButton.click({ force: true });

    const response = await deleteResponse;
    if (!response.ok()) {
        throw new Error(
            `DELETE timesheet failed: HTTP ${response.status()} ${response.url()}`,
        );
    }

    await dialog.waitFor({ state: "hidden", timeout: deleteApiTimeoutMs });
}
