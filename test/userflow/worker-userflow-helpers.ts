import { expect, type Page } from "@playwright/test";

import { mkdir, writeFile } from "node:fs/promises";
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

export const USERFLOW_HANDOFF_PATH = path.join(
    process.cwd(),
    "test",
    "results-userflow",
    "worker-userflow-handoff.json",
);

export const WORKER_USERFLOW_PERMUTATIONS: readonly WorkerUserflowPermutation[] =
    [
        {
            key: "full-time-local-bank-transfer",
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
            employmentType: "Part Time",
            employmentArrangement: "Foreign Worker",
            paymentMethod: "Cash",
            phone: "83334444",
            hourlyRate: formatMoney(11.25),
            countryOfOrigin: "Myanmar",
        },
        {
            key: "part-time-local-paynow",
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
    const nameSuffix = permutation.key
        .split("-")
        .map((part) => part[0]?.toUpperCase())
        .join("");
    const nricSeed = `${runId.replace(/\D/g, "").slice(-6)}${index}`;

    return {
        name: `Userflow ${nameSuffix} ${runId}`,
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

export async function fillWorkerCreateForm(
    page: Page,
    worker: WorkerUserflowSeedData,
): Promise<void> {
    await page.getByLabel("Name").fill(worker.name);
    await page.getByLabel("NRIC").fill(worker.nric);
    await page.getByLabel("Email").fill(worker.email);
    await page.getByLabel("Phone").fill(worker.phone);
    await page.getByRole("button", { name: worker.employmentType }).click();
    await page
        .getByRole("button", { name: worker.employmentArrangement })
        .click();

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

    await fillPaymentMethodFields(page, worker);
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
