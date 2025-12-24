import { and, asc, count, desc, eq, gte, type InferSelectModel, ilike, lte, or, type SQL } from "drizzle-orm";
import db from "@/database/db";
import { detailOrderTable, orderTable } from "@/database/schemas/schema-order";
import { loincTable } from "@/database/schemas/schema-loinc";
import { modalityTable } from "@/database/schemas/schema-modality";
import { patientTable } from "@/database/schemas/schema-patient";
import { practitionerTable } from "@/database/schemas/schema-practitioner";
import { userTable } from "@/database/schemas/schema-user";
import type {
    CreateDetailOrderItem,
    CreateOrderInput,
    DetailOrderResponse,
    FullOrderResponse,
    OrderCreationSuccess,
    OrderPaginationResponse,
    OrderQuery,
    OrderResponse,
    SimrsServiceRequest,
    UpdateDetailOrderInput,
    UpdateOrderInput,
} from "@/interface/order.interface";
import { pushWorklistToOrthanc, type MWLWorklistItem } from "@/lib/orthanc-mwl";
import { pushWorklistToDcm4chee, type DCM4CHEEMWLItem } from "@/lib/dcm4chee-mwl";
import { generateAccessionNumber } from "@/lib/utils";
import { SatuSehatService } from "@/service/satu-sehat.service";
import env from "@/config/env";

// MWL Target types
export type MWLTarget = "orthanc" | "dcm4chee" | "both";

export class OrderService {
    /**
     * Generate unique accession number
     * Format: YYYYMMDD-XXXX (where XXXX is sequence)
     */
    static async generateAccessionNumber(): Promise<string> {
        const now = new Date();
        const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, "");

        // Get max sequence for today
        const result = await db
            .select({ accessionNumber: detailOrderTable.accession_number })
            .from(detailOrderTable)
            .where(ilike(detailOrderTable.accession_number, `${datePrefix}%`))
            .orderBy(desc(detailOrderTable.accession_number))
            .limit(1);

        let sequence = 1;
        if (result.length > 0 && result[0].accessionNumber) {
            const lastSequence = result[0].accessionNumber.split('-')[1];
            sequence = parseInt(lastSequence) + 1;
        }

        return `${datePrefix}-${sequence.toString().padStart(4, "0")}`;
    }

    /**
     * Generate unique order number
     * Format: ORD-YYYYMMDD-XXXX
     */
    static async generateOrderNumber(): Promise<string> {
        const now = new Date();
        const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, "");

        // Get count of orders today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [{ total }] = await db
            .select({ total: count() })
            .from(orderTable)
            .where(and(gte(orderTable.created_at, today), lte(orderTable.created_at, tomorrow)));

        const sequence = (total + 1).toString().padStart(4, "0");
        return `ORD-${datePrefix}-${sequence}`;
    }

    /**
     * Format order response
     */
    static formatOrderResponse(
        order: InferSelectModel<typeof orderTable>,
        practitioner?: InferSelectModel<typeof practitionerTable> | null,
        createdBy?: InferSelectModel<typeof userTable> | null
    ): OrderResponse {
        return {
            id: order.id,
            id_pelayanan: order.id_pelayanan,
            id_encounter_ss: order.id_encounter_ss,
            patient: {
                mrn: order.patient_mrn,
                name: order.patient_name,
                birth_date: order.patient_birth_date?.toString() || null,
                age: order.patient_age,
                gender: order.patient_gender,
            },
            practitioner: practitioner
                ? {
                      id: practitioner.id,
                      name: practitioner.name,
                      nik: practitioner.nik,
                      profession: practitioner.profession,
                  }
                : null,
            created_by: createdBy
                ? {
                      id: createdBy.id,
                      name: createdBy.name,
                      email: createdBy.email,
                  }
                : null,
            created_at: order.created_at.toISOString(),
            updated_at: order.updated_at?.toISOString() || null,
        };
    }

    /**
     * Format detail order response
     */
    static formatDetailOrderResponse(
        detail: InferSelectModel<typeof detailOrderTable>,
        loinc?: InferSelectModel<typeof loincTable> | null,
        modality?: InferSelectModel<typeof modalityTable> | null
    ): DetailOrderResponse {
        return {
            id: detail.id,
            accession_number: detail.accession_number ?? null,
            order_number: detail.order_number ?? null,
            schedule_date: detail.schedule_date?.toISOString() ?? null,
            order_priority: detail.order_priority ?? null,
            order_status: detail.order_status ?? null,
            diagnosis: detail.diagnosis,
            notes: detail.notes,
            exam: loinc
                ? {
                      id: loinc.id,
                      code: loinc.code,
                      name: loinc.name,
                      loinc_code: loinc.loinc_code,
                      loinc_display: loinc.loinc_display,
                      require_fasting: loinc.require_fasting,
                      require_pregnancy_check: loinc.require_pregnancy_check,
                      require_use_contrast: loinc.require_use_contrast,
                      contrast_name: loinc.contrast_name,
                  }
                : null,
            modality: modality
                ? {
                      id: modality.id,
                      code: modality.code,
                      name: modality.name,
                  }
                : null,
            satu_sehat: {
                id_service_request: detail.id_service_request_ss,
                id_observation: detail.id_observation_ss,
                id_procedure: detail.id_procedure_ss,
            },
            created_at: detail.created_at.toISOString(),
            updated_at: detail.updated_at?.toISOString() || null,
        };
    }

    /**
     * Get all orders with pagination
     */
    static async getAllOrders(query: OrderQuery): Promise<OrderPaginationResponse> {
        const {
            page,
            per_page,
            search,
            id_patient,
            id_practitioner,
            order_status,
            order_priority,
            order_from,
            date_from,
            date_to,
            sort,
            dir,
        } = query;
        const offset = (page - 1) * per_page;

        // Build where conditions for orders
        const orderWhereConditions: SQL[] = [];

        if (id_patient) {
            orderWhereConditions.push(eq(orderTable.id_patient, id_patient));
        }

        if (id_practitioner) {
            orderWhereConditions.push(eq(orderTable.id_practitioner, id_practitioner));
        }

        if (date_from) {
            orderWhereConditions.push(gte(orderTable.created_at, new Date(date_from)));
        }

        if (date_to) {
            orderWhereConditions.push(lte(orderTable.created_at, new Date(date_to)));
        }

        // Search by patient name, mrn, or practitioner name
        if (search) {
            const searchCondition = or(
                ilike(patientTable.name, `%${search}%`),
                ilike(patientTable.mrn, `%${search}%`),
                ilike(practitionerTable.name, `%${search}%`)
            );
            if (searchCondition) {
                orderWhereConditions.push(searchCondition);
            }
        }

        const orderWhereClause = orderWhereConditions.length > 0 ? and(...orderWhereConditions) : undefined;

        // Determine sort order
        const sortColumn = orderTable[sort];
        const orderBy = dir === "asc" ? asc(sortColumn) : desc(sortColumn);

        // Get orders with related data
        const orders = await db
            .select({
                order: orderTable,
                patient: patientTable,
                practitioner: practitionerTable,
                createdBy: userTable,
            })
            .from(orderTable)
            .leftJoin(patientTable, eq(orderTable.id_patient, patientTable.id))
            .leftJoin(practitionerTable, eq(orderTable.id_practitioner, practitionerTable.id))
            .leftJoin(userTable, eq(orderTable.id_created_by, userTable.id))
            .where(orderWhereClause)
            .orderBy(orderBy)
            .limit(per_page)
            .offset(offset);

        // Get details for each order with filters
        const ordersWithDetails: FullOrderResponse[] = await Promise.all(
            orders.map(async ({ order, patient, practitioner, createdBy }) => {
                const detailWhereConditions: SQL[] = [eq(detailOrderTable.id_order, order.id)];

                if (order_status) {
                    detailWhereConditions.push(eq(detailOrderTable.order_status, order_status));
                }

                if (order_priority) {
                    detailWhereConditions.push(eq(detailOrderTable.order_priority, order_priority));
                }

                if (order_from) {
                    detailWhereConditions.push(eq(detailOrderTable.order_from, order_from));
                }

                const detailWhereClause = and(...detailWhereConditions);

                const details = await db
                    .select({
                        detail: detailOrderTable,
                        loinc: loincTable,
                        modality: modalityTable,
                    })
                    .from(detailOrderTable)
                    .leftJoin(loincTable, eq(detailOrderTable.id_loinc, loincTable.id))
                    .leftJoin(modalityTable, eq(loincTable.id_modality, modalityTable.id))
                    .where(detailWhereClause);

                return {
                    ...OrderService.formatOrderResponse(order, practitioner, createdBy),
                    details: details.map(({ detail, loinc, modality }) =>
                        OrderService.formatDetailOrderResponse(detail, loinc, modality)
                    ),
                };
            })
        );

        // Get total count
        const [{ total }] = await db
            .select({ total: count() })
            .from(orderTable)
            .leftJoin(patientTable, eq(orderTable.id_patient, patientTable.id))
            .leftJoin(practitionerTable, eq(orderTable.id_practitioner, practitionerTable.id))
            .where(orderWhereClause);

        const totalPages = Math.ceil(total / per_page);

        return {
            data: ordersWithDetails,
            meta: {
                total,
                page,
                per_page,
                total_pages: totalPages,
                has_next_page: page < totalPages,
                has_prev_page: page > 1,
            },
        };
    }

    /**
     * Get order by ID
     */
    static async getOrderById(orderId: string): Promise<FullOrderResponse | null> {
        const result = await db
            .select({
                order: orderTable,
                patient: patientTable,
                practitioner: practitionerTable,
                createdBy: userTable,
            })
            .from(orderTable)
            .leftJoin(patientTable, eq(orderTable.id_patient, patientTable.id))
            .leftJoin(practitionerTable, eq(orderTable.id_practitioner, practitionerTable.id))
            .leftJoin(userTable, eq(orderTable.id_created_by, userTable.id))
            .where(eq(orderTable.id, orderId))
            .limit(1);

        if (result.length === 0) return null;

        const { order, practitioner, createdBy } = result[0];

        // Get order details
        const details = await db
            .select({
                detail: detailOrderTable,
                loinc: loincTable,
                modality: modalityTable,
            })
            .from(detailOrderTable)
            .leftJoin(loincTable, eq(detailOrderTable.id_loinc, loincTable.id))
            .leftJoin(modalityTable, eq(loincTable.id_modality, modalityTable.id))
            .where(eq(detailOrderTable.id_order, orderId));

        return {
            ...OrderService.formatOrderResponse(order, practitioner, createdBy),
            details: details.map(({ detail, loinc, modality }) =>
                OrderService.formatDetailOrderResponse(detail, loinc, modality)
            ),
        };
    }

    /**
     * Get order by ID with raw data (for internal use - Satu Sehat, MWL push)
     */
    private static async getOrderByIdRaw(orderId: string) {
        const result = await db
            .select({
                order: orderTable,
                practitioner: practitionerTable,
            })
            .from(orderTable)
            .leftJoin(practitionerTable, eq(orderTable.id_practitioner, practitionerTable.id))
            .where(eq(orderTable.id, orderId))
            .limit(1);

        if (result.length === 0) return null;

        const { order, practitioner } = result[0];

        // Get order details with all raw fields
        const details = await db
            .select({
                detail: detailOrderTable,
                loinc: loincTable,
                modality: modalityTable,
            })
            .from(detailOrderTable)
            .leftJoin(loincTable, eq(detailOrderTable.id_loinc, loincTable.id))
            .leftJoin(modalityTable, eq(loincTable.id_modality, modalityTable.id))
            .where(eq(detailOrderTable.id_order, orderId));

        return {
            ...order,
            practitioner,
            details: details.map(({ detail, loinc, modality }) => ({
                ...detail,
                loinc,
                modality,
            })),
        };
    }

    /**
     * Map FHIR ServiceRequest from SIMRS to flat detail order fields
     */
    private static mapSimrsServiceRequestToDetailOrder(sr: SimrsServiceRequest) {
        const result: Record<string, unknown> = {};

        // Map occurrence datetime
        if (sr.occurrenceDateTime) result.occurrence_datetime = sr.occurrenceDateTime;

        // Map code (LOINC and KPTL)
        if (sr.code?.coding) {
            const loincCoding = sr.code.coding.find((c) => c.system?.includes("loinc.org"));
            const kptlCoding = sr.code.coding.find((c) => c.system?.includes("kptl"));
            
            if (loincCoding) {
                result.loinc_code_alt = loincCoding.code;
                result.loinc_display_alt = loincCoding.display;
            }
            if (kptlCoding) {
                result.kptl_code = kptlCoding.code;
                result.kptl_display = kptlCoding.display;
            }
        }
        if (sr.code?.text) result.code_text = sr.code.text;

        // Map orderDetail (modality, AE title, contrast)
        if (sr.orderDetail) {
            const modalityDetail = sr.orderDetail.find((d) => 
                d.coding?.some((c) => c.system?.includes("dicom.nema.org"))
            );
            const aeDetail = sr.orderDetail.find((d) => 
                d.coding?.some((c) => c.system?.includes("ae-title"))
            );
            const contrastDetail = sr.orderDetail.find((d) => 
                d.coding?.some((c) => c.system?.includes("kfa"))
            );

            if (modalityDetail?.coding?.[0]?.code) result.modality_code = modalityDetail.coding[0].code;
            if (aeDetail?.coding?.[0]?.display) result.ae_title = aeDetail.coding[0].display;
            if (contrastDetail?.coding?.[0]) {
                result.contrast_code = contrastDetail.coding[0].code;
                result.contrast_name_kfa = contrastDetail.coding[0].display;
            }
        }

        // Map requester
        if (sr.requester) {
            result.id_requester_ss = sr.requester.reference?.split("/")[1];
            result.requester_display = sr.requester.display;
        }

        // Map performer
        if (sr.performer?.[0]) {
            result.id_performer_ss = sr.performer[0].reference?.split("/")[1];
            result.performer_display = sr.performer[0].display;
        }

        // Map reasonCode (diagnosis)
        if (sr.reasonCode?.[0]?.coding?.[0]) {
            result.reason_code = sr.reasonCode[0].coding[0].code;
            result.reason_display = sr.reasonCode[0].coding[0].display;
            result.diagnosis = `${sr.reasonCode[0].coding[0].code} - ${sr.reasonCode[0].coding[0].display}`;
        }

        // Map supportingInfo (extract IDs from references)
        if (sr.supportingInfo) {
            sr.supportingInfo.forEach((info) => {
                const ref = info.reference;
                if (ref?.startsWith("Observation/")) result.id_observation_ss = ref.split("/")[1];
                if (ref?.startsWith("Procedure/")) result.id_procedure_ss = ref.split("/")[1];
                if (ref?.startsWith("AllergyIntolerance/")) result.id_allergy_intolerance_ss = ref.split("/")[1];
            });
        }

        // Extract encounter ID
        if (sr.encounter?.reference) {
            result.id_encounter_ss = sr.encounter.reference.split("/")[1];
        }

        return result;
    }

    /**
     * @deprecated Use mapSimrsServiceRequestToDetailOrder instead
     * Map FHIR ServiceRequest to flat detail order fields
     */
    private static mapFhirToDetailOrder(fhir: any) {
        const result: any = {};

        // Map ServiceRequestId
        if (fhir.ServiceRequestId) result.id_service_request_ss = fhir.ServiceRequestId;

        // Map FHIR status and intent
        if (fhir.status) result.fhir_status = fhir.status;
        if (fhir.intent) result.fhir_intent = fhir.intent;
        if (fhir.priority) result.order_priority = fhir.priority.toUpperCase();

        // Map occurrence datetime
        if (fhir.occurrenceDateTime) result.occurrence_datetime = fhir.occurrenceDateTime;

        // Map identifier - extract ACSN and ServiceRequest ID
        if (fhir.identifier) {
            const acsn = fhir.identifier.find((id: any) => 
                id.type?.coding?.some((c: any) => c.code === "ACSN")
            );
            const srId = fhir.identifier.find((id: any) => 
                id.system?.includes("/servicerequest/")
            );
            if (srId?.value && !result.id_service_request_ss) result.id_service_request_ss = srId.value;
        }

        // Map category
        if (fhir.category?.[0]?.coding?.[0]) {
            result.order_category_code = fhir.category[0].coding[0].code;
            result.order_category_display = fhir.category[0].coding[0].display;
        }

        // Map code (LOINC and KPTL)
        if (fhir.code?.coding) {
            const loincCoding = fhir.code.coding.find((c: any) => c.system?.includes("loinc.org"));
            const kptlCoding = fhir.code.coding.find((c: any) => c.system?.includes("kptl"));
            
            if (loincCoding) {
                result.loinc_code_alt = loincCoding.code;
                result.loinc_display_alt = loincCoding.display;
            }
            if (kptlCoding) {
                result.kptl_code = kptlCoding.code;
                result.kptl_display = kptlCoding.display;
            }
        }
        if (fhir.code?.text) result.code_text = fhir.code.text;

        // Map orderDetail (modality, AE title, contrast)
        if (fhir.orderDetail) {
            const modalityDetail = fhir.orderDetail.find((d: any) => 
                d.coding?.some((c: any) => c.system?.includes("dicom.nema.org"))
            );
            const aeDetail = fhir.orderDetail.find((d: any) => 
                d.coding?.some((c: any) => c.system?.includes("ae-title"))
            );
            const contrastDetail = fhir.orderDetail.find((d: any) => 
                d.coding?.some((c: any) => c.system?.includes("kfa"))
            );

            if (modalityDetail?.coding?.[0]?.code) result.modality_code = modalityDetail.coding[0].code;
            if (aeDetail?.coding?.[0]?.display) result.ae_title = aeDetail.coding[0].display;
            if (contrastDetail?.coding?.[0]) {
                result.contrast_code = contrastDetail.coding[0].code;
                result.contrast_name_kfa = contrastDetail.coding[0].display;
            }
        }

        // Map requester with Practitioner field
        if (fhir.requester) {
            result.id_requester_ss = fhir.requester.reference?.split("/")[1];
            result.requester_display = fhir.requester.Practitioner || fhir.requester.display;
        }

        // Map performer (ID from RIS)
        if (fhir.performer?.[0]) {
            result.id_performer_ss = fhir.performer[0].reference?.split("/")[1];
            result.performer_display = fhir.performer[0].display;
        }

        // Map reasonCode (diagnosis)
        if (fhir.reasonCode?.[0]?.coding?.[0]) {
            result.reason_code = fhir.reasonCode[0].coding[0].code;
            result.reason_display = fhir.reasonCode[0].coding[0].display;
        }

        // Map supportingInfo (extract IDs from references)
        if (fhir.supportingInfo) {
            fhir.supportingInfo.forEach((info: any) => {
                const ref = info.reference;
                if (ref?.startsWith("Observation/")) result.id_observation_ss = ref.split("/")[1];
                if (ref?.startsWith("Procedure/")) result.id_procedure_ss = ref.split("/")[1];
                if (ref?.startsWith("AllergyIntolerance/")) result.id_allergy_intolerance_ss = ref.split("/")[1];
            });
        }

        return result;
    }

    /**
     * Create new order with details from SIMRS
     * Flow:
     * 1. Extract patient/practitioner info from service_request
     * 2. Create order record
     * 3. Generate ACSN for each detail (format: {MODALITY}{YYYYMMDD}{SEQ})
     * 4. Create detail order records
     * 5. Return order with details
     */
    static async createOrder(data: CreateOrderInput, userId: string): Promise<FullOrderResponse> {
        // Extract patient and practitioner info from first detail's service_request
        let id_patient_ss: string | null = null;
        let id_encounter_ss: string | null = null;
        let patient_name: string | null = null;
        let patient_mrn: string | null = null;
        let patient_birth_date: string | null = null;
        let patient_age: number | null = null;
        let patient_gender: string | null = null;

        if (data.details.length > 0 && data.details[0].service_request) {
            const sr = data.details[0].service_request;
            
            // Extract patient info from subject (required)
            if (sr.subject) {
                id_patient_ss = sr.subject.reference?.split("/")[1] || null;
                patient_name = sr.subject.patient_name;
                patient_mrn = sr.subject.patient_mrn;
                patient_birth_date = sr.subject.patient_birth_date;
                patient_age = sr.subject.patient_age;
                patient_gender = sr.subject.patient_gender;
            }

            // Extract encounter ID (required)
            if (sr.encounter) {
                id_encounter_ss = sr.encounter.reference?.split("/")[1] || null;
            }
        }

        // Create order record
        const [order] = await db
            .insert(orderTable)
            .values({
                id_patient: null, // We store SS ID separately
                id_practitioner: null,
                id_created_by: userId,
                id_encounter_ss: id_encounter_ss || data.id_pelayanan,
                id_pelayanan: data.id_pelayanan,
                patient_name,
                patient_mrn,
                patient_birth_date,
                patient_age,
                patient_gender,
            })
            .returning();

        // Create order details with generated ACSN
        const detailsToInsert = await Promise.all(
            data.details.map(async (detailData: CreateDetailOrderItem) => {
                // Get LOINC data to get modality code
                const loincResult = await db
                    .select({
                        loinc: loincTable,
                        modality: modalityTable,
                    })
                    .from(loincTable)
                    .leftJoin(modalityTable, eq(loincTable.id_modality, modalityTable.id))
                    .where(eq(loincTable.id, detailData.id_loinc))
                    .limit(1);

                const loincData = loincResult[0]?.loinc;
                const modalityData = loincResult[0]?.modality;

                // Determine modality code for ACSN
                let modalityCode = "OT"; // Default: Other
                
                // Priority: service_request.orderDetail > modality from LOINC
                if (detailData.service_request?.orderDetail) {
                    const modalityDetail = detailData.service_request.orderDetail.find((d) => 
                        d.coding?.some((c) => c.system?.includes("dicom.nema.org"))
                    );
                    if (modalityDetail?.coding?.[0]?.code) {
                        modalityCode = modalityDetail.coding[0].code;
                    }
                } else if (modalityData?.code) {
                    modalityCode = modalityData.code;
                }

                // Generate ACSN with modality code: {MODALITY}{YYYYMMDD}{SEQ}
                const accessionNumber = await generateAccessionNumber(modalityCode);

                // Generate order number
                const orderNumber = `ORD-${accessionNumber}`;

                // Map service_request data to flat fields
                let mappedData: Record<string, unknown> = {};
                if (detailData.service_request) {
                    mappedData = OrderService.mapSimrsServiceRequestToDetailOrder(detailData.service_request);
                }

                return {
                    id_order: order.id,
                    id_loinc: detailData.id_loinc,
                    accession_number: accessionNumber,
                    order_number: orderNumber,
                    order_date: detailData.order_date ? new Date(detailData.order_date) : new Date(),
                    schedule_date: detailData.schedule_date ? new Date(detailData.schedule_date) : new Date(),
                    occurrence_datetime: mappedData.occurrence_datetime 
                        ? new Date(mappedData.occurrence_datetime as string) 
                        : (detailData.schedule_date ? new Date(detailData.schedule_date) : new Date()),
                    order_priority: detailData.order_priority || "ROUTINE",
                    order_from: detailData.order_from || "EXTERNAL",
                    order_status: "PENDING" as const,
                    fhir_status: "active",
                    fhir_intent: "original-order",
                    order_category_code: "363679005",
                    order_category_display: "Imaging",
                    // LOINC info from master data
                    loinc_code_alt: (mappedData.loinc_code_alt as string) || loincData?.loinc_code || null,
                    loinc_display_alt: (mappedData.loinc_display_alt as string) || loincData?.loinc_display || null,
                    // KPTL info from service_request
                    kptl_code: (mappedData.kptl_code as string) || null,
                    kptl_display: (mappedData.kptl_display as string) || null,
                    code_text: (mappedData.code_text as string) || loincData?.name || null,
                    // Modality info
                    modality_code: (mappedData.modality_code as string) || modalityCode,
                    ae_title: (mappedData.ae_title as string) || null,
                    // Contrast info
                    contrast_code: (mappedData.contrast_code as string) || loincData?.contrast_kfa_code || null,
                    contrast_name_kfa: (mappedData.contrast_name_kfa as string) || loincData?.contrast_name || null,
                    // Requester info
                    id_requester_ss: (mappedData.id_requester_ss as string) || null,
                    requester_display: (mappedData.requester_display as string) || null,
                    // Performer info
                    id_performer_ss: (mappedData.id_performer_ss as string) || null,
                    performer_display: (mappedData.performer_display as string) || null,
                    // Diagnosis info
                    reason_code: (mappedData.reason_code as string) || null,
                    reason_display: (mappedData.reason_display as string) || null,
                    diagnosis: (mappedData.diagnosis as string) || null,
                    // Supporting info IDs
                    id_observation_ss: (mappedData.id_observation_ss as string) || null,
                    id_procedure_ss: (mappedData.id_procedure_ss as string) || null,
                    id_allergy_intolerance_ss: (mappedData.id_allergy_intolerance_ss as string) || null,
                    // Notes
                    notes: detailData.notes || null,
                    // Requirements from LOINC master
                    require_fasting: loincData?.require_fasting || false,
                    require_pregnancy_check: loincData?.require_pregnancy_check || false,
                    require_use_contrast: loincData?.require_use_contrast || false,
                    // Store original service_request JSON
                    service_request_json: detailData.service_request || null,
                };
            })
        );

        await db.insert(detailOrderTable).values(detailsToInsert);

        // Return created order with details
        const createdOrder = await OrderService.getOrderById(order.id);
        return createdOrder!;
    }

    /**
     * Create order from SIMRS and return simplified response
     * Sends ServiceRequest to Satu Sehat immediately and includes result in response
     */
    static async createOrderForSimrs(
        data: CreateOrderInput, 
        userId: string
    ): Promise<OrderCreationSuccess> {
        // Create order first
        const order = await OrderService.createOrder(data, userId);

        // Send to Satu Sehat and wait for result
        let satuSehatResult: {
            sent: boolean;
            success: boolean;
            message: string;
            results: Array<{
                accession_number: string;
                success: boolean;
                id_service_request_ss?: string;
                error?: string;
            }>;
        } | undefined;

        try {
            const sendResult = await OrderService.sendOrderToSatuSehat(order.id);
            satuSehatResult = {
                sent: true,
                success: sendResult.success,
                message: sendResult.message,
                results: sendResult.results.map(r => ({
                    accession_number: r.accessionNumber,
                    success: r.success,
                    id_service_request_ss: r.id_service_request_ss,
                    error: r.error,
                })),
            };
        } catch (error) {
            // If Satu Sehat send fails, still return order but include error
            satuSehatResult = {
                sent: true,
                success: false,
                message: error instanceof Error ? error.message : "Failed to send to Satu Sehat",
                results: [],
            };
        }

        // Build simple response - echo back what SIMRS sent + id_order + generated ACSN + Satu Sehat result
        const response: OrderCreationSuccess = {
            success: true,
            message: "Order created successfully",
            data: {
                id_order: order.id,
                id_pelayanan: data.id_pelayanan || null,
                details: order.details.map((detail, index) => ({
                    id_loinc: data.details[index]?.id_loinc || "",
                    accession_number: detail.accession_number || "",
                    schedule_date: detail.schedule_date || null,
                    order_priority: detail.order_priority || "ROUTINE",
                    notes: detail.notes || null,
                })),
            },
            satu_sehat: satuSehatResult,
        };

        return response;
    }

    /**
     * Send order details to Satu Sehat as ServiceRequest
     */
    static async sendOrderToSatuSehat(orderId: string): Promise<{
        success: boolean;
        results: Array<{
            detailId: string;
            accessionNumber: string;
            success: boolean;
            id_service_request_ss?: string;
            error?: string;
        }>;
        message: string;
    }> {
        const order = await OrderService.getOrderByIdRaw(orderId);
        if (!order) {
            return {
                success: false,
                results: [],
                message: "Order not found",
            };
        }

        const results: Array<{
            detailId: string;
            accessionNumber: string;
            success: boolean;
            id_service_request_ss?: string;
            error?: string;
        }> = [];

        // Get patient and encounter IDs from first service_request
        const firstDetail = order.details[0];
        const serviceRequestJson = firstDetail?.service_request_json as SimrsServiceRequest | null;
        
        if (!serviceRequestJson?.subject?.reference || !serviceRequestJson?.encounter?.reference) {
            return {
                success: false,
                results: [],
                message: "Missing patient or encounter reference in service_request",
            };
        }

        const patientId = serviceRequestJson.subject.reference.split("/")[1];
        const encounterId = serviceRequestJson.encounter.reference.split("/")[1];

        for (const detail of order.details) {
            const sr = detail.service_request_json as SimrsServiceRequest | null;
            
            try {
                // Build ServiceRequest for Satu Sehat
                const serviceRequestPayload = SatuSehatService.buildServiceRequest({
                    organizationId: env.SATU_SEHAT_ORGANIZATION_ID,
                    accessionNumber: detail.accession_number || "",
                    loincCode: detail.loinc?.loinc_code || detail.loinc_code_alt || "",
                    loincDisplay: detail.loinc?.loinc_display || detail.loinc_display_alt || "",
                    kptlCode: detail.kptl_code || undefined,
                    kptlDisplay: detail.kptl_display || undefined,
                    codeText: detail.code_text || undefined,
                    modalityCode: detail.modality_code || undefined,
                    aeTitle: detail.ae_title || undefined,
                    contrastKfaCode: detail.contrast_code || undefined,
                    contrastKfaDisplay: detail.contrast_name_kfa || undefined,
                    patientId,
                    encounterId,
                    occurrenceDateTime: detail.occurrence_datetime?.toISOString() || detail.schedule_date?.toISOString() || undefined,
                    requesterId: detail.id_requester_ss || "",
                    requesterDisplay: detail.requester_display || undefined,
                    performerId: detail.id_performer_ss || undefined,
                    performerDisplay: detail.performer_display || undefined,
                    reasonIcdCode: detail.reason_code || undefined,
                    reasonIcdDisplay: detail.reason_display || undefined,
                    observationId: detail.id_observation_ss || undefined,
                    procedureId: detail.id_procedure_ss || undefined,
                    allergyIntoleranceId: detail.id_allergy_intolerance_ss || undefined,
                    priority: (detail.order_priority?.toLowerCase() as "routine" | "urgent" | "asap" | "stat") || "routine",
                });

                // Send to Satu Sehat
                const response = await SatuSehatService.postServiceRequest(serviceRequestPayload);

                // Update detail with ServiceRequest ID
                await db
                    .update(detailOrderTable)
                    .set({ 
                        id_service_request_ss: response.id,
                        updated_at: new Date(),
                    })
                    .where(eq(detailOrderTable.id, detail.id));

                results.push({
                    detailId: detail.id,
                    accessionNumber: detail.accession_number || "",
                    success: true,
                    id_service_request_ss: response.id,
                });
            } catch (error) {
                results.push({
                    detailId: detail.id,
                    accessionNumber: detail.accession_number || "",
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }

        const allSuccess = results.every(r => r.success);
        return {
            success: allSuccess,
            results,
            message: allSuccess 
                ? `Successfully sent ${results.length} ServiceRequest(s) to Satu Sehat`
                : `Sent ${results.filter(r => r.success).length}/${results.length} ServiceRequest(s) to Satu Sehat`,
        };
    }

    /**
     * Update order
     */
    static async updateOrder(orderId: string, data: UpdateOrderInput): Promise<FullOrderResponse | null> {
        const updateData: Partial<InferSelectModel<typeof orderTable>> = {
            ...data,
            updated_at: new Date(),
        };

        const [order] = await db.update(orderTable).set(updateData).where(eq(orderTable.id, orderId)).returning();

        if (!order) return null;

        return OrderService.getOrderById(orderId);
    }

    /**
     * Update detail order
     */
    static async updateDetailOrder(detailId: string, data: UpdateDetailOrderInput): Promise<DetailOrderResponse | null> {
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle typing issue with partial updates
        const updateData: any = {
            ...data,
            updated_at: new Date(),
        };

        if (data.schedule_date) {
            updateData.schedule_date = new Date(data.schedule_date);
        }

        const [detail] = await db
            .update(detailOrderTable)
            .set(updateData)
            .where(eq(detailOrderTable.id, detailId))
            .returning();

        if (!detail) return null;

        // Get loinc and modality data
        const result = await db
            .select({
                detail: detailOrderTable,
                loinc: loincTable,
                modality: modalityTable,
            })
            .from(detailOrderTable)
            .leftJoin(loincTable, eq(detailOrderTable.id_loinc, loincTable.id))
            .leftJoin(modalityTable, eq(loincTable.id_modality, modalityTable.id))
            .where(eq(detailOrderTable.id, detailId))
            .limit(1);

        if (result.length === 0) return null;

        const { detail: detailData, loinc, modality } = result[0];
        return OrderService.formatDetailOrderResponse(detailData, loinc, modality);
    }

    /**
     * Delete order (cascade delete details)
     */
    static async deleteOrder(orderId: string): Promise<boolean> {
        // Delete details first
        await db.delete(detailOrderTable).where(eq(detailOrderTable.id_order, orderId));

        // Delete order
        const result = await db.delete(orderTable).where(eq(orderTable.id, orderId)).returning();

        return result.length > 0;
    }

    /**
     * Delete detail order
     */
    static async deleteDetailOrder(detailId: string): Promise<boolean> {
        const result = await db.delete(detailOrderTable).where(eq(detailOrderTable.id, detailId)).returning();

        return result.length > 0;
    }

    /**
     * Get detail order by ID
     */
    static async getDetailOrderById(detailId: string): Promise<DetailOrderResponse | null> {
        const result = await db
            .select({
                detail: detailOrderTable,
                loinc: loincTable,
                modality: modalityTable,
            })
            .from(detailOrderTable)
            .leftJoin(loincTable, eq(detailOrderTable.id_loinc, loincTable.id))
            .leftJoin(modalityTable, eq(loincTable.id_modality, modalityTable.id))
            .where(eq(detailOrderTable.id, detailId))
            .limit(1);

        if (result.length === 0) return null;

        const { detail, loinc, modality } = result[0];
        return OrderService.formatDetailOrderResponse(detail, loinc, modality);
    }

    /**
     * Push order to MWL (Modality Worklist) - Orthanc
     * Akan push setiap detail order sebagai worklist item terpisah
     * @deprecated Use pushOrderToMWLWithTarget instead
     */
    static async pushOrderToMWL(orderId: string): Promise<{
        success: boolean;
        results: Array<{
            detailId: string;
            accessionNumber: string;
            success: boolean;
            instanceId?: string;
            error?: string;
        }>;
        message: string;
    }> {
        return OrderService.pushOrderToMWLWithTarget(orderId, "orthanc");
    }

    /**
     * Push order to DCM4CHEE MWL
     * @deprecated Use pushOrderToMWLWithTarget instead
     */
    static async pushOrderToDcm4cheeMWL(orderId: string): Promise<{
        success: boolean;
        results: Array<{
            detailId: string;
            accessionNumber: string;
            success: boolean;
            error?: string;
        }>;
        message: string;
    }> {
        return OrderService.pushOrderToMWLWithTarget(orderId, "dcm4chee");
    }

    /**
     * Push order to MWL with target selection
     * Supports: orthanc, dcm4chee, or both
     */
    static async pushOrderToMWLWithTarget(
        orderId: string,
        target: MWLTarget = "dcm4chee"
    ): Promise<{
        success: boolean;
        results: Array<{
            detailId: string;
            accessionNumber: string;
            success: boolean;
            instanceId?: string;
            error?: string;
            target?: string;
        }>;
        message: string;
    }> {
        // Get full order with details (raw data for MWL push)
        const order = await OrderService.getOrderByIdRaw(orderId);

        if (!order) {
            return {
                success: false,
                results: [],
                message: "Order not found",
            };
        }

        if (!order.details || order.details.length === 0) {
            return {
                success: false,
                results: [],
                message: "Order has no details to push",
            };
        }

        // Validate required data
        if (!order.patient_name || !order.patient_mrn) {
            return {
                success: false,
                results: [],
                message: "Order missing patient information",
            };
        }

        const results: Array<{
            detailId: string;
            accessionNumber: string;
            success: boolean;
            instanceId?: string;
            error?: string;
            target?: string;
        }> = [];

        let successCount = 0;

        // Push each detail as separate worklist item
        for (const detail of order.details) {
            if (!detail.accession_number) {
                results.push({
                    detailId: detail.id,
                    accessionNumber: "N/A",
                    success: false,
                    error: "Missing accession number",
                });
                continue;
            }

            if (!detail.schedule_date) {
                results.push({
                    detailId: detail.id,
                    accessionNumber: detail.accession_number,
                    success: false,
                    error: "Missing schedule date",
                });
                continue;
            }

            // Prepare base MWL data
            const baseMwlData = {
                patientId: order.patient_mrn,
                patientName: order.patient_name,
                patientBirthDate: order.patient_birth_date || "19000101",
                patientSex: (order.patient_gender === "MALE" ? "M" : order.patient_gender === "FEMALE" ? "F" : "O") as "M" | "F" | "O",
                accessionNumber: detail.accession_number,
                requestedProcedure: detail.loinc?.loinc_display || detail.code_text || "Unknown Procedure",
                modality: detail.modality_code || detail.modality?.code || "OT",
                stationAETitle: detail.ae_title || "UNKNOWN",
                scheduledDate: new Date(detail.schedule_date),
                scheduledStepId: `SPS-${detail.accession_number}`,
                scheduledStepDescription: detail.loinc?.loinc_display || detail.code_text || "Radiologic Examination",
                referringPhysician: detail.requester_display || order.practitioner?.name || undefined,
            };

            // Push to selected target(s)
            if (target === "orthanc" || target === "both") {
                const orthancItem: MWLWorklistItem = baseMwlData;
                const orthancResult = await pushWorklistToOrthanc(orthancItem);

                if (orthancResult.success) {
                    successCount++;
                }

                results.push({
                    detailId: detail.id,
                    accessionNumber: detail.accession_number,
                    success: orthancResult.success,
                    instanceId: orthancResult.instanceId,
                    error: orthancResult.error,
                    target: "orthanc",
                });
            }

            if (target === "dcm4chee" || target === "both") {
                const dcm4cheeItem: DCM4CHEEMWLItem = baseMwlData;
                const dcm4cheeResult = await pushWorklistToDcm4chee(dcm4cheeItem);

                if (dcm4cheeResult.success) {
                    successCount++;
                }

                results.push({
                    detailId: detail.id,
                    accessionNumber: detail.accession_number,
                    success: dcm4cheeResult.success,
                    error: dcm4cheeResult.error,
                    target: "dcm4chee",
                });
            }
        }

        const totalExpected = target === "both" ? order.details.length * 2 : order.details.length;

        return {
            success: successCount > 0,
            results,
            message: `Pushed ${successCount}/${totalExpected} worklist items to MWL (${target})`,
        };
    }
}

