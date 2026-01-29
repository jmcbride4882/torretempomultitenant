import { Role } from '@prisma/client';

export class UserResponseDto {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeCode: string | null;
  role: Role;
  isActive: boolean;
  locale: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transform Prisma user to response DTO (removes passwordHash)
 */
export function toUserResponse(user: any): UserResponseDto {
  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    employeeCode: user.employeeCode,
    role: user.role,
    isActive: user.isActive,
    locale: user.locale,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
