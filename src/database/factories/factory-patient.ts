import { fakerID_ID as faker } from "@faker-js/faker";
import type { InferInsertModel } from "drizzle-orm";
import { GENDERS } from "@/database/schemas/constants";
import type { patientTable } from "@/database/schemas/schema-patient";

type NewPatient = InferInsertModel<typeof patientTable>;

let maleCounter = 1;
let femaleCounter = 1;

const generateMRN = (gender: "MALE" | "FEMALE"): string => {
    if (gender === "MALE") {
        const mrn = `L${String(maleCounter).padStart(5, "0")}`;
        maleCounter++;
        return mrn;
    } else {
        const mrn = `P${String(femaleCounter).padStart(5, "0")}`;
        femaleCounter++;
        return mrn;
    }
};

const generateNIK = (): string => {
    return faker.string.numeric(16);
};

const generatePhoneNumber = (): string => {
    const prefix = "08";
    const middle = faker.string.numeric(2);
    const suffix = faker.string.numeric(8);
    return `${prefix}${middle}${suffix}`;
};

export const createPatient = async (data?: Partial<NewPatient>): Promise<NewPatient> => {
    const gender = data?.gender || faker.helpers.arrayElement(GENDERS);
    const isMale = gender === "MALE";

    return {
        mrn: data?.mrn || generateMRN(gender),
        ihs_number: data?.ihs_number ?? null,
        ihs_last_sync: data?.ihs_last_sync ?? null,
        ihs_response_status: data?.ihs_response_status ?? null,
        nik: data?.nik || generateNIK(),
        name: data?.name || faker.person.fullName({ sex: isMale ? "male" : "female" }),
        gender: gender,
        birth_date: data?.birth_date || faker.date.birthdate({ min: 1, max: 80, mode: "age" }),
        phone: data?.phone || generatePhoneNumber(),
        address: data?.address || faker.location.streetAddress(true),
        id_province: data?.id_province || faker.string.numeric(2),
        province: data?.province || faker.location.state(),
        id_city: data?.id_city || faker.string.numeric(4),
        city: data?.city || faker.location.city(),
        id_district: data?.id_district || faker.string.numeric(6),
        district: data?.district || faker.location.county(),
        id_sub_district: data?.id_sub_district || faker.string.numeric(10),
        sub_district: data?.sub_district || faker.location.street(),
        rt: data?.rt || faker.string.numeric({ length: 3, allowLeadingZeros: true }),
        rw: data?.rw || faker.string.numeric({ length: 3, allowLeadingZeros: true }),
        postal_code: data?.postal_code || faker.location.zipCode("#####"),
        emergency_contact_name: data?.emergency_contact_name || faker.person.fullName(),
        emergency_contact_phone: data?.emergency_contact_phone || generatePhoneNumber(),
        created_at: data?.created_at || new Date(),
        updated_at: data?.updated_at || new Date(),
    };
};

export const FactoryPatient = (data: Partial<NewPatient>[] | number): Promise<NewPatient[]> => {
    if (Array.isArray(data)) {
        return Promise.all(data.map((patientData) => createPatient(patientData)));
    }
    return Promise.all(Array.from({ length: data }, () => createPatient()));
};

// Reset counter (useful for testing)
export const resetMRNCounter = () => {
    maleCounter = 1;
    femaleCounter = 1;
};
