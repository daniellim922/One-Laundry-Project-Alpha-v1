import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** Custom helpers throw on failure; eslint cannot see agent-browser assertions. */
/* eslint-disable vitest/expect-expect */

import {
    ab,
    authLogin,
    click,
    closeBrowser,
    e2eDebugLog,
    evalJs,
    expectSnapshotContains,
    expectUrlContains,
    fill,
    getCount,
    getValue,
    isEnabled,
    open,
    recordStart,
    recordStop,
    resetAgentBrowserSessions,
    screenshot,
    userflowBaseUrl,
    VIDEOS_DIR,
    waitForLoadState,
    waitForUrl,
    waitMs,
} from "@/test/e2e/agent-browser";

const base = () => userflowBaseUrl();

function segmentPressedLabel(ariaLabel: string): string {
    const sel = `[aria-label="${ariaLabel}"]`;
    return evalJs(
        `(() => { const g = document.querySelector(${JSON.stringify(sel)}); const p = g?.querySelector('button[aria-pressed="true"]'); return p?.textContent?.trim() ?? ""; })()`,
    );
}

function firstViewHref(): string {
    return evalJs(`(() => {
      const a = document.querySelector('a[href*="/dashboard/worker/"][href*="/view"]');
      return a?.getAttribute("href") ?? "";
    })()`);
}

function workerIdFromViewHref(href: string): string {
    const m = href.match(/\/worker\/([a-f0-9-]{36})\/view/);
    if (!m?.[1]) {
        throw new Error(`Could not parse worker id from href: ${href}`);
    }
    return m[1];
}

/** Unique labels per run to avoid NRIC collisions. */
const runId = Date.now();
const ftWorkerName = `E2E-FT-${runId}`;
const ftWorkerNric = `S${runId}A`;
const ptWorkerName = `E2E-PT-${runId}`;
const statusWorkerName = `E2E-STATUS-${runId}`;

let createdFullTimeId: string | undefined;
let createdStatusWorkerId: string | undefined;

let workerCrudE2eRecordingActive = false;

beforeAll(async () => {
    e2eDebugLog("beforeAll: resetAgentBrowserSessions");
    resetAgentBrowserSessions();
    e2eDebugLog(`beforeAll: open login (${base()}/login)`);
    open(`${base()}/login`);
    e2eDebugLog("beforeAll: authLogin(one-laundry)");
    try {
        authLogin("one-laundry");
    } catch (e) {
        throw new Error(
            'E2E auth failed. Run `npm run test:e2e:setup-auth` with USERFLOW_LOGIN_EMAIL, USERFLOW_LOGIN_PASSWORD, and USERFLOW_BASE_URL in `.env`.',
            { cause: e },
        );
    }
    e2eDebugLog("beforeAll: waitForUrl **/dashboard**");
    waitForUrl("**/dashboard**");
    e2eDebugLog("beforeAll: recordStart");
    recordStart(path.join(VIDEOS_DIR, `worker-crud-${runId}.webm`));
    workerCrudE2eRecordingActive = true;
    e2eDebugLog("beforeAll: ready");
}, 120_000);

afterAll(() => {
    try {
        if (workerCrudE2eRecordingActive) {
            recordStop();
        }
    } finally {
        closeBrowser();
    }
});

describe("worker list", () => {
    it("shows the worker list table with columns", () => {
        open(`${base()}/dashboard/worker/all`);
        waitForLoadState("networkidle");
        for (const header of [
            "Name",
            "NRIC",
            "Status",
            "Shift Pattern",
            "Employment Type",
            "Employment Arrangement",
            "Minimum Working Hours",
            "Monthly Pay",
            "Hourly Rate",
            "Payment Method",
        ]) {
            expectSnapshotContains(header);
        }
        screenshot("worker-list.png");
    });

    it("shows worker data rows with correct badges", () => {
        open(`${base()}/dashboard/worker/all`);
        waitForLoadState("networkidle");
        expect(getCount('button[aria-label="Open row actions"]')).toBeGreaterThan(
            0,
        );
        const body = evalJs("document.body.innerText");
        expect(
            body.includes("Active") || body.includes("Inactive"),
        ).toBe(true);
        expect(
            body.includes("Active") || body.includes("Inactive"),
        ).toBe(true);
    });

    it("has View and Edit actions in row dropdown", () => {
        open(`${base()}/dashboard/worker/all`);
        waitForLoadState("networkidle");
        const n = getCount('button[aria-label="Open row actions"]');
        if (n === 0) {
            throw new Error(
                "No worker rows found — seed the database or create workers before this test.",
            );
        }
        ab(["find", "role", "button", "click", "--name", "Open row actions"]);
        waitMs(300);
        expectSnapshotContains("View");
        expectSnapshotContains("Edit");
    });
});

describe("worker create", () => {
    it("shows empty form with correct default selections", () => {
        open(`${base()}/dashboard/worker/new`);
        waitForLoadState("networkidle");
        expect(segmentPressedLabel("Employment type")).toBe("Full Time");
        expect(segmentPressedLabel("Employment arrangement")).toBe("Local Worker");
        expect(segmentPressedLabel("Shift pattern")).toBe("Day Shift");
        screenshot("worker-create-empty-form.png");
    });

    it("validates required fields on submit", () => {
        open(`${base()}/dashboard/worker/new`);
        waitForLoadState("networkidle");
        fill("#worker-form-name", "temp");
        fill("#worker-form-name", "");
        waitMs(200);
        expect(isEnabled('button[type="submit"]')).toBe(false);
    });

    it("creates a full-time foreign worker and redirects to list", () => {
        open(`${base()}/dashboard/worker/new`);
        waitForLoadState("networkidle");
        fill("#worker-form-name", ftWorkerName);
        fill("#worker-form-nric", ftWorkerNric);
        fill("#worker-form-email", `e2e-ft-${runId}@example.com`);
        fill("#worker-form-phone", "91234567");
        fill("#worker-form-countryOfOrigin", "Singapore");
        fill("#worker-form-race", "Test");
        ab([
            "find",
            "role",
            "button",
            "click",
            "--name",
            "Foreign Worker",
        ]);
        waitMs(150);
        fill("#worker-form-monthlyPay", "3000");
        fill("#worker-form-hourlyRate", "15");
        fill("#worker-form-restDayRate", "50");
        fill("#worker-form-minimumWorkingHours", "260");
        click("#worker-form-paymentMethod");
        waitMs(200);
        ab(["find", "role", "option", "click", "--name", "PayNow"]);
        waitMs(200);
        fill("#worker-form-payNowPhone", "91234567");
        click('button[type="submit"]');
        waitForUrl("**/dashboard/worker/all**");
        expectUrlContains("/dashboard/worker/all");
        open(
            `${base()}/dashboard/worker/all?search=${encodeURIComponent(ftWorkerName)}`,
        );
        waitForLoadState("networkidle");
        expectSnapshotContains(ftWorkerName);

        const href = firstViewHref();
        createdFullTimeId = workerIdFromViewHref(href);
    });

    it("creates a part-time local worker", () => {
        open(`${base()}/dashboard/worker/new`);
        waitForLoadState("networkidle");
        ab(["find", "role", "button", "click", "--name", "Part Time"]);
        waitMs(200);
        fill("#worker-form-name", ptWorkerName);
        fill("#worker-form-hourlyRate", "12");
        click('button[type="submit"]');
        waitForUrl("**/dashboard/worker/all**");
        open(
            `${base()}/dashboard/worker/all?search=${encodeURIComponent(ptWorkerName)}`,
        );
        waitForLoadState("networkidle");
        expectSnapshotContains(ptWorkerName);
    });

    it("shows conditional payment fields", () => {
        open(`${base()}/dashboard/worker/new`);
        waitForLoadState("networkidle");
        click("#worker-form-paymentMethod");
        waitMs(200);
        ab(["find", "role", "option", "click", "--name", "PayNow"]);
        waitMs(200);
        screenshot("worker-create-payment-paynow.png");
        click("#worker-form-paymentMethod");
        waitMs(200);
        ab([
            "find",
            "role",
            "option",
            "click",
            "--name",
            "Bank Transfer",
        ]);
        waitMs(200);
        screenshot("worker-create-payment-bank.png");
        click("#worker-form-paymentMethod");
        waitMs(200);
        ab(["find", "role", "option", "click", "--name", "Cash"]);
        waitMs(200);
        screenshot("worker-create-payment-cash.png");
    });
});

describe("worker view", () => {
    it("shows worker details in read-only mode", () => {
        if (!createdFullTimeId) {
            throw new Error("Missing createdFullTimeId — run create tests first.");
        }
        open(`${base()}/dashboard/worker/${createdFullTimeId}/view`);
        waitForLoadState("networkidle");
        expect(isEnabled("#worker-form-name")).toBe(false);
        expect(getValue("#worker-form-name")).toBe(ftWorkerName);
        expect(getValue("#worker-form-nric")).toBe(ftWorkerNric);
        expectSnapshotContains("Edit");
        screenshot("worker-view-detail.png");
    });

    it("has Edit link that navigates to edit page", () => {
        if (!createdFullTimeId) {
            throw new Error("Missing createdFullTimeId — run create tests first.");
        }
        open(`${base()}/dashboard/worker/${createdFullTimeId}/view`);
        waitForLoadState("networkidle");
        ab(["find", "role", "link", "click", "--name", "Edit"]);
        waitForLoadState("networkidle");
        expectUrlContains("/edit");
    });
});

describe("worker edit", () => {
    it("pre-fills form with existing worker data", () => {
        if (!createdFullTimeId) {
            throw new Error("Missing createdFullTimeId — run create tests first.");
        }
        open(`${base()}/dashboard/worker/${createdFullTimeId}/edit`);
        waitForLoadState("networkidle");
        expect(getValue("#worker-form-name")).toBe(ftWorkerName);
        expect(getValue("#worker-form-nric")).toBe(ftWorkerNric);
        screenshot("worker-edit-prefilled.png");
    });

    it("updates worker and redirects to list", () => {
        if (!createdFullTimeId) {
            throw new Error("Missing createdFullTimeId — run create tests first.");
        }
        const newPhone = `9${String(runId).slice(-7)}`;
        open(`${base()}/dashboard/worker/${createdFullTimeId}/edit`);
        waitForLoadState("networkidle");
        fill("#worker-form-phone", newPhone);
        click('button[type="submit"]');
        waitForUrl("**/dashboard/worker/all**");
        open(`${base()}/dashboard/worker/${createdFullTimeId}/view`);
        waitForLoadState("networkidle");
        expect(getValue("#worker-form-phone")).toBe(newPhone);
    });

    it("toggles worker status Active/Inactive", () => {
        open(`${base()}/dashboard/worker/new`);
        waitForLoadState("networkidle");
        fill("#worker-form-name", statusWorkerName);
        fill("#worker-form-hourlyRate", "11");
        ab(["find", "role", "button", "click", "--name", "Part Time"]);
        waitMs(200);
        click('button[type="submit"]');
        waitForUrl("**/dashboard/worker/all**");
        open(
            `${base()}/dashboard/worker/all?search=${encodeURIComponent(statusWorkerName)}`,
        );
        waitForLoadState("networkidle");
        const href = firstViewHref();
        createdStatusWorkerId = workerIdFromViewHref(href);

        open(`${base()}/dashboard/worker/${createdStatusWorkerId}/edit`);
        waitForLoadState("networkidle");
        ab(["find", "role", "button", "click", "--name", "Inactive"]);
        waitMs(200);
        const pressed = evalJs(`(() => {
          const g = document.querySelector('[aria-label="Status"]');
          const inactive = [...(g?.querySelectorAll("button") ?? [])].find(
            (b) => b.textContent?.trim() === "Inactive"
          );
          return inactive?.getAttribute("aria-pressed") ?? "";
        })()`);
        expect(pressed).toBe("true");
        click('button[type="submit"]');
        waitForUrl("**/dashboard/worker/all**");
        open(`${base()}/dashboard/worker/${createdStatusWorkerId}/view`);
        waitForLoadState("networkidle");
        expectSnapshotContains("Inactive");
    });
});
