import { Injectable, Logger } from '@nestjs/common';
import { PushMessageInput, PushSender } from './push-sender.interface';

@Injectable()
export class LoggingPushSender implements PushSender {
  private readonly logger = new Logger(LoggingPushSender.name);

  async send(message: PushMessageInput): Promise<void> {
    if (message.deviceTokens.length === 0) {
      return;
    }
    this.logger.log(
      `[push:mock] would deliver "${message.title}" to ${message.deviceTokens.length} device(s): ${message.body}`,
    );
  }
}
