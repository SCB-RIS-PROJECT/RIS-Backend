import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { userTable } from "@/database/schemas/schema-user";

export const sessionTable = pgTable(
    "tb_session",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        id_user: uuid("id_user")
            .notNull()
            .references(() => userTable.id, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        token: text("token").notNull(),
        expires_at: timestamp("expires_at").notNull(),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at"),
    },
    (t) => ({
        id_user_idx: index("id_user_idx").on(t.id_user),
        token_idx: index("token_idx").on(t.token),
    })
);
