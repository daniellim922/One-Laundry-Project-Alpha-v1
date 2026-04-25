import { NextRequest } from "next/server";

/**
 * Returns the public origin (protocol + host) for the current request.
 *
 * On Vercel, `req.nextUrl.origin` can incorrectly return `https://localhost:10000`
 * because the internal reverse proxy rewrites the Host header. We reconstruct the
 * origin from `x-forwarded-proto` and `host` headers, which Vercel sets correctly.
 */
export function getRequestOrigin(req: NextRequest): string {
    const proto =
        req.headers.get("x-forwarded-proto") ??
        req.nextUrl.protocol.replace(":", "");
    const host = req.headers.get("host") ?? req.nextUrl.host;
    return `${proto}://${host}`;
}
