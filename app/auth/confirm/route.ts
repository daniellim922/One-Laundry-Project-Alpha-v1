import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { sanitizeAuthNextParam } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;
    const nextRaw = searchParams.get("next");
    const requestOrigin = request.nextUrl.origin;

    const nextPath = sanitizeAuthNextParam(nextRaw, requestOrigin);

    const redirectOnFailure = NextResponse.redirect(
        new URL("/auth/auth-code-error", request.url),
    );

    if (!token_hash || !type) {
        return redirectOnFailure;
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
    });

    if (error) {
        return redirectOnFailure;
    }

    const successUrl = new URL(nextPath, request.url);
    return NextResponse.redirect(successUrl);
}
