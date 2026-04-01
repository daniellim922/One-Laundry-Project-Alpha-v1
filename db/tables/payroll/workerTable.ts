import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { employmentTable, type SelectEmployment } from "./employmentTable";

export const workerTable = pgTable("worker", {
    id: uuid().primaryKey().defaultRandom(),
    name: text("name").notNull(),
    nric: text("nric"),
    email: text("email"),
    phone: text("phone"),
    status: text("status", { enum: ["Active", "Inactive"] as const }).notNull(),
    countryOfOrigin: text("country_of_origin"),
    race: text("race"),

    employmentId: uuid("employment_id")
        .notNull()
        .references(() => employmentTable.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
});

export type SelectWorker = typeof workerTable.$inferSelect;
export type InsertWorker = typeof workerTable.$inferInsert;

export type WorkerWithEmployment = SelectWorker &
    Pick<
        SelectEmployment,
        "employmentType" | "employmentArrangement" | "monthlyPay" | "hourlyRate" | "paymentMethod"
    >;
