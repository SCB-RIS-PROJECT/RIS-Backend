export interface CreateRoleInput {
    name: string;
    description?: string;
}

export interface UpdateRoleInput {
    name?: string;
    description?: string;
}

export interface CreatePermissionInput {
    name: string;
    description?: string;
}

export interface UpdatePermissionInput {
    name?: string;
    description?: string;
}

export interface AssignPermissionToRoleInput {
    roleId: string;
    permissionId: string;
}

export interface AssignRoleToUserInput {
    userId: string;
    roleId: string;
}

export interface AssignPermissionToUserInput {
    userId: string;
    permissionId: string;
}

export interface UserRolesAndPermissions {
    roles: string[];
    permissions: string[];
}
