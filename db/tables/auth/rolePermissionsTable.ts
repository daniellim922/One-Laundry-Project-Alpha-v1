import {
    pgTable,
    uuid,
    text,
    timestamp,
    integer,
    boolean,
} from "drizzle-orm/pg-core";
import { rolesTable } from "@/db/tables/auth/rolesTable";
import { featuresTable } from "@/db/tables/auth/featuresTable";

export const rolePermissionsTable = pgTable("role_permissions", {
    id: uuid().primaryKey().defaultRandom(),
    roleId: uuid("role_id")
        .notNull()
        .references(() => rolesTable.id, { onDelete: "cascade" }),
    featureId: uuid("feature_id")
        .notNull()
        .references(() => featuresTable.id, { onDelete: "cascade" }),
    create: boolean("create").default(false).notNull(),
    read: boolean("read").default(false).notNull(),
    update: boolean("update").default(false).notNull(),
    delete: boolean("delete").default(false).notNull(),
});

export type SelectRolePermission = typeof rolePermissionsTable.$inferSelect;
export type InsertRolePermission = typeof rolePermissionsTable.$inferInsert;
