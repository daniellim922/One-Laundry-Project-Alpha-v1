import { expect, type Page } from "@playwright/test";

export const WORKER_FIXTURE_NAMES = {
    massEditTarget: "E2E Worker Foreign Full Time",
};

export async function assertOpenDashboardAccess(page: Page): Promise<void> {
    await expect(page).toHaveURL(/\/dashboard(\/.*)?$/);
    await expect(page.getByRole("main")).toBeVisible();
}
