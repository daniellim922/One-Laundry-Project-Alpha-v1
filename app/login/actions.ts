"use server";

import { headers } from "next/headers";

import { requestMagicLinkSignIn } from "@/lib/auth/magic-link";
import { sanitizeRedirectTo } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginActionState = {
    status: "idle" | "success" | "error";
    message?: string;
    email?: string;
};

export const initialLoginActionState: LoginActionState = {
    status: "idle",
};

function getRequestOrigin(headerList: Headers) {
    const origin = headerList.get("origin");

    if (origin) {
        return origin;
    }

    const forwardedHost = headerList.get("x-forwarded-host");
    const host = forwardedHost ?? headerList.get("host");

    if (!host) {
        throw new Error("Unable to determine request origin for auth callback");
    }

    const protocol =
        headerList.get("x-forwarded-proto") ??
        (host.startsWith("localhost") || host.startsWith("127.0.0.1")
            ? "http"
            : "https");

    return `${protocol}://${host}`;
}

export async function requestMagicLinkAction(
    _previousState: LoginActionState,
    formData: FormData,
): Promise<LoginActionState> {
    const email = String(formData.get("email") ?? "");
    const redirectTo = sanitizeRedirectTo(
        String(formData.get("redirectTo") ?? ""),
    );

    try {
        const supabase = await createSupabaseServerClient();
        const headerList = await headers();
        const result = await requestMagicLinkSignIn({
            client: supabase,
            email,
            origin: getRequestOrigin(headerList),
            redirectTo,
        });

        if ("error" in result) {
            return {
                status: "error",
                message: result.error,
            };
        }

        return {
            status: "success",
            email: result.email,
            message: `Magic link sent to ${result.email}. Check your inbox to continue.`,
        };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Unable to send the sign-in link.";

        return {
            status: "error",
            message,
        };
    }
}
