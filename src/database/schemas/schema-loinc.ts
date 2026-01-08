import { boolean, index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { modalityTable } from "@/database/schemas/schema-modality";

export const loincTable = pgTable(
    "tb_loinc",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        id_modality: uuid("id_modality")
            .notNull()
            .references(() => modalityTable.id),
        code: varchar({ length: 255 }).notNull().unique(),
        name: varchar({ length: 255 }).notNull(),

        // loinc
        loinc_code: varchar({ length: 50 }).notNull(),
        loinc_display: varchar({ length: 255 }).notNull(),
        loinc_system: varchar({ length: 255 }).notNull().default("http://loinc.org"),

        // requirements
        require_fasting: boolean("require_fasting").notNull().default(false),
        require_pregnancy_check: boolean("require_pregnancy_check").notNull().default(false),
        require_use_contrast: boolean("require_use_contrast").notNull().default(false),

        // contrast
        contrast_name: varchar({ length: 255 }),
        contrast_kfa_code: varchar({ length: 255 }),

        // status
        is_active: boolean("is_active").notNull().default(true),

        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at"),
    },
    (table) => ({
        loinc_code_idx: index("loinc_code_idx").on(table.code),
        loinc_name_idx: index("loinc_name_idx").on(table.name),
        loinc_modality_idx: index("loinc_modality_idx").on(table.id_modality),
        loinc_loinc_code_idx: index("loinc_loinc_code_idx").on(table.loinc_code),
        loinc_loinc_display_idx: index("loinc_loinc_display_idx").on(table.loinc_display),
    })
);
