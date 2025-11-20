import { count, eq, type InferSelectModel, ilike, or } from "drizzle-orm";
import db from "@/database/db";
import { userTable } from "@/database/schemas/schema-user";
import type {
    CreateUserInput,
    PaginationParams,
    UpdateUserInput,
    UserPaginationResponse,
    UserWithRolesAndPermissions,
} from "@/interface/user.interface";
import { hashPassword } from "@/lib/crypto";
import { RolePermissionService } from "@/service/role-permission.service";

export class UserService {
    static async attachRolesAndPermissions(
        user: InferSelectModel<typeof userTable>
    ): Promise<UserWithRolesAndPermissions> {
        const { roles, permissions } = await RolePermissionService.getUserRolesAndPermissions(user.id);

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            email_verified_at: user.email_verified_at,
            created_at: user.created_at,
            updated_at: user.updated_at,
            roles,
            permissions,
        };
    }

    static async getUserWithPagination(params: PaginationParams): Promise<UserPaginationResponse> {
        const page = params.page || 1;
        const perPage = params.per_page || 10;
        const offset = (page - 1) * perPage;

        // Build where conditions
        const whereConditions = params.search
            ? or(ilike(userTable.name, `%${params.search}%`), ilike(userTable.email, `%${params.search}%`))
            : undefined;

        // Get users
        const users = await db
            .select()
            .from(userTable)
            .where(whereConditions)
            .limit(perPage)
            .offset(offset)
            .orderBy(userTable.created_at);

        // Get total count
        const [{ total }] = await db.select({ total: count() }).from(userTable).where(whereConditions);

        // Attach roles and permissions to each user
        const usersWithRolesAndPermissions = await Promise.all(
            users.map((user) => UserService.attachRolesAndPermissions(user))
        );

        const totalPages = Math.ceil(total / perPage);

        return {
            data: usersWithRolesAndPermissions,
            meta: {
                total,
                page,
                per_page: perPage,
                total_pages: totalPages,
                has_next_page: page < totalPages,
                has_prev_page: page > 1,
            },
        };
    }

    static async getUserById(userId: string): Promise<UserWithRolesAndPermissions | null> {
        const [user] = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);

        if (!user) return null;

        return UserService.attachRolesAndPermissions(user);
    }

    static async getUserByEmail(email: string): Promise<UserWithRolesAndPermissions | null> {
        const [user] = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1);

        if (!user) return null;

        return UserService.attachRolesAndPermissions(user);
    }

    static async createUser(data: CreateUserInput): Promise<UserWithRolesAndPermissions> {
        const hashedPassword = await hashPassword(data.password);

        const [user] = await db
            .insert(userTable)
            .values({
                name: data.name,
                email: data.email,
                password: hashedPassword,
                avatar: data.avatar || null,
            })
            .returning();

        return UserService.attachRolesAndPermissions(user);
    }

    static async updateUser(userId: string, data: UpdateUserInput): Promise<UserWithRolesAndPermissions | null> {
        const updateData: Partial<InferSelectModel<typeof userTable>> = {
            updated_at: new Date(),
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.password !== undefined) updateData.password = await hashPassword(data.password);
        if (data.avatar !== undefined) updateData.avatar = data.avatar;

        const [user] = await db.update(userTable).set(updateData).where(eq(userTable.id, userId)).returning();

        if (!user) return null;

        return UserService.attachRolesAndPermissions(user);
    }

    static async deleteUser(userId: string): Promise<void> {
        await db.delete(userTable).where(eq(userTable.id, userId));
    }
}
