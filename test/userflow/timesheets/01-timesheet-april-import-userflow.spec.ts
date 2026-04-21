import { expect, test } from "@playwright/test";

import { registerUserflowResultFolderRenaming } from "../register-userflow-result-folder";
import { assertOpenDashboardAccess } from "../../e2e/worker-test-helpers";
import { signInToUserflowSession } from "../workers/worker-userflow-helpers";
import {
    createApril2026AttendRecordArtifactsFromLatestWorkerHandoff,
} from "./attendrecord-artifact-helpers";
import {
    assertImportPreviewBeforeRemapping,
    remapImportPreviewWorkers,
    submitAttendRecordImport,
    uploadAttendRecordWorkbook,
} from "./timesheet-import-userflow-playwright-helpers";

registerUserflowResultFolderRenaming(test);

test.describe("Timesheet userflow", () => {
    test("imports the deterministic April 2026 AttendRecord workbook from the persisted worker handoff", async ({
        page,
    }) => {
        const artifact =
            await createApril2026AttendRecordArtifactsFromLatestWorkerHandoff();

        expect(artifact.expectedRowCount).toBe(110);
        expect(artifact.workers).toHaveLength(4);

        await signInToUserflowSession(page, "/dashboard/timesheet/import");
        await assertOpenDashboardAccess(page);

        await uploadAttendRecordWorkbook(page, artifact);
        await assertImportPreviewBeforeRemapping(page, artifact);
        await remapImportPreviewWorkers(page, artifact);
        await submitAttendRecordImport(page, artifact);
    });
});
