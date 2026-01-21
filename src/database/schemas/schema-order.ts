import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { orderFromEnum, orderPriorityEnum, orderStatusEnum } from "@/database/schemas/constants";
import { loincTable } from "@/database/schemas/schema-loinc";
import { modalityTable } from "@/database/schemas/schema-modality";
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
        id_pelayanan: varchar({ length: 255 }),
        patient_name: varchar({ length: 255 }),
        patient_mrn: varchar({ length: 100 }),
        patient_birth_date: date("patient_birth_date"),
        patient_age: integer("patient_age"),
        patient_gender: varchar({ length: 10 }),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    },
    (table) => ({
        patientIdx: index("order_patient_idx").on(table.id_patient),
        practitionerIdx: index("order_practitioner_idx").on(table.id_practitioner),
        createdByIdx: index("order_created_by_idx").on(table.id_created_by),
        encounterIdx: index("order_encounter_idx").on(table.id_encounter_ss),
        pelayananIdx: index("order_pelayanan_idx").on(table.id_pelayanan),
    })
);

export const detailOrderTable = pgTable(
    "tb_detail_order",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        id_order: uuid("id_order").references(() => orderTable.id),
        id_loinc: uuid("id_loinc").references(() => loincTable.id),
        id_modality: uuid("id_modality").references(() => modalityTable.id),
        id_requester: uuid("id_requester").references(() => practitionerTable.id),
        id_performer: uuid("id_performer").references(() => practitionerTable.id),
        accession_number: varchar({ length: 255 }).unique(),
        order_number: varchar({ length: 255 }),
        schedule_date: timestamp("schedule_date").defaultNow(),
        order_priority: orderPriorityEnum("order_priority").default("ROUTINE"),
        order_status: orderStatusEnum("order_status").default("IN_REQUEST"),
        order_from: orderFromEnum("order_from").default("INTERNAL"),
        ae_title: varchar({ length: 50 }),
        diagnosis_code: varchar({ length: 50 }),
        diagnosis_display: varchar({ length: 255 }),
        notes: text("notes"),
        observation_notes: text("observation_notes"),
        diagnostic_conclusion: text("diagnostic_conclusion"),
        pacs_study_url: varchar({ length: 500 }),
        study_id: varchar({ length: 255 }), // PACS Study ID - initially null, populated when retrieved from PACS
        cara_bayar: varchar({ length: 100 }), // Payment method - set when creating order
        tipe_pelayanan: varchar({ length: 100 }), // Service type - set when creating order
        service_request_json: jsonb("service_request_json"),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at"),
    },
    (table) => ({
        orderIdx: index("detail_order_order_idx").on(table.id_order),
        loincIdx: index("detail_order_loinc_idx").on(table.id_loinc),
        modalityIdx: index("detail_order_modality_idx").on(table.id_modality),
        requesterIdx: index("detail_order_requester_idx").on(table.id_requester),
        performerIdx: index("detail_order_performer_idx").on(table.id_performer),
        orderNumberIdx: index("detail_order_order_number_idx").on(table.order_number),
        accessionNumberIdx: index("detail_order_accession_number_idx").on(table.accession_number),
        orderStatusIdx: index("detail_order_order_status_idx").on(table.order_status),
        scheduleDateIdx: index("detail_order_schedule_date_idx").on(table.schedule_date),
    })
);
