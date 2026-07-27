import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/authenticated-request';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's notifications, most recent first" })
  list(@CurrentUser() user: RequestUser) {
    return this.notificationsService.listForUser(user.userId);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  markRead(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.notificationsService.markRead(id, user.userId);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark every notification as read' })
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.notificationsService.markAllRead(user.userId);
  }

  @Post('device-tokens')
  @ApiOperation({ summary: 'Register a push notification device token for the current user' })
  registerDeviceToken(@CurrentUser() user: RequestUser, @Body() dto: RegisterDeviceTokenDto) {
    return this.notificationsService.registerDeviceToken(user.userId, dto.token, dto.platform);
  }

  @Delete('device-tokens/:token')
  @ApiOperation({ summary: 'Unregister a push notification device token (e.g. on logout)' })
  unregisterDeviceToken(@Param('token') token: string) {
    return this.notificationsService.unregisterDeviceToken(token);
  }
}
