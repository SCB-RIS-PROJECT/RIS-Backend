import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { practitionerTable } from "./schema-practitioner";

export const userTable = pgTable(
    "tb_user",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        name: varchar({ length: 255 }).notNull(),
        email: varchar({ length: 255 }).notNull().unique(),
        password: varchar({ length: 255 }).notNull(),
        practitioner_id: uuid("practitioner_id").references(() => practitionerTable.id, { onDelete: "set null" }),
        avatar: text("avatar"),
        email_verified_at: timestamp("email_verified_at"),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at"),
    },
    (t) => ({
        email_idx: uniqueIndex("email_idx").on(t.email),
        name_idx: index("name_idx").on(t.name),
        practitioner_idx: index("user_practitioner_idx").on(t.practitioner_id),
    })
);

export const userRelations = relations(userTable, ({ one }) => ({
    practitioner: one(practitionerTable, {
        fields: [userTable.practitioner_id],
        references: [practitionerTable.id],
    }),
}));
