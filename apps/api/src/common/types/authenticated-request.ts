import { Request } from 'express';
import { UserRoleType } from '@prisma/client';

export interface RequestUserRole {
  role: UserRoleType;
  restaurantId?: string | null;
  restaurantLocationId?: string | null;
}

export interface RequestUser {
  userId: string;
  email?: string | null;
  isGuest: boolean;
  roles: RequestUserRole[];
}

export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}
