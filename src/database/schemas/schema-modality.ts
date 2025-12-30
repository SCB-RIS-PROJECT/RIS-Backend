import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const modalityTable = pgTable(
    "tb_modality",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        code: varchar({ length: 255 }).notNull().unique(),
        name: varchar({ length: 255 }).notNull(),
        aet: text("aet").array(),
        description: text("description"),
        is_active: boolean("is_active").notNull().default(true),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at"),
    },
    (table) => {
        return {
            nameModalityIndex: index("name_modality_idx").on(table.name),
            codeModalityIndex: uniqueIndex("code_modality_idx").on(table.code),
        };
    }
);
