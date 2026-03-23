import { integer, pgTable, varchar, uuid } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
    id: uuid("id").primaryKey().notNull(),
    name: varchar({ length: 255 }).notNull(),
    dob: integer().notNull(),
    id_number: varchar({ length: 255 }).notNull().unique(),
    mobile_number: varchar({ length: 255 }).notNull().unique(),
    nationality: varchar({ length: 255 }).notNull().unique(),
    province: varchar({ length: 255 }).notNull().unique(),
    race: varchar({ length: 255 }).notNull().unique(),
    religion: varchar({ length: 255 }).notNull().unique(),
    employment_arrangement: varchar({ length: 255 }).notNull().unique(),
    employment_type: varchar({ length: 255 }).notNull().unique(),
    monthly_pay: varchar({ length: 255 }).notNull().unique(),
    hourly_pay: varchar({ length: 255 }).notNull().unique(),
    rest_day_pay: varchar({ length: 255 }).notNull().unique(),
    cpf_amount: varchar({ length: 255 }).notNull().unique(),
    payment_method: varchar({ length: 255 }).notNull().unique(),
    payNow_number: varchar({ length: 255 }).notNull().unique(),
    bank_account_number: varchar({ length: 255 }).notNull().unique(),
});

type SelectUser = typeof usersTable.$inferSelect;
type InsertUser = typeof usersTable.$inferInsert;

export const rolesTable = pgTable("users", {
    id: uuid("id").primaryKey().notNull(),
    name: varchar({ length: 255 }).notNull(),
    age: integer().notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
});
