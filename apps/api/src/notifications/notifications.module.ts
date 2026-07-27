import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { LoggingPushSender } from './logging-push-sender';
import { PUSH_SENDER } from './push-sender.interface';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    LoggingPushSender,
    { provide: PUSH_SENDER, useExisting: LoggingPushSender },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
