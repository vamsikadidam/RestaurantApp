import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UserRoleType } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantScopeGuard } from '../common/guards/restaurant-scope.guard';
import { AuthenticatedRequest } from '../common/types/authenticated-request';
import { CloverOAuthService } from './clover-oauth.service';
import { CloverSyncService } from './clover-sync.service';
import { TriggerSyncDto } from './dto/trigger-sync.dto';
import { SyncJobType } from '@prisma/client';

@ApiTags('clover')
@Controller('integrations/clover')
export class CloverController {
  constructor(
    private readonly cloverOAuthService: CloverOAuthService,
    private readonly cloverSyncService: CloverSyncService,
  ) {}

  @Roles(UserRoleType.RESTAURANT_ADMIN)
  @UseGuards(RolesGuard, RestaurantScopeGuard)
  @Get('oauth/start')
  @ApiOperation({ summary: 'Start the Clover OAuth connection flow for a restaurant location' })
  async oauthStart(
    @Query('restaurantLocationId') restaurantLocationId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    if (!restaurantLocationId) {
      throw new BadRequestException('restaurantLocationId is required');
    }

    const url = await this.cloverOAuthService.buildAuthorizationUrl({
      restaurantLocationId,
      connectedByUserId: req.user!.userId,
    });

    return res.redirect(url);
  }

  @Public()
  @Get('oauth/callback')
  @ApiOperation({ summary: 'Clover OAuth redirect target - completes the connection' })
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('merchant_id') merchantIdSnake?: string,
    @Query('merchantId') merchantIdCamel?: string,
  ) {
    if (!code || !state) {
      throw new BadRequestException('Missing code or state from Clover redirect');
    }

    const connection = await this.cloverOAuthService.handleCallback({
      code,
      state,
      merchantId: merchantIdSnake ?? merchantIdCamel,
    });

    return {
      success: true,
      merchantId: connection.cloverMerchantId,
      restaurantLocationId: connection.restaurantLocationId,
    };
  }

  @Roles(UserRoleType.RESTAURANT_ADMIN)
  @UseGuards(RolesGuard, RestaurantScopeGuard)
  @Post('sync')
  @ApiOperation({ summary: 'Manually trigger a full Clover inventory sync' })
  triggerSync(@Body() dto: TriggerSyncDto, @Req() req: AuthenticatedRequest) {
    return this.cloverSyncService.runFullSync(dto.restaurantId, dto.restaurantLocationId, {
      type: SyncJobType.MANUAL,
      triggeredByUserId: req.user!.userId,
    });
  }

  @Roles(UserRoleType.RESTAURANT_ADMIN, UserRoleType.RESTAURANT_EMPLOYEE)
  @UseGuards(RolesGuard, RestaurantScopeGuard)
  @Get('sync-status')
  @ApiOperation({ summary: 'View recent Clover sync job history for a restaurant' })
  getSyncStatus(@Query('restaurantId') restaurantId: string) {
    return this.cloverSyncService.getSyncStatus(restaurantId);
  }
}
