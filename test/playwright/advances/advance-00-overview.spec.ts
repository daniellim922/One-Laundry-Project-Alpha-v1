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

async function gotoAdvanceOverview(page: Page): Promise<void> {
    await page.goto("/dashboard/advance");
    await page.getByRole("heading", { name: "Advance" }).waitFor();
}

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
