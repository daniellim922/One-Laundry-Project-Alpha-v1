import { expect, test } from "@playwright/test";

import {
    assertAuthenticated,
    WORKER_FIXTURE_NAMES,
} from "./worker-test-helpers";

test.describe("Worker mass edit minimum hours", () => {
    test("updates seeded foreign full-time worker and shows result table", async ({
        page,
    }) => {
        await page.goto("/dashboard/worker/all");
        await assertAuthenticated(page);

        await expect(
            page.getByRole("heading", { name: "All workers" }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Mass edit working hours" }),
        ).toBeVisible();

        await page
            .getByRole("button", { name: "Mass edit working hours" })
            .click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(
            dialog.getByText("Only Active Full Time Foreign Workers are shown."),
        ).toBeVisible();

        const workerFilterInput = dialog
            .locator("thead tr")
            .nth(1)
            .getByPlaceholder("Filter...");
        await workerFilterInput.fill(WORKER_FIXTURE_NAMES.massEditTarget);

        await expect(
            dialog.getByRole("cell", {
                name: WORKER_FIXTURE_NAMES.massEditTarget,
                exact: true,
            }),
        ).toBeVisible();

        await dialog
            .getByRole("checkbox", {
                name: `Select ${WORKER_FIXTURE_NAMES.massEditTarget}`,
            })
            .click();

        await dialog.getByLabel("Shared minimum hours").fill("250");
        await dialog.getByRole("button", { name: "Apply to selected" }).click();

        await dialog
            .getByLabel(
                `New minimum hours for ${WORKER_FIXTURE_NAMES.massEditTarget}`,
            )
            .fill("260");

        await dialog.getByRole("button", { name: /Save selected/ }).click();
        await expect(dialog).not.toBeVisible({ timeout: 60_000 });

        const results = page.getByTestId("mass-edit-working-hours-results");
        await expect(results).toBeVisible();
        await expect(
            results.getByRole("cell", {
                name: WORKER_FIXTURE_NAMES.massEditTarget,
            }),
        ).toBeVisible();
        await expect(
            results.getByRole("cell", { name: "260h" }).first(),
        ).toBeVisible();
        await expect(
            results.getByRole("cell", { name: "✅ Updated" }),
        ).toBeVisible();
    });
});
