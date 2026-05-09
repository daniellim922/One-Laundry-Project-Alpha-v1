import { expect, type Page } from "@playwright/test";

import { isoToDmy } from "@/utils/time/calendar-date";

function sidebarRoot(page: Page) {
    return page.locator('[data-sidebar="sidebar"]');
}

/** Opens a collapsible sidebar group when sub-links are not visible, then clicks the sub-link. */
export async function clickSidebarSubLink(
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

export async function clickSidebarFeatureRoot(
    page: Page,
    featureTitle: string,
): Promise<void> {
    await sidebarRoot(page)
        .getByRole("link", { name: featureTitle, exact: true })
        .click();
}

/** Searchable combobox (cmdk `CommandItem`) triggered by a button `#id` or other locator. */
export async function selectFromSearchCombobox(
    page: Page,
    triggerSelector: string,
    optionLabel: string,
    searchPlaceholder: string,
): Promise<void> {
    const trigger = page.locator(triggerSelector);
    await expect(trigger).toBeEnabled({ timeout: 15_000 });
    await trigger.click();

    const search = page.getByPlaceholder(searchPlaceholder);
    await expect(search).toBeVisible({ timeout: 15_000 });
    await search.click();
    await search.fill(optionLabel);

    const item = page
        .locator('[data-slot="command"]')
        .locator('[data-slot="command-item"]')
        .filter({ hasText: optionLabel });
    await expect(item.first()).toBeVisible({ timeout: 20_000 });
    await item.first().click({ force: true });
}

/** Fills app `DatePickerInput` wire fields by element id using DD/MM/YYYY display matching calendar helpers. */
export async function fillDatePickerInputById(
    page: Page,
    elementId: string,
    isoYmd: string,
): Promise<void> {
    const display = isoToDmy(isoYmd);
    await page.locator(`#${elementId}`).fill(display);
    await page.locator(`#${elementId}`).blur();
}

/** Rows rendered inside dashboard `<main>` data tables (global filter uses substring matching). */
export function mainTableRowByText(page: Page, text: string) {
    return page
        .getByRole("main")
        .getByRole("row")
        .filter({ hasText: text });
}
