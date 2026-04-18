import { expect, test } from "@playwright/test";

test.describe("Dashboard regression smoke", () => {
    test("landing page and login route remain publicly reachable", async ({
        page,
    }) => {
        await page.goto("/");
        await expect(
            page.getByRole("heading", {
                name: "Deploy to the cloud with confidence",
            }),
        ).toBeVisible();
        await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();

        await page.goto("/login");
        await expect(page).toHaveURL(/\/login$/);
        await expect(
            page.getByRole("heading", {
                name: "Dashboard access now requires sign-in",
            }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Sign in" }),
        ).toBeVisible();
    });

    test("dashboard root redirects into the public login boundary", async ({
        page,
    }) => {
        await page.goto("/dashboard");

        const redirectedUrl = new URL(page.url());
        expect(redirectedUrl.pathname).toBe("/login");
        expect(redirectedUrl.searchParams.get("redirectTo")).toBe("/dashboard");
    });

    test("nested dashboard routes are no longer reachable without auth", async ({
        page,
    }) => {
        await page.goto("/dashboard/payroll");

        let redirectedUrl = new URL(page.url());
        expect(redirectedUrl.pathname).toBe("/login");
        expect(redirectedUrl.searchParams.get("redirectTo")).toBe(
            "/dashboard/payroll",
        );

        await page.goto("/dashboard/worker/all");

        redirectedUrl = new URL(page.url());
        expect(redirectedUrl.pathname).toBe("/login");
        expect(redirectedUrl.searchParams.get("redirectTo")).toBe(
            "/dashboard/worker/all",
        );
    });

    test("protected routes redirect before missing dashboard pages can render", async ({
        page,
    }) => {
        await page.goto("/dashboard/iam");

        const redirectedUrl = new URL(page.url());
        expect(redirectedUrl.pathname).toBe("/login");
        expect(redirectedUrl.searchParams.get("redirectTo")).toBe(
            "/dashboard/iam",
        );
    });
});
