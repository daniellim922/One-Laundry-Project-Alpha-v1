"use server";

import { redirect } from "next/navigation";

import { signInWithPassword } from "@/lib/auth/login";
import { sanitizeRedirectTo } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

import type { LoginActionState } from "./login-action-state";

const GENERIC_SIGN_IN_ERROR = "Invalid email or password.";

export async function signInWithPasswordAction(
    _previousState: LoginActionState,
    formData: FormData,
): Promise<LoginActionState> {
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const redirectTo = sanitizeRedirectTo(
        String(formData.get("redirectTo") ?? ""),
    );

    if (!email.trim()) {
        return {
            status: "error",
            message: "Email is required.",
        };
    }

    if (!password.trim()) {
        return {
            status: "error",
            message: "Password is required.",
        };
    }

    try {
        const supabase = await createClient();
        const result = await signInWithPassword({
            client: supabase,
            email,
            password,
        });

        if ("error" in result) {
            return {
                status: "error",
                message: GENERIC_SIGN_IN_ERROR,
            };
        }
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unable to sign in.";

        return {
            status: "error",
            message,
        };
    }

    redirect(redirectTo);
}
