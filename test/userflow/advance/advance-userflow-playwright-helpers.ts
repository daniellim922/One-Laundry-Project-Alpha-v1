import { expect, type Locator, type Page } from "@playwright/test";

import type { AdvanceRequestHandoff } from "./advance-userflow-helpers";

export async function createAdvanceRequestThroughForm(
    page: Page,
    request: AdvanceRequestHandoff,
): Promise<void> {
    await page.goto("/dashboard/advance/new");
    await expect(
        page.getByRole("heading", { name: "Employee advance request form" }),
    ).toBeVisible();

    await selectAdvanceWorker(page, request.workerName);
    await page
        .getByLabel("Date of request")
        .fill(toDisplayDate(request.requestDate));
    await page
        .getByLabel("Amount requested")
        .fill(String(request.amountRequested));
    await page.getByLabel("Purpose of advance").fill(request.purpose);

    for (let index = 0; index < request.installmentAmounts.length; index += 1) {
        if (index > 0) {
            await page.getByLabel("Add installment row").click();
        }

        const installment = request.installmentAmounts[index]!;

        await page
            .getByLabel("Installment amount")
            .nth(index)
            .fill(String(installment.amount));
        await page
            .getByLabel("Expected repayment date")
            .nth(index)
            .fill(toDisplayDate(installment.repaymentDate));
    }

    await page.getByTestId("advance-request-submit").click();

    await expect(page).toHaveURL(/\/dashboard\/advance\/all(?:\?.*)?$/);
    await expect(
        page.getByRole("heading", { name: "All advances" }),
    ).toBeVisible();
}

export async function verifyAdvanceRequestInAllAdvancesUi(
    page: Page,
    request: AdvanceRequestHandoff,
): Promise<string> {
    const candidateDetailHrefs = await collectCandidateAdvanceDetailHrefs(
        page,
        request,
    );

    for (const href of candidateDetailHrefs) {
        await page.goto(href);
        await expect(page).toHaveURL(
            /\/dashboard\/advance\/([0-9a-f-]+)\/breakdown$/i,
        );

        if ((await readAdvancePurpose(page)) !== request.purpose) {
            continue;
        }

        const advanceRequestId = readAdvanceRequestIdFromPage(page);
        await verifyAdvanceBreakdownPage(page, request);

        return advanceRequestId;
    }

    throw new Error(
        `Unable to find advance request "${request.purpose}" through /dashboard/advance/all.`,
    );
}

async function collectCandidateAdvanceDetailHrefs(
    page: Page,
    request: AdvanceRequestHandoff,
): Promise<string[]> {
    await page.goto("/dashboard/advance/all");
    await expect(
        page.getByRole("heading", { name: "All advances" }),
    ).toBeVisible();

    const searchInput = getAdvanceSearchInput(page);
    await searchInput.fill(request.workerName);
    await expect(
        getAdvanceTable(page).getByRole("cell", { name: request.workerName }).first(),
    ).toBeVisible();

    const expectedSignature = buildAdvanceListRowSignature(request);
    const detailHrefs = new Set<string>();

    for (;;) {
        const rows = getAdvanceTable(page).locator("tbody tr");
        const rowCount = await rows.count();

        for (let index = 0; index < rowCount; index += 1) {
            const row = rows.nth(index);

            if ((await readAdvanceListRowSignature(row)) !== expectedSignature) {
                continue;
            }

            detailHrefs.add(await readAdvanceViewHrefForRow(page, row));
        }

        const nextButton = getNextPaginationButton(page);

        if ((await nextButton.count()) === 0 || (await nextButton.isDisabled())) {
            return Array.from(detailHrefs);
        }

        await nextButton.click();
    }
}

async function selectAdvanceWorker(page: Page, workerName: string): Promise<void> {
    await page.getByTestId("advance-request-worker").click();
    await page.getByPlaceholder("Search employees…").fill(workerName);
    await page.getByRole("option", { name: workerName, exact: true }).click();
}

async function readAdvanceViewHrefForRow(
    page: Page,
    row: Locator,
): Promise<string> {
    await row.getByRole("button", { name: "Open row actions" }).click();

    const viewItem = page
        .locator('[data-slot="dropdown-menu-content"][data-state="open"]')
        .getByRole("menuitem", { name: "View" });
    const href = await viewItem.getAttribute("href");

    expect(href).toBeTruthy();
    await page.keyboard.press("Escape");

    return href!;
}

async function verifyAdvanceBreakdownPage(
    page: Page,
    request: AdvanceRequestHandoff,
): Promise<void> {
    await expect(page.getByTestId("advance-detail")).toBeVisible();
    await expect(page.getByTestId("advance-detail-amount")).toContainText(
        `$${request.amountRequested}`,
    );
    await expect(page.getByTestId("advance-detail-request-date")).toContainText(
        toDisplayDate(request.requestDate),
    );
    await expect(page.getByText(request.purpose, { exact: true })).toBeVisible();

    const actualInstallments = await getAdvanceBreakdownTable(page)
        .locator("tbody tr")
        .evaluateAll((rows) =>
            rows.map((row) => {
                const cells = Array.from(row.querySelectorAll("td")).map((cell) =>
                    cell.textContent?.trim() ?? "",
                );

                return cells.join(" | ");
            }),
        );

    expect(actualInstallments).toEqual(
        request.installmentAmounts.map((installment) =>
            buildAdvanceBreakdownInstallmentSignature(installment),
        ),
    );
}

async function readAdvancePurpose(page: Page): Promise<string> {
    const purposeHeading = page.getByText("Purpose of advance", { exact: true });
    const container = purposeHeading.locator("xpath=..");

    return container.locator("p").nth(1).innerText();
}

function readAdvanceRequestIdFromPage(page: Page): string {
    const match = page
        .url()
        .match(/\/dashboard\/advance\/([0-9a-f-]+)\/breakdown$/i);
    const advanceRequestId = match?.[1] ?? "";

    expect(advanceRequestId).not.toBe("");

    return advanceRequestId;
}

async function readAdvanceListRowSignature(row: Locator): Promise<string> {
    const cells = await row.locator("td").allTextContents();

    return cells.slice(0, 4).map((cell) => cell.trim()).join(" | ");
}

function buildAdvanceListRowSignature(request: AdvanceRequestHandoff): string {
    return [
        request.workerName,
        `$${request.amountRequested}`,
        "Advance Loan",
        toDisplayDate(request.requestDate),
    ].join(" | ");
}

function buildAdvanceBreakdownInstallmentSignature(
    installment: AdvanceRequestHandoff["installmentAmounts"][number],
): string {
    return [
        `$${installment.amount}`,
        toDisplayDate(installment.repaymentDate),
        installment.status,
    ].join(" | ");
}

function getAdvanceSearchInput(page: Page) {
    return page.getByRole("main").getByPlaceholder("Search...");
}

function getAdvanceTable(page: Page) {
    return page.getByRole("main").getByRole("table");
}

function getAdvanceBreakdownTable(page: Page) {
    return page.getByTestId("advance-detail").getByRole("table");
}

function getNextPaginationButton(page: Page) {
    return page.getByRole("main").getByRole("button", {
        name: "Next",
        exact: true,
    });
}

function toDisplayDate(isoDate: string): string {
    const [year, month, day] = isoDate.split("-");

    return `${day}/${month}/${year}`;
}
