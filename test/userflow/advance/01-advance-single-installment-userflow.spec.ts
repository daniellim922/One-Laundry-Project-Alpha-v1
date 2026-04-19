import { expect, test } from "@playwright/test";

import { assertOpenDashboardAccess } from "../../e2e/worker-test-helpers";
import { signInToUserflowSession } from "../workers/worker-userflow-helpers";
import {
    buildAdvanceUserflowHandoff,
    readWorkerUserflowHandoffForAdvances,
    writeAdvanceUserflowHandoff,
    type AdvanceUserflowHandoff,
} from "./advance-userflow-helpers";
import {
    createAdvanceRequestThroughForm,
    verifyAdvanceRequestInAllAdvancesUi,
} from "./advance-userflow-playwright-helpers";

test.describe("Advance userflow", () => {
    test("creates the deterministic single-installment advance tracer bullet", async ({
        page,
    }) => {
        test.setTimeout(5 * 60_000);

        const workerHandoff = await readWorkerUserflowHandoffForAdvances();
        const dataset = buildAdvanceUserflowHandoff(workerHandoff);
        const scenario = dataset.scenarios.find(
            (candidate) => candidate.scenarioKey === "single-installment",
        );

        expect(scenario).toBeDefined();
        expect(scenario?.requests).toHaveLength(1);

        const request = scenario!.requests[0]!;

        await signInToUserflowSession(page, "/dashboard/advance/new");
        await assertOpenDashboardAccess(page);

        await createAdvanceRequestThroughForm(page, request);
        const advanceRequestId = await verifyAdvanceRequestInAllAdvancesUi(
            page,
            request,
        );

        const tracerBulletHandoff: AdvanceUserflowHandoff = {
            runId: dataset.runId,
            anchor: dataset.anchor,
            scenarios: [
                {
                    ...scenario!,
                    requests: [{ ...request, advanceRequestId }],
                },
            ],
        };

        await writeAdvanceUserflowHandoff(tracerBulletHandoff);
    });
});
