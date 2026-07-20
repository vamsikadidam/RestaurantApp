import { SetMetadata } from '@nestjs/common';
import { UserRoleType } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to one or more roles. Combine with RolesGuard.
 * Restaurant/location scoping is enforced separately by RestaurantScopeGuard
 * since a role alone doesn't say *which* restaurant an admin/employee can act on.
 */
export const Roles = (...roles: UserRoleType[]) => SetMetadata(ROLES_KEY, roles);
