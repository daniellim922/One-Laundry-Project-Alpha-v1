import { expect, test } from "@playwright/test";

import { registerUserflowResultFolderRenaming } from "../register-userflow-result-folder";
import { assertOpenDashboardAccess } from "../../e2e/worker-test-helpers";
import {
    signInToUserflowSession,
    WORKER_USERFLOW_PERMUTATIONS,
} from "../workers/worker-userflow-helpers";
import {
    buildAdvanceUserflowHandoff,
    readWorkerUserflowHandoffForAdvances,
    writeAdvanceUserflowHandoff,
} from "./advance-userflow-helpers";
import {
    createAdvanceRequestThroughForm,
    verifyAdvanceRequestInAllAdvancesUi,
} from "./advance-userflow-playwright-helpers";

registerUserflowResultFolderRenaming(test);

test.describe("Advance userflow", () => {
    test("creates the deterministic advance scenario matrix from the persisted worker handoff", async ({
        page,
    }) => {
        test.setTimeout(5 * 60_000);

        const workerHandoff = await readWorkerUserflowHandoffForAdvances();
        const dataset = buildAdvanceUserflowHandoff(workerHandoff);

        expect(workerHandoff.workers).toHaveLength(
            WORKER_USERFLOW_PERMUTATIONS.length,
        );
        expect(dataset.scenarios.map((scenario) => scenario.permutationKey)).toEqual(
            WORKER_USERFLOW_PERMUTATIONS.map((permutation) => permutation.key),
        );

        await signInToUserflowSession(page, "/dashboard/advance/new");
        await assertOpenDashboardAccess(page);

        const createdHandoff = {
            ...dataset,
            scenarios: [],
        } as typeof dataset;

        for (const scenario of dataset.scenarios) {
            const createdRequests: typeof scenario.requests = [];

            for (const request of scenario.requests) {
                await createAdvanceRequestThroughForm(page, request);
                const advanceRequestId = await verifyAdvanceRequestInAllAdvancesUi(
                    page,
                    request,
                );

                createdRequests.push({
                    ...request,
                    advanceRequestId,
                });
            }

            createdHandoff.scenarios.push({
                ...scenario,
                requests: createdRequests,
            });
        }

        expect(createdHandoff.scenarios).toHaveLength(dataset.scenarios.length);
        expect(
            createdHandoff.scenarios.flatMap((scenario) => scenario.requests),
        ).toHaveLength(dataset.scenarios.flatMap((scenario) => scenario.requests).length);
        expect(
            createdHandoff.scenarios.flatMap((scenario) => scenario.requests).every(
                (request) => typeof request.advanceRequestId === "string",
            ),
        ).toBe(true);

        await writeAdvanceUserflowHandoff(createdHandoff);
    });
});
