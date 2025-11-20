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
        expires_at: timestamp("expires_at").notNull(),
        ip: text("ip"),
        user_agent: text("user_agent"),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at"),
    },
    (t) => ({
        id_user_idx: index("id_user_idx").on(t.id_user),
        expires_at_idx: index("expires_at_idx").on(t.expires_at),
    })
);
