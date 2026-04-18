import { NextRequest, NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/admin";
import { buildLoginRedirectUrl } from "@/lib/auth/redirect";
import { createSupabaseProxyClient } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
    try {
        const response = NextResponse.next();
        const supabase = createSupabaseProxyClient(request, response);
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (isAdminUser(user)) {
            return response;
        }
    } catch {
        // Fall through to the public login boundary when auth is unavailable.
    }

    const redirectTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;

    return NextResponse.redirect(buildLoginRedirectUrl(request.url, redirectTo));
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
