import { eq } from "drizzle-orm";

import { session, user } from "@/db/auth-schema";
import { db } from "@/lib/db";

export type UpdateUserBanStatusResult =
    | {
          success: true;
          userId: string;
          banned: boolean;
      }
    | {
          success: false;
          code: "VALIDATION_ERROR" | "NOT_FOUND";
          error: string;
      };

export async function updateUserBanStatus(input: {
    userId: string;
    banned: boolean;
    reason?: string | null;
}): Promise<UpdateUserBanStatusResult> {
    const userId = input.userId.trim();
    if (!userId) {
        return {
            success: false,
            code: "VALIDATION_ERROR",
            error: "User ID is required.",
        };
    }

    const [existingUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
    if (!existingUser) {
        return {
            success: false,
            code: "NOT_FOUND",
            error: "User not found.",
        };
    }

    if (input.banned) {
        await db
            .update(user)
            .set({
                banned: true,
                banReason: input.reason?.trim() || null,
                banExpires: null,
                updatedAt: new Date(),
            })
            .where(eq(user.id, userId));

        await db.delete(session).where(eq(session.userId, userId));
    } else {
        await db
            .update(user)
            .set({
                banned: false,
                banReason: null,
                banExpires: null,
                updatedAt: new Date(),
            })
            .where(eq(user.id, userId));
    }

    return {
        success: true,
        userId,
        banned: input.banned,
    };
}
