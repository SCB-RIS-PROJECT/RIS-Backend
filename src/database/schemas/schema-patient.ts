import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { genderEnum } from "@/database/schemas/constants";

export const patientTable = pgTable(
    "tb_patient",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        mrn: varchar({ length: 6 }).notNull().unique(),
        ihs_number: varchar({ length: 12 }).unique(),
        ihs_last_sync: timestamp("ihs_last_sync"),
        ihs_response_status: varchar({ length: 3 }),
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
        emergency_contact_name: varchar({ length: 255 }),
        emergency_contact_phone: varchar({ length: 20 }),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at"),
    },
    (table) => ({
        nameIdx: index("patient_name_idx").on(table.name),
        nikIdx: index("patient_nik_idx").on(table.nik),
        mrnIdx: index("patient_mrn_idx").on(table.mrn),
        phoneIdx: index("patient_phone_idx").on(table.phone),
        emailIdx: index("patient_email_idx").on(table.email),
    })
);
