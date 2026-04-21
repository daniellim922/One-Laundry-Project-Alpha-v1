"use server";

import { redirect } from "next/navigation";
import * as z from "zod";

import { normalizeEmail } from "@/lib/auth/login";
import { DEFAULT_AUTH_REDIRECT_PATH } from "@/lib/auth/redirect";
import { getSiteOrigin } from "@/lib/auth/site-origin";
import { createClient } from "@/lib/supabase/server";

import type { PasswordResetActionState } from "./password-reset-action-state";
import type { UpdatePasswordActionState } from "./update-password-action-state";

const GENERIC_RESET_SUCCESS =
    "If an account exists for that email, you will receive a link to reset your password.";

const updatePasswordSchema = z
    .object({
        password: z
            .string()
            .min(8, "Password must be at least 8 characters.")
            .max(72, "Password is too long."),
        confirmPassword: z.string().min(1, "Confirm your password."),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });

export async function requestPasswordResetAction(
    _previousState: PasswordResetActionState,
    formData: FormData,
): Promise<PasswordResetActionState> {
    const rawEmail = String(formData.get("email") ?? "");
    if (!rawEmail.trim()) {
        return {
            status: "error",
            message: "Email is required.",
        };
    }

    const email = normalizeEmail(rawEmail);
    if (!z.email().safeParse(email).success) {
        return {
            status: "error",
            message: "Enter a valid email address.",
        };
    }

    try {
        const origin = await getSiteOrigin();
        const callback = new URL("/auth/callback", origin);
        callback.searchParams.set("next", "/auth/update-password");
        const redirectTo = callback.href;
        const supabase = await createClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo,
        });

        if (error) {
            return {
                status: "error",
                message:
                    error.message || "Unable to send reset email. Try again.",
            };
        }
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Unable to send reset email.";
        return {
            status: "error",
            message,
        };
    }

    return {
        status: "success",
        message: GENERIC_RESET_SUCCESS,
    };
}

export async function updatePasswordAction(
    _previousState: UpdatePasswordActionState,
    formData: FormData,
): Promise<UpdatePasswordActionState> {
    const parsed = updatePasswordSchema.safeParse({
        password: String(formData.get("password") ?? ""),
        confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });

    if (!parsed.success) {
        const first = parsed.error.flatten().fieldErrors;
        const msg =
            first.password?.[0] ??
            first.confirmPassword?.[0] ??
            "Invalid password.";
        return {
            status: "error",
            message: msg,
        };
    }

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return {
                status: "error",
                message: "Your reset session expired. Request a new link.",
            };
        }

        const { error } = await supabase.auth.updateUser({
            password: parsed.data.password,
        });

        if (error) {
            return {
                status: "error",
                message: error.message || "Unable to update password.",
            };
        }
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Unable to update password.";
        return {
            status: "error",
            message,
        };
    }

    redirect(DEFAULT_AUTH_REDIRECT_PATH);
}
