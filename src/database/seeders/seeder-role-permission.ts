// biome-ignore-all lint/suspicious/noConsole: <because seeder>

import db from "@/database/db";
import { createPermission, createRole } from "@/database/factories/factory-role-permission";
import { FactoryUser } from "@/database/factories/factory-user";
import { rolePermissionTable, userRoleTable } from "@/database/schemas/schema-role-permission";
import { userTable } from "@/database/schemas/schema-user";

export const seedRolePermission = async () => {
    try {
        // create role
        const adminRole = await createRole({
            name: "admin",
            description: "Administrator with full access to the system",
        });

        const officerRole = await createRole({
            name: "officer",
            description: "Officer who manages patient data and schedules",
        });

        const doctorRole = await createRole({
            name: "doctor",
            description: "Doctor who handles patients and medical records",
        });

        const nurseRole = await createRole({
            name: "nurse",
            description: "Nurse who assists doctors and cares for patients",
        });

        // create permission
        const userPermissions = await Promise.all([
            createPermission({ name: "create:user", description: "can create user" }),
            createPermission({ name: "read:user", description: "can read user" }),
            createPermission({ name: "update:user", description: "can update user" }),
            createPermission({ name: "delete:user", description: "can delete user" }),
        ]);

        const rolePermissions = await Promise.all([
            createPermission({ name: "create:role", description: "can create role" }),
            createPermission({ name: "read:role", description: "can read role" }),
            createPermission({ name: "update:role", description: "can update role" }),
            createPermission({ name: "delete:role", description: "can delete role" }),
        ]);

        const permissionPermissions = await Promise.all([
            createPermission({ name: "create:permission", description: "can create permission" }),
            createPermission({ name: "read:permission", description: "can read permission" }),
            createPermission({ name: "update:permission", description: "can update permission" }),
            createPermission({ name: "delete:permission", description: "can delete permission" }),
        ]);

        const patientPermissions = await Promise.all([
            createPermission({ name: "create:patient", description: "can create patient" }),
            createPermission({ name: "read:patient", description: "can read patient" }),
            createPermission({ name: "update:patient", description: "can update patient" }),
            createPermission({ name: "delete:patient", description: "can delete patient" }),
        ]);

        const practitionerPermissions = await Promise.all([
            createPermission({ name: "create:practitioner", description: "can create practitioner" }),
            createPermission({ name: "read:practitioner", description: "can read practitioner" }),
            createPermission({ name: "update:practitioner", description: "can update practitioner" }),
            createPermission({ name: "delete:practitioner", description: "can delete practitioner" }),
        ]);

        const satuSehatPermissions = await Promise.all([
            createPermission({ name: "read:satu_sehat", description: "can read satu sehat data" }),
            createPermission({ name: "create:satu_sehat", description: "can create satu sehat data" }),
        ]);

        // assign permissions to admin role
        const permissionForAdmin = [
            ...userPermissions,
            ...rolePermissions,
            ...permissionPermissions,
            ...patientPermissions,
            ...practitionerPermissions,
            ...satuSehatPermissions,
        ];

        await db.insert(rolePermissionTable).values(
            permissionForAdmin.map((permission) => ({
                id_role: adminRole.id,
                id_permission: permission.id,
            }))
        );

        // assign permission to officer role
        const permissionForOfficer = [
            ...satuSehatPermissions,
            ...userPermissions.filter((p) => p.name === "read:user" || p.name === "update:user"),
            ...patientPermissions.filter(
                (p) =>
                    p.name === "create:patient" ||
                    p.name === "read:patient" ||
                    p.name === "update:patient" ||
                    p.name === "delete:patient"
            ),
        ];

        await db.insert(rolePermissionTable).values(
            permissionForOfficer.map((permission) => ({
                id_role: officerRole.id,
                id_permission: permission.id,
            }))
        );

        // assign permission to doctor role
        const permissionForDoctor = [
            ...satuSehatPermissions,
            ...patientPermissions.filter((p) => p.name === "read:patient"),
        ];

        await db.insert(rolePermissionTable).values(
            permissionForDoctor.map((permission) => ({
                id_role: doctorRole.id,
                id_permission: permission.id,
            }))
        );

        // assign permission to nurse role
        const permissionForNurse = [
            ...satuSehatPermissions,
            ...patientPermissions.filter((p) => p.name === "read:patient"),
        ];

        await db.insert(rolePermissionTable).values(
            permissionForNurse.map((permission) => ({
                id_role: nurseRole.id,
                id_permission: permission.id,
            }))
        );

        // create users with their roles
        const userConfigs = [
            { name: "admin", role: adminRole },
            { name: "officer", role: officerRole },
            { name: "doctor", role: doctorRole },
            { name: "nurse", role: nurseRole },
        ];

        // Create users using FactoryUser
        const userData = await FactoryUser(
            userConfigs.map((config) => ({
                name: config.name,
                email: `${config.name}@${config.name}.com`,
            }))
        );

        const userRecords = await db.insert(userTable).values(userData).returning();

        // Assign roles to users
        await db.insert(userRoleTable).values(
            userRecords.map((user, index) => ({
                id_user: user.id,
                id_role: userConfigs[index].role.id,
            }))
        );

        console.log("✅ Role and Permission seeding completed");
    } catch (error) {
        console.error("❌ Error while seeding Role and Permission:", error);
        throw error;
    }
};
