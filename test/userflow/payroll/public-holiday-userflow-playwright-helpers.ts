import { expect, type Locator, type Page } from "@playwright/test";

export type PublicHolidayRow = {
    date: string;
    name: string;
};

export const MOM_PUBLIC_HOLIDAYS_URL =
    "https://www.mom.gov.sg/employment-practices/public-holidays";

export const MOM_2026_PUBLIC_HOLIDAYS: readonly PublicHolidayRow[] = [
    { date: "2026-01-01", name: "New Year's Day" },
    { date: "2026-02-17", name: "Chinese New Year" },
    { date: "2026-02-18", name: "Chinese New Year" },
    { date: "2026-03-21", name: "Hari Raya Puasa" },
    { date: "2026-04-03", name: "Good Friday" },
    { date: "2026-05-01", name: "Labour Day" },
    { date: "2026-05-27", name: "Hari Raya Haji" },
    { date: "2026-05-31", name: "Vesak Day" },
    { date: "2026-08-09", name: "National Day" },
    { date: "2026-11-08", name: "Deepavali" },
    { date: "2026-12-25", name: "Christmas Day" },
];

export async function assertPublicHolidaySourceLinkContract(
    page: Page,
): Promise<void> {
    const sourceLink = page
        .getByRole("main")
        .getByRole("link", { name: "Ministry of Manpower public holidays" });

    await expect(sourceLink).toBeVisible();
    await expect(sourceLink).toHaveAttribute("href", MOM_PUBLIC_HOLIDAYS_URL);
    await expect(sourceLink).toHaveAttribute("target", "_blank");

    const rel = (await sourceLink.getAttribute("rel")) ?? "";

    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
}

export async function loadPublicHolidayYearThroughUi(
    page: Page,
    year: number,
): Promise<void> {
    const main = page.getByRole("main");

    await main.getByLabel("Calendar year").fill(String(year));
    await main.getByRole("button", { name: "Load year", exact: true }).click();

    await expect(page).toHaveURL(
        new RegExp(`/dashboard/payroll/public-holidays\\?year=${year}$`),
    );
    await expect(main.getByText(`${year} holiday rows`, { exact: true })).toBeVisible();
}

export async function replacePublicHolidayYearRowsThroughUi(
    page: Page,
    {
        year,
        holidays,
    }: {
        year: number;
        holidays: readonly PublicHolidayRow[];
    },
): Promise<void> {
    if (holidays.length === 0) {
        throw new Error("Expected at least one holiday row to save.");
    }

    await loadPublicHolidayYearThroughUi(page, year);
    await clearVisibleHolidayRows(page);

    for (const [index, holiday] of holidays.entries()) {
        await appendHolidayRow(page);
        await fillHolidayRow(page, index, holiday);
    }

    const main = page.getByRole("main");
    await main.getByRole("button", { name: "Save year", exact: true }).click();
    await expect(
        main.getByText(`Saved ${holidays.length} holidays for ${year}.`, {
            exact: true,
        }),
    ).toBeVisible();
}

export async function assertPublicHolidayRowsVisible(
    page: Page,
    expectedRows: readonly PublicHolidayRow[],
): Promise<void> {
    const main = page.getByRole("main");
    const dateInputs = main.locator('[id^="holiday-date-"]');
    const nameInputs = main.locator('[id^="holiday-name-"]');

    await expect(dateInputs).toHaveCount(expectedRows.length);
    await expect(nameInputs).toHaveCount(expectedRows.length);

    for (const [index, row] of expectedRows.entries()) {
        await expect(dateInputs.nth(index)).toHaveValue(toDisplayDate(row.date));
        await expect(nameInputs.nth(index)).toHaveValue(row.name);
    }
}

async function clearVisibleHolidayRows(page: Page): Promise<void> {
    const removeButtons = getRemoveButtons(page);

    while ((await removeButtons.count()) > 0) {
        await removeButtons.first().click();
    }
}

function getRemoveButtons(page: Page): Locator {
    return page
        .getByRole("main")
        .getByRole("button", { name: /^Remove holiday \d+$/ });
}

async function appendHolidayRow(page: Page): Promise<void> {
    await page
        .getByRole("main")
        .getByRole("button", { name: "Add holiday", exact: true })
        .click();
}

async function fillHolidayRow(
    page: Page,
    rowIndex: number,
    row: PublicHolidayRow,
): Promise<void> {
    const main = page.getByRole("main");

    await main.locator(`#holiday-date-${rowIndex}`).fill(toDisplayDate(row.date));
    await main.locator(`#holiday-name-${rowIndex}`).fill(row.name);
}

function toDisplayDate(isoDate: string): string {
    const [year, month, day] = isoDate.split("-");

    return `${day}/${month}/${year}`;
}
