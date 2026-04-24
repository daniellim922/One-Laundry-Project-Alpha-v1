import {
    pgTable,
    uuid,
    timestamp,
    time,
    date,
    real,
    index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { workerTable } from "./workerTable";
import { timesheetPaymentStatusEnum } from "./statusEnums";

export const timesheetTable = pgTable(
    "timesheet",
    {
        id: uuid().primaryKey().defaultRandom(),
        dateIn: date("date_in").notNull(),
        timeIn: time("time_in").notNull(),
        dateOut: date("date_out").notNull(),
        timeOut: time("time_out").notNull(),
        hours: real("hours")
            .generatedAlwaysAs(
                sql`(extract(epoch from (("date_out" + "time_out") - ("date_in" + "time_in"))) / 3600.0)::real`,
            )
            .notNull(),
        status: timesheetPaymentStatusEnum("status")
            .notNull()
            .default("Timesheet Unpaid"),

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
