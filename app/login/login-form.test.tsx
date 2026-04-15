/** @vitest-environment jsdom */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
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

import { LoginForm } from "./login-form";

describe("LoginForm — unit", () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders title, helper copy, and back link to home", () => {
        render(<LoginForm />);

        expect(screen.getByRole("heading", { name: "Log in" })).toBeTruthy();
        expect(
            screen.getByText(
                "Enter any username and password to continue to the dashboard.",
            ),
        ).toBeTruthy();

        const back = screen.getByRole("link", { name: /back to home/i });
        expect(back.getAttribute("href")).toBe("/");
    });

    it("renders username and password fields with labels and placeholders", () => {
        render(<LoginForm />);

        const userField = screen.getByLabelText("Username");
        expect(userField.getAttribute("autocomplete")).toBe("username");
        const passField = screen.getByLabelText("Password");
        expect(passField.getAttribute("type")).toBe("password");
        expect(screen.getByPlaceholderText("Enter your username")).toBeTruthy();
        expect(screen.getByPlaceholderText("Enter your password")).toBeTruthy();
    });

    it("sets the expected browser validation hints on the form fields", () => {
        const user = userEvent.setup();
        void user;
        render(<LoginForm />);

        expect(screen.getByLabelText("Username").hasAttribute("required")).toBe(
            true,
        );
        expect(screen.getByLabelText("Password").hasAttribute("required")).toBe(
            true,
        );
    });
});

describe("LoginForm — integration", () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("routes to /dashboard when both fields are non-empty", async () => {
        const user = userEvent.setup();
        render(<LoginForm />);

        await user.type(screen.getByLabelText("Username"), "testuser");
        await user.type(screen.getByLabelText("Password"), "hunter2");
        await user.click(screen.getByRole("button", { name: "Log in" }));

        await waitFor(() => {
            expect(mocks.push).toHaveBeenCalledWith("/dashboard");
        });
    });

    it("shows a validation message and stays on the page when either field is blank", async () => {
        const user = userEvent.setup();
        render(<LoginForm />);

        await user.type(screen.getByLabelText("Username"), "   ");
        await user.click(screen.getByRole("button", { name: "Log in" }));

        expect(
            await screen.findByText("Enter any username and password to continue."),
        ).toBeTruthy();
        expect(mocks.push).not.toHaveBeenCalled();
    });
});
