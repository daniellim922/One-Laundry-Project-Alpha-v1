import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { finalizeMagicLinkSignIn } from "@/lib/auth/magic-link";
import { buildLoginRedirectUrl, sanitizeRedirectTo } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const redirectTo = sanitizeRedirectTo(
        request.nextUrl.searchParams.get("redirectTo"),
    );

    try {
        const supabase = await createSupabaseServerClient();
        const result = await finalizeMagicLinkSignIn({
            client: supabase,
            code: request.nextUrl.searchParams.get("code"),
            tokenHash: request.nextUrl.searchParams.get("token_hash"),
            type: request.nextUrl.searchParams.get("type") as EmailOtpType | null,
        });

        if ("error" in result) {
            return NextResponse.redirect(
                buildLoginRedirectUrl(request.url, redirectTo, "callback"),
            );
        }

        return NextResponse.redirect(new URL(redirectTo, request.url));
    } catch {
        return NextResponse.redirect(
            buildLoginRedirectUrl(request.url, redirectTo, "callback"),
        );
    }
}
