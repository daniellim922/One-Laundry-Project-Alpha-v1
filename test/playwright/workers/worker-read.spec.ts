import { test } from "@playwright/test";

import {
    expectWorkerMatrixRowMatchesCreatedProfile,
    gotoAllWorkers,
    readWorkerMatrixE2EState,
} from "./fixtures";

test.describe.configure({ mode: "serial" });

test.describe("Worker matrix read", () => {
    test("workers.json matrix: rows match persisted creates", async ({
        page,
    }) => {
        test.setTimeout(180_000);
        const { records } = readWorkerMatrixE2EState();

        await gotoAllWorkers(page);

        for (const record of records) {
            await expectWorkerMatrixRowMatchesCreatedProfile(
                page,
                record.profile,
            );
        }
    });
});
