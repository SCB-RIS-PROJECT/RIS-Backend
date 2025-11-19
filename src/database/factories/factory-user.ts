import { fakerID_ID as faker } from "@faker-js/faker";
import type { InferInsertModel } from "drizzle-orm";
import type { userTable } from "@/database/schemas/schema-user";

type NewUser = InferInsertModel<typeof userTable>;
const DEFAULT_SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = "password";

export const createUser = async (data?: Partial<NewUser>): Promise<NewUser> => {
    const password = data?.password || DEFAULT_PASSWORD;
    const hashedPassword = await Bun.password.hash(password, {
        algorithm: "bcrypt",
        cost: DEFAULT_SALT_ROUNDS,
    });

    return {
        name: data?.name || faker.person.fullName(),
        email: data?.email || faker.internet.email(),
        password: data?.password || hashedPassword,
        avatar: data?.avatar || faker.image.avatar(),
        email_verified_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
    };
};

export const FactoryUser = (data: Partial<NewUser>[] | number): Promise<NewUser[]> => {
    if (Array.isArray(data)) {
        return Promise.all(data.map((userData) => createUser(userData)));
    }
    return Promise.all(Array.from({ length: data }, () => createUser()));
};
