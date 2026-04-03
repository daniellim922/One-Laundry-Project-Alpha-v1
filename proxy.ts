import { NextRequest, NextResponse } from "next/server";
import {
    DASHBOARD_RETURN_PATH_HEADER,
    loginUrlWithReturn,
} from "./utils/auth/return-url";
import { auth } from "./lib/auth";

export async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    const pathWithSearch =
        request.nextUrl.pathname + request.nextUrl.search;

    if (!session) {
        const dest = loginUrlWithReturn(pathWithSearch);
        return NextResponse.redirect(new URL(dest, request.url));
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(DASHBOARD_RETURN_PATH_HEADER, pathWithSearch);

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
