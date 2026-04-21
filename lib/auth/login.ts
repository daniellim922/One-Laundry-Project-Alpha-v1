type AuthenticatedUserLike = {
    email?: string | null;
};

type PasswordSignInClientLike = {
    auth: {
        signInWithPassword: (input: {
            email: string;
            password: string;
        }) => Promise<{
            error: { message: string } | null;
        }>;
        getUser: () => Promise<{
            data: {
                user: AuthenticatedUserLike | null;
            };
            error: { message: string } | null;
        }>;
        signOut: () => Promise<{
            error: { message: string } | null;
        }>;
    };
};

export function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

export async function signInWithPassword({
    client,
    email,
    password,
}: {
    client: PasswordSignInClientLike;
    email: string;
    password: string;
}) {
    const normalizedEmail = normalizeEmail(email);

    const { error: signInError } = await client.auth.signInWithPassword({
        email: normalizedEmail,
        password,
    });

    if (signInError) {
        return {
            error: signInError.message,
        } as const;
    }

    const {
        data: { user },
        error: getUserError,
    } = await client.auth.getUser();

    if (getUserError || !user?.email?.trim()) {
        await client.auth.signOut();

        return {
            error: "Unable to verify sign-in session.",
        } as const;
    }

    return {
        email: normalizeEmail(user.email),
    } as const;
}
