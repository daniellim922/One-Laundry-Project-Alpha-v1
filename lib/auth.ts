import { eq, or } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { db } from "./db";
import { user } from "@/db/auth-schema";
import { username } from "better-auth/plugins";
import * as schema from "@/db/auth-schema";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    session: {
        expiresIn: 60 * 60 * 2, // 2 hours
        updateAge: 60 * 60, // refresh every 1 hour (extends on activity)
    },
    emailAndPassword: {
        enabled: true,
    },
    plugins: [username()],
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            if (
                !ctx.path.includes("sign-in") ||
                ctx.path.includes("sign-out")
            ) {
                return;
            }
            const body = ctx.body as
                | { email?: string; username?: string }
                | undefined;
            const identifier = body?.email ?? body?.username;
            if (!identifier || typeof identifier !== "string") return;

            const [u] = await db
                .select({ banned: user.banned, banExpires: user.banExpires })
                .from(user)
                .where(
                    or(
                        eq(user.email, identifier),
                        eq(user.username, identifier),
                    ),
                )
                .limit(1);

            if (
                u?.banned &&
                (u.banExpires == null || new Date(u.banExpires) > new Date())
            ) {
                throw new APIError("FORBIDDEN", {
                    message:
                        "You have been banned. Please contact support if you believe this is an error.",
                });
            }
        }),
    },
});
