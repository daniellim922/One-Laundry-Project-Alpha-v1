import { expect, type Page } from "@playwright/test";

/** Server actions after save can be slow (e.g. draft payroll sync on worker update). */
export const WORKER_FORM_SUBMIT_EFFECT_TIMEOUT_MS = 60_000;

export const WORKER_ALL_PATH_URL_RE = /\/dashboard\/worker\/all/;

function workerFormSubmitErrorLocator(page: Page) {
    return page.locator("form#worker-form p.text-destructive");
}

export type SubmitWorkerFormOptions = {
    /**
     * When true, success is a visible inline error on the form (no redirect).
     * Use for tests that assert server-side validation like duplicate NRIC.
     */
    expectInlineError?: boolean;
};

/**
 * Clicks worker create/edit submit and waits for a terminal outcome: redirect to all workers
 * or an inline server error on the form. Does not treat the transient pending label as completion.
 */
export async function submitWorkerForm(
    page: Page,
    mode: "create" | "edit",
    options?: SubmitWorkerFormOptions,
): Promise<void> {
    const expectInlineError = options?.expectInlineError === true;
    const label = mode === "create" ? "Add New Worker" : "Save changes";

    const locateSubmitButton = () =>
        page.getByRole("main").getByRole("button", { name: label, exact: true });

    const formError = workerFormSubmitErrorLocator(page);

    const tryClickSubmit = async (): Promise<void> => {
        const submit = locateSubmitButton();
        try {
            await submit.click({ timeout: 10_000 });
        } catch {
            await submit.evaluate((el: HTMLElement) => {
                el.click();
            });
        }
    };

    const waitForTerminalOutcome = async (): Promise<void> => {
        if (expectInlineError) {
            await Promise.race([
                formError.waitFor({
                    state: "visible",
                    timeout: WORKER_FORM_SUBMIT_EFFECT_TIMEOUT_MS,
                }),
                page
                    .waitForURL(WORKER_ALL_PATH_URL_RE, {
                        timeout: WORKER_FORM_SUBMIT_EFFECT_TIMEOUT_MS,
                        waitUntil: "commit",
                    })
                    .then(() => {
                        throw new Error(
                            "Expected inline worker form error but navigated to all workers",
                        );
                    }),
            ]);
            return;
        }

        await Promise.race([
            page.waitForURL(WORKER_ALL_PATH_URL_RE, {
                timeout: WORKER_FORM_SUBMIT_EFFECT_TIMEOUT_MS,
                waitUntil: "commit",
            }),
            formError
                .waitFor({
                    state: "visible",
                    timeout: WORKER_FORM_SUBMIT_EFFECT_TIMEOUT_MS,
                })
                .then(async () => {
                    const text = (await formError.textContent())?.trim() ?? "";
                    throw new Error(
                        text.length > 0
                            ? `Worker form submit failed: ${text}`
                            : "Worker form submit failed (empty inline error)",
                    );
                }),
        ]);
    };

    const submit = locateSubmitButton();
    await expect(submit).toBeVisible({ timeout: 30_000 });
    await expect(submit).toBeEnabled({ timeout: 30_000 });

    await tryClickSubmit();
    try {
        await waitForTerminalOutcome();
    } catch {
        await tryClickSubmit();
        await waitForTerminalOutcome();
    }
}
