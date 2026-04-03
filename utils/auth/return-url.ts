const DEFAULT_RETURN = "/dashboard";

/** Request header set by proxy for dashboard routes so server code can build /login?next=… */
export const DASHBOARD_RETURN_PATH_HEADER = "x-dashboard-return-path";

/**
 * Returns a safe in-app path for post-login navigation, always under /dashboard.
 */
export function sanitizeDashboardReturnUrl(
    raw: string | null | undefined,
): string {
    if (raw == null) return DEFAULT_RETURN;
    const trimmed = raw.trim();
    if (trimmed === "") return DEFAULT_RETURN;
    if (!trimmed.startsWith("/")) return DEFAULT_RETURN;
    if (trimmed.startsWith("//")) return DEFAULT_RETURN;
    if (trimmed.includes("\\")) return DEFAULT_RETURN;

    let url: URL;
    try {
        url = new URL(trimmed, "http://localhost");
    } catch {
        return DEFAULT_RETURN;
    }

    if (url.protocol !== "http:") return DEFAULT_RETURN;

    const path = url.pathname;
    if (path === "/dashboard" || path.startsWith("/dashboard/")) {
        return `${path}${url.search}`;
    }

    return DEFAULT_RETURN;
}

/**
 * Login URL with optional `next` query when the return path is not the dashboard home.
 */
export function loginUrlWithReturn(rawPathFromHeader: string | null): string {
    if (rawPathFromHeader == null || rawPathFromHeader === "") {
        return "/login";
    }
    const sanitized = sanitizeDashboardReturnUrl(rawPathFromHeader);
    if (sanitized === "/dashboard") {
        return "/login";
    }
    return `/login?next=${encodeURIComponent(sanitized)}`;
}
