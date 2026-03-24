import {
    pgTable,
    uuid,
    timestamp,
    time,
    date,
    real,
    text,
    index,
} from "drizzle-orm/pg-core";
import { workerTable } from "./workerTable";

export const timesheetTable = pgTable(
    "timesheet",
    {
        id: uuid().primaryKey().defaultRandom(),
        dateIn: date("date_in").notNull(),
        timeIn: time("time_in").notNull(),
        dateOut: date("date_out").notNull(),
        timeOut: time("time_out").notNull(),
        hours: real("hours").notNull().default(0),
        status: text("status", {
            enum: ["unpaid", "paid"] as const,
        })
            .notNull()
            .default("unpaid"),

        workerId: uuid("worker_id")
            .notNull()
            .references(() => workerTable.id, { onDelete: "cascade" }),

        createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: false }).notNull(),
    },
    (table) => [
        index("timesheet_entries_worker_date_idx").on(
            table.workerId,
            table.dateIn,
        ),
    ],
);

export type SelectTimesheet = typeof timesheetTable.$inferSelect;
export type InsertTimesheet = typeof timesheetTable.$inferInsert;
