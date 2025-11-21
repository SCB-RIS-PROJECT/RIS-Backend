import { and, asc, count, desc, eq, type InferSelectModel, ilike, or, type SQL } from "drizzle-orm";
import db from "@/database/db";
import { patientTable } from "@/database/schemas/schema-patient";
import type {
    CreatePatientInput,
    PatientPaginationResponse,
    PatientQuery,
    PatientResponse,
    UpdatePatientInput,
} from "@/interface/patient.interface";

export class PatientService {
    static formatPatientResponse(patient: InferSelectModel<typeof patientTable>): PatientResponse {
        return {
            id: patient.id,
            mrn: patient.mrn,
            ihs_number: patient.ihs_number,
            ihs_last_sync: patient.ihs_last_sync?.toISOString() || null,
            ihs_response_status: patient.ihs_response_status,
            nik: patient.nik,
            name: patient.name,
            gender: patient.gender,
            birth_date: patient.birth_date.toISOString(),
            phone: patient.phone,
            email: patient.email,
            address: patient.address,
            id_province: patient.id_province,
            province: patient.province,
            id_city: patient.id_city,
            city: patient.city,
            id_district: patient.id_district,
            district: patient.district,
            id_sub_district: patient.id_sub_district,
            sub_district: patient.sub_district,
            rt: patient.rt,
            rw: patient.rw,
            postal_code: patient.postal_code,
            emergency_contact_name: patient.emergency_contact_name,
            emergency_contact_phone: patient.emergency_contact_phone,
            created_at: patient.created_at.toISOString(),
            updated_at: patient.updated_at?.toISOString() || null,
        };
    }

    static async generateMRN(): Promise<string> {
        // Generate 6-digit MRN: format YYMMXX where XX is sequence
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, "0");

        // Get count of patients today to use as sequence
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [{ total }] = await db
            .select({ total: count() })
            .from(patientTable)
            .where(and(eq(patientTable.created_at, today)));

        const sequence = (total + 1).toString().padStart(2, "0");
        return `${year}${month}${sequence}`;
    }

    static async getAllPatients(query: PatientQuery): Promise<PatientPaginationResponse> {
        const { page, per_page, search, sort, dir } = query;
        const offset = (page - 1) * per_page;

        // Build where conditions
        const whereConditions: SQL[] = [];
        if (search) {
            const searchCondition = or(
                ilike(patientTable.name, `%${search}%`),
                ilike(patientTable.nik, `%${search}%`),
                ilike(patientTable.mrn, `%${search}%`),
                ilike(patientTable.phone, `%${search}%`),
                ilike(patientTable.email, `%${search}%`)
            );
            if (searchCondition) {
                whereConditions.push(searchCondition);
            }
        }

        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

        // Determine sort order
        const sortColumn = patientTable[sort];
        const orderBy = dir === "asc" ? asc(sortColumn) : desc(sortColumn);

        // Get patients
        const patients = await db
            .select()
            .from(patientTable)
            .where(whereClause)
            .orderBy(orderBy)
            .limit(per_page)
            .offset(offset);

        // Get total count
        const [{ total }] = await db.select({ total: count() }).from(patientTable).where(whereClause);

        const totalPages = Math.ceil(total / per_page);

        return {
            data: patients.map((patient) => PatientService.formatPatientResponse(patient)),
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

    static async getPatientById(patientId: string): Promise<PatientResponse | null> {
        const [patient] = await db.select().from(patientTable).where(eq(patientTable.id, patientId)).limit(1);

        if (!patient) return null;

        return PatientService.formatPatientResponse(patient);
    }

    static async createPatient(data: CreatePatientInput): Promise<PatientResponse> {
        const mrn = await PatientService.generateMRN();

        const [patient] = await db
            .insert(patientTable)
            .values({
                ...data,
                mrn,
                birth_date: new Date(data.birth_date),
                ihs_last_sync: data.ihs_last_sync ? new Date(data.ihs_last_sync) : null,
            })
            .returning();

        return PatientService.formatPatientResponse(patient);
    }

    static async updatePatient(patientId: string, data: UpdatePatientInput): Promise<PatientResponse | null> {
        const updateData: Partial<InferSelectModel<typeof patientTable>> = {
            ...data,
            updated_at: new Date(),
        };

        if (data.birth_date) {
            updateData.birth_date = new Date(data.birth_date);
        }

        if (data.ihs_last_sync) {
            updateData.ihs_last_sync = new Date(data.ihs_last_sync);
        }

        const [patient] = await db
            .update(patientTable)
            .set(updateData)
            .where(eq(patientTable.id, patientId))
            .returning();

        if (!patient) return null;

        return PatientService.formatPatientResponse(patient);
    }

    static async deletePatient(patientId: string): Promise<boolean> {
        const result = await db.delete(patientTable).where(eq(patientTable.id, patientId)).returning();

        return result.length > 0;
    }
}
