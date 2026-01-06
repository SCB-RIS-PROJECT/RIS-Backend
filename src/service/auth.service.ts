import { eq } from "drizzle-orm";
import type { Context } from "hono";
import db from "@/database/db";
import { userTable } from "@/database/schemas/schema-user";
import { practitionerTable } from "@/database/schemas/schema-practitioner";
import type { AppBindings } from "@/interface";
import type { LoginData, LoginPayload, UserResponse, RegisterUserPayload, RegisterPractitionerPayload } from "@/interface/auth.interface";
import { verifyPassword, hashPassword } from "@/lib/crypto";
import { generateToken } from "@/lib/jwt";
import { UserService } from "@/service/user.service";
import {
    type ServiceResponse,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    UNAUTHORIZED_SERVICE_RESPONSE,
} from "@/entities/Service";

export class AuthService {
    static async login(c: Context<AppBindings>, payload: LoginPayload): Promise<ServiceResponse<LoginData>> {
        try {
            // Find user by email
            const [user] = await db.select().from(userTable).where(eq(userTable.email, payload.email)).limit(1);

            if (!user) {
                return {
                    status: false,
                    err: {
                        message: "Invalid email or password",
                        code: 401,
                    },
                };
            }

            // Verify password
            const isPasswordValid = await verifyPassword(payload.password, user.password);

            if (!isPasswordValid) {
                return {
                    status: false,
                    err: {
                        message: "Invalid email or password",
                        code: 401,
                    },
                };
            }

            // Get user with roles and permissions
            const userWithRolesAndPermissions = await UserService.attachRolesAndPermissions(user);

            // Generate JWT token
            const token = generateToken({
                userId: user.id,
                email: user.email,
            });

            return {
                status: true,
                data: {
                    token,
                    user: {
                        id: userWithRolesAndPermissions.id,
                        name: userWithRolesAndPermissions.name,
                        email: userWithRolesAndPermissions.email,
                        avatar: userWithRolesAndPermissions.avatar,
                        practitioner_id: userWithRolesAndPermissions.practitioner_id,
                        email_verified_at: userWithRolesAndPermissions.email_verified_at?.toISOString() || null,
                        created_at: userWithRolesAndPermissions.created_at.toISOString(),
                        updated_at: userWithRolesAndPermissions.updated_at?.toISOString() || null,
                        roles: userWithRolesAndPermissions.roles,
                        permissions: userWithRolesAndPermissions.permissions,
                    },
                },
            };
        } catch (err) {
            console.error('AuthService.login error:', err);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async logout(c: Context<AppBindings>): Promise<ServiceResponse<{ success: boolean }>> {
        try {
            // With JWT, logout is handled client-side by removing the token
            // Server-side logout can be implemented with token blacklist if needed
            return {
                status: true,
                data: { success: true },
            };
        } catch (err) {
            console.error(`AuthService.logout: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async current(c: Context<AppBindings>): Promise<ServiceResponse<UserResponse>> {
        try {
            const sessionUser = c.get("user");
            const userId = sessionUser?.id;

            if (!userId) return UNAUTHORIZED_SERVICE_RESPONSE;

            const userResponse = await UserService.getUserById(userId);

            if (!userResponse.status || !userResponse.data) return UNAUTHORIZED_SERVICE_RESPONSE;

            const userData = userResponse.data;

            // Get practitioner data if user is a practitioner
            let practitionerData = null;
            if (userData.practitioner_id) {
                const [practitioner] = await db
                    .select()
                    .from(practitionerTable)
                    .where(eq(practitionerTable.id, userData.practitioner_id))
                    .limit(1);

                if (practitioner) {
                    practitionerData = {
                        id: practitioner.id,
                        nik: practitioner.nik,
                        name: practitioner.name,
                        profession: practitioner.profession,
                        gender: practitioner.gender,
                        phone: practitioner.phone,
                        email: practitioner.email,
                    };
                }
            }

            return {
                status: true,
                data: {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    avatar: userData.avatar,
                    practitioner_id: userData.practitioner_id,
                    email_verified_at: userData.email_verified_at?.toISOString() || null,
                    created_at: userData.created_at.toISOString(),
                    updated_at: userData.updated_at?.toISOString() || null,
                    roles: userData.roles,
                    permissions: userData.permissions,
                    practitioner: practitionerData,
                },
            };
        } catch (err) {
            console.error('AuthService.current error:', err);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async registerUser(c: Context<AppBindings>, payload: RegisterUserPayload): Promise<ServiceResponse<LoginData>> {
        try {
            // Check if email already exists
            const [existingUser] = await db
                .select()
                .from(userTable)
                .where(eq(userTable.email, payload.email))
                .limit(1);

            if (existingUser) {
                return {
                    status: false,
                    err: {
                        message: "Email already registered",
                        code: 409,
                    },
                };
            }

            // Hash password
            const hashedPassword = await hashPassword(payload.password);

            // Create user
            const [newUser] = await db
                .insert(userTable)
                .values({
                    name: payload.name,
                    email: payload.email,
                    password: hashedPassword,
                    practitioner_id: null, // Not a practitioner
                })
                .returning();

            // Get user with roles and permissions
            const userWithRolesAndPermissions = await UserService.attachRolesAndPermissions(newUser);

            // Generate JWT token
            const token = generateToken({
                userId: newUser.id,
                email: newUser.email,
            });

            return {
                status: true,
                data: {
                    token,
                    user: {
                        id: userWithRolesAndPermissions.id,
                        name: userWithRolesAndPermissions.name,
                        email: userWithRolesAndPermissions.email,
                        avatar: userWithRolesAndPermissions.avatar,
                        practitioner_id: userWithRolesAndPermissions.practitioner_id,
                        email_verified_at: userWithRolesAndPermissions.email_verified_at?.toISOString() || null,
                        created_at: userWithRolesAndPermissions.created_at.toISOString(),
                        updated_at: userWithRolesAndPermissions.updated_at?.toISOString() || null,
                        roles: userWithRolesAndPermissions.roles,
                        permissions: userWithRolesAndPermissions.permissions,
                    },
                },
            };
        } catch (err) {
            console.error('AuthService.registerUser error:', err);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }

    static async registerPractitioner(c: Context<AppBindings>, payload: RegisterPractitionerPayload): Promise<ServiceResponse<LoginData>> {
        try {
            // Check if email already exists
            const [existingUser] = await db
                .select()
                .from(userTable)
                .where(eq(userTable.email, payload.email))
                .limit(1);

            if (existingUser) {
                return {
                    status: false,
                    err: {
                        message: "Email already registered",
                        code: 409,
                    },
                };
            }

            // Check if NIK already exists
            const [existingPractitioner] = await db
                .select()
                .from(practitionerTable)
                .where(eq(practitionerTable.nik, payload.nik))
                .limit(1);

            if (existingPractitioner) {
                return {
                    status: false,
                    err: {
                        message: "NIK already registered",
                        code: 409,
                    },
                };
            }

            // Hash password
            const hashedPassword = await hashPassword(payload.password);

            // Create practitioner first
            const [newPractitioner] = await db
                .insert(practitionerTable)
                .values({
                    nik: payload.nik,
                    name: payload.name,
                    gender: payload.gender,
                    birth_date: new Date(payload.birth_date),
                    profession: payload.profession || "DOCTOR",
                    phone: payload.phone,
                    email: payload.email,
                    address: payload.address,
                    id_province: payload.id_province,
                    province: payload.province,
                    id_city: payload.id_city,
                    city: payload.city,
                    id_district: payload.id_district,
                    district: payload.district,
                    id_sub_district: payload.id_sub_district,
                    sub_district: payload.sub_district,
                    rt: payload.rt,
                    rw: payload.rw,
                    postal_code: payload.postal_code,
                    ihs_number: payload.ihs_number,
                    active: true,
                })
                .returning();

            // Create user linked to practitioner
            const [newUser] = await db
                .insert(userTable)
                .values({
                    name: payload.name,
                    email: payload.email,
                    password: hashedPassword,
                    practitioner_id: newPractitioner.id,
                })
                .returning();

            // Get user with roles and permissions
            const userWithRolesAndPermissions = await UserService.attachRolesAndPermissions(newUser);

            // Generate JWT token
            const token = generateToken({
                userId: newUser.id,
                email: newUser.email,
            });

            return {
                status: true,
                data: {
                    token,
                    user: {
                        id: userWithRolesAndPermissions.id,
                        name: userWithRolesAndPermissions.name,
                        email: userWithRolesAndPermissions.email,
                        avatar: userWithRolesAndPermissions.avatar,
                        practitioner_id: userWithRolesAndPermissions.practitioner_id,
                        email_verified_at: userWithRolesAndPermissions.email_verified_at?.toISOString() || null,
                        created_at: userWithRolesAndPermissions.created_at.toISOString(),
                        updated_at: userWithRolesAndPermissions.updated_at?.toISOString() || null,
                        roles: userWithRolesAndPermissions.roles,
                        permissions: userWithRolesAndPermissions.permissions,
                        practitioner: {
                            id: newPractitioner.id,
                            nik: newPractitioner.nik,
                            name: newPractitioner.name,
                            profession: newPractitioner.profession,
                            gender: newPractitioner.gender,
                            phone: newPractitioner.phone,
                            email: newPractitioner.email,
                        },
                    },
                },
            };
        } catch (err) {
            console.error(`AuthService.registerPractitioner: ${err}`);
            return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
    }
}
