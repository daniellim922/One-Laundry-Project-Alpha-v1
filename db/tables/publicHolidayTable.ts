import {
    date,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";

export const publicHolidayTable = pgTable(
    "public_holiday",
    {
        id: uuid().primaryKey().defaultRandom(),
        date: date("holiday_date").notNull(),
        name: text("name").notNull(),
        createdAt: timestamp("created_at", { withTimezone: false })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: false })
            .notNull()
            .defaultNow(),
    },
    (table) => [uniqueIndex("public_holiday_date_unique").on(table.date)],
);

export type SelectPublicHoliday = typeof publicHolidayTable.$inferSelect;
export type InsertPublicHoliday = typeof publicHolidayTable.$inferInsert;
