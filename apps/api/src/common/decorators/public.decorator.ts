import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as not requiring authentication. Used sparingly - most of
 * this API is written "secure by default" (see JwtAuthGuard), so routes must
 * opt out explicitly rather than opt in.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
