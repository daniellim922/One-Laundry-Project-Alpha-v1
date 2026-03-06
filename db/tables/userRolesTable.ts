import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { rolesTable } from "./rolesTable";
import { user } from "../auth-schema";

export const userRolesTable = pgTable(
    "user_roles",
    {
        id: uuid().primaryKey().defaultRandom(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        roleId: uuid("role_id")
            .notNull()
            .references(() => rolesTable.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("user_roles_userId_idx").on(table.userId),
        index("user_roles_roleId_idx").on(table.roleId),
        uniqueIndex("user_roles_userId_roleId_uniq").on(table.userId, table.roleId),
    ],
);

export type SelectUserRole = typeof userRolesTable.$inferSelect;
export type InsertUserRole = typeof userRolesTable.$inferInsert;
