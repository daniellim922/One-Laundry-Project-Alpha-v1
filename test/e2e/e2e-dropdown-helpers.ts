import { expect, type Page } from "@playwright/test";

/**
 * Radix dropdown content is often portaled and can sit outside the viewport, so
 * `click()` on a menu item may fail. Row "View" items are real links — follow `href`.
 */
export async function navigateFromOpenRowMenuView(page: Page): Promise<void> {
    const viewItem = page
        .locator(
            '[data-slot="dropdown-menu-content"][data-state="open"]',
        )
        .getByRole("menuitem", { name: "View" });
    const href = await viewItem.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!);
}
