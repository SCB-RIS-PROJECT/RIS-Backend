import { pgEnum } from "drizzle-orm/pg-core";

export const PRACTITIONER_PROFFESIONS = [
    "DOCTOR",
    "NURSE",
    "MIDWIFE",
    "PHARMACIST",
    "LAB_TECHNICIAN",
    "RADIOLOGIST",
    "THERAPIST",
    "DENTIST",
    "ADMINISTRATIVE_STAFF",
] as const;

export const GENDERS = ["MALE", "FEMALE"] as const;

export const genderEnum = pgEnum("gender", GENDERS);

export const practitionerProfessionEnum = pgEnum("profession", PRACTITIONER_PROFFESIONS);

export const ss_patients = [
    {
        nik: "9271060312000001",
        name: "Ardianto Putra",
        gender: "MALE",
        birth_date: new Date("1992-01-09"),
        ihs_number: "P02478375538",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
    },
    {
        nik: "9204014804000002",
        name: "Claudia Sintia",
        gender: "FEMALE",
        birth_date: new Date("1989-11-03"),
        ihs_number: "P03647103112",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
    },
    {
        nik: "9104224509000003",
        name: "Elizabeth Dior",
        gender: "FEMALE",
        birth_date: new Date("1976-07-07"),
        ihs_number: "P00805884304",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
    },
    {
        nik: "9104223107000004",
        name: "Dr. Alan Bagus Prasetya",
        gender: "MALE",
        birth_date: new Date("1977-09-03"),
        ihs_number: "P00912894463",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
    },
    {
        nik: "9104224606000005",
        name: "Ghina Assyifa",
        gender: "FEMALE",
        birth_date: new Date("2004-08-21"),
        ihs_number: "P01654557057",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
    },
    {
        nik: "9104025209000006",
        name: "Salsabilla Anjani Rizki",
        gender: "FEMALE",
        birth_date: new Date("2001-04-16"),
        ihs_number: "P02280547535",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
    },
    {
        nik: "9201076001000007",
        name: "Theodore Elisjah",
        gender: "FEMALE",
        birth_date: new Date("1985-09-18"),
        ihs_number: "P01836748436",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
    },
    {
        nik: "9201394901000008",
        name: "Sonia Herdianti",
        gender: "FEMALE",
        birth_date: new Date("1996-06-08"),
        ihs_number: "P00883356749",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
    },
    {
        nik: "9201076407000009",
        name: "Nancy Wang",
        gender: "FEMALE",
        birth_date: new Date("1955-10-10"),
        ihs_number: "P01058967035",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
    },
    {
        nik: "9210060207000010",
        name: "Syarif Muhammad",
        gender: "MALE",
        birth_date: new Date("1988-11-02"),
        ihs_number: "P02428473601",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
    },
];

export const ss_practitioners = [
    {
        nik: "7209061211900001",
        name: "dr. Alexander",
        gender: "MALE",
        birth_date: new Date("1994-01-01"),
        ihs_number: "10009880728",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
        profession: "DOCTOR",
    },
    {
        nik: "3322071302900002",
        name: "dr. Yoga Yandika, Sp.A",
        gender: "MALE",
        birth_date: new Date("1995-02-02"),
        ihs_number: "10006926841",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
        profession: "DOCTOR",
    },
    {
        nik: "3171071609900003",
        name: "dr. Syarifuddin, Sp.Pd.",
        gender: "MALE",
        birth_date: new Date("1988-03-03"),
        ihs_number: "10001354453",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
        profession: "DOCTOR",
    },
    {
        nik: "3207192310600004",
        name: "dr. Nicholas Evan, Sp.B.",
        gender: "MALE",
        birth_date: new Date("1986-04-04"),
        ihs_number: "10010910332",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
        profession: "DOCTOR",
    },
    {
        nik: "6408130207800005",
        name: "dr. Dito Arifin, Sp.M.",
        gender: "MALE",
        birth_date: new Date("1985-05-05"),
        ihs_number: "10018180913",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
        profession: "DOCTOR",
    },
    {
        nik: "3217040109800006",
        name: "dr. Olivia Kirana, Sp.OG",
        gender: "FEMALE",
        birth_date: new Date("1984-06-06"),
        ihs_number: "10002074224",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
        profession: "DOCTOR",
    },
    {
        nik: "3519111703800007",
        name: "dr. Alicia Chrissy, Sp.N.",
        gender: "FEMALE",
        birth_date: new Date("1982-07-07"),
        ihs_number: "10012572188",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
        profession: "DOCTOR",
    },
    {
        nik: "5271002009700008",
        name: "dr. Nathalie Tan, Sp.PK.",
        gender: "FEMALE",
        birth_date: new Date("1981-08-08"),
        ihs_number: "10018452434",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
        profession: "DOCTOR",
    },
    {
        nik: "3313096403900009",
        name: "Sheila Annisa S.Kep",
        gender: "FEMALE",
        birth_date: new Date("1980-09-09"),
        ihs_number: "10014058550",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
        profession: "NURSE",
    },
    {
        nik: "3578083008700010",
        name: "apt. Aditya Pradhana, S.Farm.",
        gender: "FEMALE",
        birth_date: new Date("1980-10-10"),
        ihs_number: "10001915884",
        ihs_last_sync: new Date(),
        ihs_response_status: "200",
        profession: "PHARMACIST",
    },
];

export const ORDER_STATUS = [
    "PENDING", // Baru dibuat, belum dikonfirmasi
    "CONFIRMED", // Sudah dikonfirmasi
    "IN_PROGRESS", // Sedang dilakukan pemeriksaan
    "COMPLETED", // Pemeriksaan selesai
    "CANCELLED", // Dibatalkan
] as const;

export const orderStatusEnum = pgEnum("order_status", ORDER_STATUS);

export const ORDER_PRIORITY = [
    "ROUTINE", // Rutin
    "URGENT", // Mendesak
    "STAT", // Segera/Emergency
] as const;

export const orderPriorityEnum = pgEnum("order_priority", ORDER_PRIORITY);
