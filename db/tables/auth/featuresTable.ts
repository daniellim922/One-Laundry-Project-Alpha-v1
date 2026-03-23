import {
    pgTable,
    uuid,
    text,
    timestamp,
    integer,
    boolean,
} from "drizzle-orm/pg-core";

export const featuresTable = pgTable("features", {
    id: uuid().primaryKey().defaultRandom(),
    name: text("name").notNull(),
});

export type SelectFeature = typeof featuresTable.$inferSelect;
export type InsertFeature = typeof featuresTable.$inferInsert;
