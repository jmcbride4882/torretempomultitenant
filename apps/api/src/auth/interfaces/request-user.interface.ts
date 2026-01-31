import { Role } from '@prisma/client';

/**
 * User object attached to request by JWT strategy
 * This represents the authenticated user making the request
 */
export interface RequestUser {
  id: string;
  sub: string; // JWT subject (user ID)
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  tenantId: string | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
  } | null;
}
