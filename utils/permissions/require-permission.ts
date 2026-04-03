import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
    DASHBOARD_RETURN_PATH_HEADER,
    loginUrlWithReturn,
} from "@/utils/auth/return-url";
import { checkPermission, type PermissionAction } from "./permissions";

/**
 * Ensures the user is authenticated and has the required permission.
 * Redirects to /login if unauthenticated, / if forbidden (avoids infinite loop
 * when dashboard layout redirects forbidden users back to /dashboard).
 */
export async function requirePermission(
    featureName: string,
    action: PermissionAction,
): Promise<{ userId: string }> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        const h = await headers();
        redirect(loginUrlWithReturn(h.get(DASHBOARD_RETURN_PATH_HEADER)));
    }

    const hasPermission = await checkPermission(
        session.user.id,
        featureName,
        action,
    );

    if (!hasPermission) {
        redirect("/dashboard");
    }

    return { userId: session.user.id };
}
