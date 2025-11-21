import { z } from "@hono/zod-openapi";

// ==================== Token Response ====================
export const satuSehatTokenResponseSchema = z.object({
    refresh_token_expires_in: z.string(),
    api_product_list: z.string(),
    api_product_list_json: z.array(z.string()),
    organization_name: z.string(),
    "developer.email": z.string(),
    token_type: z.string(),
    issued_at: z.string(),
    client_id: z.string(),
    access_token: z.string(),
    application_name: z.string(),
    scope: z.string(),
    expires_in: z.string(),
    refresh_count: z.string(),
    status: z.string(),
});

export type SatuSehatTokenResponse = z.infer<typeof satuSehatTokenResponseSchema>;

// ==================== IHS Patient Response ====================
export const ihsPatientIdentifierSchema = z.object({
    system: z.string(),
    value: z.string(),
    use: z.string().optional(),
});

export const ihsPatientMetaSchema = z.object({
    lastUpdated: z.string(),
    versionId: z.string(),
});

export const ihsPatientNameSchema = z.object({
    text: z.string(),
    use: z.string().optional(),
});

export const ihsPatientResourceSchema = z.object({
    id: z.string(),
    identifier: z.array(ihsPatientIdentifierSchema),
    meta: ihsPatientMetaSchema,
    name: z.array(ihsPatientNameSchema),
    resourceType: z.literal("Patient"),
    active: z.boolean().optional(),
    link: z.array(z.any()).optional(),
});

export const ihsPatientEntrySchema = z.object({
    fullUrl: z.string(),
    resource: ihsPatientResourceSchema,
});

export const ihsPatientBundleSchema = z.object({
    entry: z.array(ihsPatientEntrySchema).optional(),
    link: z.array(z.any()),
    resourceType: z.literal("Bundle"),
    total: z.number(),
    type: z.string(),
});

export type IHSPatientBundle = z.infer<typeof ihsPatientBundleSchema>;
export type IHSPatientResource = z.infer<typeof ihsPatientResourceSchema>;

// ==================== IHS Practitioner Response ====================
export const ihsPractitionerIdentifierSchema = z.object({
    system: z.string(),
    value: z.string(),
    use: z.string().optional(),
});

export const ihsPractitionerMetaSchema = z.object({
    lastUpdated: z.string(),
    versionId: z.string(),
});

export const ihsPractitionerNameSchema = z.object({
    text: z.string(),
    use: z.string().optional(),
});

export const ihsPractitionerResourceSchema = z.object({
    id: z.string(),
    identifier: z.array(ihsPractitionerIdentifierSchema),
    meta: ihsPractitionerMetaSchema,
    name: z.array(ihsPractitionerNameSchema),
    resourceType: z.literal("Practitioner"),
    birthDate: z.string().optional(),
    gender: z.string().optional(),
    address: z.array(z.any()).optional(),
    qualification: z.array(z.any()).optional(),
});

export const ihsPractitionerEntrySchema = z.object({
    fullUrl: z.string(),
    resource: ihsPractitionerResourceSchema,
});

export const ihsPractitionerBundleSchema = z.object({
    entry: z.array(ihsPractitionerEntrySchema).optional(),
    link: z.array(z.any()),
    resourceType: z.literal("Bundle"),
    total: z.number(),
    type: z.string(),
});

export type IHSPractitionerBundle = z.infer<typeof ihsPractitionerBundleSchema>;
export type IHSPractitionerResource = z.infer<typeof ihsPractitionerResourceSchema>;

// ==================== NIK Param Schema ====================
export const nikParamSchema = z.object({
    nik: z.string().length(16, "NIK must be exactly 16 characters"),
});

export type NikParam = z.infer<typeof nikParamSchema>;

// response ihs patient:
// {
//     "entry": [
//         {
//             "fullUrl": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient/cf1de0c4-7192-4567-bd68-9f89e00ac95d",
//             "resource": {
//                 "id": "cf1de0c4-7192-4567-bd68-9f89e00ac95d",
//                 "identifier": [
//                     {
//                         "system": "https://fhir.kemkes.go.id/id/nik",
//                         "value": "################"
//                     }
//                 ],
//                 "meta": {
//                     "lastUpdated": "2025-11-20T01:44:54.607198+00:00",
//                     "versionId": "MTc2MzYwMzA5NDYwNzE5ODAwMA"
//                 },
//                 "name": [
//                     {
//                         "text": "St** Ca** P**"
//                     }
//                 ],
//                 "resourceType": "Patient"
//             }
//         },
//         {
//             "fullUrl": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient/163d680a-6d8e-400a-9b9f-7fda32828970",
//             "resource": {
//                 "id": "163d680a-6d8e-400a-9b9f-7fda32828970",
//                 "identifier": [
//                     {
//                         "system": "https://fhir.kemkes.go.id/id/nik",
//                         "value": "################"
//                     }
//                 ],
//                 "meta": {
//                     "lastUpdated": "2025-11-20T01:43:09.644683+00:00",
//                     "versionId": "MTc2MzYwMjk4OTY0NDY4MzAwMA"
//                 },
//                 "name": [
//                     {
//                         "text": "St** Ca** P**"
//                     }
//                 ],
//                 "resourceType": "Patient"
//             }
//         },
//         {
//             "fullUrl": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient/7cd73499-794e-4486-91e8-3a156855a110",
//             "resource": {
//                 "id": "7cd73499-794e-4486-91e8-3a156855a110",
//                 "identifier": [
//                     {
//                         "system": "https://fhir.kemkes.go.id/id/nik",
//                         "value": "################"
//                     }
//                 ],
//                 "meta": {
//                     "lastUpdated": "2025-11-20T01:40:05.217208+00:00",
//                     "versionId": "MTc2MzYwMjgwNTIxNzIwODAwMA"
//                 },
//                 "name": [
//                     {
//                         "text": "St** Ca** P**"
//                     }
//                 ],
//                 "resourceType": "Patient"
//             }
//         },
//         {
//             "fullUrl": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient/1a895a94-2f8d-4485-bce7-7759c0934d00",
//             "resource": {
//                 "id": "1a895a94-2f8d-4485-bce7-7759c0934d00",
//                 "identifier": [
//                     {
//                         "system": "https://fhir.kemkes.go.id/id/nik",
//                         "value": "################"
//                     }
//                 ],
//                 "meta": {
//                     "lastUpdated": "2025-11-20T01:35:12.832299+00:00",
//                     "versionId": "MTc2MzYwMjUxMjgzMjI5OTAwMA"
//                 },
//                 "name": [
//                     {
//                         "text": "St** Ca** P**"
//                     }
//                 ],
//                 "resourceType": "Patient"
//             }
//         },
//         {
//             "fullUrl": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient/599e58e4-c94d-4e0b-9069-107a873a9890",
//             "resource": {
//                 "id": "599e58e4-c94d-4e0b-9069-107a873a9890",
//                 "identifier": [
//                     {
//                         "system": "https://fhir.kemkes.go.id/id/nik",
//                         "value": "################"
//                     }
//                 ],
//                 "meta": {
//                     "lastUpdated": "2025-11-20T01:33:10.321319+00:00",
//                     "versionId": "MTc2MzYwMjM5MDMyMTMxOTAwMA"
//                 },
//                 "name": [
//                     {
//                         "text": "St** Ca** P**"
//                     }
//                 ],
//                 "resourceType": "Patient"
//             }
//         },
//         {
//             "fullUrl": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient/0da58829-a0d5-4612-a985-d1620b0f0835",
//             "resource": {
//                 "id": "0da58829-a0d5-4612-a985-d1620b0f0835",
//                 "identifier": [
//                     {
//                         "system": "https://fhir.kemkes.go.id/id/nik",
//                         "value": "################"
//                     }
//                 ],
//                 "meta": {
//                     "lastUpdated": "2025-11-20T01:27:52.561335+00:00",
//                     "versionId": "MTc2MzYwMjA3MjU2MTMzNTAwMA"
//                 },
//                 "name": [
//                     {
//                         "text": "St** Ca** P**"
//                     }
//                 ],
//                 "resourceType": "Patient"
//             }
//         },
//         {
//             "fullUrl": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient/faf5ecc0-feae-4e2a-b031-05829b4c02e0",
//             "resource": {
//                 "id": "faf5ecc0-feae-4e2a-b031-05829b4c02e0",
//                 "identifier": [
//                     {
//                         "system": "https://fhir.kemkes.go.id/id/nik",
//                         "value": "################"
//                     }
//                 ],
//                 "meta": {
//                     "lastUpdated": "2025-11-19T23:43:50.763310+00:00",
//                     "versionId": "MTc2MzU5NTgzMDc2MzMxMDAwMA"
//                 },
//                 "name": [
//                     {
//                         "text": "St** Ca** P**"
//                     }
//                 ],
//                 "resourceType": "Patient"
//             }
//         },
//         {
//             "fullUrl": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient/95576249-ec93-4ba5-b731-820793a7504c",
//             "resource": {
//                 "id": "95576249-ec93-4ba5-b731-820793a7504c",
//                 "identifier": [
//                     {
//                         "system": "https://fhir.kemkes.go.id/id/nik",
//                         "value": "################"
//                     }
//                 ],
//                 "meta": {
//                     "lastUpdated": "2025-11-19T23:36:10.008660+00:00",
//                     "versionId": "MTc2MzU5NTM3MDAwODY2MDAwMA"
//                 },
//                 "name": [
//                     {
//                         "text": "St** Ca** P**"
//                     }
//                 ],
//                 "resourceType": "Patient"
//             }
//         },
//         {
//             "fullUrl": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient/cf9d203e-4d16-45f8-8747-06813de452fe",
//             "resource": {
//                 "id": "cf9d203e-4d16-45f8-8747-06813de452fe",
//                 "identifier": [
//                     {
//                         "system": "https://fhir.kemkes.go.id/id/nik",
//                         "value": "################"
//                     }
//                 ],
//                 "meta": {
//                     "lastUpdated": "2025-11-19T23:33:30.663524+00:00",
//                     "versionId": "MTc2MzU5NTIxMDY2MzUyNDAwMA"
//                 },
//                 "name": [
//                     {
//                         "text": "St** Ca** P**"
//                     }
//                 ],
//                 "resourceType": "Patient"
//             }
//         },
//         {
//             "fullUrl": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient/7ff29b2d-8f08-4191-a559-a491276d2395",
//             "resource": {
//                 "id": "7ff29b2d-8f08-4191-a559-a491276d2395",
//                 "identifier": [
//                     {
//                         "system": "https://fhir.kemkes.go.id/id/nik",
//                         "value": "################"
//                     }
//                 ],
//                 "meta": {
//                     "lastUpdated": "2025-11-19T23:30:55.461572+00:00",
//                     "versionId": "MTc2MzU5NTA1NTQ2MTU3MjAwMA"
//                 },
//                 "name": [
//                     {
//                         "text": "St** Ca** P**"
//                     }
//                 ],
//                 "resourceType": "Patient"
//             }
//         },
//         {
//             "fullUrl": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient/9f71708d-acbb-4029-bc76-d8090256d8f2",
//             "resource": {
//                 "id": "9f71708d-acbb-4029-bc76-d8090256d8f2",
//                 "identifier": [
//                     {
//                         "system": "https://fhir.kemkes.go.id/id/nik",
//                         "value": "################"
//                     }
//                 ],
//                 "meta": {
//                     "lastUpdated": "2025-11-19T23:27:33.298123+00:00",
//                     "versionId": "MTc2MzU5NDg1MzI5ODEyMzAwMA"
//                 },
//                 "name": [
//                     {
//                         "text": "St** Ca** P**"
//                     }
//                 ],
//                 "resourceType": "Patient"
//             }
//         },
//         {
//             "fullUrl": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient/0adf8007-fa70-4b48-88e8-df99dd521990",
//             "resource": {
//                 "id": "0adf8007-fa70-4b48-88e8-df99dd521990",
//                 "identifier": [
//                     {
//                         "system": "https://fhir.kemkes.go.id/id/nik",
//                         "value": "################"
//                     }
//                 ],
//                 "meta": {
//                     "lastUpdated": "2025-11-19T23:20:39.418995+00:00",
//                     "versionId": "MTc2MzU5NDQzOTQxODk5NTAwMA"
//                 },
//                 "name": [
//                     {
//                         "text": "St** Ca** P**"
//                     }
//                 ],
//                 "resourceType": "Patient"
//             }
//         },
//         {
//             "fullUrl": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient/28c31542-30f7-49f3-89b9-8cc1e572a95e",
//             "resource": {
//                 "id": "28c31542-30f7-49f3-89b9-8cc1e572a95e",
//                 "identifier": [
//                     {
//                         "system": "https://fhir.kemkes.go.id/id/nik",
//                         "value": "################"
//                     }
//                 ],
//                 "meta": {
//                     "lastUpdated": "2025-11-19T23:20:20.952346+00:00",
//                     "versionId": "MTc2MzU5NDQyMDk1MjM0NjAwMA"
//                 },
//                 "name": [
//                     {
//                         "text": "ge** el** p**"
//                     }
//                 ],
//                 "resourceType": "Patient"
//             }
//         },
//         {
//             "fullUrl": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient/P02280547535",
//             "resource": {
//                 "active": true,
//                 "id": "P02280547535",
//                 "identifier": [
//                     {
//                         "system": "https://fhir.kemkes.go.id/id/ihs-number",
//                         "use": "official",
//                         "value": "P02280547535"
//                     },
//                     {
//                         "system": "https://fhir.kemkes.go.id/id/nik",
//                         "use": "official",
//                         "value": "################"
//                     }
//                 ],
//                 "link": [
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/f2aea232-a5ad-4754-9bb5-10083ce346d3"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/46d399d9-e188-42ea-864e-beb3b8ce0f2a"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/70e842ae-4428-45bf-9166-dfa17de41e14"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/1f346d42-17c2-4d71-9ef0-1b85296f1aba"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/04be1530-de1f-4d22-bf5c-ab4bffde2b36"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/227a963f-a2e6-4251-b2cf-bb5d292a58de"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/f9406b4a-e9b9-4d9a-a421-227cf0b16ab6"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/99f9f5af-bf05-4505-99d8-c137e93c2180"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/dd6c8273-e5ea-4455-a78c-6657cf669b4b"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/ed3595db-1da9-4446-b90c-6f623f8f72be"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/19471570-2478-488b-ad11-1aa31422ad02"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/ee1c206a-df1c-4035-9494-3498fd8961be"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/a978bd6e-8841-4063-b14e-b5c7a4c3199c"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/ebaedcc2-c6a0-4b3c-84d3-cec628b5788f"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/94689116-e889-4a3f-a3d5-2f52811bed01"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/1ac203ba-c1e6-4ee5-8368-7846882c34fb"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/b8b12c2c-fb56-40f5-9c9b-2f5ab0378b78"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/b288f652-5975-43ed-b4ab-a3f5ded21632"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/7a7df848-a21c-43d2-a9f5-957998c2f93d"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/9b3f6a83-6279-4a2a-979f-fa2fda81f348"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/c6eaa490-0699-473e-a9ef-f8f6ee51b50e"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/82762d83-8258-40bc-a3c7-8dcf2662c04c"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/c9a5a6f1-e21a-4f55-91a3-40dac2271c56"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/b33ccfe6-a399-4731-b88b-4d6af20bb996"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/323b483f-70ea-4100-a7c1-29c773803781"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/80022301-9c98-41b1-b74d-979368374320"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/26b4edf1-5651-404b-a2e6-1ef70cfda9cb"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/a2c68982-4fa3-4c3a-af95-b206edbfe04e"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/929e4a92-5c79-4f6f-94bc-4fe784151b5b"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/bc1edf9e-4699-4b56-8859-36487c8298bf"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/fb75735e-74de-44b9-bd31-ec717d591e72"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/952ef34b-d13b-4da2-a30b-74411faeae7a"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/fd06c880-e17a-4123-aaa0-11a544cc235e"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/095a289d-4d47-4979-b6c2-32f4917b59f5"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/4aa7d462-38c9-4642-b4ac-99a7d62ca853"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/a22f3806-9802-473b-b9c0-5de56f1ba3de"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/19c8233f-cf73-40df-be48-c88cd0c813e7"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/778142ff-fa44-4b99-bcf3-01fc306bb6cd"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/82e18d70-5afe-430d-b7ed-5c0634a3ae9f"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/5baa7cf1-9ef5-4c41-b2c7-3195f39fe33c"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/265ad91f-791b-4090-bd45-3aed2f5b3671"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/2ab68870-2587-49a5-b4be-7454637d273a"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/726640ec-5ae7-4d07-ba62-36c9caa8c6f3"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/0169a682-342d-49b7-87cd-c2f5c2698d46"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/95017e07-8c94-4777-b567-7aa8f10ce972"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/130eae00-41cf-4f69-affc-32e83f29b028"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/cd8639b1-4502-45b2-8007-36395a5eaa05"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/4459b6eb-e7b6-4c7c-b366-933ba0f98c39"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/f98e527c-3cb8-479f-8c5a-f813494e3952"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/64d5f590-e406-4a22-83a2-0a660e7983a6"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/19f04365-0780-4ea9-ba05-f6f0a73a969f"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/dfe9058d-7159-4d00-83ae-11a072041b60"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/532eddb7-a35c-4a68-b017-75c012ee29c4"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/3cb6f3d2-fff3-4cc8-92f1-77ee7964f3eb"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/0c2625e9-138a-4dba-b902-c95f70caf098"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/d84ad01c-918a-4d1b-b637-18d188927d14"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/664c0ffd-1e76-4f4c-b604-06f2dcfbbbbc"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/c469b10f-ef4e-4f96-bc47-6d969dd7e875"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/5470be61-3844-40e5-8dac-152190567881"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/7cbfedc3-1af8-4fe1-87d0-50054b40e69e"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/cb5a533a-b613-4215-86c6-d80c04015644"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/424f0a53-6fa0-412e-8c53-fea4d9524105"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/72397f62-ece3-4fe2-9c40-1fdd1b7fb8e1"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/67ac4616-e7c3-4a13-8363-6f09dd52ddf6"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/1a2c5079-315b-44e1-9701-a861096f494b"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/5b92a1a2-049b-4bd3-afd9-1f3da6955229"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/364efec4-9a3d-4ec2-a239-6369c2dacb5b"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/a017de84-9eff-4ab7-858c-b79bcf92bb94"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/7686021f-9724-4db7-a5ce-a86f30d50fca"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/dbf756ac-cc52-4728-ac03-71c979659d78"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/13a6aef1-6d0a-4cc6-973e-06a415d95df3"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/536cf7ea-3a7d-40cb-b560-c85a414a5692"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/4ea21d19-46a0-4ec2-a3f2-fe9ece1f1ceb"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/4814162b-3538-4850-9d34-12f464e6f485"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/cc789c1d-12d1-40fa-8c6a-f41a5f5f278e"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/74cb5708-2343-4ffe-888a-ff4b6522f11c"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/2d9f4023-29c1-4fc6-9392-589ec8370082"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/af954d42-e831-422c-b9d1-806b534a0f2e"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/b7bfa84a-f1a6-4a9d-927d-9c2c05f5c0b5"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/adece66a-fc67-4ef1-969c-6f53b24ec34d"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/d66de27f-7a03-4ddf-b57b-db9f7711c797"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/1495e390-44a9-45b1-adc8-5e56528ca1b7"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/5372d4cd-b97f-4c37-99dc-31ac6d45650b"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/e14b5731-92d4-4d33-9586-56f552b7c07f"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/89d15e23-0e91-43f9-a28d-ceb40ef5af2e"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/94c2f4c6-a95c-41fa-badc-2988600be5b0"
//                         },
//                         "type": "refer"
//                     },
//                     {
//                         "other": {
//                             "reference": "RelatedPerson/849c6143-f5f9-4438-9de2-7ed4308f2bdb"
//                         },
//                         "type": "refer"
//                     }
//                 ],
//                 "meta": {
//                     "lastUpdated": "2025-11-17T04:06:29.666217+00:00",
//                     "versionId": "MTc2MzM1MjM4OTY2NjIxNzAwMA"
//                 },
//                 "name": [
//                     {
//                         "text": "Sa** An** Ri**",
//                         "use": "official"
//                     }
//                 ],
//                 "resourceType": "Patient"
//             }
//         }
//     ],
//     "link": [
//         {
//             "relation": "search",
//             "url": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient/?identifier=https%3A%2F%2Ffhir.kemkes.go.id%2Fid%2Fnik%7C9104025209000006"
//         },
//         {
//             "relation": "first",
//             "url": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient/?identifier=https%3A%2F%2Ffhir.kemkes.go.id%2Fid%2Fnik%7C9104025209000006"
//         },
//         {
//             "relation": "self",
//             "url": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Patient/?identifier=https%3A%2F%2Ffhir.kemkes.go.id%2Fid%2Fnik%7C9104025209000006"
//         }
//     ],
//     "resourceType": "Bundle",
//     "total": 14,
//     "type": "searchset"
// }

// response ihs practitioner:
// {
//     "entry": [
//         {
//             "fullUrl": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Practitioner/10006926841",
//             "resource": {
//                 "address": [
//                     {
//                         "city": "Kab. Garut",
//                         "country": "ID",
//                         "extension": [
//                             {
//                                 "extension": [
//                                     {
//                                         "url": "province",
//                                         "valueCode": "32"
//                                     },
//                                     {
//                                         "url": "city",
//                                         "valueCode": "3205"
//                                     },
//                                     {
//                                         "url": "district",
//                                         "valueCode": "320519"
//                                     },
//                                     {
//                                         "url": "village",
//                                         "valueCode": "3205192003"
//                                     },
//                                     {
//                                         "url": "rw",
//                                         "valueCode": "1"
//                                     },
//                                     {
//                                         "url": "rt",
//                                         "valueCode": "12"
//                                     }
//                                 ],
//                                 "url": "https://fhir.kemkes.go.id/r4/StructureDefinition/administrativeCode"
//                             }
//                         ],
//                         "line": [
//                             "Komplek Kesehatan"
//                         ],
//                         "use": "home"
//                     }
//                 ],
//                 "birthDate": "1995-02-02",
//                 "gender": "male",
//                 "id": "10006926841",
//                 "identifier": [
//                     {
//                         "system": "https://fhir.kemkes.go.id/id/nakes-his-number",
//                         "value": "10006926841"
//                     },
//                     {
//                         "system": "https://fhir.kemkes.go.id/id/nik",
//                         "use": "official",
//                         "value": "3322071302900002"
//                     }
//                 ],
//                 "meta": {
//                     "lastUpdated": "2024-11-05T09:10:51.313514+00:00",
//                     "versionId": "MTczMDc5Nzg1MTMxMzUxNDAwMA"
//                 },
//                 "name": [
//                     {
//                         "text": "d** Yo** Ya** S**",
//                         "use": "official"
//                     }
//                 ],
//                 "qualification": [
//                     {
//                         "code": {
//                             "coding": [
//                                 {
//                                     "code": "STR-KKI",
//                                     "display": "Surat Tanda Registrasi Dokter",
//                                     "system": "https://terminology.kemkes.go.id/v1-0302"
//                                 }
//                             ]
//                         },
//                         "identifier": [
//                             {
//                                 "system": "https://fhir.kemkes.go.id/id/str-kki-number",
//                                 "value": "1234567887654322"
//                             }
//                         ]
//                     }
//                 ],
//                 "resourceType": "Practitioner"
//             }
//         }
//     ],
//     "link": [
//         {
//             "relation": "search",
//             "url": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Practitioner/?identifier=https%3A%2F%2Ffhir.kemkes.go.id%2Fid%2Fnik%7C3322071302900002"
//         },
//         {
//             "relation": "first",
//             "url": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Practitioner/?identifier=https%3A%2F%2Ffhir.kemkes.go.id%2Fid%2Fnik%7C3322071302900002"
//         },
//         {
//             "relation": "self",
//             "url": "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1/Practitioner/?identifier=https%3A%2F%2Ffhir.kemkes.go.id%2Fid%2Fnik%7C3322071302900002"
//         }
//     ],
//     "resourceType": "Bundle",
//     "total": 1,
//     "type": "searchset"
// }
