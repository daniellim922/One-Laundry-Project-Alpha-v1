import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    redirect: vi.fn(),
    createClient: vi.fn(),
    getSiteOrigin: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    redirect: (...args: unknown[]) => mocks.redirect(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: (...args: unknown[]) => mocks.createClient(...args),
}));

vi.mock("@/lib/auth/site-origin", () => ({
    getSiteOrigin: (...args: unknown[]) => mocks.getSiteOrigin(...args),
}));

import {
    requestPasswordResetAction,
    updatePasswordAction,
} from "@/app/auth/actions";
import { initialPasswordResetActionState } from "@/app/auth/password-reset-action-state";
import { initialUpdatePasswordActionState } from "@/app/auth/update-password-action-state";

describe("requestPasswordResetAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSiteOrigin.mockResolvedValue("https://app.test");
        mocks.createClient.mockResolvedValue({
            auth: {
                resetPasswordForEmail: vi.fn().mockResolvedValue({
                    error: null,
                }),
            },
        });
    });

    it("returns error when email is missing", async () => {
        const formData = new FormData();
        formData.set("email", "   ");

        await expect(
            requestPasswordResetAction(initialPasswordResetActionState, formData),
        ).resolves.toEqual({
            status: "error",
            message: "Email is required.",
        });
        expect(mocks.createClient).not.toHaveBeenCalled();
    });

    it("returns error when email is invalid", async () => {
        const formData = new FormData();
        formData.set("email", "not-an-email");

        await expect(
            requestPasswordResetAction(initialPasswordResetActionState, formData),
        ).resolves.toEqual({
            status: "error",
            message: "Enter a valid email address.",
        });
        expect(mocks.createClient).not.toHaveBeenCalled();
    });

    it("calls resetPasswordForEmail with normalized email and redirect URL", async () => {
        const resetPasswordForEmail = vi.fn().mockResolvedValue({
            error: null,
        });
        mocks.createClient.mockResolvedValue({
            auth: { resetPasswordForEmail },
        });

        const formData = new FormData();
        formData.set("email", "  User@Example.COM ");

        await expect(
            requestPasswordResetAction(initialPasswordResetActionState, formData),
        ).resolves.toEqual({
            status: "success",
            message:
                "If an account exists for that email, you will receive a link to reset your password.",
        });

        expect(resetPasswordForEmail).toHaveBeenCalledWith(
            "user@example.com",
            {
                redirectTo:
                    "https://app.test/auth/callback?next=%2Fauth%2Fupdate-password",
            },
        );
    });

    it("returns error when Supabase reports failure", async () => {
        mocks.createClient.mockResolvedValue({
            auth: {
                resetPasswordForEmail: vi.fn().mockResolvedValue({
                    error: { message: "Rate limited" },
                }),
            },
        });

        const formData = new FormData();
        formData.set("email", "user@example.com");

        await expect(
            requestPasswordResetAction(initialPasswordResetActionState, formData),
        ).resolves.toEqual({
            status: "error",
            message: "Rate limited",
        });
    });
});

describe("updatePasswordAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.redirect.mockImplementation((url: string) => {
            throw Object.assign(new Error("NEXT_REDIRECT"), {
                digest: `NEXT_REDIRECT;replace;${url};307;`,
            });
        });
    });

    it("returns validation error when passwords mismatch", async () => {
        const formData = new FormData();
        formData.set("password", "password-one");
        formData.set("confirmPassword", "password-two");

        await expect(
            updatePasswordAction(initialUpdatePasswordActionState, formData),
        ).resolves.toMatchObject({
            status: "error",
            message: "Passwords do not match.",
        });
        expect(mocks.createClient).not.toHaveBeenCalled();
    });

    it("redirects to dashboard after successful update", async () => {
        const updateUser = vi.fn().mockResolvedValue({ error: null });
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: { id: "u1" } },
                    error: null,
                }),
                updateUser,
            },
        });

        const formData = new FormData();
        formData.set("password", "newpass-ok");
        formData.set("confirmPassword", "newpass-ok");

        await expect(
            updatePasswordAction(initialUpdatePasswordActionState, formData),
        ).rejects.toThrow("NEXT_REDIRECT");

        expect(updateUser).toHaveBeenCalledWith({
            password: "newpass-ok",
        });
        expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
    });
});
