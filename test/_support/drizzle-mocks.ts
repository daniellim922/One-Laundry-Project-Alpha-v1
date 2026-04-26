import { vi } from "vitest";

type SelectMock = {
    mockReturnValueOnce: (value: unknown) => unknown;
};

/**
 * `db.select().from().where().limit()` chain resolving `value` from `limit`.
 */
export function drizzleMockSelectLimitResolved(
    selectFn: SelectMock,
    value: unknown,
) {
    const limit = vi.fn().mockResolvedValue(value);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    selectFn.mockReturnValueOnce({ from });
}

/**
 * `db.select().from().innerJoin().where().limit()` chain resolving `value` from `limit`.
 */
export function drizzleMockSelectJoinLimitResolved(
    selectFn: SelectMock,
    value: unknown,
) {
    const limit = vi.fn().mockResolvedValue(value);
    const where = vi.fn().mockReturnValue({ limit });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    selectFn.mockReturnValueOnce({ from });
}
