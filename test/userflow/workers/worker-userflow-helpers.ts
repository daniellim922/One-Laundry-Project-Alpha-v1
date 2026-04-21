import { expect, type Page } from "@playwright/test";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type WorkerEmploymentType = "Full Time" | "Part Time";
export type WorkerArrangement = "Local Worker" | "Foreign Worker";
export type WorkerPaymentMethod = "Bank Transfer" | "PayNow" | "Cash";

export type WorkerUserflowPermutation = {
    key:
        | "full-time-local-bank-transfer"
        | "full-time-foreign-paynow"
        | "part-time-foreign-cash"
        | "part-time-local-paynow";
    alias: "FTLW" | "FTFW" | "PTFW" | "PTLW";
    employmentType: WorkerEmploymentType;
    employmentArrangement: WorkerArrangement;
    paymentMethod: WorkerPaymentMethod;
    phone: string;
    hourlyRate: string;
    monthlyPay?: string;
    restDayRate?: string;
    minimumWorkingHours?: string;
    cpf?: string;
    countryOfOrigin?: string;
    bankAccountNumber?: string;
    payNowPhone?: string;
};

export type WorkerUserflowSeedData = {
    name: string;
    nric: string;
    email: string;
    phone: string;
    employmentType: WorkerEmploymentType;
    employmentArrangement: WorkerArrangement;
    paymentMethod: WorkerPaymentMethod;
    hourlyRate: string;
    monthlyPay: string | null;
    restDayRate: string | null;
    minimumWorkingHours: string | null;
    cpf: string | null;
    countryOfOrigin: string | null;
    bankAccountNumber: string | null;
    payNowPhone: string | null;
};

export type WorkerUserflowHandoffRecord = {
    permutationKey: WorkerUserflowPermutation["key"];
    workerId: string;
    initialValues: WorkerUserflowSeedData;
};

export type WorkerUserflowHandoff = {
    runId: string;
    workers: WorkerUserflowHandoffRecord[];
};

export const USERFLOW_PERSISTED_ARTIFACTS_DIR = path.join(
    process.cwd(),
    "test",
    "artifacts-userflow",
);

export const USERFLOW_HANDOFF_PATH = path.join(
    USERFLOW_PERSISTED_ARTIFACTS_DIR,
    "worker-userflow-handoff.json",
);

const USERFLOW_LOGIN_EMAIL = process.env.USERFLOW_LOGIN_EMAIL?.trim();
const USERFLOW_LOGIN_PASSWORD = process.env.USERFLOW_LOGIN_PASSWORD ?? "";

export const WORKER_USERFLOW_PERMUTATIONS: readonly WorkerUserflowPermutation[] =
    [
        {
            key: "full-time-local-bank-transfer",
            alias: "FTLW",
            employmentType: "Full Time",
            employmentArrangement: "Local Worker",
            paymentMethod: "Bank Transfer",
            phone: "81112222",
            monthlyPay: formatMoney(2800),
            hourlyRate: formatMoney(12.5),
            restDayRate: formatMoney(18.75),
            minimumWorkingHours: "250",
            cpf: formatMoney(120.55),
            bankAccountNumber: "1234567890",
        },
        {
            key: "full-time-foreign-paynow",
            alias: "FTFW",
            employmentType: "Full Time",
            employmentArrangement: "Foreign Worker",
            paymentMethod: "PayNow",
            phone: "82223333",
            monthlyPay: formatMoney(2950),
            hourlyRate: formatMoney(13.2),
            restDayRate: formatMoney(19.8),
            minimumWorkingHours: "260",
            countryOfOrigin: "Malaysia",
            payNowPhone: "82223333",
        },
        {
            key: "part-time-foreign-cash",
            alias: "PTFW",
            employmentType: "Part Time",
            employmentArrangement: "Foreign Worker",
            paymentMethod: "Cash",
            phone: "83334444",
            hourlyRate: formatMoney(11.25),
            countryOfOrigin: "Myanmar",
        },
        {
            key: "part-time-local-paynow",
            alias: "PTLW",
            employmentType: "Part Time",
            employmentArrangement: "Local Worker",
            paymentMethod: "PayNow",
            phone: "84445555",
            hourlyRate: formatMoney(14.1),
            cpf: formatMoney(88.4),
            payNowPhone: "84445555",
        },
    ] as const;

export function createUserflowRunId(): string {
    const isoStamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const entropy = Math.random().toString(36).slice(2, 8);

    return `${isoStamp}-${entropy}`;
}

export function buildCreateWorkerSeedData(
    permutation: WorkerUserflowPermutation,
    runId: string,
    index: number,
): WorkerUserflowSeedData {
    const nricSeed = `${runId.replace(/\D/g, "").slice(-6)}${index}`;

    return {
        name: `Userflow ${permutation.alias} ${runId}`,
        nric: `T${nricSeed}A`,
        email: `userflow-${permutation.key}-${runId}@example.com`,
        phone: permutation.phone,
        employmentType: permutation.employmentType,
        employmentArrangement: permutation.employmentArrangement,
        paymentMethod: permutation.paymentMethod,
        hourlyRate: permutation.hourlyRate,
        monthlyPay: permutation.monthlyPay ?? null,
        restDayRate: permutation.restDayRate ?? null,
        minimumWorkingHours: permutation.minimumWorkingHours ?? null,
        cpf: permutation.cpf ?? null,
        countryOfOrigin: permutation.countryOfOrigin ?? null,
        bankAccountNumber: permutation.bankAccountNumber ?? null,
        payNowPhone: permutation.payNowPhone ?? null,
    };
}

export function buildEditWorkerSeedData(
    worker: WorkerUserflowSeedData,
): WorkerUserflowSeedData {
    return {
        ...worker,
        name: `${worker.name} Edited`,
        nric: worker.nric.replace(/.$/, "B"),
        email: worker.email.replace("@", "+edited@"),
        phone: bumpDigits(worker.phone, 1111),
        hourlyRate: bumpMoney(worker.hourlyRate, 0.75),
        monthlyPay:
            worker.monthlyPay !== null
                ? bumpMoney(worker.monthlyPay, 125)
                : null,
        restDayRate:
            worker.restDayRate !== null
                ? bumpMoney(worker.restDayRate, 1.25)
                : null,
        minimumWorkingHours:
            worker.minimumWorkingHours !== null
                ? String(Number(worker.minimumWorkingHours) + 5)
                : null,
        cpf: worker.cpf !== null ? bumpMoney(worker.cpf, 11.2) : null,
        countryOfOrigin:
            worker.countryOfOrigin !== null
                ? `${worker.countryOfOrigin} Updated`
                : null,
        bankAccountNumber:
            worker.bankAccountNumber !== null
                ? bumpDigits(worker.bankAccountNumber, 7)
                : null,
        payNowPhone:
            worker.payNowPhone !== null
                ? bumpDigits(worker.payNowPhone, 2222)
                : null,
    };
}

export async function fillWorkerCreateForm(
    page: Page,
    worker: WorkerUserflowSeedData,
): Promise<void> {
    await page.getByRole("button", { name: worker.employmentType }).click();
    await page
        .getByRole("button", { name: worker.employmentArrangement })
        .click();

    await fillWorkerScalarFields(page, worker);
    await fillPaymentMethodFields(page, worker);
}

export async function fillWorkerEditForm(
    page: Page,
    worker: WorkerUserflowSeedData,
): Promise<void> {
    await fillWorkerScalarFields(page, worker);
    await fillPaymentMethodFields(page, worker);
}

export async function openWorkerEditFromAllWorkersTable(
    page: Page,
    workerName: string,
): Promise<void> {
    const main = page.getByRole("main");

    await main.getByPlaceholder("Search...").fill(workerName);
    await expect(main.getByRole("cell", { name: workerName })).toBeVisible();
    await main.getByRole("button", { name: "Open row actions" }).first().click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/dashboard\/worker\/([0-9a-f-]+)\/edit$/i);
}

export async function signInToUserflowSession(
    page: Page,
    redirectTo = "/dashboard",
): Promise<void> {
    if (!USERFLOW_LOGIN_EMAIL || !USERFLOW_LOGIN_PASSWORD) {
        throw new Error(
            "Missing USERFLOW_LOGIN_EMAIL or USERFLOW_LOGIN_PASSWORD. Add them to .env before running npm run test:userflow or npm run test:e2e.",
        );
    }

    await page.goto(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);

    if (new URL(page.url()).pathname === "/login") {
        await page.getByLabel("Email").fill(USERFLOW_LOGIN_EMAIL);
        await page.getByLabel("Password").fill(USERFLOW_LOGIN_PASSWORD);
        await page.getByRole("button", { name: "Sign in" }).click();
    }

    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page).toHaveURL(buildRedirectExpectation(redirectTo));
    await expect(page.getByRole("main")).toBeVisible();
}

export async function readWorkerUserflowHandoff(): Promise<WorkerUserflowHandoff> {
    try {
        const raw = await readFile(USERFLOW_HANDOFF_PATH, "utf8");

        return JSON.parse(raw) as WorkerUserflowHandoff;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            throw new Error(
                `Worker userflow handoff file is missing at ${USERFLOW_HANDOFF_PATH}. Run test/userflow/workers/01-worker-new-userflow.spec.ts first.`,
            );
        }

        throw error;
    }
}

function buildRedirectExpectation(redirectTo: string): RegExp {
    return new RegExp(`${escapeForRegex(redirectTo)}(?:\\?.*)?$`);
}

function escapeForRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fillWorkerScalarFields(
    page: Page,
    worker: WorkerUserflowSeedData,
): Promise<void> {
    await page.getByLabel("Name").fill(worker.name);
    await page.getByLabel("NRIC").fill(worker.nric);
    await page.getByLabel("Email").fill(worker.email);
    await page.getByLabel("Phone").fill(worker.phone);

    if (worker.monthlyPay !== null) {
        await page.getByLabel("Monthly Pay").fill(worker.monthlyPay);
    } else {
        await expect(page.getByLabel("Monthly Pay")).toHaveCount(0);
    }

    await page.getByLabel("Hourly Rate").fill(worker.hourlyRate);

    if (worker.restDayRate !== null) {
        await page.getByLabel("Rest Day Rate").fill(worker.restDayRate);
    } else {
        await expect(page.getByLabel("Rest Day Rate")).toHaveCount(0);
    }

    if (worker.minimumWorkingHours !== null) {
        await page
            .getByLabel("Minimum Working Hours")
            .fill(worker.minimumWorkingHours);
    } else {
        await expect(page.getByLabel("Minimum Working Hours")).toHaveCount(0);
    }

    if (worker.cpf !== null) {
        await page.getByLabel("CPF").fill(worker.cpf);
    } else {
        await expect(page.getByLabel("CPF")).toHaveCount(0);
    }

    if (worker.countryOfOrigin !== null) {
        await page.getByLabel("Country of Origin").fill(worker.countryOfOrigin);
    }
}

export async function assertWorkerSearchableAndCaptureWorkerId(
    page: Page,
    workerName: string,
): Promise<string> {
    const main = page.getByRole("main");

    await main.getByPlaceholder("Search...").fill(workerName);
    await expect(main.getByRole("cell", { name: workerName })).toBeVisible();
    await main.getByRole("button", { name: "Open row actions" }).first().click();
    await page.getByRole("menuitem", { name: "View" }).click();

    await expect(page).toHaveURL(/\/dashboard\/worker\/([0-9a-f-]+)\/view$/i);

    const match = page
        .url()
        .match(/\/dashboard\/worker\/([0-9a-f-]+)\/view$/i);
    const workerId = match?.[1] ?? "";

    expect(workerId).not.toBe("");

    return workerId;
}

export async function writeWorkerUserflowHandoff(
    handoff: WorkerUserflowHandoff,
): Promise<void> {
    await mkdir(path.dirname(USERFLOW_HANDOFF_PATH), { recursive: true });
    await writeFile(
        USERFLOW_HANDOFF_PATH,
        `${JSON.stringify(handoff, null, 2)}\n`,
        "utf8",
    );
}

async function fillPaymentMethodFields(
    page: Page,
    worker: WorkerUserflowSeedData,
): Promise<void> {
    if (worker.paymentMethod === "Cash") {
        await selectPaymentMethod(page, "PayNow");
        await page
            .getByRole("textbox", { name: /^PayNow/ })
            .fill(worker.phone);
        await selectPaymentMethod(page, "Cash");
        await expect(page.getByRole("textbox", { name: /^PayNow/ })).toHaveCount(
            0,
        );
        await expect(page.getByLabel("Bank Account Number")).toHaveCount(0);

        return;
    }

    await selectPaymentMethod(page, worker.paymentMethod);

    if (worker.paymentMethod === "Bank Transfer") {
        await page
            .getByLabel("Bank Account Number")
            .fill(worker.bankAccountNumber ?? "");
        await expect(page.getByRole("textbox", { name: /^PayNow/ })).toHaveCount(
            0,
        );

        return;
    }

    await page
        .getByRole("textbox", { name: /^PayNow/ })
        .fill(worker.payNowPhone ?? worker.phone);
    await expect(page.getByLabel("Bank Account Number")).toHaveCount(0);
}

async function selectPaymentMethod(
    page: Page,
    paymentMethod: WorkerPaymentMethod,
): Promise<void> {
    await page.getByLabel("Payment Method").click();
    await page.getByRole("option", { name: paymentMethod }).click();
}

function formatMoney(value: number): string {
    return value.toFixed(2);
}

function bumpDigits(value: string, amount: number): string {
    return String(Number(value) + amount);
}

function bumpMoney(value: string, amount: number): string {
    return formatMoney(Number(value) + amount);
}
