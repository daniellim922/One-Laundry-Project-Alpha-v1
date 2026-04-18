import { redirect } from "next/navigation";

import {
    requireAdminUser,
    type AuthenticatedUserLike,
} from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DashboardAdminUser = {
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

function redirectToLogin(): never {
    redirect("/login");
}

export async function requireCurrentDashboardAdminUser(
    client?: DashboardAuthClientLike,
): Promise<DashboardAdminUser> {
    const supabase = client ?? (await createSupabaseServerClient());
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error) {
        redirectToLogin();
    }

    try {
        return {
            email: requireAdminUser(user).email,
        };
    } catch {
        redirectToLogin();
    }
}
