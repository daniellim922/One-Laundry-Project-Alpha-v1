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

const UPDATE_PASSWORD_PATH = "/auth/update-password";

/**
 * Safe path for post-recovery redirect. Rejects open redirects and absolute URLs
 * unless they match the current request origin.
 */
export function sanitizeAuthNextParam(
    raw: string | null | undefined,
    requestOrigin: string,
    fallback = UPDATE_PASSWORD_PATH,
) {
    if (!raw?.trim()) {
        return fallback;
    }

    const trimmed = raw.trim();

    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
        return sanitizeRedirectTo(trimmed, fallback);
    }

    try {
        const url = new URL(trimmed);
        if (url.origin === requestOrigin) {
            const pathWithQuery = `${url.pathname}${url.search}`;
            return sanitizeRedirectTo(pathWithQuery, fallback);
        }
    } catch {
        // ignore invalid URL
    }

    return fallback;
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
