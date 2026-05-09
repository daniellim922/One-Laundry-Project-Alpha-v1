import { expect, test } from "@playwright/test";

import {
    WORKER_E2E_MATRIX_PROFILES,
    createWorkerE2EMatrixRunSuffix,
    expectWorkerMatrixRowMatchesCreatedProfile,
    fillWorkerFormFields,
    gotoNewWorker,
    submitWorkerForm,
    type WorkerMatrixE2EPersistedRecord,
    withWorkerE2EMatrixRunIdentity,
    writeWorkerMatrixE2EState,
} from "./fixtures";

test.describe.configure({ mode: "serial" });

test.describe("Worker matrix create", () => {
    test("workers.json matrix: create each profile and persist shared state", async ({
        page,
    }) => {
        test.setTimeout(180_000);
        const runSuffix = createWorkerE2EMatrixRunSuffix();
        const records: WorkerMatrixE2EPersistedRecord[] = [];

        for (const raw of WORKER_E2E_MATRIX_PROFILES) {
            const profile = withWorkerE2EMatrixRunIdentity(raw, runSuffix);

            await gotoNewWorker(page);
            await fillWorkerFormFields(page, profile);
            await submitWorkerForm(page, "create");
            await expect(page).toHaveURL(/\/dashboard\/worker\/all/);

            await expectWorkerMatrixRowMatchesCreatedProfile(page, profile);

            records.push({
                name: String(profile.name),
                nric: String(profile.nric),
                profile,
            });
        }

        writeWorkerMatrixE2EState({ runSuffix, records });
    });
});
