import { expect, test, type Locator, type Page } from "@playwright/test";

import type { WorkerUpsertFormInput } from "@/db/schemas/worker-employment";
import type {
    WorkerEmploymentArrangement,
    WorkerEmploymentType,
    WorkerPaymentMethod,
    WorkerShiftPattern,
    WorkerStatus,
} from "@/types/status";
import {
    readWorkerMatrixE2EState,
    type WorkerMatrixE2EProfileForCreate,
} from "../shared/matrix";
import {
    submitWorkerForm,
    WORKER_ALL_PATH_URL_RE,
} from "./worker-submit-form";

const WORKER_FORM_ELEMENT_ID_PREFIX = "worker-form" as const;
const WORKER_E2E_DEFAULT_TABLE_STATUS =
    "Active" as const satisfies WorkerStatus;

type WorkerFormInputFieldKey =
    | "name"
    | "nric"
    | "email"
    | "phone"
    | "countryOfOrigin"
    | "race"
    | "monthlyPay"
    | "hourlyRate"
    | "restDayRate"
    | "minimumWorkingHours"
    | "cpf"
    | "payNowPhone"
    | "bankAccountNumber";

type WorkerUpsertScalars = Pick<WorkerUpsertFormInput, WorkerFormInputFieldKey>;
type WorkerUpsertChoices = Pick<
    WorkerUpsertFormInput,
    | "employmentType"
    | "employmentArrangement"
    | "shiftPattern"
    | "status"
    | "paymentMethod"
>;
type WorkerFormFieldValues = Partial<WorkerUpsertScalars & WorkerUpsertChoices>;

function isBrowserOrContextClosedError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    return (
        err.name === "TargetClosedError" ||
        err.message.includes("Target page, context or browser has been closed")
    );
}

function workerFormInputLocator(page: Page, field: WorkerFormInputFieldKey) {
    return page.locator(`#${WORKER_FORM_ELEMENT_ID_PREFIX}-${field}`);
}

function mainTableRowByText(page: Page, text: string) {
    return page
        .getByRole("main")
        .getByRole("row")
        .filter({ hasText: text });
}

function workerTableRow(page: Page, workerName: string) {
    return mainTableRowByText(page, workerName);
}

function workerTableMoneyCellFromJsonAmount(amount: string | number): string {
    return `$${Number(amount)}`;
}

function workerTableMinimumHoursCellFromJson(hours: string | number): string {
    return `${Number(hours)}h`;
}

function nonEmptyMoneyOrHoursField(
    value: string | number | null | undefined,
): string | null {
    if (value == null) return null;
    const s = typeof value === "number" ? String(value) : value.trim();
    return s.length > 0 ? s : null;
}

function coerceFormFillText(value: string | number | null | undefined): string {
    if (value == null) return "";
    return typeof value === "number" ? String(value) : value;
}

function workerMatrixEmailInsertEdited(email: string): string {
    const trimmed = email.trim();
    const at = trimmed.indexOf("@");
    if (at <= 0) return `${trimmed}edited`;
    return `${trimmed.slice(0, at)}edited${trimmed.slice(at)}`;
}

function workerMatrixMoneyAddCent(value: string): string {
    const n = Number(value.trim());
    const next = n + 0.01;
    const rounded = Math.round(next * 100) / 100;
    return String(rounded);
}

function workerMatrixIntegerLikeAppend01(value: string): string {
    const s = value.trim();
    const base = s.includes(".") ? s.split(".")[0] ?? s : s;
    return `${base}01`;
}

function applyWorkerMatrixUpdateTransforms(
    profile: WorkerMatrixE2EProfileForCreate,
): WorkerFormFieldValues {
    const out: WorkerFormFieldValues = {};
    out.name = `${profile.name} edited`;
    out.nric = `${profile.nric}01`;
    if (profile.email != null && profile.email.trim() !== "") {
        out.email = workerMatrixEmailInsertEdited(profile.email);
    }
    const phone = profile.phone?.trim();
    if (phone != null && phone !== "") {
        out.phone = `${phone}01`;
    }
    if (
        profile.countryOfOrigin != null &&
        String(profile.countryOfOrigin).trim() !== ""
    ) {
        out.countryOfOrigin = `${coerceFormFillText(profile.countryOfOrigin)} edited`;
    }
    if (profile.race != null && String(profile.race).trim() !== "") {
        out.race = `${coerceFormFillText(profile.race)} edited`;
    }

    const monthlyPay = nonEmptyMoneyOrHoursField(profile.monthlyPay);
    if (monthlyPay != null) {
        out.monthlyPay = workerMatrixMoneyAddCent(monthlyPay);
    }
    const hourlyRate = nonEmptyMoneyOrHoursField(profile.hourlyRate);
    if (hourlyRate != null) {
        out.hourlyRate = workerMatrixMoneyAddCent(hourlyRate);
    }
    const restDayRate = nonEmptyMoneyOrHoursField(profile.restDayRate);
    if (restDayRate != null) {
        out.restDayRate = workerMatrixMoneyAddCent(restDayRate);
    }
    const minimumWorkingHours = nonEmptyMoneyOrHoursField(
        profile.minimumWorkingHours,
    );
    if (minimumWorkingHours != null) {
        out.minimumWorkingHours =
            workerMatrixIntegerLikeAppend01(minimumWorkingHours);
    }
    const cpf = nonEmptyMoneyOrHoursField(profile.cpf);
    if (cpf != null) {
        out.cpf = workerMatrixIntegerLikeAppend01(cpf);
    }

    if (profile.payNowPhone != null && String(profile.payNowPhone).trim() !== "") {
        out.payNowPhone = `${coerceFormFillText(profile.payNowPhone)}01`;
    }
    if (
        profile.bankAccountNumber != null &&
        String(profile.bankAccountNumber).trim() !== ""
    ) {
        out.bankAccountNumber = `${coerceFormFillText(profile.bankAccountNumber)}01`;
    }

    return out;
}

async function setDashboardMainTableSearchFilter(
    page: Page,
    value: string,
): Promise<void> {
    const search = page.getByRole("main").getByPlaceholder("Search...");
    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.evaluate((el: HTMLInputElement, val: string) => {
        const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
        )?.set;
        setter?.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
}

async function clickOpenRowActionsTrigger(
    row: Locator,
    options?: { visibleTimeoutMs?: number; menuOpenTimeoutMs?: number },
): Promise<void> {
    const visibleTimeoutMs = options?.visibleTimeoutMs ?? 15_000;
    const menuOpenTimeoutMs = options?.menuOpenTimeoutMs ?? 15_000;
    const trigger = row.getByRole("button", { name: "Open row actions" });
    await expect(trigger).toBeVisible({ timeout: visibleTimeoutMs });
    await expect(trigger).toBeEnabled({ timeout: visibleTimeoutMs });

    const page = row.page();
    const MENU_OPEN_PROBE_MS = 750;

    const menuAppearsOpen = async (): Promise<boolean> => {
        try {
            const expanded = await trigger.getAttribute("aria-expanded", {
                timeout: MENU_OPEN_PROBE_MS,
            });
            if (expanded === "true") return true;
        } catch {
            // Trigger detached or row remounted during DataTable URL-sync.
        }

        const menu = page.getByRole("menu").first();
        try {
            await menu.waitFor({ state: "visible", timeout: MENU_OPEN_PROBE_MS });
            return true;
        } catch {
            // No portal menu yet.
        }

        try {
            const menuitem = page.getByRole("menuitem").first();
            await menuitem.waitFor({
                state: "visible",
                timeout: MENU_OPEN_PROBE_MS,
            });
            return true;
        } catch {
            return false;
        }
    };

    const tryOpen = async (): Promise<void> => {
        try {
            await trigger.click({ force: true, timeout: 8_000 });
        } catch (err) {
            if (isBrowserOrContextClosedError(err)) {
                throw err;
            }
            const pg = row.page();
            if (pg.isClosed()) {
                const original =
                    err instanceof Error ? err.stack ?? err.message : String(err);
                throw new Error(
                    `Row actions trigger click failed and page is already closed. Original error:\n${original}`,
                );
            }
            try {
                await trigger.evaluate((el: HTMLElement) => {
                    el.click();
                });
            } catch (evalErr) {
                if (isBrowserOrContextClosedError(evalErr)) {
                    const original =
                        err instanceof Error ? err.message : String(err);
                    const closedMsg =
                        evalErr instanceof Error
                            ? evalErr.message
                            : String(evalErr);
                    throw new Error(
                        `Row actions menu: DOM click fallback ran while browser/context was closing (${closedMsg}). Original pointer click error: ${original}`,
                    );
                }
                throw evalErr;
            }
        }
    };

    await tryOpen();

    await expect
        .poll(
            async () => {
                if (await menuAppearsOpen()) return true;
                await tryOpen();
                return menuAppearsOpen();
            },
            {
                message:
                    "Row actions menu did not open (expected aria-expanded=true or visible menu/menuitem)",
                timeout: menuOpenTimeoutMs,
            },
        )
        .toBeTruthy();
}

async function followDashboardRowMenuItem(
    page: Page,
    itemLabel: string,
): Promise<void> {
    const menuitem = page.getByRole("menuitem", {
        name: itemLabel,
        exact: true,
    });
    await menuitem.waitFor({ state: "visible", timeout: 15_000 });
    await menuitem.scrollIntoViewIfNeeded();

    const href = await menuitem.getAttribute("href");
    if (href?.startsWith("/")) {
        await page.goto(href);
        return;
    }

    try {
        await menuitem.click({ force: true, timeout: 10_000 });
    } catch {
        const hrefRetry = await menuitem.getAttribute("href");
        if (hrefRetry?.startsWith("/")) {
            await page.goto(hrefRetry);
            return;
        }
        throw new Error(
            `Could not activate row menu item "${itemLabel}" (no href and click failed).`,
        );
    }
}

async function gotoAllWorkers(page: Page): Promise<void> {
    await page.goto("/dashboard/worker/all");
    await page.getByRole("heading", { name: "All workers" }).waitFor();
}

async function openWorkerRowMenuItem(
    page: Page,
    workerName: string,
    item: "View" | "Edit",
): Promise<void> {
    const table = page.getByRole("main").locator("table").first();
    await expect(
        table
            .getByRole("button", {
                name: "Open row actions",
            })
            .first(),
    ).toBeVisible({ timeout: 60_000 });

    await setDashboardMainTableSearchFilter(page, workerName);

    const row = workerTableRow(page, workerName);
    await expect(row).toBeVisible({ timeout: 90_000 });
    await row.scrollIntoViewIfNeeded();
    await clickOpenRowActionsTrigger(row, {
        visibleTimeoutMs: 45_000,
        menuOpenTimeoutMs: 45_000,
    });
    await followDashboardRowMenuItem(page, item);
}

async function fillName(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "name").fill(value);
}

async function fillNric(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "nric").fill(value);
}

async function fillEmail(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "email").fill(value);
}

async function fillPhone(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "phone").fill(value);
}

async function fillCountryOfOrigin(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "countryOfOrigin").fill(value);
}

async function fillRace(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "race").fill(value);
}

async function fillMonthlyPay(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "monthlyPay").fill(value);
}

async function fillHourlyRate(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "hourlyRate").fill(value);
}

async function fillRestDayRate(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "restDayRate").fill(value);
}

async function fillMinimumWorkingHours(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "minimumWorkingHours").fill(value);
}

async function fillCpf(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "cpf").fill(value);
}

async function fillPayNowPhone(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "payNowPhone").fill(value);
}

async function fillBankAccountNumber(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "bankAccountNumber").fill(value);
}

async function setEmploymentType(
    page: Page,
    value: WorkerEmploymentType,
): Promise<void> {
    await page
        .getByRole("group", { name: "Employment type" })
        .getByRole("button", { name: value, exact: true })
        .click();
}

async function setEmploymentArrangement(
    page: Page,
    value: WorkerEmploymentArrangement,
): Promise<void> {
    await page
        .getByRole("group", { name: "Employment arrangement" })
        .getByRole("button", { name: value, exact: true })
        .click();
}

async function setShiftPattern(
    page: Page,
    value: WorkerShiftPattern,
): Promise<void> {
    await page
        .getByRole("group", { name: "Shift pattern" })
        .getByRole("button", { name: value, exact: true })
        .click();
}

async function setStatus(page: Page, value: WorkerStatus): Promise<void> {
    const group = page.getByRole("group", { name: "Status" });
    try {
        await group.waitFor({ state: "visible", timeout: 45_000 });
    } catch {
        return;
    }
    await group.getByRole("button", { name: value, exact: true }).click();
}

async function selectPaymentMethod(
    page: Page,
    method: WorkerPaymentMethod,
): Promise<void> {
    await page.locator(`#${WORKER_FORM_ELEMENT_ID_PREFIX}-paymentMethod`).click();
    await page.getByRole("option", { name: method, exact: true }).click();
}

async function fillWorkerFormFields(
    page: Page,
    values: WorkerFormFieldValues,
): Promise<void> {
    if (values.name !== undefined) {
        await fillName(page, coerceFormFillText(values.name));
    }
    if (values.nric !== undefined) {
        await fillNric(page, coerceFormFillText(values.nric));
    }
    if (values.email !== undefined) {
        await fillEmail(page, coerceFormFillText(values.email));
    }
    if (values.phone !== undefined) {
        await fillPhone(page, coerceFormFillText(values.phone));
    }
    if (values.countryOfOrigin !== undefined) {
        await fillCountryOfOrigin(page, coerceFormFillText(values.countryOfOrigin));
    }
    if (values.race !== undefined) {
        await fillRace(page, coerceFormFillText(values.race));
    }

    if (values.employmentType !== undefined) {
        await setEmploymentType(page, values.employmentType);
    }
    if (values.employmentArrangement !== undefined) {
        await setEmploymentArrangement(page, values.employmentArrangement);
    }
    if (values.shiftPattern !== undefined) {
        await setShiftPattern(page, values.shiftPattern);
    }
    if (values.status !== undefined) {
        await setStatus(page, values.status);
    }

    if (values.monthlyPay !== undefined) {
        await fillMonthlyPay(page, coerceFormFillText(values.monthlyPay));
    }
    if (values.hourlyRate !== undefined) {
        await fillHourlyRate(page, coerceFormFillText(values.hourlyRate));
    }
    if (values.restDayRate !== undefined) {
        await fillRestDayRate(page, coerceFormFillText(values.restDayRate));
    }
    if (values.minimumWorkingHours !== undefined) {
        await fillMinimumWorkingHours(
            page,
            coerceFormFillText(values.minimumWorkingHours),
        );
    }
    if (values.cpf !== undefined) {
        await fillCpf(page, coerceFormFillText(values.cpf));
    }

    if (values.paymentMethod != null) {
        await selectPaymentMethod(page, values.paymentMethod);
    }
    if (values.payNowPhone !== undefined) {
        await fillPayNowPhone(page, coerceFormFillText(values.payNowPhone));
    }
    if (values.bankAccountNumber !== undefined) {
        await fillBankAccountNumber(
            page,
            coerceFormFillText(values.bankAccountNumber),
        );
    }
}

async function expectWorkerMatrixRowMatchesUpdatedProfile(
    page: Page,
    originalProfile: WorkerMatrixE2EProfileForCreate,
    transforms: WorkerFormFieldValues,
): Promise<void> {
    const row = workerTableRow(page, transforms.name!);
    await expect(row).toBeVisible();
    await expect(row).toContainText(WORKER_E2E_DEFAULT_TABLE_STATUS);
    await expect(row).toContainText(originalProfile.shiftPattern!);
    await expect(row).toContainText(originalProfile.employmentType!);
    await expect(row).toContainText(originalProfile.employmentArrangement!);
    await expect(row).toContainText(originalProfile.paymentMethod!);

    const monthlyPay = transforms.monthlyPay;
    if (monthlyPay != null && monthlyPay !== "") {
        await expect(row).toContainText(
            workerTableMoneyCellFromJsonAmount(monthlyPay),
        );
    }
    const hourlyRate = transforms.hourlyRate;
    if (hourlyRate != null && hourlyRate !== "") {
        await expect(row).toContainText(
            workerTableMoneyCellFromJsonAmount(hourlyRate),
        );
    }
    const minimumWorkingHours = transforms.minimumWorkingHours;
    if (minimumWorkingHours != null && minimumWorkingHours !== "") {
        await expect(row).toContainText(
            workerTableMinimumHoursCellFromJson(minimumWorkingHours),
        );
    }
}

test.describe.configure({ mode: "serial" });

test.describe("Worker matrix update", () => {
    test("workers.json matrix: set active and apply edit transforms", async ({
        page,
    }) => {
        test.setTimeout(180_000);
        const { records } = readWorkerMatrixE2EState();

        for (const record of records) {
            const transforms = applyWorkerMatrixUpdateTransforms(record.profile);

            await gotoAllWorkers(page);
            await openWorkerRowMenuItem(page, record.name, "Edit");

            await page
                .getByRole("group", { name: "Status" })
                .waitFor({ state: "visible", timeout: 15_000 });
            await page
                .getByRole("group", { name: "Status" })
                .getByRole("button", { name: "Active", exact: true })
                .click();

            await fillWorkerFormFields(page, transforms);
            await submitWorkerForm(page, "edit");
            await expect(page).toHaveURL(WORKER_ALL_PATH_URL_RE, {
                timeout: 15_000,
            });

            await expectWorkerMatrixRowMatchesUpdatedProfile(
                page,
                record.profile,
                transforms,
            );

            await openWorkerRowMenuItem(page, transforms.name!, "View");
            await expect(page.locator("#worker-form-name")).toHaveValue(
                transforms.name!,
            );
            await expect(page.locator("#worker-form-nric")).toHaveValue(
                transforms.nric!,
            );
            if (
                transforms.email != null &&
                String(transforms.email).trim() !== ""
            ) {
                await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
                    String(transforms.email),
                );
            }
            if (
                transforms.phone != null &&
                String(transforms.phone).trim() !== ""
            ) {
                await expect(page.getByLabel("Phone", { exact: true })).toHaveValue(
                    String(transforms.phone),
                );
            }

            const restAfter = nonEmptyMoneyOrHoursField(transforms.restDayRate);
            if (restAfter != null) {
                await expect(page.locator("#worker-form-restDayRate")).toHaveValue(
                    restAfter,
                );
            }
        }
    });
});
