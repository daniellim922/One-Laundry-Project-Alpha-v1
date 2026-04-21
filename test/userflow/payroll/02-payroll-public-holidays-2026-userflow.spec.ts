import { expect, test } from "@playwright/test";

import { registerUserflowResultFolderRenaming } from "../register-userflow-result-folder";
import { assertOpenDashboardAccess } from "../../e2e/worker-test-helpers";
import { signInToUserflowSession } from "../workers/worker-userflow-helpers";
import {
    assertPublicHolidayRowsVisible,
    assertPublicHolidaySourceLinkContract,
    loadPublicHolidayYearThroughUi,
    MOM_2026_PUBLIC_HOLIDAYS,
    replacePublicHolidayYearRowsThroughUi,
} from "./public-holiday-userflow-playwright-helpers";

registerUserflowResultFolderRenaming(test);

test.describe("Payroll public-holidays userflow", () => {
    test("saves and reloads the official MOM 2026 calendar deterministically", async ({
        page,
    }) => {
        await signInToUserflowSession(page, "/dashboard/payroll/public-holidays");
        await assertOpenDashboardAccess(page);

        await expect(page).toHaveURL(
            /\/dashboard\/payroll\/public-holidays(?:\?.*)?$/,
        );
        await assertPublicHolidaySourceLinkContract(page);

        await replacePublicHolidayYearRowsThroughUi(page, {
            year: 2026,
            holidays: MOM_2026_PUBLIC_HOLIDAYS,
        });

        await loadPublicHolidayYearThroughUi(page, 2026);
        await assertPublicHolidayRowsVisible(page, MOM_2026_PUBLIC_HOLIDAYS);
    });
});
