import { expect, type Page } from "@playwright/test";

export const WORKER_FIXTURE_NAMES = {
    massEditTarget: "E2E Worker Foreign Full Time",
};

export const TEST_USERS = {
    admin: {
        username:
            process.env.SEED_ADMIN_USERNAME ??
            process.env.PLAYWRIGHT_TEST_USERNAME ??
            "root",
        password:
            process.env.SEED_ADMIN_PASSWORD ??
            process.env.PLAYWRIGHT_TEST_PASSWORD ??
            "root1234",
    },
    workersReadOnly: {
        username:
            process.env.SEED_WORKER_READONLY_USERNAME ?? "worker_reader",
        password:
            process.env.SEED_WORKER_READONLY_PASSWORD ?? "worker1234",
    },
    workersCreateOnly: {
        username:
            process.env.SEED_WORKER_CREATE_USERNAME ?? "worker_creator",
        password:
            process.env.SEED_WORKER_CREATE_PASSWORD ?? "worker1234",
    },
    workersUpdateOnly: {
        username:
            process.env.SEED_WORKER_UPDATE_USERNAME ?? "worker_updater",
        password:
            process.env.SEED_WORKER_UPDATE_PASSWORD ?? "worker1234",
    },
};

export async function clearAuthState(page: Page): Promise<void> {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
}

export async function loginAs(
    page: Page,
    credentials: { username: string; password: string },
): Promise<void> {
    await clearAuthState(page);
    await page.getByLabel("Username").fill(credentials.username);
    await page.getByLabel("Password").fill(credentials.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard(\/.*)?$/);
}

export async function assertAuthenticated(page: Page): Promise<void> {
    await expect(page).not.toHaveURL(/\/login/);
}
