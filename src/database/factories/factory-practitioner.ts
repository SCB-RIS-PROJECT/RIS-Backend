import { fakerID_ID as faker } from "@faker-js/faker";
import type { InferInsertModel } from "drizzle-orm";
import { GENDERS, PRACTITIONER_PROFFESIONS } from "@/database/schemas/constants";
import type { practitionerTable } from "@/database/schemas/schema-practitioner";

type NewPractitioner = InferInsertModel<typeof practitionerTable>;

const generateNIK = (): string => {
    // NIK Indonesia: 16 digit
    return faker.string.numeric(16);
};

const generatePhoneNumber = (): string => {
    // Format: 08xx-xxxx-xxxx
    const prefix = "08";
    const middle = faker.string.numeric(2);
    const suffix = faker.string.numeric(8);
    return `${prefix}${middle}${suffix}`;
};

export const createPractitioner = async (data?: Partial<NewPractitioner>): Promise<NewPractitioner> => {
    const gender = data?.gender || faker.helpers.arrayElement(GENDERS);
    const isMale = gender === "MALE";
    const profession = data?.profession || faker.helpers.arrayElement(PRACTITIONER_PROFFESIONS);

    return {
        ihs_number: data?.ihs_number ?? null,
        ihs_last_sync: data?.ihs_last_sync ?? null,
        ihs_response_status: data?.ihs_response_status ?? null,
        profession: profession,
        nik: data?.nik || generateNIK(),
        name: data?.name || `${faker.person.fullName({ sex: isMale ? "male" : "female" })}`,
        gender: gender,
        birth_date: data?.birth_date || faker.date.birthdate({ min: 25, max: 65, mode: "age" }),
        phone: data?.phone || generatePhoneNumber(),
        email: data?.email || faker.internet.email().toLowerCase(),
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
        active: data?.active ?? true,
        created_at: data?.created_at || new Date(),
        updated_at: data?.updated_at || new Date(),
    };
};

export const FactoryPractitioner = (data: Partial<NewPractitioner>[] | number): Promise<NewPractitioner[]> => {
    if (Array.isArray(data)) {
        return Promise.all(data.map((practitionerData) => createPractitioner(practitionerData)));
    }
    return Promise.all(Array.from({ length: data }, () => createPractitioner()));
};
