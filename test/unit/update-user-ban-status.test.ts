import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    db: {
        select: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

import { updateUserBanStatus } from "@/services/iam/update-user-ban-status";

function queueExistingUser(row: { id: string; banned: boolean } | null) {
    mocks.db.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(row ? [row] : []),
            }),
        }),
    });
}

describe("updateUserBanStatus", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns a conflict when banning an already banned user", async () => {
        queueExistingUser({ id: "user-1", banned: true });

        const result = await updateUserBanStatus({
            userId: "user-1",
            banned: true,
            reason: "Repeated request",
        });

        expect(result).toEqual({
            success: false,
            code: "CONFLICT",
            error: "User is already banned.",
        });
        expect(mocks.db.update).not.toHaveBeenCalled();
        expect(mocks.db.delete).not.toHaveBeenCalled();
    });

    it("returns a conflict when unbanning a user who is not banned", async () => {
        queueExistingUser({ id: "user-2", banned: false });

        const result = await updateUserBanStatus({
            userId: "user-2",
            banned: false,
        });

        expect(result).toEqual({
            success: false,
            code: "CONFLICT",
            error: "User is not banned.",
        });
        expect(mocks.db.update).not.toHaveBeenCalled();
        expect(mocks.db.delete).not.toHaveBeenCalled();
    });
});
