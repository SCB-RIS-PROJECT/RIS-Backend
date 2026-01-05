import { boolean, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { genderEnum, practitionerProfessionEnum } from "@/database/schemas/constants";

export const profileTable = pgTable(
    "tb_practitioner",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        ihs_number: varchar({ length: 12 }).unique(),
        ihs_last_sync: timestamp("ihs_last_sync"),
        ihs_response_status: varchar({ length: 3 }),
        profession: practitionerProfessionEnum("profession").notNull().default("DOCTOR"),
        nik: varchar({ length: 16 }).notNull().unique(),
        name: varchar({ length: 255 }).notNull(),
        gender: genderEnum("gender").notNull(),
        birth_date: timestamp("birth_date").notNull(),
        phone: varchar({ length: 20 }),
        email: varchar({ length: 255 }),
        address: text(),
        id_province: varchar(),
        province: varchar(),
        id_city: varchar(),
        city: varchar(),
        id_district: varchar(),
        district: varchar(),
        id_sub_district: varchar(),
        sub_district: varchar(),
        rt: varchar({ length: 3 }),
        rw: varchar({ length: 3 }),
        postal_code: varchar({ length: 10 }),
        active: boolean("active").notNull().default(true),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at"),
    },
    (table) => ({
        nameIdx: index("practitioner_name_idx").on(table.name),
        emailIdx: index("practitioner_email_idx").on(table.email),
        nikIdx: index("practitioner_nik_idx").on(table.nik),
        professionIdx: index("practitioner_profession_idx").on(table.profession),
    })
);

export const profileRelations = relations(profileTable, ({ one }) => ({
    user: one(profileTable, {
        fields: [profileTable.id],
        references: [profileTable.id],
    }),
}));
