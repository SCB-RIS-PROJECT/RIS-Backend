import { and, asc, count, desc, eq, gte, inArray, type InferSelectModel, ilike, lte, or, sql, type SQL } from "drizzle-orm";
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
    UpdateOrderDetailWithModalityPerformerInput,
    FinalizeOrderDetailInput,
} from "@/interface/order.interface";
import { pushWorklistToOrthanc, type MWLWorklistItem } from "@/lib/orthanc-mwl";
import { pushWorklistToDcm4chee, type DCM4CHEEMWLItem } from "@/lib/dcm4chee-mwl";
import { queryStudiesFromPACS, testPACSConnection, getStudyWithSeriesAndInstances, type PACSStudyQueryParams } from "@/lib/pacs-orthanc";
import { generateAccessionNumber } from "@/lib/utils";
import { SatuSehatService } from "@/service/satu-sehat.service";
import env from "@/config/env";
import { loggerPino } from "@/config/log";
import type { ServiceResponse } from "@/entities/Service";
import {
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    NotFoundWithMessage,
} from "@/entities/Service";
import type { PagedList } from "@/entities/Query";

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
        modality?: InferSelectModel<typeof modalityTable> | null,
        requester?: InferSelectModel<typeof practitionerTable> | null,
        performer?: InferSelectModel<typeof practitionerTable> | null
    ): DetailOrderResponse {
        // For exam: prioritize master data
        let exam = null;
        if (loinc) {
            exam = {
                id: loinc.id,
                code: loinc.code,
                name: loinc.name,
                loinc_code: loinc.loinc_code,
                loinc_display: loinc.loinc_display,
            };
        }

        // For modality: prioritize master data
        let modalityInfo = null;
        if (modality) {
            modalityInfo = {
                id: modality.id,
                code: modality.code,
                name: modality.name,
                ae_title: detail.ae_title || null,
            };
        }

        // Contrast info from loinc master data
        const contrastInfo = loinc?.contrast_name || loinc?.contrast_kfa_code ? {
            code: loinc.contrast_kfa_code ?? null,
            name: loinc.contrast_name ?? null,
        } : null;

        // KPTL info - removed as no longer stored in detail_order
        const kptlInfo = null;

        // Requester info (referring physician) from relation
        const requesterInfo = requester ? {
            id: requester.id,
            id_ss: requester.ihs_number ?? null,
            name: requester.name,
        } : null;

        // Performer info (radiologist from RIS) from relation
        const performerInfo = performer ? {
            id: performer.id,
            id_ss: performer.ihs_number ?? null,
            name: performer.name,
        } : null;

        // Check if order can be pushed to MWL
        // Requirements: Required MWL data complete
        const canPushToMwl = Boolean(
            detail.accession_number && // Accession number exists
            loinc && // Loinc master data exists
            modality && // Modality master data exists
            detail.ae_title && // AE Title exists
            performer // Performer assigned
        );

        return {
            id: detail.id,
            accession_number: detail.accession_number ?? null,
            order_number: detail.order_number ?? null,
            schedule_date: detail.schedule_date?.toISOString() ?? null,
            order_priority: detail.order_priority ?? null,
            order_status: detail.order_status ?? null,
            diagnosis: detail.diagnosis_code || detail.diagnosis_display ? {
                code: detail.diagnosis_code ?? null,
                display: detail.diagnosis_display ?? null,
            } : null,
            notes: detail.notes,
            observation_notes: detail.observation_notes,
            diagnostic_conclusion: detail.diagnostic_conclusion,
            exam: exam,
            modality: modalityInfo,
            contrast: contrastInfo,
            kptl: kptlInfo,
            requester: requesterInfo,
            performer: performerInfo,
            can_push_to_mwl: canPushToMwl,
            created_at: detail.created_at.toISOString(),
            updated_at: detail.updated_at?.toISOString() || null,
        };
    }

    /**
     * Get all orders with pagination
     */
    static async getAllOrders(query: OrderQuery): Promise<ServiceResponse<OrderPaginationResponse>> {
        try {
            return await this._getAllOrdersInternal(query);
        } catch (err) {
            console.error(`OrderService.getAllOrders: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    private static async _getAllOrdersInternal(query: OrderQuery): Promise<ServiceResponse<OrderPaginationResponse>> {
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

        // Search by patient name or mrn (from order fields or patient table)
        if (search) {
            const searchCondition = or(
                ilike(orderTable.patient_name, `%${search}%`),
                ilike(orderTable.patient_mrn, `%${search}%`),
                ilike(patientTable.name, `%${search}%`),
                ilike(patientTable.mrn, `%${search}%`)
            );
            if (searchCondition) {
                orderWhereConditions.push(searchCondition);
            }
        }

        // Filter by order_status, order_priority, order_from (from detail_order)
        // Use subquery to filter orders that have details matching the criteria
        if (order_status || order_priority || order_from) {
            const detailSubqueryConditions: SQL[] = [];

            if (order_status) {
                detailSubqueryConditions.push(eq(detailOrderTable.order_status, order_status));
            }
            if (order_priority) {
                detailSubqueryConditions.push(eq(detailOrderTable.order_priority, order_priority));
            }
            if (order_from) {
                detailSubqueryConditions.push(eq(detailOrderTable.order_from, order_from));
            }

            // Add condition: order must have at least one detail matching the filters
            const subquery = db
                .select({ id: detailOrderTable.id_order })
                .from(detailOrderTable)
                .where(
                    and(
                        eq(detailOrderTable.id_order, orderTable.id),
                        ...detailSubqueryConditions
                    )
                );

            orderWhereConditions.push(sql`exists (${subquery})`);
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
                requester: practitionerTable,
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

        // Get details for each order - apply same filters as order query
        const ordersWithDetails: FullOrderResponse[] = await Promise.all(
            orders.map(async ({ order, patient, requester, createdBy }) => {
                const detailWhereConditions: SQL[] = [eq(detailOrderTable.id_order, order.id)];

                // Apply filters from query params to details
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
                    .leftJoin(modalityTable, eq(detailOrderTable.id_modality, modalityTable.id))
                    .where(detailWhereClause);

                // Get unique performer IDs from details (not requester - requester is at order level)
                const performerIds = [...new Set(details.map(d => d.detail.id_performer).filter((id): id is string => id !== null))];

                // Fetch performers only if there are any
                let practitioners: InferSelectModel<typeof practitionerTable>[] = [];
                if (performerIds.length > 0) {
                    practitioners = await db
                        .select()
                        .from(practitionerTable)
                        .where(inArray(practitionerTable.id, performerIds));
                }

                const practitionerMap = new Map(practitioners.map(p => [p.id, p]));

                return {
                    ...OrderService.formatOrderResponse(order, createdBy),
                    details: details.map(({ detail, loinc, modality }) => {
                        const performer = detail.id_performer ? practitionerMap.get(detail.id_performer) : null;
                        // Pass requester from order level to each detail
                        return OrderService.formatDetailOrderResponse(detail, loinc, modality, requester || undefined, performer || undefined);
                    }),
                };
            })
        );

        // Get total count
        const [{ total }] = await db
            .select({ total: count() })
            .from(orderTable)
            .leftJoin(patientTable, eq(orderTable.id_patient, patientTable.id))
            .where(orderWhereClause);

        const totalPages = Math.ceil(total / per_page);

        return {
            status: true,
            data: {
                data: ordersWithDetails,
                meta: {
                    total,
                    page,
                    per_page,
                    total_pages: totalPages,
                    has_next_page: page < totalPages,
                    has_prev_page: page > 1,
                },
            },
        };
    }

    /**
     * Get order by ID
     */
    static async getOrderById(orderId: string): Promise<ServiceResponse<FullOrderResponse>> {
        try {
            const result = await db
                .select({
                    order: orderTable,
                    patient: patientTable,
                    requester: practitionerTable,
                    createdBy: userTable,
                })
                .from(orderTable)
                .leftJoin(patientTable, eq(orderTable.id_patient, patientTable.id))
                .leftJoin(practitionerTable, eq(orderTable.id_practitioner, practitionerTable.id))
                .leftJoin(userTable, eq(orderTable.id_created_by, userTable.id))
                .where(eq(orderTable.id, orderId))
                .limit(1);

            if (result.length === 0) return INVALID_ID_SERVICE_RESPONSE;

            const { order, requester, createdBy } = result[0];

            // Get order details
            const details = await db
                .select({
                    detail: detailOrderTable,
                    loinc: loincTable,
                    modality: modalityTable,
                })
                .from(detailOrderTable)
                .leftJoin(loincTable, eq(detailOrderTable.id_loinc, loincTable.id))
                .leftJoin(modalityTable, eq(detailOrderTable.id_modality, modalityTable.id))
                .where(eq(detailOrderTable.id_order, orderId));

            // Get unique performer IDs from details (not requester - requester is at order level)
            const performerIds = [...new Set(details.map(d => d.detail.id_performer).filter((id): id is string => id !== null))];

            // Fetch performers only if there are any
            let practitioners: InferSelectModel<typeof practitionerTable>[] = [];
            if (performerIds.length > 0) {
                practitioners = await db
                    .select()
                    .from(practitionerTable)
                    .where(inArray(practitionerTable.id, performerIds));
            }

            const practitionerMap = new Map(practitioners.map(p => [p.id, p]));

            const orderData = {
                ...OrderService.formatOrderResponse(order, createdBy),
                details: details.map(({ detail, loinc, modality }) => {
                    const performer = detail.id_performer ? practitionerMap.get(detail.id_performer) : null;
                    // Pass requester from order level to each detail
                    return OrderService.formatDetailOrderResponse(detail, loinc, modality, requester || undefined, performer || undefined);
                }),
            };

            return {
                status: true,
                data: orderData,
            };
        } catch (err) {
            console.error(`OrderService.getOrderById: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    /**
     * Get order by Accession Number
     */
    static async getOrderByAccessionNumber(accessionNumber: string): Promise<ServiceResponse<FullOrderResponse>> {
        try {
            // First, find the detail order by accession number
            const [detailOrder] = await db
                .select()
                .from(detailOrderTable)
                .where(eq(detailOrderTable.accession_number, accessionNumber))
                .limit(1);

            if (!detailOrder || !detailOrder.id_order) {
                return NotFoundWithMessage("Order with this accession number not found");
            }

            // Then get the full order using the order ID
            return await OrderService.getOrderById(detailOrder.id_order);
        } catch (err) {
            console.error(`OrderService.getOrderByAccessionNumber: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
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
     * Note: LOINC and modality data now come from master data tables only
     */
    private static mapSimrsServiceRequestToDetailOrder(sr: SimrsServiceRequest) {
        const result: Record<string, unknown> = {};

        // Map occurrence datetime
        if (sr.occurrenceDateTime) result.occurrence_datetime = sr.occurrenceDateTime;

        // Extract AE title from orderDetail
        if (sr.orderDetail) {
            const aeDetail = sr.orderDetail.find((d) =>
                d.coding?.some((c) => c.system?.includes("ae-title"))
            );
            if (aeDetail?.coding?.[0]?.display) result.ae_title = aeDetail.coding[0].display;
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
            result.diagnosis_code = sr.reasonCode[0].coding[0].code;
            result.diagnosis_display = sr.reasonCode[0].coding[0].display;
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
     * Create new order with details from SIMRS (NEW FORMAT)
     * Flow:
     * 1. Extract patient/practitioner info from new SIMRS format
     * 2. Create order record
     * 3. For each detail (LOINC):
     *    - Find LOINC in master data (tb_loinc)
     *    - Generate ACSN for each detail
     *    - Create detail order record
     * 4. Return id_order dan array detail_orders dengan ACSN
     * Note: SatuSehat tidak dilakukan di RIS, akan dilakukan oleh SIMRS
     */
    static async createOrder(data: CreateOrderInput, userId: string): Promise<ServiceResponse<OrderCreationSuccess>> {
        try {
            // Extract patient info dari subject
            const patient_name = data.subject.patient_name;
            const patient_mrn = data.subject.patient_mrn;
            const patient_birth_date = data.subject.patient_birth_date;
            const patient_age = data.subject.patient_age;
            const patient_gender = data.subject.patient_gender;
            const id_patient_ss = data.subject.ihs_id;

            // Extract encounter ID
            const id_encounter_ss = data.encounter.encounter_id;

            // Build diagnosis string from diagnosa
            let diagnosis: string | null = null;
            let diagnosis_code: string | null = null;
            let diagnosis_display: string | null = null;
            if (data.diagnosa) {
                diagnosis = `${data.diagnosa.code} - ${data.diagnosa.display}`;
                diagnosis_code = data.diagnosa.code;
                diagnosis_display = data.diagnosa.display;
            }

            // Find or create requester practitioner by IHS number
            let requesterId: string | null = null;
            let requesterPractitioner = await db
                .select()
                .from(practitionerTable)
                .where(eq(practitionerTable.ihs_number, data.requester.id_practitioner))
                .limit(1);

            if (requesterPractitioner.length > 0) {
                requesterId = requesterPractitioner[0].id;
            } else {
                // Create new practitioner if not found
                console.info(`[CreateOrder] Creating new practitioner with IHS number "${data.requester.id_practitioner}"`);
                const [newPractitioner] = await db
                    .insert(practitionerTable)
                    .values({
                        ihs_number: data.requester.id_practitioner,
                        name: data.requester.name_practitioner,
                        nik: data.requester.id_practitioner, // Use IHS as NIK placeholder
                        gender: "MALE", // Default
                        birth_date: new Date("1970-01-01"), // Default
                        active: true,
                    })
                    .returning();
                requesterId = newPractitioner.id;
            }

            // Create order record
            const [order] = await db
                .insert(orderTable)
                .values({
                    id_patient: null, // We don't use patient table relation
                    id_practitioner: requesterId, // Store requester at order level
                    id_created_by: userId,
                    id_encounter_ss: id_encounter_ss,
                    id_pelayanan: data.id_pelayanan,
                    patient_name,
                    patient_mrn,
                    patient_birth_date,
                    patient_age,
                    patient_gender,
                })
                .returning();

            // Process each detail (pemeriksaan/LOINC)
            const detailsCreated: Array<{ id_detail_order: string; accession_number: string }> = [];

            for (const detailData of data.details) {
                const loincId = detailData.id_loinc;

                // Get LOINC data from master
                const loincResult = await db
                    .select({
                        loinc: loincTable,
                        modality: modalityTable,
                    })
                    .from(loincTable)
                    .leftJoin(modalityTable, eq(loincTable.id_modality, modalityTable.id))
                    .where(eq(loincTable.id, loincId))
                    .limit(1);

                let modalityCode = "OT"; // Default: Other

                if (loincResult.length > 0 && loincResult[0].loinc) {
                    if (loincResult[0].modality?.code) {
                        modalityCode = loincResult[0].modality.code;
                    }
                } else {
                    // Skip this detail if LOINC not found
                    console.warn(`[CreateOrder] LOINC ID "${loincId}" not found in master data. Skipping this detail.`);
                    continue;
                }

                // Generate ACSN with modality code: {MODALITY}{YYYYMMDD}{SEQ}
                const accessionNumber = await generateAccessionNumber(modalityCode);

                // Generate order number
                const orderNumber = `ORD-${accessionNumber}`;

                // Get modality ID from LOINC data
                const modalityId = loincResult[0].loinc.id_modality;

                const [detailOrder] = await db
                    .insert(detailOrderTable)
                    .values({
                        id_order: order.id,
                        id_loinc: loincId,
                        id_modality: modalityId,
                        accession_number: accessionNumber,
                        order_number: orderNumber,
                        schedule_date: new Date(),
                        order_priority: data.order_priority || "ROUTINE",
                        order_from: "EXTERNAL" as const,
                        order_status: "IN_REQUEST" as const,
                        ae_title: null,
                        // Diagnosis info
                        diagnosis_code: diagnosis_code,
                        diagnosis_display: diagnosis_display,
                        // Notes
                        notes: data.notes || null,
                        service_request_json: null,
                    })
                    .returning();

                detailsCreated.push({
                    id_detail_order: detailOrder.id,
                    accession_number: accessionNumber,
                });
            }

            // Return response sesuai format baru
            return {
                status: true,
                data: {
                    id_order: order.id,
                    detail_orders: detailsCreated,
                },
            };
        } catch (err) {
            console.error(`OrderService.createOrder: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }



    /**
     * Push order to MWL (Modality Worklist)
     * Data diambil dari database yang sudah di-update sebelumnya
     */
    static async pushToMWL(
        orderId: string,
        detailId: string,
        mwlTarget: "orthanc" | "dcm4chee" | "both" = "dcm4chee"
    ): Promise<{
        success: boolean;
        message: string;
        data?: {
            detail_id: string;
            accession_number: string;
            mwl_target: string;
            order_status: string;
        };
    }> {
        // Get order and detail
        const order = await OrderService.getOrderByIdRaw(orderId);
        if (!order) {
            return { success: false, message: "Order not found" };
        }

        const detail = order.details.find((d) => d.id === detailId);
        if (!detail) {
            return { success: false, message: "Order detail not found" };
        }

        // Validate required data
        if (!detail.accession_number) {
            return { success: false, message: "Missing accession number" };
        }

        if (!detail.modality) {
            return { success: false, message: "Missing modality data. Please ensure order has valid LOINC reference." };
        }

        if (!detail.ae_title) {
            return { success: false, message: "Missing ae_title. Please update order detail first." };
        }

        // Validate status (must be IN_REQUEST or IN_QUEUE for retry)
        if (detail.order_status !== "IN_REQUEST" && detail.order_status !== "IN_QUEUE") {
            return {
                success: false,
                message: `Cannot push to MWL with status "${detail.order_status}". Status must be IN_REQUEST or IN_QUEUE.`
            };
        }

        try {
            // Prepare MWL data dari database
            const mwlData = {
                patientId: order.patient_mrn || "",
                patientName: order.patient_name || "",
                patientBirthDate: order.patient_birth_date || "19000101",
                patientSex: (order.patient_gender === "MALE" ? "M" : order.patient_gender === "FEMALE" ? "F" : "O") as "M" | "F" | "O",
                accessionNumber: detail.accession_number,
                requestedProcedure: detail.loinc?.loinc_display || "Radiologic Examination",
                modality: detail.modality.code,
                stationAETitle: detail.ae_title,
                scheduledDate: new Date(detail.schedule_date || new Date()),
                scheduledStepId: `SPS-${detail.accession_number}`,
                scheduledStepDescription: detail.loinc?.loinc_display || "Radiologic Examination",
                referringPhysician: order.practitioner?.name || undefined,
            };

            let lastResult: { success: boolean; error?: string } = { success: false, error: "No target selected" };

            // Push to selected target
            if (mwlTarget === "orthanc" || mwlTarget === "both") {
                const orthancResult = await pushWorklistToOrthanc(mwlData);
                lastResult = { success: orthancResult.success, error: orthancResult.error || undefined };
                if (!orthancResult.success) {
                    return {
                        success: false,
                        message: `Failed to push to Orthanc: ${orthancResult.error}`,
                    };
                }
            }

            if (mwlTarget === "dcm4chee" || mwlTarget === "both") {
                const dcm4cheeResult = await pushWorklistToDcm4chee(mwlData);
                lastResult = { success: dcm4cheeResult.success, error: dcm4cheeResult.error || undefined };
                if (!dcm4cheeResult.success) {
                    return {
                        success: false,
                        message: `Failed to push to DCM4CHEE: ${dcm4cheeResult.error}`,
                    };
                }
            }

            // Update status to IN_QUEUE after successful MWL push
            await db
                .update(detailOrderTable)
                .set({ order_status: "IN_QUEUE" })
                .where(eq(detailOrderTable.id, detailId));

            return {
                success: true,
                message: `Order pushed to MWL (${mwlTarget}) successfully`,
                data: {
                    detail_id: detailId,
                    accession_number: detail.accession_number,
                    mwl_target: mwlTarget,
                    order_status: "IN_QUEUE",
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to push to MWL",
            };
        }
    }



    /**
     * Update detail order
     */
    static async updateDetailOrder(detailId: string, data: UpdateDetailOrderInput): Promise<DetailOrderResponse | null> {
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle typing issue with partial updates
        const updateData: any = {
            updated_at: new Date(),
        };

        // Schedule & Status
        if (data.schedule_date) {
            updateData.schedule_date = new Date(data.schedule_date);
        }
        if (data.order_priority) {
            updateData.order_priority = data.order_priority;
        }
        if (data.order_status) {
            updateData.order_status = data.order_status;
        }
        if (data.notes !== undefined) {
            updateData.notes = data.notes;
        }
        if (data.observation_notes !== undefined) {
            updateData.observation_notes = data.observation_notes;
        }
        if (data.diagnostic_conclusion !== undefined) {
            updateData.diagnostic_conclusion = data.diagnostic_conclusion;
        }

        // Handle diagnosis update - split into code and display
        if (data.diagnosis) {
            updateData.diagnosis_code = data.diagnosis.code || null;
            updateData.diagnosis_display = data.diagnosis.display || null;
        }

        // Workstation AE Title
        if (data.ae_title !== undefined) {
            updateData.ae_title = data.ae_title;
        }

        // Performer (Radiolog) - update relation ID
        if (data.performer_id !== undefined) {
            updateData.id_performer = data.performer_id;
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
            .leftJoin(modalityTable, eq(detailOrderTable.id_modality, modalityTable.id))
            .where(eq(detailOrderTable.id, detailId))
            .limit(1);

        if (result.length === 0) return null;

        const { detail: detailData, loinc, modality } = result[0];

        // Fetch performer if exists (no requester at detail level)
        let performer = null;

        if (detailData.id_performer) {
            [performer] = await db.select().from(practitionerTable).where(eq(practitionerTable.id, detailData.id_performer)).limit(1);
        }

        return OrderService.formatDetailOrderResponse(detailData, loinc, modality, undefined, performer || undefined);
    }

    /**
     * Delete order (cascade delete details)
     */
    static async deleteOrder(orderId: string): Promise<ServiceResponse<{ deletedCount: number }>> {
        try {
            // Delete details first
            await db.delete(detailOrderTable).where(eq(detailOrderTable.id_order, orderId));

            // Delete order
            const result = await db.delete(orderTable).where(eq(orderTable.id, orderId)).returning();

            if (result.length === 0) {
                return INVALID_ID_SERVICE_RESPONSE;
            }

            return {
                status: true,
                data: { deletedCount: result.length },
            };
        } catch (err) {
            console.error(`OrderService.deleteOrder: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
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
            .leftJoin(modalityTable, eq(detailOrderTable.id_modality, modalityTable.id))
            .where(eq(detailOrderTable.id, detailId))
            .limit(1);

        if (result.length === 0) return null;

        const { detail, loinc, modality } = result[0];

        // Fetch performer if exists (no requester at detail level)
        let performer = null;

        if (detail.id_performer) {
            [performer] = await db.select().from(practitionerTable).where(eq(practitionerTable.id, detail.id_performer)).limit(1);
        }

        return OrderService.formatDetailOrderResponse(detail, loinc, modality, undefined, performer || undefined);
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
                requestedProcedure: detail.loinc?.loinc_display || "Unknown Procedure",
                modality: detail.modality?.code || "OT",
                stationAETitle: detail.ae_title || "UNKNOWN",
                scheduledDate: new Date(detail.schedule_date),
                scheduledStepId: `SPS-${detail.accession_number}`,
                scheduledStepDescription: detail.loinc?.loinc_display || "Radiologic Examination",
                referringPhysician: order.practitioner?.name || undefined,
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



    /**
     * Finalize order detail - set status to FINAL and optionally send Observation + DiagnosticReport to Satu Sehat
     */
    static async finalizeOrderDetail(
        orderId: string,
        detailId: string,
        input: FinalizeOrderDetailInput
    ): Promise<{
        success: boolean;
        message: string;
        data?: {
            detail_id: string;
            order_status: string;
        };
    }> {
        try {
            // 1. Get detail
            const [detail] = await db
                .select()
                .from(detailOrderTable)
                .where(and(eq(detailOrderTable.id, detailId), eq(detailOrderTable.id_order, orderId)))
                .limit(1);

            if (!detail) {
                return {
                    success: false,
                    message: "Order detail not found",
                };
            }

            // 2. Validate status (must be IN_PROGRESS)
            if (detail.order_status !== "IN_PROGRESS") {
                return {
                    success: false,
                    message: `Cannot finalize order with status ${detail.order_status}. Order must be IN_PROGRESS.`,
                };
            }

            // 3. Update status to FINAL and save observation notes
            await db
                .update(detailOrderTable)
                .set({
                    order_status: "FINAL",
                    observation_notes: input.observation_notes,
                    diagnostic_conclusion: input.diagnostic_conclusion,
                    updated_at: new Date(),
                })
                .where(eq(detailOrderTable.id, detailId));

            loggerPino.info(`[Finalize] Order detail ${detailId} finalized successfully`);

            return {
                success: true,
                message: "Order finalized successfully",
                data: {
                    detail_id: detailId,
                    order_status: "FINAL",
                },
            };
        } catch (error) {
            loggerPino.error(error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to finalize order",
            };
        }
    }

    /**
     * Update order detail with modality and performer information
     * This will:
     * 1. Validate modality exists and get modality_code
     * 2. Validate performer exists and get performer ID & name
     * 3. Update detail order with modality_code, ae_title, performer info
     * 4. Update status from IN_REQUEST to IN_QUEUE
     * 
     * Note: Push to MWL is done separately via pushToMWL() method
     */
    static async updateOrderDetailWithModalityPerformer(
        orderId: string,
        detailId: string,
        data: UpdateOrderDetailWithModalityPerformerInput
    ): Promise<{
        success: boolean;
        message: string;
        data?: {
            detail_id: string;
            accession_number: string;
            order_status: string;
            modality: {
                id: string;
                code: string;
                name: string;
                ae_title: string;
            };
            performer: {
                id: string;
                id_ss: string;
                name: string;
            };
        };
    }> {
        try {
            // 1. Get modality data
            const [modality] = await db
                .select()
                .from(modalityTable)
                .where(eq(modalityTable.id, data.id_modality))
                .limit(1);

            if (!modality) {
                return {
                    success: false,
                    message: "Modality not found",
                };
            }

            // Validate AE Title exists in modality's AET list
            if (!modality.aet || !modality.aet.includes(data.ae_title)) {
                return {
                    success: false,
                    message: `AE Title "${data.ae_title}" not found in modality "${modality.name}"`,
                };
            }

            // 2. Get performer/practitioner data
            const [performer] = await db
                .select()
                .from(practitionerTable)
                .where(eq(practitionerTable.id, data.id_performer))
                .limit(1);

            if (!performer) {
                return {
                    success: false,
                    message: "Performer/Practitioner not found",
                };
            }

            if (!performer.ihs_number) {
                return {
                    success: false,
                    message: "Performer does not have Satu Sehat IHS number",
                };
            }

            // 3. Get order and detail
            const [order] = await db
                .select()
                .from(orderTable)
                .where(eq(orderTable.id, orderId))
                .limit(1);

            if (!order) {
                return {
                    success: false,
                    message: "Order not found",
                };
            }

            const [detail] = await db
                .select()
                .from(detailOrderTable)
                .where(and(
                    eq(detailOrderTable.id, detailId),
                    eq(detailOrderTable.id_order, orderId)
                ))
                .limit(1);

            if (!detail) {
                return {
                    success: false,
                    message: "Order detail not found",
                };
            }

            // Validate status is IN_REQUEST
            if (detail.order_status !== "IN_REQUEST") {
                return {
                    success: false,
                    message: `Cannot update order with status "${detail.order_status}". Only orders with status IN_REQUEST can be updated.`,
                };
            }

            // Validate required data exists
            if (!detail.accession_number) {
                return {
                    success: false,
                    message: "Order detail missing accession number",
                };
            }

            if (!detail.schedule_date) {
                return {
                    success: false,
                    message: "Order detail missing schedule date",
                };
            }

            // 4. Update detail order with relation IDs only
            await db
                .update(detailOrderTable)
                .set({
                    id_modality: modality.id,
                    ae_title: data.ae_title,
                    id_performer: performer.id,
                    updated_at: new Date(),
                })
                .where(eq(detailOrderTable.id, detailId));

            return {
                success: true,
                message: "Order detail updated successfully. You can now push to MWL.",
                data: {
                    detail_id: detailId,
                    accession_number: detail.accession_number,
                    order_status: "IN_REQUEST",
                    modality: {
                        id: modality.id,
                        code: modality.code,
                        name: modality.name,
                        ae_title: data.ae_title,
                    },
                    performer: {
                        id: performer.id,
                        id_ss: performer.ihs_number,
                        name: performer.name,
                    },
                },
            };
        } catch (error) {
            loggerPino.error(error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to update order detail",
            };
        }
    }

    /**
     * Fetch study dari PACS Orthanc berdasarkan Accession Number
     */
    static async fetchStudyFromPACS(accessionNumber: string) {
        try {
            // Query study by ACSN
            const queryResult = await queryStudiesFromPACS({ accessionNumber });

            if (!queryResult.success || !queryResult.data || queryResult.data.length === 0) {
                return {
                    success: false,
                    message: `Study with accession number ${accessionNumber} not found in PACS`,
                };
            }

            const study = queryResult.data[0];

            // Get detailed series and instances for Cornerstone
            const detailResult = await getStudyWithSeriesAndInstances(study.studyId);

            if (!detailResult.success) {
                return {
                    success: false,
                    message: "Failed to get study details from PACS",
                };
            }

            // Find order detail by ACSN
            const detailOrders = await db
                .select()
                .from(detailOrderTable)
                .where(eq(detailOrderTable.accession_number, accessionNumber))
                .limit(1);

            if (!detailOrders || detailOrders.length === 0) {
                return {
                    success: false,
                    message: `Detail order with accession number ${accessionNumber} not found`,
                };
            }

            const detailOrder = detailOrders[0];

            // Update order with PACS URL
            await db
                .update(detailOrderTable)
                .set({
                    pacs_study_url: study.studyUrl,
                    updated_at: new Date(),
                })
                .where(eq(detailOrderTable.id, detailOrder.id));

            return {
                success: true,
                message: "Successfully fetched study from PACS and updated order",
                data: {
                    detail_id: detailOrder.id,
                    accession_number: accessionNumber,
                    pacs_study_url: study.studyUrl,
                    viewer_url: study.viewerUrl,
                    study_data: detailResult.data, // Contains series and instances for Cornerstone
                },
            };
        } catch (error) {
            console.error("[OrderService] Fetch study from PACS error:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to fetch study from PACS",
            };
        }
    }

    /**
     * Test koneksi ke PACS Orthanc
     */
    static async testPACSConnection(): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }> {
        try {
            const result = await testPACSConnection();

            if (!result.success) {
                return {
                    success: false,
                    message: result.error || "Failed to connect to PACS",
                };
            }

            return {
                success: true,
                message: "Successfully connected to PACS Orthanc",
                data: result.data,
            };
        } catch (error) {
            loggerPino.error(error, "[PACS] Connection test error");
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to test PACS connection",
            };
        }
    }

    /**
     * Check-in order: Update schedule_date to current time and set status to IN_PROGRESS
     */
    static async checkInOrder(orderId: string, detailId: string): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }> {
        try {
            // Find order detail
            const detailOrders = await db
                .select()
                .from(detailOrderTable)
                .where(
                    and(
                        eq(detailOrderTable.id, detailId),
                        eq(detailOrderTable.id_order, orderId)
                    )
                )
                .limit(1);

            if (!detailOrders || detailOrders.length === 0) {
                return {
                    success: false,
                    message: "Order detail not found",
                };
            }

            const detailOrder = detailOrders[0];

            // Check if already IN_PROGRESS or FINAL
            if (detailOrder.order_status === "IN_PROGRESS") {
                return {
                    success: false,
                    message: "Order already checked in",
                };
            }

            if (detailOrder.order_status === "FINAL") {
                return {
                    success: false,
                    message: "Order already finalized, cannot check in",
                };
            }

            // Update schedule_date and status
            const now = new Date();
            const updated = await db
                .update(detailOrderTable)
                .set({
                    schedule_date: now,
                    order_status: "IN_PROGRESS",
                    updated_at: now,
                })
                .where(eq(detailOrderTable.id, detailId))
                .returning();

            if (!updated || updated.length === 0) {
                return {
                    success: false,
                    message: "Failed to check in order",
                };
            }

            return {
                success: true,
                message: "Order checked in successfully",
                data: {
                    detail_id: detailId,
                    accession_number: updated[0].accession_number,
                    order_status: updated[0].order_status,
                    schedule_date: updated[0].schedule_date,
                },
            };
        } catch (error) {
            loggerPino.error(error, "[OrderService] Check-in order error");
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to check in order",
            };
        }
    }
}
