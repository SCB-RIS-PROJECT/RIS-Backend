import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
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
        id_pelayanan: varchar({ length: 255 }),
        patient_name: varchar({ length: 255 }),
        patient_mrn: varchar({ length: 100 }),
        patient_birth_date: date("patient_birth_date"),
        patient_age: integer("patient_age"),
        patient_gender: varchar({ length: 10 }),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at"),
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
        id_loinc: uuid("id_loinc").references(() => loincTable.id), // Nullable - optional reference untuk order dari SIMRS
        id_service_request_ss: varchar({ length: 255 }),
        id_observation_ss: varchar({ length: 255 }),
        id_procedure_ss: varchar({ length: 255 }),
        id_allergy_intolerance_ss: varchar({ length: 255 }),
        id_requester_ss: varchar({ length: 255 }),
        requester_display: varchar({ length: 255 }),
        id_performer_ss: varchar({ length: 255 }),
        performer_display: varchar({ length: 255 }),
        accession_number: varchar({ length: 255 }).unique(),
        order_number: varchar({ length: 255 }),
        order_date: timestamp("order_date").defaultNow(),
        schedule_date: timestamp("schedule_date").defaultNow(),
        occurrence_datetime: timestamp("occurrence_datetime"),
        order_priority: orderPriorityEnum("order_priority").default("ROUTINE"),
        order_status: orderStatusEnum("order_status").default("PENDING"),
        order_from: orderFromEnum("order_from").default("INTERNAL"),
        fhir_status: varchar({ length: 50 }).default("active"),
        fhir_intent: varchar({ length: 50 }).default("original-order"),
        order_category_code: varchar({ length: 50 }),
        order_category_display: varchar({ length: 255 }),
        loinc_code_alt: varchar({ length: 50 }),
        loinc_display_alt: varchar({ length: 255 }),
        kptl_code: varchar({ length: 100 }),
        kptl_display: varchar({ length: 255 }),
        code_text: varchar({ length: 255 }),
        modality_code: varchar({ length: 50 }),
        ae_title: varchar({ length: 50 }),
        contrast_code: varchar({ length: 100 }),
        contrast_name_kfa: varchar({ length: 255 }),
        reason_code: varchar({ length: 50 }),
        reason_display: varchar({ length: 255 }),
        diagnosis: text("diagnosis"),
        diagnosis_code: varchar({ length: 50 }),
        diagnosis_display: varchar({ length: 255 }),
        notes: text("notes"),
        require_fasting: boolean("require_fasting").default(false),
        require_pregnancy_check: boolean("require_pregnancy_check").default(false),
        require_use_contrast: boolean("require_use_contrast").default(false),
        service_request_json: jsonb("service_request_json"),
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
        requesterSsIdx: index("detail_order_requester_ss_idx").on(table.id_requester_ss),
        performerSsIdx: index("detail_order_performer_ss_idx").on(table.id_performer_ss),
        allergySsIdx: index("detail_order_allergy_ss_idx").on(table.id_allergy_intolerance_ss),
    })
);
