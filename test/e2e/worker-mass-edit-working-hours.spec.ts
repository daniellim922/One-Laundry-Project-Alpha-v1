import { expect, test, type Locator, type Page } from "@playwright/test";

const NOT_AUTHENTICATED_SKIP_REASON =
    "Not authenticated (auth setup did not produce a valid session). Configure DB/env and re-run e2e.";
const PERMISSION_SKIP_REASON =
    "Current user does not have Workers create/update permissions required for this flow.";
const NO_EDITABLE_ROW_SKIP_REASON =
    "No Active Full Time Foreign Worker rows available for mass-edit; seed workers and re-run e2e.";

function requireAuthenticatedOrSkip(page: { url(): string }) {
    if (page.url().includes("/login")) {
        test.skip(true, NOT_AUTHENTICATED_SKIP_REASON);
    }
}

async function requirePermissionButtonsOrSkip(page: Page) {
    const main = page.getByRole("main");
    const newWorker = main.getByRole("link", { name: "New worker" });
    const massEdit = main.getByRole("button", {
        name: "Mass edit working hours",
    });

    const hasBoth = (await newWorker.count()) > 0 && (await massEdit.count()) > 0;
    if (!hasBoth) {
        test.skip(true, PERMISSION_SKIP_REASON);
    }

    await expect(newWorker).toBeVisible();
    await expect(massEdit).toBeVisible();
}

async function requireEditableSelectionOrSkip(dialog: Locator) {
    const editableInput = dialog
        .locator("tbody input[aria-label^='New minimum hours for']")
        .first();
    if ((await editableInput.count()) === 0) {
        test.skip(true, NO_EDITABLE_ROW_SKIP_REASON);
    }
    return editableInput;
}

test.describe("Worker mass edit minimum hours", () => {
    test("supports shared apply + row override and shows results table", async ({
        page,
    }) => {
        await page.goto("/dashboard/worker/all");
        requireAuthenticatedOrSkip(page);
        await expect(
            page.getByRole("heading", { name: "All workers" }),
        ).toBeVisible();

        await requirePermissionButtonsOrSkip(page);

        await page
            .getByRole("button", { name: "Mass edit working hours" })
            .click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        await expect(
            dialog.getByText(
                "Only Active Full Time Foreign Workers are shown.",
            ),
        ).toBeVisible();
        await expect(
            dialog.getByRole("columnheader", { name: "Employment Type" }),
        ).toHaveCount(0);
        await expect(
            dialog.getByRole("columnheader", { name: "Status" }),
        ).toHaveCount(0);
        await expect(
            dialog.getByRole("columnheader", {
                name: "Employment Arrangement",
            }),
        ).toBeVisible();

        const selectedRowsOnOpen = dialog.locator("tbody tr[data-state='selected']");
        expect(await selectedRowsOnOpen.count()).toBe(0);

        const arrangementCells = dialog.locator("tbody td:nth-child(4)");
        if ((await arrangementCells.count()) === 0) {
            test.skip(true, NO_EDITABLE_ROW_SKIP_REASON);
        }
        for (let i = 0; i < (await arrangementCells.count()); i += 1) {
            await expect(arrangementCells.nth(i)).toHaveText("Foreign Worker");
        }

        const workerFilterInput = dialog
            .locator("thead tr")
            .nth(1)
            .getByPlaceholder("Filter...");
        await workerFilterInput.fill("zzzz-not-found");
        await expect(workerFilterInput).toHaveValue("zzzz-not-found");
        await expect(dialog.getByText("No results.")).toBeVisible();
        await workerFilterInput.fill("");
        await expect(workerFilterInput).toHaveValue("");

        await dialog
            .getByLabel("Shared minimum hours")
            .fill("250");

        await dialog.getByRole("checkbox").nth(1).click();
        await dialog.getByRole("button", { name: "Apply to selected" }).click();

        const editableInput = await requireEditableSelectionOrSkip(dialog);
        await editableInput.fill("260");

        await dialog.getByRole("button", { name: /Save selected/ }).click();
        await expect(dialog).not.toBeVisible({ timeout: 60_000 });

        const results = page.getByTestId("mass-edit-working-hours-results");
        await expect(results).toBeVisible();
        await expect(
            results.getByRole("columnheader", { name: "Name" }),
        ).toBeVisible();
        await expect(
            results.getByRole("columnheader", { name: "Old Working Hours" }),
        ).toBeVisible();
        await expect(
            results.getByRole("columnheader", {
                name: "Employment Arrangement",
            }),
        ).toBeVisible();
        await expect(
            results.getByRole("columnheader", { name: "New Working Hours" }),
        ).toBeVisible();
        await expect(
            results.getByRole("columnheader", { name: "Status" }),
        ).toBeVisible();
        const statusCells = results.getByRole("cell", {
            name: /✅ Updated|❌ Failed/,
        });
        await expect(statusCells.first()).toBeVisible();
        expect(await statusCells.count()).toBeGreaterThan(0);
    });
});
