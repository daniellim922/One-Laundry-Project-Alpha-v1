import { pgTable, uuid, timestamp, time, date, index } from "drizzle-orm/pg-core";
import { workersTable } from "./workersTable";

export const timesheetEntriesTable = pgTable(
    "timesheet_entries",
    {
        id: uuid().primaryKey().defaultRandom(),
        workerId: uuid("worker_id")
            .notNull()
            .references(() => workersTable.id, { onDelete: "cascade" }),
        date: date("date").notNull(),
        timeIn: time("time_in").notNull(),
        timeOut: time("time_out").notNull(),
        createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: false }).notNull(),
    },
    (table) => [index("timesheet_entries_worker_date_idx").on(table.workerId, table.date)],
);

export type SelectTimesheetEntry = typeof timesheetEntriesTable.$inferSelect;
export type InsertTimesheetEntry = typeof timesheetEntriesTable.$inferInsert;
