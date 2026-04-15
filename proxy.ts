import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
    void request;
    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
