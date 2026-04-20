import fs from "node:fs/promises";
import path from "node:path";

import type { TestInfo, test as PlaywrightTest } from "@playwright/test";

/**
 * Maps each userflow spec (path relative to test/userflow) to the folder name under
 * test/results-userflow/ after the run (video, trace, error-context, etc.).
 */
const RESULT_FOLDER_SLUG: Record<string, string> = {
    "workers/01-worker-new-userflow.spec.ts": "01-worker-new",
    "workers/02-worker-edit-userflow.spec.ts": "01-worker-edit",
    "timesheets/01-timesheet-march-userflow.spec.ts": "02-timesheet-new",
    "advance/01-advance-create-userflow.spec.ts": "03-advance-new",
};

export async function renameUserflowOutputToStableSlug(
    testInfo: TestInfo,
): Promise<void> {
    const rel = path
        .relative(testInfo.project.testDir, testInfo.file)
        .replace(/\\/g, "/");
    const slug = RESULT_FOLDER_SLUG[rel];
    if (!slug) return;

    const src = testInfo.outputDir;
    const dest = path.join(testInfo.project.outputDir, slug);

    if (path.resolve(src) === path.resolve(dest)) return;

    try {
        await fs.rm(dest, { recursive: true, force: true });
    } catch {
        /* ignore */
    }

    try {
        await fs.rename(src, dest);
    } catch {
        /* ignore — e.g. missing src when skipped */
    }
}

/** Call once per spec file so artifacts land in the stable slug folders. */
export function registerUserflowResultFolderRenaming(
    test: typeof PlaywrightTest,
): void {
    test.afterEach(async ({}, testInfo) => {
        await renameUserflowOutputToStableSlug(testInfo);
    });
}
