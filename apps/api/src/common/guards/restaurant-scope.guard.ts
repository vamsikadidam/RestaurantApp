import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request';

/**
 * Enforces that an authenticated admin/employee can only act on the
 * restaurant (and, if present, restaurant location) identified by the
 * `restaurantId` / `restaurantLocationId` route params - never another
 * restaurant's data. Apply after JwtAuthGuard + RolesGuard.
 *
 * A user's roles are scoped via `UserRole.restaurantId` /
 * `restaurantLocationId` (see prisma/schema.prisma). This guard checks the
 * JWT's embedded role snapshot against the resource being accessed.
 */
@Injectable()
export class RestaurantScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const params = request.params;
    const query = request.query as Record<string, string | undefined>;
    const body = (request.body ?? {}) as Record<string, string | undefined>;

    const restaurantId = params.restaurantId ?? query.restaurantId ?? body.restaurantId;
    const restaurantLocationId =
      params.restaurantLocationId ??
      params.locationId ??
      query.restaurantLocationId ??
      body.restaurantLocationId;

    if (!restaurantId && !restaurantLocationId) {
      // Nothing to scope against - RolesGuard already checked the role type.
      return true;
    }

    const isAuthorized = user?.roles.some((role) => {
      if (restaurantLocationId && role.restaurantLocationId) {
        return role.restaurantLocationId === restaurantLocationId;
      }
      if (restaurantId && role.restaurantId) {
        return role.restaurantId === restaurantId;
      }
      return false;
    });

    if (!isAuthorized) {
      throw new ForbiddenException('You do not have access to this restaurant location');
    }

    return true;
  }
}
