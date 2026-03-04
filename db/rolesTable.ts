import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";

export const rolesTable = pgTable("roles", {
    id: uuid().primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
});

export type SelectRole = typeof rolesTable.$inferSelect;
export type InsertRole = typeof rolesTable.$inferInsert;
