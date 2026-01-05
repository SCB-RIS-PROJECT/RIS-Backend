import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { profileTable } from "./schema-profile";

export const userTable = pgTable(
    "tb_user",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        name: varchar({ length: 255 }).notNull(),
        email: varchar({ length: 255 }).notNull().unique(),
        password: varchar({ length: 255 }).notNull(),
        profile_id: uuid("profile_id").references(() => profileTable.id, { onDelete: "set null" }),
        avatar: text("avatar"),
        email_verified_at: timestamp("email_verified_at"),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at"),
    },
    (t) => ({
        email_idx: uniqueIndex("email_idx").on(t.email),
        name_idx: index("name_idx").on(t.name),
        profile_idx: index("user_profile_idx").on(t.profile_id),
    })
);

export const userRelations = relations(userTable, ({ one }) => ({
    profile: one(profileTable, {
        fields: [userTable.profile_id],
        references: [profileTable.id],
    }),
}));
