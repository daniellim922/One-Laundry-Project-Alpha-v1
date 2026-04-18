import { type EmailOtpType } from "@supabase/supabase-js";

import {
    getConfiguredAdminEmail,
    isAdminUser,
    normalizeEmail,
} from "@/lib/auth/admin";
import {
    DEFAULT_AUTH_REDIRECT_PATH,
    sanitizeRedirectTo,
} from "@/lib/auth/redirect";

type PasswordlessClientLike = {
    auth: {
        signInWithOtp: (input: {
            email: string;
            options: {
                shouldCreateUser: boolean;
                emailRedirectTo: string;
            };
        }) => Promise<{
            error: { message: string } | null;
        }>;
        exchangeCodeForSession: (code: string) => Promise<{
            error: { message: string } | null;
        }>;
        verifyOtp: (input: {
            token_hash: string;
            type: EmailOtpType;
        }) => Promise<{
            error: { message: string } | null;
        }>;
        getUser: () => Promise<{
            data: {
                user: {
                    email?: string | null;
                } | null;
            };
            error: { message: string } | null;
        }>;
        signOut: () => Promise<{
            error: { message: string } | null;
        }>;
    };
};

export async function requestMagicLinkSignIn({
    client,
    email,
    origin,
    redirectTo,
    env = process.env,
}: {
    client: PasswordlessClientLike;
    email: string;
    origin: string;
    redirectTo?: string | null;
    env?: Record<string, string | undefined>;
}) {
    const normalizedEmail = normalizeEmail(email);
    const adminEmail = getConfiguredAdminEmail(env);

    if (normalizedEmail !== adminEmail) {
        return {
            error: "Only the configured admin email can request a sign-in link.",
        } as const;
    }

    const callbackUrl = new URL("/auth/callback", origin);
    callbackUrl.searchParams.set(
        "redirectTo",
        sanitizeRedirectTo(redirectTo, DEFAULT_AUTH_REDIRECT_PATH),
    );

    const { error } = await client.auth.signInWithOtp({
        email: adminEmail,
        options: {
            shouldCreateUser: false,
            emailRedirectTo: callbackUrl.toString(),
        },
    });

    if (error) {
        return {
            error: error.message,
        } as const;
    }

    return {
        email: adminEmail,
    } as const;
}

export async function finalizeMagicLinkSignIn({
    client,
    code,
    tokenHash,
    type,
    env = process.env,
}: {
    client: PasswordlessClientLike;
    code: string | null;
    tokenHash: string | null;
    type: EmailOtpType | null;
    env?: Record<string, string | undefined>;
}) {
    if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);

        if (error) {
            return {
                error: error.message,
            } as const;
        }
    } else if (tokenHash && type) {
        const { error } = await client.auth.verifyOtp({
            token_hash: tokenHash,
            type,
        });

        if (error) {
            return {
                error: error.message,
            } as const;
        }
    } else {
        return {
            error: "Missing Supabase auth callback parameters.",
        } as const;
    }

    const {
        data: { user },
        error: getUserError,
    } = await client.auth.getUser();

    if (getUserError || !isAdminUser(user, env)) {
        await client.auth.signOut();

        return {
            error: "Authenticated user is not the configured admin.",
        } as const;
    }

    return {
        email: getConfiguredAdminEmail(env),
    } as const;
}
