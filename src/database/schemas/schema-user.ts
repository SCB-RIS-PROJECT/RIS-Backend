import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const userTable = pgTable(
    "tb_user",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        name: varchar({ length: 255 }).notNull(),
        email: varchar({ length: 255 }).notNull().unique(),
        password: varchar({ length: 255 }).notNull(),
        avatar: text("avatar"),
        email_verified_at: timestamp("email_verified_at"),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at"),
    },
    (t) => ({
        email_idx: uniqueIndex("email_idx").on(t.email),
        name_idx: index("name_idx").on(t.name),
    })
);
