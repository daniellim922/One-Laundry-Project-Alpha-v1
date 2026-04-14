/** @vitest-environment jsdom */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    signInUsername: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mocks.push,
    }),
}));

vi.mock("next/link", () => ({
    default: ({
        href,
        className,
        children,
    }: {
        href: string;
        className?: string;
        children: React.ReactNode;
    }) => React.createElement("a", { href, className }, children),
}));

vi.mock("@/lib/auth-client", () => ({
    authClient: {
        signIn: {
            username: (...args: unknown[]) => mocks.signInUsername(...args),
        },
    },
}));

import { LoginForm } from "./login-form";

const DEFAULT_AFTER = "/dashboard";

describe("LoginForm — unit", () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.signInUsername.mockImplementation(async (_creds, opts) => {
            opts?.onSuccess?.();
        });
    });

    it("renders title, helper copy, and back link to home", () => {
        render(<LoginForm afterLoginPath={DEFAULT_AFTER} />);

        expect(screen.getByRole("heading", { name: "Log in" })).toBeTruthy();
        expect(
            screen.getByText("Enter your credentials to access your account."),
        ).toBeTruthy();

        const back = screen.getByRole("link", { name: /back to home/i });
        expect(back.getAttribute("href")).toBe("/");
    });

    it("renders username and password fields with labels and placeholders", () => {
        render(<LoginForm afterLoginPath={DEFAULT_AFTER} />);

        const userField = screen.getByLabelText("Username");
        expect(userField.getAttribute("autocomplete")).toBe("username");
        const passField = screen.getByLabelText("Password");
        expect(passField.getAttribute("type")).toBe("password");
        expect(screen.getByPlaceholderText("Enter your username")).toBeTruthy();
        expect(screen.getByPlaceholderText("Enter your password")).toBeTruthy();
    });

    it("marks the form aria-busy while a sign-in request is in flight", async () => {
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });

        mocks.signInUsername.mockImplementationOnce(async () => {
            await gate;
        });

        const user = userEvent.setup();
        render(<LoginForm afterLoginPath={DEFAULT_AFTER} />);

        await user.type(screen.getByLabelText("Username"), "alice");
        await user.type(screen.getByLabelText("Password"), "secret");
        await user.click(screen.getByRole("button", { name: "Log in" }));

        const form = screen
            .getByRole("textbox", { name: "Username" })
            .closest("form");
        expect(form?.getAttribute("aria-busy")).toBe("true");
        expect(
            screen.getByRole("button", { name: /logging in/i }),
        ).toBeTruthy();

        release();
        await waitFor(() =>
            expect(form?.getAttribute("aria-busy")).toBe("false"),
        );
    });
});

describe("LoginForm — integration (auth + navigation)", () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("calls signIn.username with credentials and callback URL, then navigates on success", async () => {
        const afterPath = "/dashboard/payroll";
        mocks.signInUsername.mockImplementation(async (_creds, opts) => {
            opts?.onSuccess?.();
        });

        const user = userEvent.setup();
        render(<LoginForm afterLoginPath={afterPath} />);

        await user.type(screen.getByLabelText("Username"), "testuser");
        await user.type(screen.getByLabelText("Password"), "hunter2");
        await user.click(screen.getByRole("button", { name: "Log in" }));

        await waitFor(() => {
            expect(mocks.signInUsername).toHaveBeenCalledTimes(1);
        });

        const [credentials] = mocks.signInUsername.mock.calls[0] as [
            { username: string; password: string; callbackURL: string },
            unknown,
        ];
        expect(credentials.username).toBe("testuser");
        expect(credentials.password).toBe("hunter2");
        expect(credentials.callbackURL).toBe(afterPath);

        await waitFor(() => {
            expect(mocks.push).toHaveBeenCalledWith(afterPath);
        });
    });

    it("surfaces auth error message from onError and re-enables the form", async () => {
        mocks.signInUsername.mockImplementation(async (_creds, opts) => {
            opts?.onError?.({
                error: { message: "Invalid username or password" },
            });
        });

        const user = userEvent.setup();
        render(<LoginForm afterLoginPath={DEFAULT_AFTER} />);

        await user.type(screen.getByLabelText("Username"), "x");
        await user.type(screen.getByLabelText("Password"), "y");
        await user.click(screen.getByRole("button", { name: "Log in" }));

        expect(
            await screen.findByText("Invalid username or password"),
        ).toBeTruthy();

        const submit = screen.getByRole("button", { name: "Log in" });
        expect(submit.hasAttribute("disabled")).toBe(false);
    });
});
