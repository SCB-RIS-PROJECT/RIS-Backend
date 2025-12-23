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
    OrderPaginationResponse,
    OrderQuery,
    OrderResponse,
    UpdateDetailOrderInput,
    UpdateOrderInput,
} from "@/interface/order.interface";

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
        patient?: InferSelectModel<typeof patientTable> | null,
        practitioner?: InferSelectModel<typeof practitionerTable> | null,
        createdBy?: InferSelectModel<typeof userTable> | null
    ): OrderResponse {
        return {
            id: order.id,
            id_patient: order.id_patient ?? null,
            patient: patient
                ? {
                      id: patient.id,
                      mrn: patient.mrn,
                      name: patient.name,
                      nik: patient.nik,
                      gender: patient.gender,
                      birth_date: patient.birth_date.toISOString(),
                      phone: patient.phone,
                  }
                : undefined,
            id_practitioner: order.id_practitioner ?? null,
            practitioner: practitioner
                ? {
                      id: practitioner.id,
                      name: practitioner.name,
                      nik: practitioner.nik,
                      profession: practitioner.profession,
                      phone: practitioner.phone,
                  }
                : undefined,
            id_created_by: order.id_created_by ?? null,
            created_by: createdBy
                ? {
                      id: createdBy.id,
                      name: createdBy.name,
                      email: createdBy.email,
                  }
                : undefined,
            id_encounter_ss: order.id_encounter_ss,
            id_pelayanan: order.id_pelayanan,
            patient_name: order.patient_name,
            patient_mrn: order.patient_mrn,
            patient_birth_date: order.patient_birth_date?.toString() || null,
            patient_age: order.patient_age,
            patient_gender: order.patient_gender,
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
            id_order: detail.id_order ?? null,
            id_loinc: detail.id_loinc ?? null,
            loinc:
                loinc && modality
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
                          modality: {
                              id: modality.id,
                              code: modality.code,
                              name: modality.name,
                          },
                      }
                    : undefined,
            id_service_request_ss: detail.id_service_request_ss,
            id_observation_ss: detail.id_observation_ss,
            id_procedure_ss: detail.id_procedure_ss,
            id_allergy_intolerance_ss: detail.id_allergy_intolerance_ss,
            id_requester_ss: detail.id_requester_ss,
            requester_display: detail.requester_display,
            id_performer_ss: detail.id_performer_ss,
            performer_display: detail.performer_display,
            accession_number: detail.accession_number ?? null,
            order_number: detail.order_number ?? null,
            order_date: detail.order_date?.toISOString() ?? null,
            schedule_date: detail.schedule_date?.toISOString() ?? null,
            occurrence_datetime: detail.occurrence_datetime?.toISOString() ?? null,
            order_priority: detail.order_priority ?? null,
            order_status: detail.order_status ?? null,
            order_from: detail.order_from ?? null,
            fhir_status: detail.fhir_status,
            fhir_intent: detail.fhir_intent,
            order_category_code: detail.order_category_code,
            order_category_display: detail.order_category_display,
            loinc_code_alt: detail.loinc_code_alt,
            loinc_display_alt: detail.loinc_display_alt,
            kptl_code: detail.kptl_code,
            kptl_display: detail.kptl_display,
            code_text: detail.code_text,
            modality_code: detail.modality_code,
            ae_title: detail.ae_title,
            contrast_code: detail.contrast_code,
            contrast_name_kfa: detail.contrast_name_kfa,
            reason_code: detail.reason_code,
            reason_display: detail.reason_display,
            diagnosis: detail.diagnosis,
            notes: detail.notes,
            require_fasting: detail.require_fasting ?? null,
            require_pregnancy_check: detail.require_pregnancy_check ?? null,
            require_use_contrast: detail.require_use_contrast ?? null,
            service_request_json: detail.service_request_json ?? null,
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
                    ...OrderService.formatOrderResponse(order, patient, practitioner, createdBy),
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

        const { order, patient, practitioner, createdBy } = result[0];

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
            ...OrderService.formatOrderResponse(order, patient, practitioner, createdBy),
            details: details.map(({ detail, loinc, modality }) =>
                OrderService.formatDetailOrderResponse(detail, loinc, modality)
            ),
        };
    }

    /**
     * Map FHIR ServiceRequest to flat detail order fields
     */
    private static mapFhirToDetailOrder(fhir: any) {
        const result: any = {};

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
            if (srId?.value) result.id_service_request_ss = srId.value;
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

        // Map requester
        if (fhir.requester) {
            result.id_requester_ss = fhir.requester.reference?.split("/")[1];
            result.requester_display = fhir.requester.display;
        }

        // Map performer
        if (fhir.performer?.[0]) {
            result.id_performer_ss = fhir.performer[0].reference?.split("/")[1];
            result.performer_display = fhir.performer[0].display;
        }

        // Map reasonCode
        if (fhir.reasonCode?.[0]?.coding?.[0]) {
            result.reason_code = fhir.reasonCode[0].coding[0].code;
            result.reason_display = fhir.reasonCode[0].coding[0].display;
        }

        // Map supportingInfo
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
     * Create new order with details
     */
    static async createOrder(data: CreateOrderInput, userId: string): Promise<FullOrderResponse> {
        const orderNumber = await OrderService.generateOrderNumber();

        // Create order
        const [order] = await db
            .insert(orderTable)
            .values({
                id_patient: data.id_patient,
                id_practitioner: data.id_practitioner,
                id_created_by: userId,
                id_encounter_ss: data.id_encounter_ss,
                id_pelayanan: data.id_pelayanan,
                patient_name: data.patient_name,
                patient_mrn: data.patient_mrn,
                patient_birth_date: data.patient_birth_date,
                patient_age: data.patient_age,
                patient_gender: data.patient_gender,
            })
            .returning();

        // Generate base accession number info
        const now = new Date();
        const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, "");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [{ total }] = await db
            .select({ total: count() })
            .from(detailOrderTable)
            .where(and(gte(detailOrderTable.created_at, today), lte(detailOrderTable.created_at, tomorrow)));

        // Create order details with sequential accession numbers
        const detailsToInsert = await Promise.all(
            data.details.map(async (detailData: CreateDetailOrderItem, index: number) => {
                // Generate unique accession number for each detail
                const sequence = (total + 1 + index).toString().padStart(4, "0");
                const accessionNumber = `${datePrefix}-${sequence}`;

                // Get LOINC data to copy requirements
                const [loincData] = await db.select().from(loincTable).where(eq(loincTable.id, detailData.id_loinc));

                // Merge FHIR data if provided
                let mergedData = { ...detailData };
                if ((detailData as any).service_request) {
                    const fhirMapped = OrderService.mapFhirToDetailOrder((detailData as any).service_request);
                    mergedData = { ...mergedData, ...fhirMapped };
                }

                return {
                    id_order: order.id,
                    id_loinc: mergedData.id_loinc,
                    accession_number: accessionNumber,
                    order_number: orderNumber,
                    order_date: mergedData.order_date ? new Date(mergedData.order_date) : new Date(),
                    schedule_date: mergedData.schedule_date ? new Date(mergedData.schedule_date) : new Date(),
                    occurrence_datetime: mergedData.occurrence_datetime ? new Date(mergedData.occurrence_datetime) : undefined,
                    order_priority: mergedData.order_priority || "ROUTINE",
                    order_from: mergedData.order_from || "INTERNAL",
                    fhir_status: mergedData.fhir_status || "active",
                    fhir_intent: mergedData.fhir_intent || "original-order",
                    id_requester_ss: mergedData.id_requester_ss,
                    requester_display: mergedData.requester_display,
                    id_performer_ss: mergedData.id_performer_ss,
                    performer_display: mergedData.performer_display,
                    order_category_code: mergedData.order_category_code,
                    order_category_display: mergedData.order_category_display,
                    loinc_code_alt: mergedData.loinc_code_alt,
                    loinc_display_alt: mergedData.loinc_display_alt,
                    kptl_code: mergedData.kptl_code,
                    kptl_display: mergedData.kptl_display,
                    code_text: mergedData.code_text,
                    modality_code: mergedData.modality_code,
                    ae_title: mergedData.ae_title,
                    contrast_code: mergedData.contrast_code,
                    contrast_name_kfa: mergedData.contrast_name_kfa,
                    reason_code: mergedData.reason_code,
                    reason_display: mergedData.reason_display,
                    id_service_request_ss: mergedData.id_service_request_ss,
                    id_observation_ss: mergedData.id_observation_ss,
                    id_procedure_ss: mergedData.id_procedure_ss,
                    id_allergy_intolerance_ss: mergedData.id_allergy_intolerance_ss,
                    diagnosis: mergedData.diagnosis,
                    notes: mergedData.notes,
                    require_fasting: loincData?.require_fasting || false,
                    require_pregnancy_check: loincData?.require_pregnancy_check || false,
                    require_use_contrast: loincData?.require_use_contrast || false,
                    service_request_json: (detailData as any).service_request || null,
                };
            })
        );

        await db.insert(detailOrderTable).values(detailsToInsert);

        // Return created order with details
        const createdOrder = await OrderService.getOrderById(order.id);
        return createdOrder!;
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
}
