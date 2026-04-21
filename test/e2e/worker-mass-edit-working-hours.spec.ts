import { expect, test } from "@playwright/test";

import {
    assertOpenDashboardAccess,
    WORKER_FIXTURE_NAMES,
} from "./worker-test-helpers";

test.describe("Worker mass edit minimum hours", () => {
    test("updates a foreign full-time worker via mass edit and shows result table", async ({
        page,
    }) => {
        await page.goto("/dashboard/worker/mass-edit");
        await assertOpenDashboardAccess(page);

        await expect(
            page.getByRole("heading", { name: "Mass edit working hours" }),
        ).toBeVisible();
        await expect(
            page
                .getByTestId("mass-edit-working-hours-panel")
                .getByText(
                    "Only Active Full Time Foreign Workers are shown.",
                ),
        ).toBeVisible();

        const panel = page.getByTestId("mass-edit-working-hours-panel");
        await expect(panel.getByRole("table")).toBeVisible();
        const noEligibleWorkers = panel.getByRole("cell", {
            name: "No results.",
        });
        test.skip(
            (await noEligibleWorkers.count()) > 0,
            "No Active Full Time Foreign workers in DB. Seed workers and re-run e2e.",
        );
        const workerFilterInput = panel
            .locator("thead tr")
            .nth(1)
            .getByPlaceholder("Filter...");
        await workerFilterInput.fill(WORKER_FIXTURE_NAMES.massEditTarget);

        await expect(
            panel
                .getByRole("cell", {
                    name: WORKER_FIXTURE_NAMES.massEditTarget,
                    exact: true,
                })
                .first(),
        ).toBeVisible();

        const targetWorkerCheckbox = panel.getByRole("checkbox", {
            name: `Select ${WORKER_FIXTURE_NAMES.massEditTarget}`,
        }).first();
        await targetWorkerCheckbox.click();

        await panel.getByLabel("Shared minimum hours").fill("250");
        await panel.getByRole("button", { name: "Apply to selected" }).click();

        await targetWorkerCheckbox
            .locator("xpath=ancestor::tr[1]")
            .getByLabel(
                `New minimum hours for ${WORKER_FIXTURE_NAMES.massEditTarget}`,
            )
            .fill("260");

        await panel.getByRole("button", { name: /Save selected/ }).click();

        const results = page.getByTestId("mass-edit-working-hours-results");
        await expect(results).toBeVisible({ timeout: 60_000 });
        await expect(
            results
                .getByRole("cell", {
                    name: WORKER_FIXTURE_NAMES.massEditTarget,
                })
                .first(),
        ).toBeVisible();
        await expect(
            results.getByRole("cell", { name: "260h" }).first(),
        ).toBeVisible();
        await expect(
            results.getByRole("cell", { name: "✅ Updated" }),
        ).toBeVisible();
    });
});
