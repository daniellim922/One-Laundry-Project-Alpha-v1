import { type NextRequest, NextResponse } from "next/server";

import { sanitizeAuthNextParam } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * PKCE email links (password recovery, etc.) land here with ?code=...
 * after Supabase redirects. Session cookies are established via exchangeCodeForSession.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const nextRaw = searchParams.get("next");
    const requestOrigin = request.nextUrl.origin;
    const nextPath = sanitizeAuthNextParam(nextRaw, requestOrigin);

    const failureRedirect = NextResponse.redirect(
        new URL("/auth/auth-code-error", request.url),
    );

    if (!code) {
        return failureRedirect;
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        return failureRedirect;
    }

    return NextResponse.redirect(new URL(nextPath, request.url));
}
