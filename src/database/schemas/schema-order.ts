import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { orderPriorityEnum, orderStatusEnum } from "@/database/schemas/constants";
import { loincTable } from "@/database/schemas/schema-loinc";
import { modalityTable } from "@/database/schemas/schema-modality";
import { patientTable } from "@/database/schemas/schema-patient";
import { practitionerTable } from "@/database/schemas/schema-practitioner";
import { userTable } from "@/database/schemas/schema-user";

export const orderTable = pgTable(
    "tb_order",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        // references
        id_patient: uuid("id_patient")
            .notNull()
            .references(() => patientTable.id),
        id_practitioner: uuid("id_practitioner")
            .notNull()
            .references(() => practitionerTable.id),
        id_created_by: uuid("id_created_by")
            .notNull()
            .references(() => userTable.id),
        id_loinc: uuid("id_loinc").references(() => loincTable.id),
        id_modality: uuid("id_modality").references(() => modalityTable.id),

        // satu sehat references
        id_encounter_ss: varchar({ length: 255 }),
        id_service_request_ss: varchar({ length: 255 }),
        id_observation_ss: varchar({ length: 255 }),
        id_procedure_ss: varchar({ length: 255 }),

        // order
        accession_number: varchar({ length: 255 }).unique(),
        order_number: varchar({ length: 255 }),
        order_date: timestamp("order_date").defaultNow(),
        schedule_date: timestamp("schedule_date").defaultNow(),
        priority: orderPriorityEnum("priority").default("ROUTINE"),
        status_order: orderStatusEnum("status_order").default("PENDING"),

        // clinical info
        diagnosis: text("diagnosis"),
        notes: text("notes"),
        require_fasting: boolean("require_fasting").default(false),
        require_pregnancy_check: boolean("require_pregnancy_check").default(false),
        require_use_contrast: boolean("require_use_contrast").default(false),

        created_at: timestamp("created_at").defaultNow(),
        updated_at: timestamp("updated_at"),
    },
    (table) => ({
        accessionNumberIdx: uniqueIndex("order_accession_number_idx").on(table.accession_number),
        orderNumberIdx: uniqueIndex("order_order_number_idx").on(table.order_number),
        patientIdx: index("order_patient_idx").on(table.id_patient),
        practitionerIdx: index("order_practitioner_idx").on(table.id_practitioner),
        statusIdx: index("order_status_idx").on(table.status_order),
        orderDateIdx: index("order_order_date_idx").on(table.order_date),
        scheduledDateIdx: index("order_schedule_date_idx").on(table.schedule_date),
    })
);
