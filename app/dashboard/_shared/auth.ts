import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type AuthenticatedUserLike = {
    email?: string | null;
};

export type DashboardSessionUser = {
    email: string;
};

type DashboardAuthClientLike = {
    auth: {
        getUser: () => Promise<{
            data: {
                user: AuthenticatedUserLike | null;
            };
            error: unknown;
        }>;
    };
};

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function redirectToLogin(): never {
    redirect("/login");
}

export async function requireCurrentDashboardUser(
    client?: DashboardAuthClientLike,
): Promise<DashboardSessionUser> {
    const supabase = client ?? (await createClient());
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error) {
        redirectToLogin();
    }

    if (!user?.email?.trim()) {
        redirectToLogin();
    }

    return {
        email: normalizeEmail(user.email),
    };
}
