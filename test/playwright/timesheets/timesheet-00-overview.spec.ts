import { expect, test } from "@playwright/test";

import {
    clickSidebarFeatureRoot,
    clickSidebarSubLink,
} from "../shared/ui";
import { gotoTimesheetOverview } from "./fixtures";

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
