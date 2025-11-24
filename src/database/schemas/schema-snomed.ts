import { boolean, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const snomedTable = pgTable("tb_snomed", {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar().notNull().unique(),
    display: text().notNull(),
    system: varchar().notNull(),
    category: varchar(),
    description: text(),
    active: boolean("active").notNull().default(true),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at"),
});
