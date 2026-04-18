import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
    const loginUrl = new URL("/login", request.url);
    const redirectTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;

    loginUrl.searchParams.set("redirectTo", redirectTo);

    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
