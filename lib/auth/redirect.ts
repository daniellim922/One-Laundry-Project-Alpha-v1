export const DEFAULT_AUTH_REDIRECT_PATH = "/dashboard";

export function sanitizeRedirectTo(
    redirectTo: string | null | undefined,
    fallback = DEFAULT_AUTH_REDIRECT_PATH,
) {
    if (!redirectTo) {
        return fallback;
    }

    if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
        return fallback;
    }

    return redirectTo;
}

export function buildLoginRedirectUrl(
    input: string | URL,
    redirectTo?: string | null,
    authError?: string,
) {
    const loginUrl = new URL("/login", input);

    loginUrl.searchParams.set(
        "redirectTo",
        sanitizeRedirectTo(redirectTo, DEFAULT_AUTH_REDIRECT_PATH),
    );

    if (authError) {
        loginUrl.searchParams.set("authError", authError);
    }

    return loginUrl;
}
