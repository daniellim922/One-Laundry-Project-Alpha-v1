import { headers } from "next/headers";

/**
 * Absolute site origin for server-side auth redirects (e.g. resetPasswordForEmail).
 * Prefer NEXT_PUBLIC_SITE_URL when set; otherwise derive from request headers (Vercel, local dev).
 */
export async function getSiteOrigin(): Promise<string> {
    const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (fromEnv) {
        return fromEnv.replace(/\/$/, "");
    }

    const headerList = await headers();
    const proto = headerList.get("x-forwarded-proto") ?? "http";
    const host =
        headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";

    if (!host) {
        throw new Error(
            "Cannot resolve site origin: set NEXT_PUBLIC_SITE_URL or ensure Host / x-forwarded-host is present.",
        );
    }

    return `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`;
}
