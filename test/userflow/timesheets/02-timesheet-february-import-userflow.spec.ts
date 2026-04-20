import { expect, test } from "@playwright/test";

import { assertOpenDashboardAccess } from "../../e2e/worker-test-helpers";
import { signInToUserflowSession } from "../workers/worker-userflow-helpers";
import {
    createFebruary2026AttendRecordArtifactsFromLatestWorkerHandoff,
} from "./february-attendrecord-artifact-helpers";
import {
    assertFebruaryImportPreviewBeforeRemapping,
    remapFebruaryImportPreviewWorkers,
    submitFebruaryAttendRecordImport,
    uploadFebruaryAttendRecordWorkbook,
    verifyFebruaryImportedRowsInAllTimesheetsUi,
} from "./timesheet-import-userflow-playwright-helpers";

test.describe("Timesheet userflow", () => {
    test("imports the deterministic February 2026 AttendRecord workbook after the March smoke path", async ({
        page,
    }) => {
        const artifact =
            await createFebruary2026AttendRecordArtifactsFromLatestWorkerHandoff();

        expect(artifact.expectedRowCount).toBe(102);
        expect(artifact.workers).toHaveLength(4);

        await signInToUserflowSession(page, "/dashboard/timesheet/import");
        await assertOpenDashboardAccess(page);

        await uploadFebruaryAttendRecordWorkbook(page, artifact);
        await assertFebruaryImportPreviewBeforeRemapping(page, artifact);
        await remapFebruaryImportPreviewWorkers(page, artifact);
        await submitFebruaryAttendRecordImport(page, artifact);
        await verifyFebruaryImportedRowsInAllTimesheetsUi(page, artifact);
    });
});
