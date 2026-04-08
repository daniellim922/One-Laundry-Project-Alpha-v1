import { expect, test } from "@playwright/test";

import { assertAuthenticated } from "./worker-test-helpers";

test.describe("DataTable column filter typing", () => {
    test("allows typing multiple characters into column filter input", async ({
        page,
    }) => {
        await page.goto("/dashboard/worker/all");
        await assertAuthenticated(page);

        const main = page.getByRole("main");
        await expect(
            main.getByRole("heading", { name: "All workers" }),
        ).toBeVisible();

        // Column filters row is the last header group row.
        const filterRow = main.locator("thead tr").last();
        const nameFilterInput = filterRow
            .locator("th")
            .first()
            .getByPlaceholder("Filter...");

        await nameFilterInput.click();
        await nameFilterInput.type("abc", { delay: 10 });
        await expect(nameFilterInput).toHaveValue("abc");
    });
});

