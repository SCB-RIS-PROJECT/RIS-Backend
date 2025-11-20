import type { Meta } from "@/interface/index.d";

export interface CreateUserInput {
    name: string;
    email: string;
    password: string;
    avatar?: string;
}

export interface UpdateUserInput {
    name?: string;
    email?: string;
    password?: string;
    avatar?: string;
}

export interface UserWithRolesAndPermissions {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    email_verified_at: Date | null;
    created_at: Date;
    updated_at: Date | null;
    roles: string[];
    permissions: string[];
}

export interface PaginationParams {
    page?: number;
    per_page?: number;
    search?: string;
}

export interface UserPaginationResponse {
    data: UserWithRolesAndPermissions[];
    meta: Meta;
}
