import { index, pgTable, primaryKey, text, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { userTable } from "@/database/schemas/schema-user";

// tb_role
export const roleTable = pgTable(
    "tb_role",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        name: varchar({ length: 255 }).notNull(),
        description: text("description"),
    },
    (t) => ({
        role_name_unq: unique("role_name_unq").on(t.name),
    })
);

// tb_permission
export const permissionTable = pgTable(
    "tb_permission",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        name: varchar({ length: 255 }).notNull(),
        description: text("description"),
    },
    (t) => ({
        permission_name_unq: unique("permission_name_unq").on(t.name),
    })
);

// tb_role_permission
export const rolePermissionTable = pgTable(
    "tb_role_permission",
    {
        id_role: uuid("id_role")
            .notNull()
            .references(() => roleTable.id, { onDelete: "cascade" }),
        id_permission: uuid("id_permission")
            .notNull()
            .references(() => permissionTable.id, { onDelete: "cascade" }),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.id_role, t.id_permission] }),
        id_role_idx: index("id_role_idx").on(t.id_role),
        id_permission_idx: index("id_permission_idx").on(t.id_permission),
    })
);

// tb_user_role
export const userRoleTable = pgTable(
    "tb_user_role",
    {
        id_user: uuid("id_user")
            .notNull()
            .references(() => userTable.id, { onDelete: "cascade" }),
        id_role: uuid("id_role")
            .notNull()
            .references(() => roleTable.id, { onDelete: "cascade" }),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.id_user, t.id_role] }),
        id_user_role_idx: index("id_user_role_idx").on(t.id_user),
        id_role_user_idx: index("id_role_user_idx").on(t.id_role),
    })
);

// tb_user_permission
export const userPermissionTable = pgTable(
    "tb_user_permission",
    {
        id_user: uuid("id_user")
            .notNull()
            .references(() => userTable.id, { onDelete: "cascade" }),
        id_permission: uuid("id_permission")
            .notNull()
            .references(() => permissionTable.id, { onDelete: "cascade" }),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.id_user, t.id_permission] }),
        id_user_permission_idx: index("id_user_permission_idx").on(t.id_user),
        id_permission_user_idx: index("id_permission_user_idx").on(t.id_permission),
    })
);
