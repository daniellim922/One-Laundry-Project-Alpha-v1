import {
    pgTable,
    uuid,
    text,
    timestamp,
    integer,
    boolean,
} from "drizzle-orm/pg-core";

export const rolesTable = pgTable("roles", {
    id: uuid().primaryKey().defaultRandom(),
    name: text("name").notNull(),
});

export type SelectRole = typeof rolesTable.$inferSelect;
export type InsertRole = typeof rolesTable.$inferInsert;
