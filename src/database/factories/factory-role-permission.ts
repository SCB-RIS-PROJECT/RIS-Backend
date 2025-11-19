import { fakerID_ID as faker } from "@faker-js/faker";
import db from "@/database/db";
import { permissionTable, roleTable } from "@/database/schemas/schema-role-permission";

// create role
export const createRole = async (override?: Partial<typeof roleTable.$inferInsert>) => {
    const role = {
        name: faker.person.jobTitle(),
        description: faker.lorem.sentence(),
        ...override,
    };

    const [newRole] = await db.insert(roleTable).values(role).returning();
    return newRole;
};

// create permission
export const createPermission = async (override?: Partial<typeof permissionTable.$inferInsert>) => {
    const permission = {
        name: faker.helpers.arrayElement([
            "create:user",
            "read:user",
            "update:user",
            "delete:user",
            "create:role",
            "read:role",
            "update:role",
            "delete:role",
            "create:permission",
            "read:permission",
            "update:permission",
            "delete:permission",
        ]),
        description: faker.lorem.sentence(),
        ...override,
    };

    const [newPermission] = await db.insert(permissionTable).values(permission).returning();
    return newPermission;
};
