import { expect, test, type Page } from "@playwright/test";

function sidebarRoot(page: Page) {
    return page.locator('[data-sidebar="sidebar"]');
}

async function clickSidebarSubLink(
    page: Page,
    featureTitle: string,
    subLinkName: string,
): Promise<void> {
    const root = sidebarRoot(page);
    const subLink = root.getByRole("link", { name: subLinkName });
    if (!(await subLink.isVisible())) {
        await root
            .getByRole("button", { name: `Toggle ${featureTitle} submenu` })
            .click();
    }
    await expect(subLink).toBeVisible({ timeout: 15_000 });
    await subLink.click();
}

async function clickSidebarFeatureRoot(
    page: Page,
    featureTitle: string,
): Promise<void> {
    await sidebarRoot(page)
        .getByRole("link", { name: featureTitle, exact: true })
        .click();
}

async function gotoTimesheetOverview(page: Page): Promise<void> {
    await page.goto("/dashboard/timesheet");
    await page.getByRole("heading", { name: "Timesheet" }).waitFor();
}

test.describe("Timesheet overview and navigation", () => {
    test("overview quick actions and sidebar reach timesheet routes", async ({
        page,
    }) => {
        await gotoTimesheetOverview(page);

        await expect(
            page.getByText("Quick actions", { exact: true }),
        ).toBeVisible({ timeout: 60_000 });

        await expect(
            page.getByRole("main").getByRole("link", { name: "All timesheets" }),
        ).toBeVisible();
        await expect(
            page.getByRole("main").getByRole("link", { name: "New timesheet" }),
        ).toBeVisible();
        await expect(
            page.getByRole("main").getByRole("link", { name: "Import timesheets" }),
        ).toBeVisible();

        await page.getByRole("main").getByRole("link", { name: "All timesheets" }).click();
        await expect(page).toHaveURL(/\/dashboard\/timesheet\/all$/);
        await expect(
            page.getByRole("heading", { name: "All timesheets" }),
        ).toBeVisible();

        await gotoTimesheetOverview(page);
        await page.getByRole("main").getByRole("link", { name: "New timesheet" }).click();
        await expect(page).toHaveURL(/\/dashboard\/timesheet\/new$/);
        await expect(
            page.getByRole("heading", { name: "Add new timesheet" }),
        ).toBeVisible();

        await gotoTimesheetOverview(page);
        await page
            .getByRole("main")
            .getByRole("link", { name: "Import timesheets" })
            .click();
        await expect(page).toHaveURL(/\/dashboard\/timesheet\/import$/);
        await expect(
            page.getByRole("heading", { name: "Import timesheet" }),
        ).toBeVisible();

        await gotoTimesheetOverview(page);
        await clickSidebarSubLink(page, "Timesheet", "All timesheets");
        await expect(page).toHaveURL(/\/dashboard\/timesheet\/all$/);

        await clickSidebarSubLink(page, "Timesheet", "New timesheet");
        await expect(page).toHaveURL(/\/dashboard\/timesheet\/new$/);

        await clickSidebarSubLink(page, "Timesheet", "Import timesheets");
        await expect(page).toHaveURL(/\/dashboard\/timesheet\/import$/);

        await clickSidebarFeatureRoot(page, "Timesheet");
        await expect(page).toHaveURL(/\/dashboard\/timesheet$/);
        await expect(
            page.getByRole("heading", { name: "Timesheet" }),
        ).toBeVisible();
    });
});
