import { boolean, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { orderFromEnum, orderPriorityEnum, orderStatusEnum } from "@/database/schemas/constants";
import { loincTable } from "@/database/schemas/schema-loinc";
import { patientTable } from "@/database/schemas/schema-patient";
import { practitionerTable } from "@/database/schemas/schema-practitioner";
import { userTable } from "@/database/schemas/schema-user";

export const orderTable = pgTable(
    "tb_order",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        id_patient: uuid("id_patient").references(() => patientTable.id),
        id_practitioner: uuid("id_practitioner").references(() => practitionerTable.id),
        id_created_by: uuid("id_created_by").references(() => userTable.id),
        id_encounter_ss: varchar({ length: 255 }),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at"),
    },
    (table) => ({
        patientIdx: index("order_patient_idx").on(table.id_patient),
        practitionerIdx: index("order_practitioner_idx").on(table.id_practitioner),
        createdByIdx: index("order_created_by_idx").on(table.id_created_by),
        encounterIdx: index("order_encounter_idx").on(table.id_encounter_ss),
    })
);

export const detailOrderTable = pgTable(
    "tb_detail_order",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        id_order: uuid("id_order").references(() => orderTable.id),
        id_loinc: uuid("id_loinc").references(() => loincTable.id),
        id_service_request_ss: varchar({ length: 255 }),
        id_observation_ss: varchar({ length: 255 }),
        id_procedure_ss: varchar({ length: 255 }),
        accession_number: varchar({ length: 255 }).unique(),
        order_number: varchar({ length: 255 }),
        order_date: timestamp("order_date").defaultNow(),
        schedule_date: timestamp("schedule_date").defaultNow(),
        order_priority: orderPriorityEnum("order_priority").default("ROUTINE"),
        order_status: orderStatusEnum("order_status").default("PENDING"),
        order_from: orderFromEnum("order_from").default("INTERNAL"),
        diagnosis: text("diagnosis"),
        notes: text("notes"),
        require_fasting: boolean("require_fasting").default(false),
        require_pregnancy_check: boolean("require_pregnancy_check").default(false),
        require_use_contrast: boolean("require_use_contrast").default(false),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at"),
    },
    (table) => ({
        orderIdx: index("detail_order_order_idx").on(table.id_order),
        loincIdx: index("detail_order_loinc_idx").on(table.id_loinc),
        orderNumberIdx: index("detail_order_order_number_idx").on(table.order_number),
        accessionNumberIdx: index("detail_order_accession_number_idx").on(table.accession_number),
        orderStatusIdx: index("detail_order_order_status_idx").on(table.order_status),
        serviceRequestSsIdx: index("detail_order_service_request_ss_idx").on(table.id_service_request_ss),
        observationSsIdx: index("detail_order_observation_ss_idx").on(table.id_observation_ss),
        procedureSsIdx: index("detail_order_procedure_ss_idx").on(table.id_procedure_ss),
    })
);
