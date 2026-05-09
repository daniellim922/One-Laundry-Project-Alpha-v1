import { expect, test } from "@playwright/test";

import {
    clickSidebarFeatureRoot,
    clickSidebarSubLink,
} from "../shared/ui";
import { gotoAdvanceOverview } from "./fixtures";

test.describe("Advance overview and navigation", () => {
    test("overview quick actions and sidebar reach advance routes", async ({
        page,
    }) => {
        await gotoAdvanceOverview(page);

        await expect(
            page.getByText("Quick actions", { exact: true }),
        ).toBeVisible({ timeout: 60_000 });

        await expect(
            page.getByRole("main").getByRole("link", { name: "All advances" }),
        ).toBeVisible();
        await expect(
            page.getByRole("main").getByRole("link", { name: "New advance" }),
        ).toBeVisible();

        await page.getByRole("main").getByRole("link", { name: "All advances" }).click();
        await expect(page).toHaveURL(/\/dashboard\/advance\/all$/);
        await expect(
            page.getByRole("heading", { name: "All advances" }),
        ).toBeVisible();

        await gotoAdvanceOverview(page);
        await page.getByRole("main").getByRole("link", { name: "New advance" }).click();
        await expect(page).toHaveURL(/\/dashboard\/advance\/new$/);
        await expect(
            page.getByRole("heading", { name: "Employee advance request form" }),
        ).toBeVisible();

        await gotoAdvanceOverview(page);
        await clickSidebarSubLink(page, "Advance", "All advances");
        await expect(page).toHaveURL(/\/dashboard\/advance\/all$/);

        await clickSidebarSubLink(page, "Advance", "New advance");
        await expect(page).toHaveURL(/\/dashboard\/advance\/new$/);

        await clickSidebarFeatureRoot(page, "Advance");
        await expect(page).toHaveURL(/\/dashboard\/advance$/);
        await expect(
            page.getByRole("heading", { name: "Advance" }),
        ).toBeVisible();
    });
});
