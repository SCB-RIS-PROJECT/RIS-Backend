import { and, asc, count, desc, eq, gte, type InferSelectModel, ilike, lte, or, sql, type SQL } from "drizzle-orm";
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
    FinalizeOrderDetailInput,
} from "@/interface/order.interface";
import { pushWorklistToOrthanc, type MWLWorklistItem } from "@/lib/orthanc-mwl";
import { pushWorklistToDcm4chee, type DCM4CHEEMWLItem } from "@/lib/dcm4chee-mwl";
import { generateAccessionNumber } from "@/lib/utils";
import { SatuSehatService } from "@/service/satu-sehat.service";
import env from "@/config/env";
import { loggerPino } from "@/config/log";

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
        practitioners: {
            requester: { id_ss: string; name: string } | null;
            performers: Array<{ id_ss: string; name: string }>;
        } | null,
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
            practitioners: practitioners,
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
        // For exam: prioritize master data, fallback to service_request data
        let exam = null;
        if (loinc) {
            exam = {
                id: loinc.id,
                code: loinc.code,
                name: loinc.name,
                loinc_code: loinc.loinc_code,
                loinc_display: loinc.loinc_display,
                require_fasting: loinc.require_fasting,
                require_pregnancy_check: loinc.require_pregnancy_check,
                require_use_contrast: loinc.require_use_contrast,
                contrast_name: loinc.contrast_name,
            };
        } else if (detail.loinc_code_alt || detail.loinc_display_alt) {
            // Use data from service_request (for SIMRS orders)
            exam = {
                id: detail.id, // Use detail ID as placeholder
                code: detail.loinc_code_alt || "N/A",
                name: detail.code_text || detail.loinc_display_alt || "N/A",
                loinc_code: detail.loinc_code_alt || "N/A",
                loinc_display: detail.loinc_display_alt || "N/A",
                require_fasting: detail.require_fasting || false,
                require_pregnancy_check: detail.require_pregnancy_check || false,
                require_use_contrast: detail.require_use_contrast || false,
                contrast_name: detail.contrast_name_kfa || null,
            };
        }

        // For modality: prioritize master data, fallback to modality_code from service_request
        let modalityInfo = null;
        if (modality) {
            modalityInfo = {
                id: modality.id,
                code: modality.code,
                name: modality.name,
                ae_title: detail.ae_title || null,
            };
        } else if (detail.modality_code) {
            // Use modality_code from service_request (for SIMRS orders)
            modalityInfo = {
                id: detail.id, // Use detail ID as placeholder
                code: detail.modality_code,
                name: detail.modality_code, // Use code as name if no master data
                ae_title: detail.ae_title || null,
            };
        }

        // Contrast info (from RIS update)
        const contrastInfo = detail.contrast_code || detail.contrast_name_kfa ? {
            code: detail.contrast_code ?? null,
            name: detail.contrast_name_kfa ?? null,
        } : null;

        // KPTL info
        const kptlInfo = detail.kptl_code || detail.kptl_display ? {
            code: detail.kptl_code ?? null,
            display: detail.kptl_display ?? null,
        } : null;

        // Performer info (radiologist from RIS)
        const performerInfo = detail.id_performer_ss || detail.performer_display ? {
            id_ss: detail.id_performer_ss ?? null,
            name: detail.performer_display ?? null,
        } : null;

        // Check if order can be pushed to MWL
        // Requirements: ServiceRequest sent to Satu Sehat + Required MWL data complete
        const canPushToMwl = Boolean(
            detail.id_service_request_ss && // ServiceRequest sudah dikirim
            detail.accession_number && // Accession number exists
            detail.modality_code && // Modality code exists
            detail.ae_title // AE Title exists
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
            performer: performerInfo,
            satu_sehat: {
                id_service_request: detail.id_service_request_ss,
                id_imaging_study: detail.id_imaging_study_ss,
                id_observation: detail.id_observation_ss,
                id_procedure: detail.id_procedure_ss,
                id_allergy_intolerance: detail.id_allergy_intolerance_ss,
            },
            can_push_to_mwl: canPushToMwl,
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
                createdBy: userTable,
            })
            .from(orderTable)
            .leftJoin(patientTable, eq(orderTable.id_patient, patientTable.id))
            .leftJoin(userTable, eq(orderTable.id_created_by, userTable.id))
            .where(orderWhereClause)
            .orderBy(orderBy)
            .limit(per_page)
            .offset(offset);

        // Get details for each order (no filter here, show all details within filtered orders)
        const ordersWithDetails: FullOrderResponse[] = await Promise.all(
            orders.map(async ({ order, patient, createdBy }) => {
                const detailWhereConditions: SQL[] = [eq(detailOrderTable.id_order, order.id)];

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

                // Extract practitioners from first detail's service_request
                const firstDetail = details[0]?.detail;
                const serviceRequestJson = firstDetail?.service_request_json as SimrsServiceRequest | null;
                
                let practitioners: {
                    requester: { id_ss: string; name: string } | null;
                    performers: Array<{ id_ss: string; name: string }>;
                } | null = null;

                if (serviceRequestJson || firstDetail) {
                    // Get requester from service_request_json OR from detail fields
                    let requester: { id_ss: string; name: string } | null = null;
                    if (firstDetail?.id_requester_ss) {
                        requester = {
                            id_ss: firstDetail.id_requester_ss,
                            name: firstDetail.requester_display || "",
                        };
                    } else if (serviceRequestJson?.requester) {
                        requester = {
                            id_ss: serviceRequestJson.requester.reference?.split("/")[1] || "",
                            name: serviceRequestJson.requester.display || "",
                        };
                    }

                    // Get performers - combine from service_request_json AND from detail fields (id_performer_ss)
                    const performersSet = new Map<string, { id_ss: string; name: string }>();
                    
                    // Add performers from service_request_json
                    if (serviceRequestJson?.performer) {
                        for (const p of serviceRequestJson.performer) {
                            const id = p.reference?.split("/")[1] || "";
                            if (id) {
                                performersSet.set(id, {
                                    id_ss: id,
                                    name: p.display || "",
                                });
                            }
                        }
                    }
                    
                    // Add/update performers from detail fields (takes precedence - data from RIS)
                    for (const { detail } of details) {
                        if (detail.id_performer_ss) {
                            performersSet.set(detail.id_performer_ss, {
                                id_ss: detail.id_performer_ss,
                                name: detail.performer_display || "",
                            });
                        }
                    }

                    practitioners = {
                        requester,
                        performers: Array.from(performersSet.values()),
                    };
                }

                return {
                    ...OrderService.formatOrderResponse(order, practitioners, createdBy),
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
                createdBy: userTable,
            })
            .from(orderTable)
            .leftJoin(patientTable, eq(orderTable.id_patient, patientTable.id))
            .leftJoin(userTable, eq(orderTable.id_created_by, userTable.id))
            .where(eq(orderTable.id, orderId))
            .limit(1);

        if (result.length === 0) return null;

        const { order, createdBy } = result[0];

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

        // Extract practitioners from first detail's service_request
        const firstDetail = details[0]?.detail;
        const serviceRequestJson = firstDetail?.service_request_json as SimrsServiceRequest | null;
        
        let practitioners: {
            requester: { id_ss: string; name: string } | null;
            performers: Array<{ id_ss: string; name: string }>;
        } | null = null;

        if (serviceRequestJson || firstDetail) {
            // Get requester from service_request_json OR from detail fields
            let requester: { id_ss: string; name: string } | null = null;
            if (firstDetail?.id_requester_ss) {
                requester = {
                    id_ss: firstDetail.id_requester_ss,
                    name: firstDetail.requester_display || "",
                };
            } else if (serviceRequestJson?.requester) {
                requester = {
                    id_ss: serviceRequestJson.requester.reference?.split("/")[1] || "",
                    name: serviceRequestJson.requester.display || "",
                };
            }

            // Get performers - combine from service_request_json AND from detail fields (id_performer_ss)
            const performersSet = new Map<string, { id_ss: string; name: string }>();
            
            // Add performers from service_request_json
            if (serviceRequestJson?.performer) {
                for (const p of serviceRequestJson.performer) {
                    const id = p.reference?.split("/")[1] || "";
                    if (id) {
                        performersSet.set(id, {
                            id_ss: id,
                            name: p.display || "",
                        });
                    }
                }
            }
            
            // Add/update performers from detail fields (takes precedence - data from RIS)
            for (const { detail } of details) {
                if (detail.id_performer_ss) {
                    performersSet.set(detail.id_performer_ss, {
                        id_ss: detail.id_performer_ss,
                        name: detail.performer_display || "",
                    });
                }
            }

            practitioners = {
                requester,
                performers: Array.from(performersSet.values()),
            };
        }

        return {
            ...OrderService.formatOrderResponse(order, practitioners, createdBy),
            details: details.map(({ detail, loinc, modality }) =>
                OrderService.formatDetailOrderResponse(detail, loinc, modality)
            ),
        };
    }

    /**
     * Get order by Accession Number
     */
    static async getOrderByAccessionNumber(accessionNumber: string): Promise<FullOrderResponse | null> {
        // First, find the detail order by accession number
        const [detailOrder] = await db
            .select()
            .from(detailOrderTable)
            .where(eq(detailOrderTable.accession_number, accessionNumber))
            .limit(1);

        if (!detailOrder || !detailOrder.id_order) {
            return null;
        }

        // Then get the full order using the order ID
        return OrderService.getOrderById(detailOrder.id_order);
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
     * 1. Extract patient/practitioner info from new SIMRS format
     * 2. Create order record
     * 3. Generate ACSN for each detail (format: {MODALITY}{YYYYMMDD}{SEQ})
     * 4. Create detail order records
     * 5. Return order with details
     * Note: Satu Sehat will be sent later after RIS completes the order
     */
    static async createOrder(data: CreateOrderInput, userId: string): Promise<FullOrderResponse> {
        // Extract patient and practitioner info from first detail
        let id_patient_ss: string | null = null;
        let id_encounter_ss: string | null = null;
        let patient_name: string | null = null;
        let patient_mrn: string | null = null;
        let patient_birth_date: string | null = null;
        let patient_age: number | null = null;
        let patient_gender: string | null = null;

        if (data.details.length > 0) {
            const firstDetail = data.details[0];
            
            // Extract patient info from subject
            if (firstDetail.subject) {
                id_patient_ss = firstDetail.subject.ihs_id || null;
                patient_name = firstDetail.subject.patient_name;
                patient_mrn = firstDetail.subject.patient_mrn;
                patient_birth_date = firstDetail.subject.patient_birth_date;
                patient_age = firstDetail.subject.patient_age;
                patient_gender = firstDetail.subject.patient_gender;
            }

            // Extract encounter ID
            if (firstDetail.encounter) {
                id_encounter_ss = firstDetail.encounter.encounter_id || null;
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
                // Determine modality code for ACSN from LOINC code prefix (e.g., "36687-2" -> search in DB)
                // For now, try to determine from LOINC code pattern or use default
                let modalityCode = "OT"; // Default: Other
                
                // Try to find modality from LOINC code in pemeriksaan
                if (detailData.pemeriksaan?.code) {
                    const loincResult = await db
                        .select({
                            loinc: loincTable,
                            modality: modalityTable,
                        })
                        .from(loincTable)
                        .leftJoin(modalityTable, eq(loincTable.id_modality, modalityTable.id))
                        .where(eq(loincTable.loinc_code, detailData.pemeriksaan.code))
                        .limit(1);

                    if (loincResult[0]?.modality?.code) {
                        modalityCode = loincResult[0].modality.code;
                    }
                }

                // Generate ACSN with modality code: {MODALITY}{YYYYMMDD}{SEQ}
                const accessionNumber = await generateAccessionNumber(modalityCode);

                // Generate order number
                const orderNumber = `ORD-${accessionNumber}`;

                // Build diagnosis string from diagnosa
                let diagnosis: string | null = null;
                let diagnosis_code: string | null = null;
                let diagnosis_display: string | null = null;
                if (detailData.diagnosa) {
                    diagnosis = `${detailData.diagnosa.code} - ${detailData.diagnosa.display}`;
                    diagnosis_code = detailData.diagnosa.code;
                    diagnosis_display = detailData.diagnosa.display;
                }

                // Build service_request_json for later Satu Sehat integration
                const serviceRequestJson = {
                    code: {
                        coding: [{
                            system: detailData.pemeriksaan.system,
                            code: detailData.pemeriksaan.code,
                            display: detailData.pemeriksaan.display,
                        }],
                        text: detailData.pemeriksaan.text,
                    },
                    subject: {
                        reference: `Patient/${detailData.subject.ihs_id}`,
                        patient_name: detailData.subject.patient_name,
                        patient_mrn: detailData.subject.patient_mrn,
                        patient_birth_date: detailData.subject.patient_birth_date,
                        patient_age: detailData.subject.patient_age,
                        patient_gender: detailData.subject.patient_gender,
                    },
                    encounter: {
                        reference: `Encounter/${detailData.encounter.encounter_id}`,
                    },
                    requester: {
                        reference: `Practitioner/${detailData.requester.id_practitioner}`,
                        display: detailData.requester.name_practitioner,
                    },
                    reasonCode: detailData.diagnosa ? [{
                        coding: [{
                            system: detailData.diagnosa.system,
                            code: detailData.diagnosa.code,
                            display: detailData.diagnosa.display,
                        }],
                    }] : undefined,
                    occurrenceDateTime: detailData.ccurence_date_time,
                };

                return {
                    id_order: order.id,
                    id_loinc: null, // SIMRS orders don't use RIS LOINC master
                    accession_number: accessionNumber,
                    order_number: orderNumber,
                    order_date: new Date(),
                    schedule_date: detailData.ccurence_date_time ? new Date(detailData.ccurence_date_time) : new Date(),
                    occurrence_datetime: detailData.ccurence_date_time ? new Date(detailData.ccurence_date_time) : new Date(),
                    order_priority: detailData.order_priority || "ROUTINE",
                    order_from: "EXTERNAL" as const,
                    order_status: "IN_REQUEST" as const,
                    fhir_status: "active",
                    fhir_intent: "original-order",
                    order_category_code: "363679005",
                    order_category_display: "Imaging",
                    // LOINC info from pemeriksaan
                    loinc_code_alt: detailData.pemeriksaan.code || null,
                    loinc_display_alt: detailData.pemeriksaan.display || null,
                    code_text: detailData.pemeriksaan.text || detailData.pemeriksaan.display || null,
                    // Modality info
                    modality_code: modalityCode,
                    ae_title: null,
                    // Requester info
                    id_requester_ss: detailData.requester.id_practitioner || null,
                    requester_display: detailData.requester.name_practitioner || null,
                    // Diagnosis info
                    reason_code: detailData.diagnosa?.code || null,
                    reason_display: detailData.diagnosa?.display || null,
                    diagnosis: diagnosis,
                    diagnosis_code: diagnosis_code,
                    diagnosis_display: diagnosis_display,
                    // Notes
                    notes: detailData.notes || null,
                    // Store original data as service_request_json for later Satu Sehat integration
                    service_request_json: serviceRequestJson,
                };
            })
        );

        await db.insert(detailOrderTable).values(detailsToInsert);

        // Return created order with details
        const createdOrder = await OrderService.getOrderById(order.id);
        return createdOrder!;
    }

    /**
     * Create order from SIMRS and return simple message
     * Satu Sehat will NOT be sent immediately - it will be sent later after RIS completes the order
     */
    static async createOrderForSimrs(
        data: CreateOrderInput, 
        userId: string
    ): Promise<OrderCreationSuccess> {
        // Create order (no Satu Sehat send)
        await OrderService.createOrder(data, userId);

        // Return simple success message only
        const response: OrderCreationSuccess = {
            success: true,
            message: "Order created successfully",
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
     * Send ServiceRequest to Satu Sehat (tanpa MWL push)
     * Data diambil dari database yang sudah di-update sebelumnya
     */
    static async sendToSatuSehat(
        orderId: string,
        detailId: string
    ): Promise<{
        success: boolean;
        message: string;
        data?: {
            detail_id: string;
            accession_number: string;
            service_request_id: string;
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

        // Validate required data from database
        if (!detail.accession_number) {
            return { success: false, message: "Missing accession number" };
        }

        if (!detail.modality_code) {
            return { success: false, message: "Missing modality_code. Please update order detail first." };
        }

        if (!detail.ae_title) {
            return { success: false, message: "Missing ae_title. Please update order detail first." };
        }

        if (!detail.id_performer_ss) {
            return { success: false, message: "Missing performer_id. Please update order detail first." };
        }

        if (!detail.performer_display) {
            return { success: false, message: "Missing performer_name. Please update order detail first." };
        }

        if (!detail.schedule_date && !detail.occurrence_datetime) {
            return { success: false, message: "Missing schedule date" };
        }

        // Get patient and encounter from service_request_json
        const serviceRequestJson = detail.service_request_json as SimrsServiceRequest | null;
        if (!serviceRequestJson?.subject?.reference || !serviceRequestJson?.encounter?.reference) {
            return { success: false, message: "Missing patient or encounter reference in order data" };
        }

        const patientId = serviceRequestJson.subject.reference.split("/")[1];
        const encounterId = serviceRequestJson.encounter.reference.split("/")[1];

        try {
            // Build ServiceRequest dari data di database
            const serviceRequestPayload = SatuSehatService.buildServiceRequest({
                organizationId: env.SATU_SEHAT_ORGANIZATION_ID,
                accessionNumber: detail.accession_number,
                // Include existing ServiceRequest ID if updating
                serviceRequestId: detail.id_service_request_ss || undefined,
                // Code (LOINC + KPTL)
                loincCode: detail.loinc?.loinc_code || detail.loinc_code_alt || "",
                loincDisplay: detail.loinc?.loinc_display || detail.loinc_display_alt || "",
                kptlCode: detail.kptl_code || undefined,
                kptlDisplay: detail.kptl_display || undefined,
                codeText: detail.code_text || undefined,
                // Order Detail (modality, AE title, contrast) - dari DB
                modalityCode: detail.modality_code,
                aeTitle: detail.ae_title,
                contrastKfaCode: detail.contrast_code || undefined,
                contrastKfaDisplay: detail.contrast_name_kfa || undefined,
                // Subject & Encounter
                patientId,
                encounterId,
                // Occurrence
                occurrenceDateTime:
                    detail.occurrence_datetime?.toISOString() || detail.schedule_date?.toISOString() || undefined,
                // Requester (dokter yang merujuk - dari SIMRS)
                requesterId: detail.id_requester_ss || "",
                requesterDisplay: detail.requester_display || undefined,
                // Performer (radiologist - dari RIS/DB)
                performerId: detail.id_performer_ss,
                performerDisplay: detail.performer_display,
                // Reason (diagnosis)
                reasonIcdCode: detail.reason_code || detail.diagnosis_code || undefined,
                reasonIcdDisplay: detail.reason_display || detail.diagnosis_display || undefined,
                // Supporting info - dari DB
                observationId: detail.id_observation_ss || undefined,
                procedureId: detail.id_procedure_ss || undefined,
                allergyIntoleranceId: detail.id_allergy_intolerance_ss || undefined,
                // Priority
                priority: (detail.order_priority?.toLowerCase() as "routine" | "urgent" | "asap" | "stat") || "routine",
            });

            let satuSehatResponse;
            let actionType: "created" | "updated";

            // Check if ServiceRequest already exists - UPDATE instead of CREATE
            if (detail.id_service_request_ss) {
                // UPDATE existing ServiceRequest
                satuSehatResponse = await SatuSehatService.putServiceRequest(
                    detail.id_service_request_ss,
                    serviceRequestPayload
                );
                actionType = "updated";
            } else {
                // CREATE new ServiceRequest
                satuSehatResponse = await SatuSehatService.postServiceRequest(serviceRequestPayload);
                actionType = "created";

                // Simpan ServiceRequest ID ke database (hanya untuk create baru)
                await db
                    .update(detailOrderTable)
                    .set({
                        id_service_request_ss: satuSehatResponse.id,
                        updated_at: new Date(),
                    })
                    .where(eq(detailOrderTable.id, detailId));
            }

            return {
                success: true,
                message: `ServiceRequest ${actionType} in Satu Sehat successfully`,
                data: {
                    detail_id: detailId,
                    accession_number: detail.accession_number,
                    service_request_id: satuSehatResponse.id,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to send to Satu Sehat",
            };
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

        if (!detail.modality_code) {
            return { success: false, message: "Missing modality_code. Please update order detail first." };
        }

        if (!detail.ae_title) {
            return { success: false, message: "Missing ae_title. Please update order detail first." };
        }

        try {
            // Prepare MWL data dari database
            const mwlData = {
                patientId: order.patient_mrn || "",
                patientName: order.patient_name || "",
                patientBirthDate: order.patient_birth_date || "19000101",
                patientSex: (order.patient_gender === "MALE" ? "M" : order.patient_gender === "FEMALE" ? "F" : "O") as "M" | "F" | "O",
                accessionNumber: detail.accession_number,
                requestedProcedure: detail.loinc?.loinc_display || detail.code_text || detail.loinc_display_alt || "Radiologic Examination",
                modality: detail.modality_code,
                stationAETitle: detail.ae_title,
                scheduledDate: new Date(detail.schedule_date || detail.occurrence_datetime || new Date()),
                scheduledStepId: `SPS-${detail.accession_number}`,
                scheduledStepDescription: detail.loinc?.loinc_display || detail.code_text || detail.loinc_display_alt || "Radiologic Examination",
                referringPhysician: detail.requester_display || order.practitioner?.name || undefined,
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
     * @deprecated Use sendToSatuSehat and pushToMWL separately
     * Send order detail to Satu Sehat and push to MWL in one flow
     */
    static async sendToSatuSehatAndPushMWL(
        orderId: string,
        detailId: string,
        data: {
            modality_code: string;
            ae_title: string;
            performer_id: string;
            performer_name: string;
            contrast_code?: string;
            contrast_name?: string;
            observation_id?: string;
            procedure_id?: string;
            allergy_intolerance_id?: string;
            mwl_target?: "orthanc" | "dcm4chee" | "both";
        }
    ): Promise<{
        success: boolean;
        message: string;
        data?: {
            detail_id: string;
            accession_number: string;
            service_request_id: string;
            mwl_push: {
                success: boolean;
                target: string;
                error?: string;
            };
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

        if (!detail.schedule_date && !detail.occurrence_datetime) {
            return { success: false, message: "Missing schedule date" };
        }

        // Get patient and encounter from service_request_json
        const serviceRequestJson = detail.service_request_json as SimrsServiceRequest | null;
        if (!serviceRequestJson?.subject?.reference || !serviceRequestJson?.encounter?.reference) {
            return { success: false, message: "Missing patient or encounter reference in order data" };
        }

        const patientId = serviceRequestJson.subject.reference.split("/")[1];
        const encounterId = serviceRequestJson.encounter.reference.split("/")[1];

        try {
            // ========== STEP 1: Update detail order dengan data lengkap ==========
            await db
                .update(detailOrderTable)
                .set({
                    modality_code: data.modality_code,
                    ae_title: data.ae_title,
                    id_performer_ss: data.performer_id,
                    performer_display: data.performer_name,
                    contrast_code: data.contrast_code || null,
                    contrast_name_kfa: data.contrast_name || null,
                    id_observation_ss: data.observation_id || null,
                    id_procedure_ss: data.procedure_id || null,
                    id_allergy_intolerance_ss: data.allergy_intolerance_id || null,
                    updated_at: new Date(),
                })
                .where(eq(detailOrderTable.id, detailId));

            // ========== STEP 2: Build ServiceRequest lengkap ==========
            const serviceRequestPayload = SatuSehatService.buildServiceRequest({
                organizationId: env.SATU_SEHAT_ORGANIZATION_ID,
                accessionNumber: detail.accession_number,
                // Code (LOINC + KPTL)
                loincCode: detail.loinc?.loinc_code || detail.loinc_code_alt || "",
                loincDisplay: detail.loinc?.loinc_display || detail.loinc_display_alt || "",
                kptlCode: detail.kptl_code || undefined,
                kptlDisplay: detail.kptl_display || undefined,
                codeText: detail.code_text || undefined,
                // Order Detail (modality, AE title, contrast)
                modalityCode: data.modality_code,
                aeTitle: data.ae_title,
                contrastKfaCode: data.contrast_code || undefined,
                contrastKfaDisplay: data.contrast_name || undefined,
                // Subject & Encounter
                patientId,
                encounterId,
                // Occurrence
                occurrenceDateTime:
                    detail.occurrence_datetime?.toISOString() || detail.schedule_date?.toISOString() || undefined,
                // Requester (dokter yang merujuk - dari SIMRS)
                requesterId: detail.id_requester_ss || "",
                requesterDisplay: detail.requester_display || undefined,
                // Performer (radiologist - dari RIS)
                performerId: data.performer_id,
                performerDisplay: data.performer_name,
                // Reason (diagnosis)
                reasonIcdCode: detail.reason_code || detail.diagnosis_code || undefined,
                reasonIcdDisplay: detail.reason_display || detail.diagnosis_display || undefined,
                // Supporting info
                observationId: data.observation_id || undefined,
                procedureId: data.procedure_id || undefined,
                allergyIntoleranceId: data.allergy_intolerance_id || undefined,
                // Priority
                priority: (detail.order_priority?.toLowerCase() as "routine" | "urgent" | "asap" | "stat") || "routine",
            });

            // ========== STEP 3: POST ke Satu Sehat ==========
            const satuSehatResponse = await SatuSehatService.postServiceRequest(serviceRequestPayload);

            // ========== STEP 4: Simpan ServiceRequest ID ==========
            await db
                .update(detailOrderTable)
                .set({
                    id_service_request_ss: satuSehatResponse.id,
                    updated_at: new Date(),
                })
                .where(eq(detailOrderTable.id, detailId));

            // ========== STEP 5: Push ke MWL ==========
            const mwlTarget = data.mwl_target || "dcm4chee";
            let mwlResult: { success: boolean; error?: string } = { success: false, error: "MWL push skipped" };

            // Prepare MWL data
            const mwlData = {
                patientId: order.patient_mrn || "",
                patientName: order.patient_name || "",
                patientBirthDate: order.patient_birth_date || "19000101",
                patientSex: (order.patient_gender === "MALE" ? "M" : order.patient_gender === "FEMALE" ? "F" : "O") as "M" | "F" | "O",
                accessionNumber: detail.accession_number,
                requestedProcedure: detail.loinc?.loinc_display || detail.code_text || "Radiologic Examination",
                modality: data.modality_code,
                stationAETitle: data.ae_title,
                scheduledDate: new Date(detail.schedule_date || detail.occurrence_datetime || new Date()),
                scheduledStepId: `SPS-${detail.accession_number}`,
                scheduledStepDescription: detail.loinc?.loinc_display || detail.code_text || "Radiologic Examination",
                referringPhysician: detail.requester_display || order.practitioner?.name || undefined,
            };

            // Push to selected target
            if (mwlTarget === "orthanc" || mwlTarget === "both") {
                const orthancResult = await pushWorklistToOrthanc(mwlData);
                mwlResult = { success: orthancResult.success, error: orthancResult.error || undefined };
            }
            
            if (mwlTarget === "dcm4chee" || mwlTarget === "both") {
                const dcm4cheeResult = await pushWorklistToDcm4chee(mwlData);
                mwlResult = { success: dcm4cheeResult.success, error: dcm4cheeResult.error || undefined };
            }

            // ========== Return Success ==========
            return {
                success: true,
                message: "Order sent to Satu Sehat and pushed to MWL successfully",
                data: {
                    detail_id: detailId,
                    accession_number: detail.accession_number,
                    service_request_id: satuSehatResponse.id,
                    mwl_push: {
                        success: mwlResult.success,
                        target: mwlTarget,
                        error: mwlResult.error,
                    },
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to send to Satu Sehat",
            };
        }
    }

    /**
     * @deprecated Use sendToSatuSehatAndPushMWL instead
     * Complete order detail dengan data lengkap dan kirim ke Satu Sehat
     */
    static async completeOrderAndSendToSatuSehat(
        orderId: string,
        detailId: string,
        data: {
            modality_code: string;
            ae_title: string;
            performer_id: string;
            performer_name: string;
            contrast_code?: string;
            contrast_name?: string;
            observation_id?: string;
            procedure_id?: string;
            allergy_intolerance_id?: string;
        }
    ): Promise<{
        success: boolean;
        message: string;
        data?: {
            detail_id: string;
            accession_number: string;
            service_request_id: string;
            service_request_url: string;
        };
    }> {
        // Use new method but without MWL push
        const result = await OrderService.sendToSatuSehatAndPushMWL(orderId, detailId, {
            ...data,
            mwl_target: undefined, // Will skip MWL
        });

        if (!result.success) {
            return { success: false, message: result.message };
        }

        return {
            success: true,
            message: result.message,
            data: {
                detail_id: result.data!.detail_id,
                accession_number: result.data!.accession_number,
                service_request_id: result.data!.service_request_id,
                service_request_url: `${env.SATU_SEHAT_BASE_URL}/ServiceRequest/${result.data!.service_request_id}`,
            },
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

        // Modality & Workstation
        if (data.modality_code !== undefined) {
            updateData.modality_code = data.modality_code;
        }
        if (data.ae_title !== undefined) {
            updateData.ae_title = data.ae_title;
        }

        // Performer (Radiolog)
        if (data.performer_id !== undefined) {
            updateData.id_performer_ss = data.performer_id;
        }
        if (data.performer_name !== undefined) {
            updateData.performer_display = data.performer_name;
        }

        // Contrast
        if (data.contrast_code !== undefined) {
            updateData.contrast_code = data.contrast_code;
        }
        if (data.contrast_name !== undefined) {
            updateData.contrast_name_kfa = data.contrast_name;
        }

        // KPTL Code
        if (data.kptl_code !== undefined) {
            updateData.kptl_code = data.kptl_code;
        }
        if (data.kptl_display !== undefined) {
            updateData.kptl_display = data.kptl_display;
        }

        // Satu Sehat IDs
        if (data.id_service_request_ss !== undefined) {
            updateData.id_service_request_ss = data.id_service_request_ss;
        }
        if (data.id_observation_ss !== undefined) {
            updateData.id_observation_ss = data.id_observation_ss;
        }
        if (data.id_procedure_ss !== undefined) {
            updateData.id_procedure_ss = data.id_procedure_ss;
        }
        if (data.id_allergy_intolerance_ss !== undefined) {
            updateData.id_allergy_intolerance_ss = data.id_allergy_intolerance_ss;
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

    /**
     * Fetch ImagingStudy from Satu Sehat by Accession Number
     * and save the imaging_study_id to database
     */
    static async fetchImagingStudyFromSatuSehat(accessionNumber: string): Promise<{
        success: boolean;
        message: string;
        data?: {
            detail_id: string;
            accession_number: string;
            imaging_study_id: string;
        };
    }> {
        try {
            // Find detail order by accession number
            const [detailOrder] = await db
                .select()
                .from(detailOrderTable)
                .where(eq(detailOrderTable.accession_number, accessionNumber))
                .limit(1);

            if (!detailOrder) {
                return {
                    success: false,
                    message: `Detail order with accession number ${accessionNumber} not found`,
                };
            }

            // Get Satu Sehat token
            const token = await SatuSehatService.getAccessToken();

            // Query ImagingStudy from Satu Sehat
            const identifier = `http://sys-ids.kemkes.go.id/acsn/${env.SATU_SEHAT_ORGANIZATION_ID}|${accessionNumber}`;
            const url = `${env.SATU_SEHAT_BASE_URL}/ImagingStudy?identifier=${encodeURIComponent(identifier)}`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                return {
                    success: false,
                    message: `Failed to fetch ImagingStudy from Satu Sehat: ${response.statusText}`,
                };
            }

            const bundle = await response.json();

            // Check if there are entries
            if (!bundle.entry || bundle.entry.length === 0) {
                return {
                    success: false,
                    message: `No ImagingStudy found for accession number ${accessionNumber}`,
                };
            }

            // Get ImagingStudy ID from first entry
            const imagingStudyId = bundle.entry[0].resource.id;

            if (!imagingStudyId) {
                return {
                    success: false,
                    message: "ImagingStudy ID not found in response",
                };
            }

            // Update detail order with imaging_study_id
            await db
                .update(detailOrderTable)
                .set({
                    id_imaging_study_ss: imagingStudyId,
                    updated_at: new Date(),
                })
                .where(eq(detailOrderTable.id, detailOrder.id));

            return {
                success: true,
                message: "Successfully fetched and saved ImagingStudy ID",
                data: {
                    detail_id: detailOrder.id,
                    accession_number: accessionNumber,
                    imaging_study_id: imagingStudyId,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to fetch ImagingStudy",
            };
        }
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
            observation_id?: string;
            diagnostic_report_id?: string;
            sent_to_satusehat: boolean;
        };
    }> {
        try {
            // 1. Get order and detail
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

            // 3. Validate required data
            if (!detail.id_service_request_ss) {
                return {
                    success: false,
                    message: "ServiceRequest ID not found. Order must be sent to Satu Sehat first.",
                };
            }

            if (!detail.id_performer_ss || !detail.performer_display) {
                return {
                    success: false,
                    message: "Performer information not found. Please complete order first.",
                };
            }

            // 4. Update status to FINAL and save observation notes
            await db
                .update(detailOrderTable)
                .set({
                    order_status: "FINAL",
                    observation_notes: input.observation_notes,
                    diagnostic_conclusion: input.diagnostic_conclusion,
                    updated_at: new Date(),
                })
                .where(eq(detailOrderTable.id, detailId));

            let observationId: string | undefined;
            let diagnosticReportId: string | undefined;
            let sentToSatuSehat = false;

            // 5. Check if encounter exists - if yes, send to Satu Sehat
            if (order.id_encounter_ss) {
                loggerPino.info(`[Finalize] Order has encounter ${order.id_encounter_ss}, sending to Satu Sehat...`);

                const now = new Date();

                // 5a. Build and POST Observation
                const observation = SatuSehatService.buildObservation({
                    organizationId: env.SATU_SEHAT_ORGANIZATION_ID,
                    observationIdentifier: `OBS-${detailId}`,
                    patientId: order.id_patient ?? "",
                    patientName: order.patient_name ?? "Unknown",
                    encounterId: order.id_encounter_ss,
                    loincCode: detail.loinc_code_alt ?? "",
                    loincDisplay: detail.loinc_display_alt ?? "",
                    performerId: detail.id_performer_ss,
                    performerDisplay: detail.performer_display,
                    effectiveDateTime: now,
                    issuedDateTime: now,
                    valueString: input.observation_notes,
                    serviceRequestId: detail.id_service_request_ss,
                    imagingStudyId: detail.id_imaging_study_ss ?? undefined,
                });

                const observationResponse = await SatuSehatService.postObservation(observation);
                observationId = observationResponse.id;

                loggerPino.info(`[Finalize] Observation posted successfully: ${observationId}`);

                // 5b. Build and POST DiagnosticReport
                const diagnosticReport = SatuSehatService.buildDiagnosticReport({
                    organizationId: env.SATU_SEHAT_ORGANIZATION_ID,
                    diagnosticReportIdentifier: `DR-${detailId}`,
                    patientId: order.id_patient ?? "",
                    encounterId: order.id_encounter_ss,
                    loincCode: detail.loinc_code_alt ?? "",
                    loincDisplay: detail.loinc_display_alt ?? "",
                    performerId: detail.id_performer_ss,
                    performerDisplay: detail.performer_display,
                    effectiveDateTime: now,
                    issuedDateTime: now,
                    conclusion: input.diagnostic_conclusion,
                    serviceRequestId: detail.id_service_request_ss,
                    imagingStudyId: detail.id_imaging_study_ss ?? undefined,
                    observationId: observationId,
                });

                const diagnosticReportResponse = await SatuSehatService.postDiagnosticReport(diagnosticReport);
                diagnosticReportId = diagnosticReportResponse.id;

                loggerPino.info(`[Finalize] DiagnosticReport posted successfully: ${diagnosticReportId}`);

                // 5c. Save IDs to database
                await db
                    .update(detailOrderTable)
                    .set({
                        id_observation_ss: observationId,
                        id_diagnostic_report_ss: diagnosticReportId,
                        updated_at: new Date(),
                    })
                    .where(eq(detailOrderTable.id, detailId));

                sentToSatuSehat = true;
            } else {
                loggerPino.info(`[Finalize] Order has no encounter, skipping Satu Sehat submission`);
            }

            return {
                success: true,
                message: sentToSatuSehat
                    ? "Order finalized and sent to Satu Sehat successfully"
                    : "Order finalized (no encounter, not sent to Satu Sehat)",
                data: {
                    detail_id: detailId,
                    order_status: "FINAL",
                    observation_id: observationId,
                    diagnostic_report_id: diagnosticReportId,
                    sent_to_satusehat: sentToSatuSehat,
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
}
